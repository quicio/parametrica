/**
 * operators/geometry/boolean.js — boolean union / difference / intersection.
 *
 * Fill-semantics operations over closed curves, powered by the
 * polygon-clipping library (Martinez–Rueda–Feito algorithm).
 * Holes are emitted as separate curves with meta.role = 'hole'.
 */

import polygonClipping from 'polygon-clipping';
import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';

let id = 0;
const opId = () => `bl-${id++}`;

const toRing = (points) => {
  const ring = points.map((p) => [p.x, p.y]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
  return ring;
};

const fromMultiPolygon = (multi) => {
  const curves = [];
  for (const polygon of multi) {
    for (let r = 0; r < polygon.length; r++) {
      const ring = polygon[r];
      const pts = ring.map(([x, y]) => ({ x, y }));
      // drop duplicated closing point
      if (pts.length > 1) {
        const a = pts[0];
        const b = pts[pts.length - 1];
        if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-9) pts.pop();
      }
      if (pts.length > 2) {
        curves.push({
          id: opId(), points: pts, closed: true,
          meta: { source: 'boolean', role: r === 0 ? 'outer' : 'hole' },
        });
      }
    }
  }
  return curves;
};

Operators.register({
  id: 'boolean',
  name: 'Boolean',
  category: 'geometry',
  params: {
    op: { label: 'Operation', type: TYPE.SELECT, options: ['union', 'difference', 'intersection'], default: 'union' },
  },
  apply(curves, p) {
    const closed = curves.filter((c) => c.closed && c.points.length > 2);
    if (!closed.length) throw new Error('boolean requires closed curves');
    const geoms = closed.map((c) => [[toRing(c.points)]]);
    try {
      let result;
      if (p.op === 'union') {
        result = geoms.reduce((acc, g) => polygonClipping.union(acc, g));
      } else if (p.op === 'intersection') {
        result = geoms.reduce((acc, g) => polygonClipping.intersection(acc, g));
      } else {
        const rest = geoms.slice(1);
        const clip = rest.length ? rest.reduce((acc, g) => polygonClipping.union(acc, g)) : [];
        result = clip.length ? polygonClipping.difference(geoms[0], clip) : geoms[0];
      }
      return fromMultiPolygon(result);
    } catch (e) {
      throw new Error(`boolean failed: ${e.message}`, { cause: e });
    }
  },
});
