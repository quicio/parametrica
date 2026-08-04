/**
 * operators/geometry/stroke.js — stroke expansion & ribbons.
 *
 * Converts polylines into closed outline polygons: offset on both sides
 * of the centerline, joined at the ends. These change the *meaning* of
 * the geometry (stroke → shape), so ribbon variants live in topology.
 */

import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { offsetPoints } from './offset.js';

let id = 0;
const opId = () => `st-${id++}`;

/** Outline polygon for a polyline expanded by (left, right). */
export function expandStroke(points, left, right, closed) {
  if (points.length < 2) return [];
  const a = offsetPoints(points, left, closed);
  const b = offsetPoints(points, -right, closed);
  if (closed) {
    // inner ring reversed → donut-style outline ring pair joined as one ring
    return [...a, ...b.reverse()];
  }
  return [...a, ...b.reverse()];
}

Operators.register({
  id: 'stroke-expand',
  name: 'Stroke Expansion',
  category: 'geometry',
  params: {
    width: { label: 'Width', type: TYPE.NUMBER, min: 0.5, max: 80, step: 0.5, default: 6 },
  },
  apply(curves, p) {
    return curves.map((c) => ({
      id: opId(),
      points: expandStroke(c.points, p.width / 2, p.width / 2, c.closed),
      closed: true,
      meta: { source: 'stroke-expand' },
    })).filter((c) => c.points.length > 2);
  },
});

Operators.register({
  id: 'ribbon',
  name: 'Ribbon',
  category: 'topology',
  params: {
    width: { label: 'Width', type: TYPE.NUMBER, min: 0.5, max: 120, step: 0.5, default: 14 },
  },
  apply(curves, p) {
    return curves.map((c) => ({
      id: opId(),
      points: expandStroke(c.points, p.width / 2, p.width / 2, c.closed),
      closed: true,
      meta: { source: 'ribbon' },
    })).filter((c) => c.points.length > 2);
  },
});

Operators.register({
  id: 'offset-ribbon',
  name: 'Offset Ribbon',
  category: 'topology',
  params: {
    left: { label: 'Left', type: TYPE.NUMBER, min: 0, max: 120, step: 0.5, default: 14 },
    right: { label: 'Right', type: TYPE.NUMBER, min: 0, max: 120, step: 0.5, default: 4 },
  },
  apply(curves, p) {
    return curves.map((c) => ({
      id: opId(),
      points: expandStroke(c.points, p.left, p.right, c.closed),
      closed: true,
      meta: { source: 'offset-ribbon' },
    })).filter((c) => c.points.length > 2);
  },
});

Operators.register({
  id: 'centerline',
  name: 'Centerline',
  category: 'topology',
  params: {},
  apply(curves) {
    // The centerline of a ribbon/outline: midpoints between left and
    // right offset halves (expandStroke concatenates left + reversed right).
    return curves.map((c) => {
      const n = c.points.length;
      const half = Math.floor(n / 2);
      const points = [];
      for (let i = 0; i < half; i++) {
        const a = c.points[i];
        const b = c.points[n - 1 - i];
        points.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
      return { ...c, id: opId(), points, closed: false };
    }).filter((c) => c.points.length > 1);
  },
});
