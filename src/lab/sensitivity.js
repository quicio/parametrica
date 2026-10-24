/**
 * sensitivity.js — which parameters actually change the figure?
 *
 * Central finite differences in parameter space:
 *   impact(p) = shapeDistance(D(p + delta), D(p - delta))
 *
 * Pure except for calling the deterministic evaluation engine. Candidate
 * documents are throwaway clones and are never adopted.
 */

import { clampNumber } from '../core/schema.js';
import { evaluateDocument } from '../core/engine.js';
import { bboxAll, resampleUniform } from '../sampling/sampling.js';
import { computeDescriptor } from './descriptor.js';
import { attachLayerAliases } from '../core/document.js';
import { numericParameterRefs, pathForRef, schemaForRef, stageForRef } from './parameters.js';

const EPS = 1e-9;

/**
 * @param {object} document
 * @param {Array} curves  already evaluated base curves
 * @param {{time?: number, maxParams?: number, refs?: Array}} options
 * @returns {{base: object, entries: Array, elapsedMs: number}}
 */
export function computeSensitivity(document, curves, { time = 0, maxParams = 12, refs = null } = {}) {
  const t0 = now();
  const base = computeDescriptor(document, curves, { hash: false });
  const baseBox = bboxAll(curves ?? []);
  const available = refs ?? numericParameterRefs(document);
  const selected = available.slice(0, Math.max(0, maxParams));
  const entries = [];

  for (const ref of selected) {
    const schema = ref.schema ?? schemaForRef(document, ref);
    if (!schema) continue;
    const stage = stageForRef(document, ref);
    if (!stage) continue;
    const currentRaw = stage.params[ref.key];
    if (typeof currentRaw !== 'number') continue;
    const current = clampNumber(schema, currentRaw);
    const min = schema.min;
    const max = schema.max;
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) continue;

    const delta = Math.max(Number(schema.step) || 0, (max - min) * 0.02);
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

function evaluateCandidate(document, ref, value, schema, time) {
  try {
    const candidate = attachLayerAliases(structuredClone(document));
    const stage = stageForRef(candidate, ref);
    if (!stage) return null;
    stage.params[ref.key] = clampNumber(schema, value);
    const evaluation = evaluateDocument(candidate, { time });
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
export function shapeDistance(curvesA, curvesB, diagonal = 1) {
  const a = sampleCloud(curvesA);
  const b = sampleCloud(curvesB);
  if (!a.length || !b.length) return 1;
  const dAB = meanNearest(a, b);
  const dBA = meanNearest(b, a);
  const scale = Math.max(EPS, diagonal);
  return Math.max(0, Math.min(1, ((dAB + dBA) / 2) / scale));
}

function sampleCloud(curves, maxPoints = 512) {
  if (!curves?.length) return [];
  const perCurve = Math.max(2, Math.floor(maxPoints / curves.length));
  const out = [];
  for (const c of curves) {
    if (!c.points?.length) continue;
    const pts = resampleUniform(c.points, perCurve, Boolean(c.closed));
    for (const p of pts) out.push(p);
  }
  return out.slice(0, maxPoints);
}

function meanNearest(from, to) {
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

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
