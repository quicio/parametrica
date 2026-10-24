/**
 * exploration.js — pure exploration sessions for the lab.
 *
 * A session owns a base document, a selection and a set of locks. It can
 * produce deterministic 1D sweeps and seeded random candidates without ever
 * mutating the current document.
 */

import { clampNumber } from '../core/schema.js';
import { attachLayerAliases } from '../core/document.js';
import { Generators, Operators } from '../core/registry.js';
import { mulberry32 } from '../math/noise.js';
import {
  numericParameterRefs,
  pathForRef,
  sameRef,
  schemaForRef,
  stageForRef,
} from './parameters.js';

export class ExplorationSession {
  constructor(document) {
    this.base = attachLayerAliases(structuredClone(document));
    this.refs = numericParameterRefs(document);
    this.selection = [];
    this.locks = [];
  }

  /** Select the parameters that randomisation may change. */
  setSelection(refs) {
    const locks = new Set(this.locks.map(pathForRef));
    this.selection = (refs ?? [])
      .filter((ref) => this.refs.some((candidate) => sameRef(candidate, ref)))
      .filter((ref) => !locks.has(pathForRef(ref)))
      .map((ref) => this.cloneRef(ref));
    return this.selection;
  }

  select(ref, selected = true) {
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
  setLock(ref, locked = true) {
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
  setLocks(refs) {
    this.locks = (refs ?? [])
      .filter((ref) => this.refs.some((candidate) => sameRef(candidate, ref)))
      .map((ref) => this.cloneRef(ref));
    this.selection = this.selection.filter(
      (candidate) => !this.locks.some((locked) => sameRef(locked, candidate)),
    );
    return this.locks;
  }

  /** Solo means: only this parameter is selected; every other ref is locked. */
  solo(ref) {
    this.selection = [this.cloneRef(ref)];
    this.locks = this.refs
      .filter((candidate) => !sameRef(candidate, ref))
      .map((candidate) => this.cloneRef(candidate));
    return { selection: this.selection, locks: this.locks };
  }

  isLocked(ref) {
    return this.locks.some((candidate) => sameRef(candidate, ref));
  }

  isSelected(ref) {
    return this.selection.some((candidate) => sameRef(candidate, ref));
  }

  /**
   * Deterministic 1D sweep over the schema range.
   * @returns {Array<{id, path, ref, value, document}>}
   */
  sweep1D(ref, { steps = 12 } = {}) {
    const schema = schemaForRef(this.base, ref);
    if (!schema || !Number.isFinite(schema.min) || !Number.isFinite(schema.max) || schema.max <= schema.min) {
      throw new Error(`Parameter ${pathForRef(ref)} has no finite range`);
    }
    const n = Math.max(2, Math.min(48, Math.floor(steps)));
    const out = [];
    for (let i = 0; i < n; i++) {
      const value = schema.min + ((schema.max - schema.min) * i) / (n - 1);
      out.push(this.candidate(ref, value, `sweep-${i}`, i));
    }
    return out;
  }

  /**
   * Seeded, scoped randomisation. Locked parameters are untouched; only
   * selected parameters are perturbed around their current value.
   */
  randomize({ intensity = 0.15, count = 6, seed = 1 } = {}) {
    const selected = this.selection.filter((ref) => !this.isLocked(ref));
    if (!selected.length) throw new Error('Select at least one unlocked parameter');
    const n = Math.max(1, Math.min(24, Math.floor(count)));
    const strength = Math.max(0.01, Math.min(1, Number(intensity) || 0.15));
    const random = mulberry32((seed >>> 0) || 1);
    const out = [];
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
        path: selected.length === 1 ? pathForRef(selected[0]) : 'multiple',
        ref: selected[0] ?? null,
        value: selected.length === 1 ? Number(stageForRef(document, selected[0])?.params[selected[0].key]) : null,
        document,
      });
    }
    return out;
  }

  /**
   * Row-major 2D grid. X changes fastest.
   * @returns {Array<{id, path, ref, value, col, row, x, y, document}>}
   */
  grid2D(refX, refY, { cols = 6, rows = 4 } = {}) {
    if (sameRef(refX, refY)) throw new Error('Choose two different axes');
    const schemaX = schemaForRef(this.base, refX);
    const schemaY = schemaForRef(this.base, refY);
    for (const [label, schema] of [['X', schemaX], ['Y', schemaY]]) {
      if (!schema || !Number.isFinite(schema.min) || !Number.isFinite(schema.max) || schema.max <= schema.min) {
        throw new Error(`${label} axis has no finite range`);
      }
    }
    const c = Math.max(3, Math.min(12, Math.floor(cols)));
    const r = Math.max(3, Math.min(12, Math.floor(rows)));
    if (c * r > 144) throw new Error('Grid is limited to 144 candidates');
    const out = [];
    for (let row = 0; row < r; row++) {
      const yValue = schemaY.min + ((schemaY.max - schemaY.min) * row) / (r - 1);
      for (let col = 0; col < c; col++) {
        const xValue = schemaX.min + ((schemaX.max - schemaX.min) * col) / (c - 1);
        const document = attachLayerAliases(structuredClone(this.base));
        const stageX = stageForRef(document, refX);
        const stageY = stageForRef(document, refY);
        if (!stageX || !stageY) continue;
        stageX.params[refX.key] = clampNumber(schemaX, xValue);
        stageY.params[refY.key] = clampNumber(schemaY, yValue);
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

  candidate(ref, value, id, index) {
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

  cloneRef(ref) {
    const base = this.refs.find((candidate) => sameRef(candidate, ref));
    return base ? { ...base } : { ...ref };
  }
}

function gaussian(random) {
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
export function morphDocuments(a, b, { steps = 10 } = {}) {
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

export function assertMorphCompatible(a, b) {
  if (!a?.generator || !b?.generator) throw new Error('Two documents are required');
  if (a.generator.id !== b.generator.id) {
    throw new Error(`Different generators: ${a.generator.id} ≠ ${b.generator.id}`);
  }
  const opsA = a.operators ?? [];
  const opsB = b.operators ?? [];
  if (opsA.length !== opsB.length) throw new Error('Operator stacks have different lengths');
  for (let i = 0; i < opsA.length; i++) {
    if (opsA[i].id !== opsB[i].id) throw new Error(`Operator ${i + 1} differs`);
  }
  if (Number(a.seed) !== Number(b.seed)) throw new Error('Documents use different seeds');
  assertNonNumericEqual(a.generator, b.generator, Generators.get(a.generator.id).params);
  for (let i = 0; i < opsA.length; i++) {
    assertNonNumericEqual(opsA[i], opsB[i], Operators.get(opsA[i].id).params);
  }
}

function assertNonNumericEqual(stageA, stageB, schema) {
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
