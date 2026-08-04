/**
 * engine.js — the mathematical pipeline (spec §4).
 *
 *   generator → operator stack → analysis → stats
 *
 * Pure and DOM-free: fully testable in Node. Includes a per-stage
 * memoization cache: editing stage k only re-evaluates stages ≥ k
 * (when animation is off; during animation everything re-evaluates
 * because `time` flows into every stage).
 */

import { Generators, Operators } from './registry.js';
import { resolveParams } from '../animation/animatable.js';
import { createStdlib } from '../math/stdlib.js';
import { analyzeAll } from '../analysis/differential.js';
import { bboxAll } from '../sampling/sampling.js';

const MAX_POINTS_PER_CURVE = 50_000;
const MAX_TOTAL_POINTS = 200_000;

let curveId = 0;
const nextId = () => `c${curveId++}`;

/**
 * @param {object} document  GlyphDocument (sanitized)
 * @param {{time?: number, quality?: object}} options
 * @returns {{curves, analysis, errors, stats, bbox}}
 */
export function evaluateDocument(document, options = {}) {
  const t0 = now();
  const time = options.time ?? document.animation?.time ?? 0;
  const errors = [];
  const scope = createStdlib(document.seed ?? 1);
  const ctx = { time, seed: document.seed ?? 1, scope, quality: options.quality ?? {}, document };

  // Cache key for each stage. Includes view.camera so 3D-projected
  // generators invalidate when the user drags the canvas to rotate.
  const camSig = JSON.stringify(document.view?.camera ?? {});
  const cacheKey = (stage) => JSON.stringify([stage.id, stage.params, stage.mods, stage.enabled, camSig]);

  let curves = [];
  const stages = [document.generator, ...(document.operators ?? [])];
  const prev = evaluateDocument._cache;
  const signatures = [];
  let reusedUntil = -1;

  if (prev && prev.documentRef === document && prev.time === time) {
    // reuse the longest valid prefix of stages
    for (let i = 0; i < stages.length && i < prev.signatures.length; i++) {
      if (prev.signatures[i] !== cacheKey(stages[i])) break;
      reusedUntil = i;
    }
  }

  if (reusedUntil >= 0) {
    curves = prev.stageOutputs[reusedUntil];
    signatures.push(...prev.signatures.slice(0, reusedUntil + 1));
  }

  const stageOutputs = signatures.length ? [...prev.stageOutputs.slice(0, reusedUntil + 1)] : [];
  const stageTimes = new Array(stages.length).fill(0);

  for (let i = reusedUntil + 1; i < stages.length; i++) {
    const stage = stages[i];
    signatures.push(cacheKey(stage));
    if (i > 0 && stage.enabled === false) {
      stageOutputs.push(curves);
      continue;
    }
    const before = now();
    if (i === 0) {
      const def = Generators.get(stage.id);
      const params = resolveParams(def.params, stage.params, stage.mods, ctx, tagErrors(errors, 'generator', 0));
      curves = runGuarded(() => def.sample(params, ctx), errors, 'generator', 0) ?? [];
    } else {
      const def = Operators.get(stage.id);
      const params = resolveParams(def.params, stage.params, stage.mods, ctx, tagErrors(errors, 'operator', i - 1));
      curves = runGuarded(() => def.apply(curves, params, ctx), errors, 'operator', i - 1) ?? curves;
    }
    stageTimes[i] = now() - before;
    curves = sanitizeCurves(curves);
    stageOutputs.push(curves);
  }

  curves = enforceBudget(curves);

  evaluateDocument._cache = {
    documentRef: document,
    time,
    signatures,
    stageOutputs,
  };

  const analysis = analyzeAll(curves);
  const stats = {
    evalMs: now() - t0,
    stageTimes,
    curveCount: curves.length,
    pointCount: analysis.totalPoints,
    arcLength: Math.round(analysis.totalArcLength),
  };

  return { curves, analysis, errors, stats, bbox: bboxAll(curves) };
}

function runGuarded(fn, errors, stage, index) {
  try {
    return fn();
  } catch (e) {
    errors.push({ stage, index, message: e.message });
    return null;
  }
}

function tagErrors(errors, stage, index) {
  const proxy = [];
  proxy.push = (...items) => {
    for (const item of items) errors.push({ stage, index, ...item });
    return proxy.length;
  };
  return proxy;
}

/** Drop degenerate/non-finite curves, normalize shape. */
function sanitizeCurves(curves) {
  if (!Array.isArray(curves)) return [];
  const out = [];
  for (const c of curves) {
    if (!c || !Array.isArray(c.points) || c.points.length < 2) continue;
    let finite = true;
    for (const p of c.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) { finite = false; break; }
    }
    if (!finite) continue;
    out.push({
      id: c.id ?? nextId(),
      points: c.points,
      closed: Boolean(c.closed),
      meta: c.meta ?? {},
    });
  }
  return out;
}

/** Hard budgets (spec §4.3): decimate rather than freeze. */
function enforceBudget(curves) {
  let total = 0;
  const out = [];
  for (const c of curves) {
    let points = c.points;
    if (points.length > MAX_POINTS_PER_CURVE) {
      points = decimate(points, MAX_POINTS_PER_CURVE);
    }
    if (total + points.length > MAX_TOTAL_POINTS) {
      const remaining = MAX_TOTAL_POINTS - total;
      if (remaining < 2) break;
      points = decimate(points, remaining);
    }
    total += points.length;
    out.push({ ...c, points });
  }
  return out;
}

function decimate(points, target) {
  const stride = points.length / target;
  const out = [];
  for (let i = 0; i < target; i++) out.push(points[Math.floor(i * stride)]);
  return out;
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
