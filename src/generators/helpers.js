/**
 * helpers.js — shared utilities for generators.
 */

import { compileExpression } from '../math/expression.js';
import { sampleUniform, sampleAdaptive, fitCurves, centerCurves } from '../sampling/sampling.js';

let id = 0;
export const genId = (prefix) => `${prefix}-${id++}`;

/**
 * Compile an expression or throw a labeled error (caught by the engine
 * and surfaced in the UI next to the offending field).
 */
export function compileOrThrow(source, label) {
  const compiled = compileExpression(source);
  if (!compiled.ok) throw new Error(`${label}: ${compiled.error.message}`);
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
  const fn = (t) => {
    scope.t = t;
    scope.theta = t;
    const x = fnX(scope);
    const y = fnY(scope);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`non-finite point at t=${t.toFixed(4)}`);
    }
    return { x, y };
  };
  return adaptive
    ? sampleAdaptive(fn, t0, t1, { minSteps: Math.min(256, samples), samples })
    : sampleUniform(fn, t0, t1, samples);
}

/** Apply fit/center post-processing when the generator asks for it. */
export function postProcess(curves, { fit = 0, center = true }) {
  let out = curves;
  if (fit > 0) out = fitCurves(out, fit);
  else if (center) out = centerCurves(out);
  return out;
}

/** TAU shortcut for schema defaults. */
export const TAU = Math.PI * 2;

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

