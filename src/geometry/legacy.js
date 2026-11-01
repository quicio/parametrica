/**
 * geometry/legacy.js — compatibility bridge with the pre-contract Curve[].
 */

import { createCurve2D, createCurve3D, isCurve3D } from './contracts.js';

export function fromLegacyCurves(curves) {
  if (!Array.isArray(curves)) return [];
  return curves.map((curve) => {
    const first = curve?.points?.[0];
    const spatial = first && Number.isFinite(first.x3) && Number.isFinite(first.y3) && Number.isFinite(first.h3);
    if (spatial) {
      return createCurve3D({
        id: curve.id,
        closed: curve.closed,
        meta: curve.meta,
        points: curve.points.map((point) => ({
          x: point.x3,
          y: point.y3,
          z: point.h3,
        })),
      });
    }
    return createCurve2D({
      id: curve.id,
      closed: curve.closed,
      meta: curve.meta,
      points: curve.points.map((point) => ({ x: point.x, y: point.y })),
    });
  });
}

export function toLegacyCurves(geometry, projectPoint) {
  return geometry.map((item) => toLegacyCurve(item, projectPoint));
}

export function toLegacyCurve(geometry, projectPoint) {
  if (!isCurve3D(geometry)) {
    return {
      id: geometry.id,
      points: geometry.points.map((point) => ({ ...point })),
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
