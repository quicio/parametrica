/**
 * exploration.js — pure exploration sessions for the lab.
 *
 * A session owns a base document, a selection and a set of locks. It can
 * produce deterministic 1D sweeps and seeded random candidates without ever
 * mutating the current document.
 */

import { clampNumber } from '../core/schema.ts';
import { attachLayerAliases } from '../core/document.ts';
import { Generators, Operators } from '../core/registry.ts';
import { mulberry32 } from '../math/noise.ts';
import type { DocumentShape } from '../core/documentTypes.ts';
import type { ParameterRef, NumericParameterRef } from './parameters.ts';
import {
  numericParameterRefs,
  pathForRef,
  sameRef,
  schemaForRef,
  stageForRef,
} from './parameters.ts';

export interface ExplorationCandidate {
  id: string;
  index?: number;
  path: string;
  ref: ParameterRef | null;
  value: unknown;
  document: DocumentShape;
  col?: number;
  row?: number;
  x?: unknown;
  y?: unknown;
}
export interface SweepOptions { steps?: number }
export interface RandomizeOptions { intensity?: number; count?: number; seed?: number }
export interface GridOptions { cols?: number; rows?: number }
export interface MorphOptions { steps?: number }
export interface MorphCandidate {
  id: string;
  index: number;
  t: number;
  path: string;
  value: null;
  document: DocumentShape;
}

export class ExplorationSession {
  base: DocumentShape;
  refs: NumericParameterRef[];
  selection: ParameterRef[];
  locks: ParameterRef[];

  constructor(document: DocumentShape) {
    this.base = attachLayerAliases(structuredClone(document));
    this.refs = numericParameterRefs(document);
    this.selection = [];
    this.locks = [];
  }

  /** Select the parameters that randomisation may change. */
  setSelection(refs: ReadonlyArray<ParameterRef> | null | undefined): ParameterRef[] {
    const locks = new Set(this.locks.map(pathForRef));
    this.selection = (refs ?? [])
      .filter((ref) => this.refs.some((candidate) => sameRef(candidate, ref)))
      .filter((ref) => !locks.has(pathForRef(ref)))
      .map((ref) => this.cloneRef(ref));
    return this.selection;
  }

  select(ref: ParameterRef, selected = true): ParameterRef[] {
    if (selected) {
      if (!this.selection.some((candidate) => sameRef(candidate, ref))) {
        this.selection.push(this.cloneRef(ref));
      }
    } else {
      this.selection = this.selection.filter((candidate) => !sameRef(candidate, ref));
    }
    return this.selection;
  }

  /** Lock a parameter and remove it from the active selection. */
  setLock(ref: ParameterRef, locked = true): ParameterRef[] {
    if (locked) {
      if (!this.locks.some((candidate) => sameRef(candidate, ref))) {
        this.locks.push(this.cloneRef(ref));
      }
      this.selection = this.selection.filter((candidate) => !sameRef(candidate, ref));
    } else {
      this.locks = this.locks.filter((candidate) => !sameRef(candidate, ref));
    }
    return this.locks;
  }

  /** Replace the set of locked parameters. */
  setLocks(refs: ReadonlyArray<ParameterRef> | null | undefined): ParameterRef[] {
    this.locks = (refs ?? [])
      .filter((ref) => this.refs.some((candidate) => sameRef(candidate, ref)))
      .map((ref) => this.cloneRef(ref));
    this.selection = this.selection.filter(
      (candidate) => !this.locks.some((locked) => sameRef(locked, candidate)),
    );
    return this.locks;
  }

  /** Solo means: only this parameter is selected; every other ref is locked. */
  solo(ref: ParameterRef): { selection: ParameterRef[]; locks: ParameterRef[] } {
    this.selection = [this.cloneRef(ref)];
    this.locks = this.refs
      .filter((candidate) => !sameRef(candidate, ref))
      .map((candidate) => this.cloneRef(candidate));
    return { selection: this.selection, locks: this.locks };
  }

  isLocked(ref: ParameterRef): boolean {
    return this.locks.some((candidate) => sameRef(candidate, ref));
  }

  isSelected(ref: ParameterRef): boolean {
    return this.selection.some((candidate) => sameRef(candidate, ref));
  }

  /**
   * Deterministic 1D sweep over the schema range.
   * @returns {Array<{id, path, ref, value, document}>}
   */
  sweep1D(ref: ParameterRef, { steps = 12 }: SweepOptions = {}): ExplorationCandidate[] {
    const schema = schemaForRef(this.base, ref);
    if (!schema || !Number.isFinite(schema.min) || !Number.isFinite(schema.max) || (schema.max as number) <= (schema.min as number)) {
      throw new Error(`Parameter ${pathForRef(ref)} has no finite range`);
    }
    const n = Math.max(2, Math.min(48, Math.floor(steps)));
    const min = schema.min as number;
    const max = schema.max as number;
    const out: ExplorationCandidate[] = [];
    for (let i = 0; i < n; i++) {
      const value = min + ((max - min) * i) / (n - 1);
      out.push(this.candidate(ref, value, `sweep-${i}`, i));
    }
    return out;
  }

  /**
   * Seeded, scoped randomisation. Locked parameters are untouched; only
   * selected parameters are perturbed around their current value.
   */
  randomize({ intensity = 0.15, count = 6, seed = 1 }: RandomizeOptions = {}): ExplorationCandidate[] {
    const selected = this.selection.filter((ref) => !this.isLocked(ref));
    if (!selected.length) throw new Error('Select at least one unlocked parameter');
    const n = Math.max(1, Math.min(24, Math.floor(count)));
    const strength = Math.max(0.01, Math.min(1, Number(intensity) || 0.15));
    const random = mulberry32((seed >>> 0) || 1);
    const out: ExplorationCandidate[] = [];
    for (let i = 0; i < n; i++) {
      const document = attachLayerAliases(structuredClone(this.base));
      for (const ref of selected) {
        const schema = schemaForRef(document, ref);
        const stage = stageForRef(document, ref);
        if (!schema || !stage) continue;
        const current = Number(stage.params[ref.key]);
        if (!Number.isFinite(current)) continue;
        const range = (schema.max ?? 1) - (schema.min ?? 0);
        const value = current + gaussian(random) * range * strength;
        stage.params[ref.key] = clampNumber(schema, value);
      }
      out.push({
        id: `random-${i}`,
        path: selected.length === 1 && selected[0] ? pathForRef(selected[0]) : 'multiple',
        ref: selected[0] ?? null,
        value: selected.length === 1 && selected[0] ? Number(stageForRef(document, selected[0])?.params[selected[0].key]) : null,
        document,
      });
    }
    return out;
  }

  /**
   * Row-major 2D grid. X changes fastest.
   * @returns {Array<{id, path, ref, value, col, row, x, y, document}>}
   */
  grid2D(refX: ParameterRef, refY: ParameterRef, { cols = 6, rows = 4 }: GridOptions = {}): ExplorationCandidate[] {
    if (sameRef(refX, refY)) throw new Error('Choose two different axes');
    const schemaX = schemaForRef(this.base, refX);
    const schemaY = schemaForRef(this.base, refY);
    for (const [label, schema] of ([['X', schemaX], ['Y', schemaY]] as Array<[string, import('../core/schema.ts').SchemaEntry | null]>)) {
      if (!schema || !Number.isFinite(schema.min) || !Number.isFinite(schema.max) || (schema.max as number) <= (schema.min as number)) {
        throw new Error(`${label} axis has no finite range`);
      }
    }
    const c = Math.max(3, Math.min(12, Math.floor(cols)));
    const r = Math.max(3, Math.min(12, Math.floor(rows)));
    if (c * r > 144) throw new Error('Grid is limited to 144 candidates');
    const minX = schemaX!.min as number;
    const maxX = schemaX!.max as number;
    const minY = schemaY!.min as number;
    const maxY = schemaY!.max as number;
    const out: ExplorationCandidate[] = [];
    for (let row = 0; row < r; row++) {
      const yValue = minY + ((maxY - minY) * row) / (r - 1);
      for (let col = 0; col < c; col++) {
        const xValue = minX + ((maxX - minX) * col) / (c - 1);
        const document = attachLayerAliases(structuredClone(this.base));
        const stageX = stageForRef(document, refX);
        const stageY = stageForRef(document, refY);
        if (!stageX || !stageY) continue;
        stageX.params[refX.key] = clampNumber(schemaX!, xValue);
        stageY.params[refY.key] = clampNumber(schemaY!, yValue);
        out.push({
          id: `grid-${row}-${col}`,
          path: 'grid',
          ref: null,
          value: null,
          col,
          row,
          x: stageX.params[refX.key],
          y: stageY.params[refY.key],
          document,
        });
      }
    }
    return out;
  }

  candidate(ref: ParameterRef, value: unknown, id: string, index: number): ExplorationCandidate {
    const schema = schemaForRef(this.base, ref);
    if (!schema) throw new Error(`Unknown parameter ${pathForRef(ref)}`);
    const document = attachLayerAliases(structuredClone(this.base));
    const stage = stageForRef(document, ref);
    if (!stage) throw new Error(`Unknown stage for ${pathForRef(ref)}`);
    stage.params[ref.key] = clampNumber(schema, value);
    return {
      id,
      index,
      path: pathForRef(ref),
      ref: this.cloneRef(ref),
      value: stage.params[ref.key],
      document,
    };
  }

  cloneRef(ref: ParameterRef): ParameterRef {
    const base = this.refs.find((candidate) => sameRef(candidate, ref));
    return base ? { ...base } : { ...ref };
  }
}

function gaussian(random: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Same-structure parameter morph. Non-numeric parameters and the document
 * seed must match; only numeric parameters interpolate.
 * @returns {Array<{id, index, t, path, value, document}>}
 */
export function morphDocuments(a: DocumentShape, b: DocumentShape, { steps = 10 }: MorphOptions = {}): MorphCandidate[] {
  a = attachLayerAliases(a);
  b = attachLayerAliases(b);
  assertMorphCompatible(a, b);
  const n = Math.max(2, Math.min(40, Math.floor(steps)));
  const refs = numericParameterRefs(a);
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const document = attachLayerAliases(structuredClone(a));
    for (const ref of refs) {
      const schema = schemaForRef(a, ref);
      const stageA = stageForRef(a, ref);
      const stageB = stageForRef(b, ref);
      if (!schema || !stageA || !stageB) continue;
      const av = Number(stageA.params[ref.key]);
      const bv = Number(stageB.params[ref.key]);
      if (!Number.isFinite(av) || !Number.isFinite(bv)) continue;
      const stage = stageForRef(document, ref);
      if (!stage) continue;
      stage.params[ref.key] = clampNumber(schema, av + (bv - av) * t);
    }
    out.push({ id: `morph-${i}`, index: i, t, path: 'morph', value: null, document });
  }
  return out;
}

export function assertMorphCompatible(a: DocumentShape, b: DocumentShape): void {
  if (!a?.generator || !b?.generator) throw new Error('Two documents are required');
  if (a.generator.id !== b.generator.id) {
    throw new Error(`Different generators: ${a.generator.id} ≠ ${b.generator.id}`);
  }
  const opsA = a.operators ?? [];
  const opsB = b.operators ?? [];
  if (opsA.length !== opsB.length) throw new Error('Operator stacks have different lengths');
  for (let i = 0; i < opsA.length; i++) {
    if (opsA[i]!.id !== opsB[i]!.id) throw new Error(`Operator ${i + 1} differs`);
  }
  if (Number(a.seed) !== Number(b.seed)) throw new Error('Documents use different seeds');
  assertNonNumericEqual(a.generator, b.generator, Generators.get(a.generator.id).params);
  for (let i = 0; i < opsA.length; i++) {
    assertNonNumericEqual(opsA[i]!, opsB[i]!, Operators.get(opsA[i]!.id).params);
  }
}

function assertNonNumericEqual(stageA: { params?: Record<string, unknown>; enabled?: boolean } | undefined, stageB: { params?: Record<string, unknown>; enabled?: boolean } | undefined, schema: Record<string, { type?: string }> | null | undefined): void {
  if (!stageA || !stageB) return;
  for (const [key, s] of Object.entries(schema ?? {})) {
    if (s.type === 'number') continue;
    const av = JSON.stringify(stageA.params?.[key]);
    const bv = JSON.stringify(stageB.params?.[key]);
    if (av !== bv) throw new Error(`Non-numeric parameter "${key}" differs`);
  }
  if (Boolean(stageA.enabled) !== Boolean(stageB.enabled)) {
    throw new Error('Operator enabled state differs');
  }
}
