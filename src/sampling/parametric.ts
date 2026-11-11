/** Generator-facing sampling and post-processing. */

import {
  sampleUniform,
  sampleAdaptive,
  centerCurves,
  splitCurveAtDiscontinuities,
} from './sampling.js';

export interface ParametricPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}
export interface ParametricCurve {
  id?: string;
  points: ParametricPoint[];
  closed?: boolean;
  meta?: Record<string, unknown>;
  analysis?: unknown;
  [key: string]: unknown;
}
export interface SampleParametricOptions {
  t0: number;
  t1: number;
  samples: number;
  adaptive?: boolean;
  scope: Record<string, unknown>;
}
export interface PostProcessOptions {
  center?: boolean;
  fit?: number;
  size?: number;
  [key: string]: unknown;
}

/** Sample x(t), y(t) over a domain with optional adaptive refinement. */
export function sampleParametric(
  fnX: (scope: Record<string, unknown>) => number,
  fnY: (scope: Record<string, unknown>) => number,
  { t0, t1, samples, adaptive, scope }: SampleParametricOptions,
): ParametricPoint[] {
  let a = t0;
  let b = t1;
  if (a > b) [a, b] = [b, a];
  const fn = (t: number): ParametricPoint => {
    scope.t = t;
    scope.theta = t;
    return { x: fnX(scope), y: fnY(scope) };
  };
  return (adaptive
    ? sampleAdaptive(fn, a, b, { minSteps: Math.min(512, samples), samples, maxDepth: 8 })
    : sampleUniform(fn, a, b, samples)) as ParametricPoint[];
}

/**
 * Apply discontinuity splitting and optional centering.
 *
 * Fit is presentation, not generator mathematics: the engine owns the final
 * frame. Keeping centering here preserves the legacy planar output for
 * `fit = 0` while the engine applies the fit scale once for fitted shapes.
 */
export function postProcess(curves: ReadonlyArray<ParametricCurve>, { center = true }: PostProcessOptions = {}): ParametricCurve[] {
  let out: ParametricCurve[] = [];
  for (const curve of curves) {
    const split = splitCurveAtDiscontinuities(curve.points, { closed: Boolean(curve.closed) }) as {
      segments: ParametricPoint[][];
      closed: boolean;
      broken: boolean;
    };
    if (!split.segments.length) continue;
    if (split.segments.length === 1) {
      out.push({
        ...curve,
        points: split.segments[0] ?? [],
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
  if (center) out = centerCurves(out) as ParametricCurve[];
  return out;
}

/** True when the sampled polyline ends where it started. */
export function isClosedPolyline(points: ReadonlyArray<ParametricPoint> | null | undefined, eps = 1e-6): boolean {
  if (!Array.isArray(points) || points.length < 2) return false;
  const a = points[0];
  const b = points[points.length - 1];
  if (!a || !b) return false;
  return Math.hypot(a.x - b.x, a.y - b.y) <= eps;
}
