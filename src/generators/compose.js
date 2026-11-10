/**
 * generators/compose.js — multi-curve generator helpers.
 */

import { makeScope } from './context.js';
import { postProcess } from '../sampling/parametric.ts';
import { TAU } from '../math/periods.ts';

/**
 * Compose a Curve[] from a per-sample branch function.
 *
 * @param {(i: number, ctx: {scope, t0, t1}) => Point[]} branchFn
 */
export function composeCurves(branchFn, {
  count,
  t0 = 0,
  t1 = TAU,
  closed = false,
  source = 'compose',
  scope,
}) {
  const curves = [];
  for (let i = 0; i < count; i++) {
    scope.t = t0 + ((t1 - t0) * i) / Math.max(1, count - 1);
    scope.theta = scope.t;
    const points = branchFn(i, { scope, t0, t1 });
    if (!Array.isArray(points) || points.length < 2) continue;
    const clean = [];
    for (const p of points) {
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) clean.push(p);
      else if (clean.length) break;
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

/** Sugar for generators that emit multiple curves. */
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
