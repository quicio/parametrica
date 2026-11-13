/**
 * operators/topology/voronoi.ts — Voronoi · skeleton · medial axis.
 *
 * Voronoi: cells of the curve samples (d3-delaunay).
 * Skeleton / medial axis: approximation from the Delaunay triangulation
 * of dense boundary samples — interior circumcenters of adjacent
 * triangles are connected, then short leaf branches are pruned.
 * Honest approximations, computed on samples, fully deterministic.
 */

import { Delaunay } from 'd3-delaunay';
import { Operators } from '../../core/registry.ts';
import { TYPE } from '../../core/schema.ts';
import { resampleUniform, bboxAll } from '../../sampling/sampling.js';

type Rec = Record<string, unknown>;
interface Vec2 { x: number; y: number }
interface CurveLike extends Rec { points: Vec2[]; closed?: boolean; id?: string }
interface Segment { a: Vec2; b: Vec2 }

let id = 0;
const opId = (): string => `vx-${id++}`;

Operators.register(({
  id: 'voronoi',
  name: 'Voronoi',
  category: 'topology',
  params: {
    samplePoints: { label: 'Sample Points', type: TYPE.NUMBER, min: 16, max: 600, step: 1, default: 120 },
    padding: { label: 'Bounds Padding', type: TYPE.NUMBER, min: 0, max: 400, step: 1, default: 60 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const pts = gatherSamples(curves, Number(p.samplePoints));
    if (pts.length < 3) throw new Error('voronoi needs ≥ 3 sample points');
    const box = bboxAll(curves) as { minX: number; minY: number; maxX: number; maxY: number };
    const padding = Number(p.padding);
    const delaunay = Delaunay.from(pts.map((q) => [q.x, q.y] as [number, number]));
    const vor = delaunay.voronoi([
      box.minX - padding, box.minY - padding,
      box.maxX + padding, box.maxY + padding,
    ]);
    const out: unknown[] = [];
    for (const cell of vor.cellPolygons()) {
      if (!cell || cell.length < 4) continue;
      const points: Vec2[] = cell.slice(0, -1).map(([x, y]) => ({ x: x!, y: y! }));
      out.push({ id: opId(), points, closed: true, meta: { source: 'voronoi' } });
    }
    return out;
  },
}) as never);

Operators.register(({
  id: 'skeleton',
  name: 'Skeleton',
  category: 'topology',
  params: {
    samples: { advanced: true, label: 'Boundary Samples', type: TYPE.NUMBER, min: 40, max: 500, step: 10, default: 160 },
    prune: { label: 'Prune Length', type: TYPE.NUMBER, min: 0, max: 120, step: 1, default: 18 },
    prunePasses: { label: 'Prune Passes', type: TYPE.NUMBER, min: 0, max: 6, step: 1, default: 2 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    return skeletonOf(curves, p);
  },
}) as never);

Operators.register(({
  id: 'medial-axis',
  name: 'Medial Axis',
  category: 'topology',
  params: {
    samples: { advanced: true, label: 'Boundary Samples', type: TYPE.NUMBER, min: 40, max: 500, step: 10, default: 200 },
    prune: { label: 'Prune Length', type: TYPE.NUMBER, min: 0, max: 120, step: 1, default: 6 },
    prunePasses: { label: 'Prune Passes', type: TYPE.NUMBER, min: 0, max: 6, step: 1, default: 1 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    return skeletonOf(curves, p);
  },
}) as never);

/* ———————— medial axis approximation ———————— */

function skeletonOf(curves: CurveLike[], p: Rec): unknown[] {
  const closedCurves = curves.filter((c) => c.closed && c.points.length > 8);
  if (!closedCurves.length) throw new Error('skeleton requires a closed curve');

  const samples = Number(p.samples);
  const pruneLength = Number(p.prune);
  const prunePasses = Number(p.prunePasses);
  const out: unknown[] = [];
  for (const c of closedCurves) {
    const boundary = resampleUniform(c.points as never, samples, true) as Vec2[];
    const delaunay = Delaunay.from(boundary.map((q) => [q.x, q.y] as [number, number]));
    const { triangles, halfedges, points: coords } = delaunay;

    // circumcenters per triangle
    const triCount = triangles.length / 3;
    const centers: Array<Vec2 | null> = new Array(triCount);
    const inside: boolean[] = new Array(triCount).fill(false);
    for (let t = 0; t < triCount; t++) {
      const a = pointAt(coords, triangles[3 * t]!);
      const b = pointAt(coords, triangles[3 * t + 1]!);
      const d = pointAt(coords, triangles[3 * t + 2]!);
      centers[t] = circumcenter(a, b, d);
      inside[t] = Boolean(centers[t] && pointInPolygon(centers[t]!, boundary));
    }

    // connect centers of adjacent interior triangles
    let segments: Segment[] = [];
    for (let e = 0; e < halfedges.length; e++) {
      const opposite = halfedges[e]!;
      if (opposite < 0 || opposite < e) continue;
      const t1 = Math.floor(e / 3);
      const t2 = Math.floor(opposite / 3);
      if (inside[t1] && inside[t2]) {
        segments.push({ a: centers[t1]!, b: centers[t2]! });
      }
    }

    // prune short leaf branches
    for (let pass = 0; pass < prunePasses; pass++) {
      segments = pruneLeaves(segments, pruneLength);
    }

    for (const s of segments) {
      out.push({ id: opId(), points: [s.a, s.b], closed: false, meta: { source: 'skeleton' } });
    }
  }
  return out;
}

function pruneLeaves(segments: Segment[], minLen: number): Segment[] {
  if (minLen <= 0 || !segments.length) return segments;
  const key = (p: Vec2): string => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  const degree = new Map<string, number>();
  for (const s of segments) {
    degree.set(key(s.a), (degree.get(key(s.a)) ?? 0) + 1);
    degree.set(key(s.b), (degree.get(key(s.b)) ?? 0) + 1);
  }
  return segments.filter((s) => {
    const len = Math.hypot(s.a.x - s.b.x, s.a.y - s.b.y);
    const isLeaf = degree.get(key(s.a)) === 1 || degree.get(key(s.b)) === 1;
    return !(isLeaf && len < minLen);
  });
}

function pointAt(coords: Float64Array, i: number): Vec2 {
  return { x: coords[2 * i]!, y: coords[2 * i + 1]! };
}

function circumcenter(a: Vec2, b: Vec2, c: Vec2): Vec2 | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  return {
    x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d,
    y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d,
  };
}

/** Ray-casting point-in-polygon. */
export function pointInPolygon(pt: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (
      a.y > pt.y !== b.y > pt.y &&
      pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Evenly gather up to `budget` samples across all curves. */
function gatherSamples(curves: CurveLike[], budget: number): Vec2[] {
  const all: Vec2[] = [];
  for (const c of curves) all.push(...c.points);
  if (all.length <= budget) return all;
  const stride = all.length / budget;
  const out: Vec2[] = [];
  for (let i = 0; i < budget; i++) out.push(all[Math.floor(i * stride)]!);
  return out;
}
