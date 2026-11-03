/**
 * sampling/parametric.js — generator-facing sampling and post-processing.
 */

import {
  sampleUniform,
  sampleAdaptive,
  centerCurves,
  splitCurveAtDiscontinuities,
} from './sampling.js';

/** Sample x(t), y(t) over a domain with optional adaptive refinement. */
export function sampleParametric(fnX, fnY, { t0, t1, samples, adaptive, scope }) {
  let a = t0;
  let b = t1;
  if (a > b) [a, b] = [b, a];
  const fn = (t) => {
    scope.t = t;
    scope.theta = t;
    return { x: fnX(scope), y: fnY(scope) };
  };
  return adaptive
    ? sampleAdaptive(fn, a, b, { minSteps: Math.min(512, samples), samples, maxDepth: 8 })
    : sampleUniform(fn, a, b, samples);
}

/**
 * Apply discontinuity splitting and optional centering.
 *
 * Fit is presentation, not generator mathematics: the engine owns the final
 * frame. Keeping centering here preserves the legacy planar output for
 * `fit = 0` while the engine applies the fit scale once for fitted shapes.
 */
export function postProcess(curves, { center = true } = {}) {
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
  if (center) out = centerCurves(out);
  return out;
}

/** True when the sampled polyline ends where it started. */
export function isClosedPolyline(points, eps = 1e-6) {
  if (!Array.isArray(points) || points.length < 2) return false;
  const a = points[0];
  const b = points[points.length - 1];
  return Math.hypot(a.x - b.x, a.y - b.y) <= eps;
}
