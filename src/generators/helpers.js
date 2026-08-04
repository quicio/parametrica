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
    ? sampleAdaptive(fn, t0, t1, { minSteps: Math.min(256, samples) })
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
