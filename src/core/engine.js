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

export const POINT_LIMITS = Object.freeze({
  perCurve: MAX_POINTS_PER_CURVE,
  total: MAX_TOTAL_POINTS,
});

let curveId = 0;
const nextId = () => `c${curveId++}`;

/**
 * @param {object} document  GlyphDocument (sanitized)
 * @param {{time?: number, quality?: object}} options
 * @returns {{curves, analysis, errors, stats, bbox}}
 */
export function evaluateDocument(document, options = {}) {
  if (Array.isArray(document.layers) && document.layers.length) {
    return evaluateLayers(document, options);
  }
  const t0 = now();
  const time = options.time ?? document.animation?.time ?? 0;
  const seed = document.seed ?? 1;
  const quality = options.quality ?? {};
  const errors = [];
  const scope = createStdlib(seed);
  const ctx = { time, seed, scope, quality, document, timeline: document.animation?.timeline ?? null, layerIndex: options.layerIndex ?? 0 };

  // Cache key for each stage. Includes view.camera so 3D-projected
  // generators invalidate when the user drags the canvas to rotate, and
  // seed/time/quality because noise and animation flow into every stage.
  const camSig = JSON.stringify(document.view?.camera ?? {});
  const qualitySig = JSON.stringify(quality);
  const timelineSig = JSON.stringify(document.animation?.timeline ?? null);
  const cacheKey = (stage) => JSON.stringify([
    seed, time, qualitySig, timelineSig,
    stage.id, stage.params, stage.mods, stage.enabled, camSig,
  ]);

  let curves = [];
  const stages = [document.generator, ...(document.operators ?? [])];
  const prev = evaluateDocument._cache;
  const signatures = [];
  let reusedUntil = -1;

  if (
    prev &&
    prev.documentRef === document &&
    prev.time === time &&
    prev.seed === seed &&
    prev.qualitySig === qualitySig
  ) {
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
  let peakPoints = totalPoints(curves);

  for (let i = reusedUntil + 1; i < stages.length; i++) {
    const stage = stages[i];
    signatures.push(cacheKey(stage));
    if (i > 0 && stage.enabled === false) {
      const points = totalPoints(curves);
      if (points > peakPoints) peakPoints = points;
      stageOutputs.push(curves);
      continue;
    }
    const before = now();
    if (i === 0) {
      const def = Generators.get(stage.id);
      const params = resolveParams(def.params, stage.params, stage.mods, {
        ...ctx, stagePath: 'generator.params',
      }, tagErrors(errors, 'generator', 0));
      curves = runGuarded(() => def.sample(params, ctx), errors, 'generator', 0) ?? [];
    } else {
      const def = Operators.get(stage.id);
      const params = resolveParams(def.params, stage.params, stage.mods, {
        ...ctx, stagePath: `operators[${i - 1}].params`,
      }, tagErrors(errors, 'operator', i - 1));
      curves = runGuarded(() => def.apply(curves, params, ctx), errors, 'operator', i - 1) ?? curves;
    }
    curves = sanitizeCurves(curves);
    // Budget after EVERY stage: topology operators can multiply points,
    // and we must not feed an unbounded array into the next stage.
    curves = enforceBudget(curves);
    const points = totalPoints(curves);
    if (points > peakPoints) peakPoints = points;
    stageTimes[i] = now() - before;
    stageOutputs.push(curves);
  }

  curves = enforceBudget(curves);
  const pointCount = totalPoints(curves);
  if (pointCount > peakPoints) peakPoints = pointCount;

  evaluateDocument._cache = {
    documentRef: document,
    time,
    seed,
    qualitySig,
    signatures,
    stageOutputs,
  };

  const bbox = bboxAll(curves);
  const stats = {
    evalMs: now() - t0,
    analysisMs: 0,
    stageTimes,
    curveCount: curves.length,
    pointCount,
    peakPoints,
    arcLength: Math.round(arcLengthAll(curves)),
  };

  const result = { curves, errors, stats, bbox };

  // Differential geometry (tangents/normals/curvature/inflections) is
  // only needed by a few render passes/overlays. Compute it on first
  // access instead of on every animation frame or mutation probe.
  let analysis = null;
  Object.defineProperty(result, 'analysis', {
    enumerable: true,
    configurable: true,
    get() {
      if (!analysis) {
        const a0 = now();
        analysis = analyzeAll(curves);
        stats.analysisMs = now() - a0;
      }
      return analysis;
    },
  });

  return result;
}

function evaluateLayers(document, options = {}) {
  const t0 = now();
  const time = options.time ?? document.animation?.time ?? 0;
  const errors = [];
  const layerResults = [];
  const combined = [];
  let peakPoints = 0;
  let arcLength = 0;
  let curveCount = 0;
  let pointCount = 0;

  for (let index = 0; index < document.layers.length; index++) {
    const layer = document.layers[index];
    if (!layer || layer.visible === false) {
      layerResults.push({
        id: layer?.id ?? `layer-${index}`,
        name: layer?.name ?? `Layer ${index + 1}`,
        visible: false,
        locked: Boolean(layer?.locked),
        style: layer?.style ?? document.view?.style,
        generator: layer?.generator,
        operators: layer?.operators,
        curves: [],
        stats: null,
        bbox: null,
        errors: [],
      });
      continue;
    }
    const subdocument = {
      version: 2,
      name: layer.name,
      seed: layer.seed ?? document.seed ?? 1,
      generator: layer.generator,
      operators: layer.operators ?? [],
      view: document.view,
      animation: document.animation,
    };
    const evaluation = evaluateDocument(subdocument, { ...options, time, layerIndex: index });
    const layerErrors = evaluation.errors.map((error) => ({
      ...error,
      layerId: layer.id,
      layerIndex: index,
    }));
    errors.push(...layerErrors);
    const curves = evaluation.curves.map((curve) => ({
      ...curve,
      meta: { ...curve.meta, layerId: layer.id, layerName: layer.name },
    }));
    combined.push(...curves);
    layerResults.push({
      id: layer.id,
      name: layer.name,
      visible: true,
      locked: Boolean(layer.locked),
      style: layer.style,
      generator: layer.generator,
      operators: layer.operators,
      curves,
      stats: evaluation.stats,
      bbox: evaluation.bbox,
      errors: layerErrors,
    });
    peakPoints += evaluation.stats.peakPoints ?? evaluation.stats.pointCount;
    arcLength += evaluation.stats.arcLength;
    curveCount += evaluation.stats.curveCount;
    pointCount += evaluation.stats.pointCount;
  }

  const capped = enforceBudget(combined);
  if (capped.length !== combined.length || pointCount > MAX_TOTAL_POINTS) {
    const grouped = new Map(layerResults.map((layer) => [layer.id, []]));
    for (const curve of capped) {
      const id = curve.meta?.layerId;
      if (grouped.has(id)) grouped.get(id).push(curve);
    }
    for (const layer of layerResults) layer.curves = grouped.get(layer.id) ?? [];
    pointCount = totalPoints(capped);
    curveCount = capped.length;
    arcLength = Math.round(arcLengthAll(capped));
  }

  const bbox = bboxAll(capped);
  const stats = {
    evalMs: now() - t0,
    analysisMs: 0,
    stageTimes: [],
    curveCount,
    pointCount,
    peakPoints: Math.max(peakPoints, pointCount),
    arcLength: Math.round(arcLength),
  };
  const result = {
    curves: capped,
    errors,
    stats,
    bbox,
    layers: layerResults,
  };
  let analysis = null;
  Object.defineProperty(result, 'analysis', {
    enumerable: true,
    configurable: true,
    get() {
      if (!analysis) {
        const a0 = now();
        analysis = analyzeAll(capped);
        stats.analysisMs = now() - a0;
      }
      return analysis;
    },
  });
  return result;
}

function totalPoints(curves) {
  let total = 0;
  for (const c of curves) total += c.points.length;
  return total;
}

function arcLengthAll(curves) {
  let total = 0;
  for (const c of curves) {
    const pts = c.points;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    if (c.closed && pts.length > 2) {
      total += Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
    }
  }
  return total;
}

function runGuarded(fn, errors, stage, index) {
  try {
    return fn();
  } catch (e) {
    const entry = { stage, index, message: e.message };
    if (e.key) entry.key = e.key;
    if (e.span) entry.span = e.span;
    errors.push(entry);
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
