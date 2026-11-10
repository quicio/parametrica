/** Which parameters actually change the figure? */

import { clampNumber } from '../core/schema.ts';
import type { SchemaEntry } from '../core/schema.ts';
import { evaluateDocument } from '../core/engine.ts';
import { bboxAll, resampleUniform } from '../sampling/sampling.js';
import { computeDescriptor } from './descriptor.ts';
import { attachLayerAliases } from '../core/document.ts';
import { numericParameterRefs, pathForRef, schemaForRef, stageForRef } from './parameters.ts';
import type { NumericParameterRef, ParameterRef } from './parameters.ts';
import type { DocumentShape } from '../core/documentTypes.ts';

const EPS = 1e-9;

export interface SensitivityPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}
export interface SensitivityCurve {
  points: SensitivityPoint[];
  closed?: boolean;
  [key: string]: unknown;
}
export interface SensitivityEntry {
  path: string;
  stage: ParameterRef['stage'];
  index: number | null;
  key: string;
  current: number;
  delta: number;
  impact: number;
  direction: '0' | '±';
}
export interface SensitivityResult {
  base: unknown;
  entries: SensitivityEntry[];
  elapsedMs: number;
}
export interface SensitivityOptions {
  time?: number;
  maxParams?: number;
  refs?: ParameterRef[] | null;
}

export function computeSensitivity(
  document: DocumentShape,
  curves: ReadonlyArray<SensitivityCurve>,
  { time = 0, maxParams = 12, refs = null }: SensitivityOptions = {},
): SensitivityResult {
  const t0 = now();
  const base = computeDescriptor(document, curves as never, { hash: false });
  const baseBox = bboxAll(curves ?? []) as { diagonal?: number };
  const available: ParameterRef[] = refs ?? numericParameterRefs(document);
  const selected = available.slice(0, Math.max(0, maxParams));
  const entries: SensitivityEntry[] = [];

  for (const ref of selected) {
    const schema = (ref.schema ?? schemaForRef(document, ref)) as SchemaEntry | null;
    if (!schema) continue;
    const stage = stageForRef(document, ref);
    if (!stage) continue;
    const currentRaw = stage.params[ref.key];
    if (typeof currentRaw !== 'number') continue;
    const current = clampNumber(schema, currentRaw);
    const min = schema.min;
    const max = schema.max;
    if (!Number.isFinite(min) || !Number.isFinite(max) || (max as number) <= (min as number)) continue;

    const delta = Math.max(Number(schema.step) || 0, ((max as number) - (min as number)) * 0.02);
    const plus = evaluateCandidate(document, ref, current + delta, schema, time);
    const minus = evaluateCandidate(document, ref, current - delta, schema, time);
    if (!plus || !minus) {
      entries.push({
        path: pathForRef(ref), stage: ref.stage, index: ref.index ?? null, key: ref.key,
        current, delta, impact: 0, direction: '0',
      });
      continue;
    }

    const impact = shapeDistance(plus.curves, minus.curves, baseBox.diagonal || 1);
    entries.push({
      path: pathForRef(ref),
      stage: ref.stage,
      index: ref.index ?? null,
      key: ref.key,
      current,
      delta,
      impact: Number(impact.toFixed(6)),
      direction: impact < 1e-9 ? '0' : '±',
    });
  }

  entries.sort((a, b) => {
    if (b.impact !== a.impact) return b.impact - a.impact;
    return a.path.localeCompare(b.path);
  });

  return { base, entries, elapsedMs: now() - t0 };
}

function evaluateCandidate(
  document: DocumentShape,
  ref: ParameterRef,
  value: number,
  schema: SchemaEntry,
  time: number,
): { curves: SensitivityCurve[]; errors: unknown[] } | null {
  try {
    const candidate = attachLayerAliases(structuredClone(document)) as DocumentShape;
    const stage = stageForRef(candidate, ref);
    if (!stage) return null;
    stage.params[ref.key] = clampNumber(schema, value);
    const evaluation = evaluateDocument(candidate, { time }) as { curves: SensitivityCurve[]; errors: unknown[] };
    if (evaluation.errors.length || !evaluation.curves.length) return null;
    return evaluation;
  } catch {
    return null;
  }
}

/**
 * Symmetric Chamfer distance between two curve sets, normalised by a
 * reference diagonal. Returns 0 for identical shapes and 1 for “different”.
 */
export function shapeDistance(
  curvesA: ReadonlyArray<SensitivityCurve> | null | undefined,
  curvesB: ReadonlyArray<SensitivityCurve> | null | undefined,
  diagonal = 1,
): number {
  const a = sampleCloud(curvesA ?? []);
  const b = sampleCloud(curvesB ?? []);
  if (!a.length || !b.length) return 1;
  const dAB = meanNearest(a, b);
  const dBA = meanNearest(b, a);
  const scale = Math.max(EPS, diagonal);
  return Math.max(0, Math.min(1, ((dAB + dBA) / 2) / scale));
}

function sampleCloud(curves: ReadonlyArray<SensitivityCurve>, maxPoints = 512): SensitivityPoint[] {
  if (!curves?.length) return [];
  const perCurve = Math.max(2, Math.floor(maxPoints / curves.length));
  const out: SensitivityPoint[] = [];
  for (const c of curves) {
    if (!c.points?.length) continue;
    const pts = resampleUniform(c.points, perCurve, Boolean(c.closed)) as SensitivityPoint[];
    for (const p of pts) out.push(p);
  }
  return out.slice(0, maxPoints);
}

function meanNearest(from: ReadonlyArray<SensitivityPoint>, to: ReadonlyArray<SensitivityPoint>): number {
  let total = 0;
  for (const p of from) {
    let best = Infinity;
    for (const q of to) {
      const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
      if (d < best) best = d;
    }
    total += Math.sqrt(best);
  }
  return total / from.length;
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export type { NumericParameterRef };
