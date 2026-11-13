/**
 * operators/geometry/boolean.ts — boolean union / difference / intersection.
 *
 * Fill-semantics operations over closed curves, powered by the
 * polygon-clipping library (Martinez–Rueda–Feito algorithm).
 * Holes are emitted as separate curves with meta.role = 'hole'.
 */

import polygonClipping from 'polygon-clipping';
import type { MultiPolygon, Pair, Ring } from 'polygon-clipping';
import { Operators } from '../../core/registry.ts';
import { TYPE } from '../../core/schema.ts';

type Rec = Record<string, unknown>;
interface Vec2 { x: number; y: number }
interface CurveLike extends Rec { points: Vec2[]; closed?: boolean; id?: string }

let id = 0;
const opId = (): string => `bl-${id++}`;

const toRing = (points: Vec2[]): Ring => {
  const ring: Pair[] = points.map((p) => [p.x, p.y]);
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first] as Pair);
  return ring;
};

const fromMultiPolygon = (multi: MultiPolygon): unknown[] => {
  const curves: unknown[] = [];
  for (const polygon of multi) {
    for (let r = 0; r < polygon.length; r++) {
      const ring = polygon[r]!;
      const pts: Vec2[] = ring.map(([x, y]) => ({ x, y }));
      // drop duplicated closing point
      if (pts.length > 1) {
        const a = pts[0]!;
        const b = pts[pts.length - 1]!;
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

Operators.register(({
  id: 'boolean',
  name: 'Boolean',
  category: 'geometry',
  params: {
    op: { label: 'Operation', type: TYPE.SELECT, options: ['union', 'difference', 'intersection'], default: 'union' },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const closed = curves.filter((c) => c.closed && c.points.length > 2);
    if (!closed.length) throw new Error('boolean requires closed curves');
    const geoms: MultiPolygon[] = closed.map((c) => [[toRing(c.points)]]);
    try {
      let result: MultiPolygon;
      if (p.op === 'union') {
        result = geoms.reduce((acc, g) => polygonClipping.union(acc, g));
      } else if (p.op === 'intersection') {
        result = geoms.reduce((acc, g) => polygonClipping.intersection(acc, g));
      } else {
        const rest = geoms.slice(1);
        const clip = rest.length ? rest.reduce((acc, g) => polygonClipping.union(acc, g)) : [];
        result = clip.length ? polygonClipping.difference(geoms[0]!, clip) : geoms[0]!;
      }
      return fromMultiPolygon(result);
    } catch (e) {
      throw new Error(`boolean failed: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
    }
  },
}) as never);
