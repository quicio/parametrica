/**
 * geometry/transform.ts — world-space geometry transforms.
 *
 * These helpers transform canonical geometry. They are independent from the
 * camera and from screen-space render items.
 */

import { createCurve3D, isCurve3D } from './contracts.ts';
import type { Curve3D, Point3D } from './contracts.ts';

export type Axis = 'x' | 'y' | 'z';

export function mapCurve3D(curve: Curve3D, fn: (point: Point3D) => Point3D): Curve3D {
  return createCurve3D({
    id: curve.id,
    closed: curve.closed,
    meta: curve.meta,
    points: curve.points.map(fn),
  });
}

export function rotateCurve3D(curve: Curve3D, angle: number, axis: Axis = 'z'): Curve3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return mapCurve3D(curve, (point) => {
    if (axis === 'x') return { x: point.x, y: point.y * cos - point.z * sin, z: point.y * sin + point.z * cos };
    if (axis === 'y') return { x: point.x * cos + point.z * sin, y: point.y, z: -point.x * sin + point.z * cos };
    return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos, z: point.z };
  });
}

export function scaleCurve3D(curve: Curve3D, sx = 1, sy = sx, sz = sx): Curve3D {
  return mapCurve3D(curve, (point) => ({ x: point.x * sx, y: point.y * sy, z: point.z * sz }));
}

export function mirrorCurve3D(curve: Curve3D, axis: Axis = 'x'): Curve3D {
  return mapCurve3D(curve, (point) => ({
    x: axis === 'x' ? -point.x : point.x,
    y: axis === 'y' ? -point.y : point.y,
    z: axis === 'z' ? -point.z : point.z,
  }));
}

/** Transform a generic geometry item if it is a curve; otherwise return it. */
export function transformWorldCurve<T>(curve: T, fn: (point: Point3D) => Point3D): T | Curve3D {
  return isCurve3D(curve) ? mapCurve3D(curve, fn) : curve;
}
