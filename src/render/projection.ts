/** Render-time orthographic views. */

import { boundsOfProjectedPoints, createViewTransform } from '../view/transform.ts';

export interface ProjectedPoint {
  x: number;
  y: number;
  x3?: number;
  y3?: number;
  h3?: number;
  depthAlpha?: number;
  [key: string]: unknown;
}
export interface ProjectedCurve {
  points: ProjectedPoint[];
  [key: string]: unknown;
}
export type Projection = '3d' | 'xy' | 'xz' | 'yz';
export interface ProjectionOptions {
  fit?: number;
}

/** Does this geometry actually carry true 3D coordinates? */
export function supportsOrthographic(curves: ReadonlyArray<ProjectedCurve> | null | undefined): boolean {
  if (!Array.isArray(curves)) return false;
  for (const curve of curves) {
    const point = curve?.points?.[0];
    if (point && Number.isFinite(point.x3) && Number.isFinite(point.y3) && Number.isFinite(point.h3)) {
      return true;
    }
  }
  return false;
}

/**
 * Orthographic views only make sense for curves with true 3D metadata.
 * A 2D curve has z=0, so XZ/YZ would collapse it to a flat line; fall back
 * to the camera view instead of showing an apparently empty canvas.
 */
export function projectionFor(curves: ReadonlyArray<ProjectedCurve>, projection: Projection = '3d'): Projection {
  return projection === '3d' || supportsOrthographic(curves) ? projection : '3d';
}

export function projectCurves<T extends ProjectedCurve>(
  curves: T[],
  projection: Projection = '3d',
  { fit = 0 }: ProjectionOptions = {},
): T[] {
  if (!Array.isArray(curves) || projection === '3d' || !supportsOrthographic(curves)) return curves;
  const projected = curves.map((curve) => ({
    ...curve,
    points: curve.points.map((point) => projectPoint(point, projection)),
  }));
  const transform = createViewTransform({
    projection,
    frame: { mode: 'composition', anchor: 'bbox', fit },
    bounds: boundsOfProjectedPoints(projected.flatMap((curve) => curve.points)),
  } as never) as { applyFrame(point: ProjectedPoint): ProjectedPoint };
  return projected.map((curve) => ({
    ...curve,
    points: curve.points.map((point) => transform.applyFrame(point)),
  }));
}

export function projectPoint(point: ProjectedPoint, projection: Projection): ProjectedPoint {
  const x3 = Number.isFinite(point.x3) ? point.x3 as number : point.x;
  const y3 = Number.isFinite(point.y3) ? point.y3 as number : point.y;
  const z = Number.isFinite(point.h3) ? point.h3 as number : 0;
  let x = x3;
  let y = -y3;
  if (projection === 'xz') {
    x = x3;
    y = -z;
  } else if (projection === 'yz') {
    x = -y3;
    y = -z;
  }
  return {
    ...point,
    x,
    y,
    // An orthographic view has no camera depth; keep the geometry legible
    // instead of reusing the 3D fade.
    depthAlpha: 1,
  };
}

/** Height/radial value used by the gradient pass for the active view. */
export function gradientAxisValue(point: ProjectedPoint, projection: Projection): number {
  if (projection === 'xy') {
    const x3 = Number.isFinite(point.x3) ? point.x3 as number : point.x;
    const y3 = Number.isFinite(point.y3) ? point.y3 as number : point.y;
    return Math.hypot(x3, y3);
  }
  if (Number.isFinite(point.h3)) return point.h3 as number;
  return point.y;
}
