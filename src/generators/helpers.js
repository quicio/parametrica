/**
 * helpers.js — shared utilities for generators.
 */

import { compileExpression } from '../math/expression.js';
import {
  sampleUniform, sampleAdaptive, fitCurves, centerCurves, splitCurveAtDiscontinuities,
} from '../sampling/sampling.js';

let id = 0;
export const genId = (prefix) => `${prefix}-${id++}`;

/**
 * Compile an expression or throw a labeled error (caught by the engine
 * and surfaced in the UI next to the offending field). `key` is the
 * schema parameter key used by the inline error mapper.
 */
export function compileOrThrow(source, label, key = null) {
  const compiled = compileExpression(source);
  if (!compiled.ok) {
    const err = new Error(`${label}: ${compiled.error.message}`);
    if (key) err.key = key;
    if (compiled.error) err.span = compiled.error;
    throw err;
  }
  return compiled.fn;
}

/** Build a per-sample scope: stdlib base + t/theta/time, mutated in place. */
export function makeScope(ctx) {
  const scope = Object.assign(Object.create(null), ctx.scope);
  scope.time = ctx.time ?? 0;
  return scope;
}

/** Sample x(t), y(t) over a domain with optional adaptive refinement. */
export function sampleParametric(fnX, fnY, { t0, t1, samples, adaptive, scope }) {
  // Domain sanity: t0 must be ≤ t1. If the user typed them inverted
  // (T MIN=57 > T MAX=-24) the sampler would walk the domain backwards,
  // producing a dense 13-period tangle that looks identical to the
  // default curve — the exact bug from the screenshot. Normalize by
  // swapping so the domain is always [min, max].
  let a = t0;
  let b = t1;
  if (a > b) [a, b] = [b, a];
  const fn = (t) => {
    scope.t = t;
    scope.theta = t;
    const x = fnX(scope);
    const y = fnY(scope);
    // Non-finite samples become breaks, not fatal errors: the splitter
    // removes the offending point and keeps the finite runs on each side.
    return { x, y };
  };
  return adaptive
    ? sampleAdaptive(fn, a, b, { minSteps: Math.min(512, samples), samples, maxDepth: 8 })
    : sampleUniform(fn, a, b, samples);
}

/** Apply discontinuity splitting + fit/center post-processing. */
export function postProcess(curves, { fit = 0, center = true }) {
  let out = [];
  for (const curve of curves) {
    const split = splitCurveAtDiscontinuities(curve.points, { closed: Boolean(curve.closed) });
    if (!split.segments.length) continue;
    if (split.segments.length === 1) {
      out.push({
        ...curve,
        points: split.segments[0],
        closed: split.closed,
        meta: split.broken ? { ...(curve.meta ?? {}), discontinuity: true } : (curve.meta ?? {}),
      });
    } else {
      split.segments.forEach((points, index) => {
        out.push({
          ...curve,
          id: `${curve.id ?? 'curve'}-s${index}`,
          points,
          closed: false,
          meta: { ...(curve.meta ?? {}), discontinuity: true, segment: index },
        });
      });
    }
  }
  if (fit > 0) out = fitCurves(out, fit);
  else if (center) out = centerCurves(out);
  return out;
}

/**
 * True when the sampled polyline ends where it started. Used by
 * generators whose closure depends on parameter choices (fractional
 * frequencies, non-integer superformula symmetry) instead of hardcoding
 * `closed: true` and drawing a false closing segment.
 */
export function isClosedPolyline(points, eps = 1e-6) {
  if (!Array.isArray(points) || points.length < 2) return false;
  const a = points[0];
  const b = points[points.length - 1];
  return Math.hypot(a.x - b.x, a.y - b.y) <= eps;
}

/** TAU shortcut for schema defaults. */
export const TAU = Math.PI * 2;

export function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Smallest denominator q such that `value ≈ p/q` within tolerance.
 * Returns 0 when the value is not rational at this resolution. Used to
 * derive the exact period of Lissajous and trochoid families without
 * hard-coding a per-preset turn count.
 */
export function rationalDenominator(value, { maxDenominator = 64, tolerance = 1e-7 } = {}) {
  const x = Math.abs(Number(value));
  if (!Number.isFinite(x)) return 0;
  if (x < tolerance) return 0;
  for (let d = 1; d <= maxDenominator; d++) {
    const p = Math.round(x * d);
    if (p === 0) continue;
    if (Math.abs(x - p / d) <= tolerance * Math.max(1, x)) return d;
  }
  return 0;
}

/**
 * Number of 2π turns after which a trochoid closes.
 * The rolling angle is (R∓r)/r, so the period is the denominator of
 * that ratio in lowest terms (the ring term repeats every turn).
 */
export function trochoidTurns(R, r, mode = 'hypo', { maxTurns = 128 } = {}) {
  const wheel = Math.abs(Number(r));
  if (!Number.isFinite(wheel) || wheel < 1e-9) return 1;
  const ring = Math.abs(Number(R));
  const ratio = (mode === 'epi' ? ring + wheel : ring - wheel) / wheel;
  const denominator = rationalDenominator(ratio, { maxDenominator: maxTurns });
  return Math.min(maxTurns, denominator || 1);
}

/** Common 2π turn count for sin(a·t + δ), sin(b·t). */
export function lissajousTurns(a, b, { maxTurns = 64 } = {}) {
  const da = rationalDenominator(a, { maxDenominator: maxTurns });
  const db = rationalDenominator(b, { maxDenominator: maxTurns });
  if (!da || !db) return 1;
  return Math.min(maxTurns, lcm(da, db));
}

/** 2π turn count for a rose r = cos((n/d)·θ + phase). */
export function roseTurns(n, d = 1, { maxTurns = 64 } = {}) {
  const numer = Math.round(Math.abs(Number(n)) || 1);
  const denom = Math.round(Math.abs(Number(d)) || 1);
  return Math.min(maxTurns, denom / gcd(numer, denom));
}

/**
 * Compose a Curve[] from a per-sample function that gets called `count`
 * times across a parameter domain. Returns the array of generated
 * curves (one per "branch"). Useful for strange attractors, IFS, and
 * any generator that naturally produces multiple separate curves.
 *
 * @param {(i: number, ctx: {scope, t0, t1}) => Point[]} branchFn
 * @param {object} opts  { count, t0, t1, closed, source, scope }
 * @returns {Array<{id, points, closed, meta}>}
 */
export function composeCurves(branchFn, { count, t0 = 0, t1 = TAU, closed = false, source = 'compose', scope }) {
  const curves = [];
  for (let i = 0; i < count; i++) {
    scope.t = t0 + ((t1 - t0) * i) / Math.max(1, count - 1);
    scope.theta = scope.t;
    const points = branchFn(i, { scope, t0, t1 });
    if (!Array.isArray(points) || points.length < 2) continue;
    // Sanitize: drop any non-finite points so a bad sample doesn't
    // poison the whole curve.
    const clean = [];
    for (const p of points) {
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) clean.push(p);
      else if (clean.length) break; // halt at first NaN; keep leading run
    }
    if (clean.length >= 2) {
      curves.push({
        id: `${source}-${i}`,
        points: clean,
        closed,
        meta: { source, branch: i },
      });
    }
  }
  return curves;
}

/**
 * Sugar for building a generator that emits multiple curves. Centralizes
 * the registry boilerplate (id/name/category) so each attractor-style
 * generator is just its params schema + sample body.
 */
export function registerMultiCurveGenerator({ id, name, category = 'attractor', params, sample }) {
  return {
    id,
    name,
    category,
    params,
    domain: () => ({ t0: 0, t1: TAU, closed: false }),
    sample(p, ctx) {
      const scope = makeScope(ctx);
      const curves = sample(p, ctx, scope);
      return postProcess(curves, p);
    },
  };
}



/**
 * Shared pinhole camera used by the 3D generators. The camera lives on
 * `document.view.camera`, so canvas drag and presets persist together.
 */
export function cameraFrom(view) {
  return view?.camera ?? {
    yaw: -Math.PI / 6,
    pitch: Math.PI / 9,
    fov: 320,
  };
}

/** Project one world point to screen space and normalized depth. */
export function project3D(x, y, z, cam, { depthFade = true, fadeStrength = 0.55 } = {}) {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const fov = cam.fov;
  const xp = x * cy + y * sy;
  const yp = -x * sy * cp + y * cy * cp + z * sp;
  const zp = x * sy * sp - y * cy * sp + z * cp;
  const denom = zp + fov;
  if (Math.abs(denom) < 1e-9) return null;
  const depth = Math.max(0, Math.min(1, (zp + fov) / (2 * fov)));
  return {
    x: (xp * fov) / denom,
    y: (yp * fov) / denom,
    depth,
    depthAlpha: depthFade ? 0.4 + fadeStrength * depth : 1,
  };
}
