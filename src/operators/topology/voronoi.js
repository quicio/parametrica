/**
 * operators/topology/voronoi.js — Voronoi · skeleton · medial axis.
 *
 * Voronoi: cells of the curve samples (d3-delaunay).
 * Skeleton / medial axis: approximation from the Delaunay triangulation
 * of dense boundary samples — interior circumcenters of adjacent
 * triangles are connected, then short leaf branches are pruned.
 * Honest approximations, computed on samples, fully deterministic.
 */

import { Delaunay } from 'd3-delaunay';
import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { resampleUniform, bboxAll } from '../../sampling/sampling.js';

let id = 0;
const opId = () => `vx-${id++}`;

Operators.register({
  id: 'voronoi',
  name: 'Voronoi',
  category: 'topology',
  params: {
    samplePoints: { label: 'Sample Points', type: TYPE.NUMBER, min: 16, max: 600, step: 1, default: 120 },
    padding: { label: 'Bounds Padding', type: TYPE.NUMBER, min: 0, max: 400, step: 1, default: 60 },
  },
  apply(curves, p) {
    const pts = gatherSamples(curves, p.samplePoints);
    if (pts.length < 3) throw new Error('voronoi needs ≥ 3 sample points');
    const box = bboxAll(curves);
    const delaunay = Delaunay.from(pts.map((q) => [q.x, q.y]));
    const vor = delaunay.voronoi([
      box.minX - p.padding, box.minY - p.padding,
      box.maxX + p.padding, box.maxY + p.padding,
    ]);
    const out = [];
    for (const cell of vor.cellPolygons()) {
      if (!cell || cell.length < 4) continue;
      const points = cell.slice(0, -1).map(([x, y]) => ({ x, y }));
      out.push({ id: opId(), points, closed: true, meta: { source: 'voronoi' } });
    }
    return out;
  },
});

Operators.register({
  id: 'skeleton',
  name: 'Skeleton',
  category: 'topology',
  params: {
    samples: { label: 'Boundary Samples', type: TYPE.NUMBER, min: 40, max: 500, step: 10, default: 160 },
    prune: { label: 'Prune Length', type: TYPE.NUMBER, min: 0, max: 120, step: 1, default: 18 },
    prunePasses: { label: 'Prune Passes', type: TYPE.NUMBER, min: 0, max: 6, step: 1, default: 2 },
  },
  apply(curves, p) {
    return skeletonOf(curves, p);
  },
});

Operators.register({
  id: 'medial-axis',
  name: 'Medial Axis',
  category: 'topology',
  params: {
    samples: { label: 'Boundary Samples', type: TYPE.NUMBER, min: 40, max: 500, step: 10, default: 200 },
    prune: { label: 'Prune Length', type: TYPE.NUMBER, min: 0, max: 120, step: 1, default: 6 },
    prunePasses: { label: 'Prune Passes', type: TYPE.NUMBER, min: 0, max: 6, step: 1, default: 1 },
  },
  apply(curves, p) {
    return skeletonOf(curves, p);
  },
});

/* ———————— medial axis approximation ———————— */

function skeletonOf(curves, p) {
  const closedCurves = curves.filter((c) => c.closed && c.points.length > 8);
  if (!closedCurves.length) throw new Error('skeleton requires a closed curve');

  const out = [];
  for (const c of closedCurves) {
    const boundary = resampleUniform(c.points, p.samples, true);
    const delaunay = Delaunay.from(boundary.map((q) => [q.x, q.y]));
    const { triangles, halfedges, points: coords } = delaunay;

    // circumcenters per triangle
    const triCount = triangles.length / 3;
    const centers = new Array(triCount);
    const inside = new Array(triCount).fill(false);
    for (let t = 0; t < triCount; t++) {
      const a = pointAt(coords, triangles[3 * t]);
      const b = pointAt(coords, triangles[3 * t + 1]);
      const d = pointAt(coords, triangles[3 * t + 2]);
      centers[t] = circumcenter(a, b, d);
      inside[t] = centers[t] && pointInPolygon(centers[t], boundary);
    }

    // connect centers of adjacent interior triangles
    let segments = [];
    for (let e = 0; e < halfedges.length; e++) {
      const opposite = halfedges[e];
      if (opposite < 0 || opposite < e) continue;
      const t1 = Math.floor(e / 3);
      const t2 = Math.floor(opposite / 3);
      if (inside[t1] && inside[t2]) {
        segments.push({ a: centers[t1], b: centers[t2] });
      }
    }

    // prune short leaf branches
    for (let pass = 0; pass < p.prunePasses; pass++) {
      segments = pruneLeaves(segments, p.prune);
    }

    for (const s of segments) {
      out.push({ id: opId(), points: [s.a, s.b], closed: false, meta: { source: 'skeleton' } });
    }
  }
  return out;
}

function pruneLeaves(segments, minLen) {
  if (minLen <= 0 || !segments.length) return segments;
  const key = (p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  const degree = new Map();
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

function pointAt(coords, i) {
  return { x: coords[2 * i], y: coords[2 * i + 1] };
}

function circumcenter(a, b, c) {
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
export function pointInPolygon(pt, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
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
function gatherSamples(curves, budget) {
  const all = [];
  for (const c of curves) all.push(...c.points);
  if (all.length <= budget) return all;
  const stride = all.length / budget;
  const out = [];
  for (let i = 0; i < budget; i++) out.push(all[Math.floor(i * stride)]);
  return out;
}
