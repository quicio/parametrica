/**
 * geometry/legacy.ts — compatibility bridge with the pre-contract Curve[].
 */

import { createCurve2D, createCurve3D, isCurve3D } from './contracts.ts';
import type { Curve2D, Curve3D, Point2D, Point3D } from './contracts.ts';

type Rec = Record<string, unknown>;
interface LegacyPoint {
  x?: unknown;
  y?: unknown;
  x3?: unknown;
  y3?: unknown;
  h3?: unknown;
  [key: string]: unknown;
}
interface LegacyCurve {
  id?: string;
  points?: LegacyPoint[];
  closed?: boolean;
  meta?: Rec;
}

export function fromLegacyCurves(curves: unknown): Array<Curve2D | Curve3D> {
  if (!Array.isArray(curves)) return [];
  return (curves as LegacyCurve[]).map((curve) => {
    const points = Array.isArray(curve?.points) ? curve.points : [];
    const first = points[0];
    const spatial = first && Number.isFinite(first.x3) && Number.isFinite(first.y3) && Number.isFinite(first.h3);
    if (spatial) {
      return createCurve3D({
        id: curve.id,
        closed: curve.closed,
        meta: curve.meta,
        points: points.map((point) => ({
          x: Number(point.x3),
          y: Number(point.y3),
          z: Number(point.h3),
        })),
      });
    }
    return createCurve2D({
      id: curve.id,
      closed: curve.closed,
      meta: curve.meta,
      points: points.map((point) => ({ x: Number(point.x), y: Number(point.y) })),
    });
  });
}

export function toLegacyCurves(
  geometry: Array<Curve2D | Curve3D>,
  projectPoint: (point: Point3D, index: number) => unknown,
): Array<{ id?: string | undefined; points: unknown[]; closed: boolean; meta: Rec }> {
  return geometry.map((item) => toLegacyCurve(item, projectPoint));
}

export function toLegacyCurve(
  geometry: Curve2D | Curve3D,
  projectPoint: (point: Point3D, index: number) => unknown,
): { id?: string | undefined; points: unknown[]; closed: boolean; meta: Rec } {
  if (!isCurve3D(geometry)) {
    return {
      id: geometry.id,
      points: geometry.points.map((point: Point2D) => ({ ...point })),
      closed: geometry.closed,
      meta: geometry.meta,
    };
  }
  return {
    id: geometry.id,
    points: geometry.points.map((point, index) => projectPoint(point, index)),
    closed: geometry.closed,
    meta: geometry.meta,
  };
}
