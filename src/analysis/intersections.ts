/** Crossing detection across and within curves. */

export interface AnalysisPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}
export interface IntersectionPoint {
  x: number;
  y: number;
}
export interface ClusterPoint extends IntersectionPoint {
  count: number;
}
export interface PolylineIntersectionOptions {
  clusterDist?: number;
  closedA?: boolean;
  closedB?: boolean;
}
export interface SelfIntersectionOptions {
  clusterDist?: number;
  closed?: boolean;
}

const ENDPOINT_EPS = 1e-6;

export function segmentIntersection(
  a: AnalysisPoint,
  b: AnalysisPoint,
  c: AnalysisPoint,
  d: AnalysisPoint,
): IntersectionPoint | null {
  for (const p of [a, b]) {
    for (const q of [c, d]) {
      if (Math.hypot(p.x - q.x, p.y - q.y) < ENDPOINT_EPS) return { x: p.x, y: p.y };
    }
  }
  const rX = b.x - a.x; const rY = b.y - a.y;
  const sX = d.x - c.x; const sY = d.y - c.y;
  const denom = rX * sY - rY * sX;
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((c.x - a.x) * sY - (c.y - a.y) * sX) / denom;
  const u = ((c.x - a.x) * rY - (c.y - a.y) * rX) / denom;
  if (t < -ENDPOINT_EPS || t > 1 + ENDPOINT_EPS) return null;
  if (u < -ENDPOINT_EPS || u > 1 + ENDPOINT_EPS) return null;
  return { x: a.x + t * rX, y: a.y + t * rY };
}

function aabbOverlap(a: AnalysisPoint, b: AnalysisPoint, c: AnalysisPoint, d: AnalysisPoint): boolean {
  return (
    Math.min(a.x, b.x) <= Math.max(c.x, d.x) + ENDPOINT_EPS &&
    Math.min(c.x, d.x) <= Math.max(a.x, b.x) + ENDPOINT_EPS &&
    Math.min(a.y, b.y) <= Math.max(c.y, d.y) + ENDPOINT_EPS &&
    Math.min(c.y, d.y) <= Math.max(a.y, b.y) + ENDPOINT_EPS
  );
}

export function clusterPoints(points: ReadonlyArray<IntersectionPoint>, radius = 4): ClusterPoint[] {
  const clusters: ClusterPoint[] = [];
  for (const p of points) {
    let best: ClusterPoint | null = null;
    let bestDist = Infinity;
    for (const cl of clusters) {
      const dist = Math.hypot(cl.x - p.x, cl.y - p.y);
      if (dist < radius && dist < bestDist) { best = cl; bestDist = dist; }
    }
    if (best) {
      best.x = (best.x * best.count + p.x) / (best.count + 1);
      best.y = (best.y * best.count + p.y) / (best.count + 1);
      best.count++;
    } else {
      clusters.push({ x: p.x, y: p.y, count: 1 });
    }
  }
  return clusters;
}

/**
 * All intersections between two polylines (segment pairs, clustered).
 */
export function polylineIntersections(
  polyA: ReadonlyArray<AnalysisPoint>,
  polyB: ReadonlyArray<AnalysisPoint>,
  { clusterDist = 4, closedA = false, closedB = false }: PolylineIntersectionOptions = {},
): ClusterPoint[] {
  const hits: IntersectionPoint[] = [];
  const segsA = segmentPairs(polyA, closedA);
  const segsB = segmentPairs(polyB, closedB);
  for (const [a, b] of segsA) {
    for (const [c, d] of segsB) {
      if (!aabbOverlap(a, b, c, d)) continue;
      const hit = segmentIntersection(a, b, c, d);
      if (hit) hits.push(hit);
    }
  }
  return clusterPoints(hits, clusterDist);
}

/**
 * Self-intersections of one polyline (non-adjacent segments, clustered).
 */
export function selfIntersections(
  poly: ReadonlyArray<AnalysisPoint>,
  { clusterDist = 4, closed = false }: SelfIntersectionOptions = {},
): ClusterPoint[] {
  const hits: IntersectionPoint[] = [];
  const segs = segmentPairs(poly, closed);
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      // skip adjacent segments (they share an endpoint by construction)
      if (j - i === 1) continue;
      if (closed && i === 0 && j === segs.length - 1) continue;
      const first = segs[i];
      const second = segs[j];
      if (!first || !second) continue;
      const [a, b] = first;
      const [c, d] = second;
      if (!aabbOverlap(a, b, c, d)) continue;
      const hit = segmentIntersection(a, b, c, d);
      if (hit) hits.push(hit);
    }
  }
  return clusterPoints(hits, clusterDist);
}

function segmentPairs(poly: ReadonlyArray<AnalysisPoint>, closed: boolean): Array<[AnalysisPoint, AnalysisPoint]> {
  const segs: Array<[AnalysisPoint, AnalysisPoint]> = [];
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    if (a && b) segs.push([a, b]);
  }
  const first = poly[0];
  const last = poly[poly.length - 1];
  if (closed && poly.length > 2 && first && last) segs.push([last, first]);
  return segs;
}
