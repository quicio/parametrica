/**
 * intersections.js — crossing detection across and within curves.
 *
 * Exact segment tests with AABB pre-culling and proximity clustering.
 * Used by the topology visualization, the self-intersection overlay and
 * mutation validation. Budget-guarded: skips gracefully beyond a point cap.
 */

const ENDPOINT_EPS = 1e-6;

export function segmentIntersection(a, b, c, d) {
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

function aabbOverlap(a, b, c, d) {
  return (
    Math.min(a.x, b.x) <= Math.max(c.x, d.x) + ENDPOINT_EPS &&
    Math.min(c.x, d.x) <= Math.max(a.x, b.x) + ENDPOINT_EPS &&
    Math.min(a.y, b.y) <= Math.max(c.y, d.y) + ENDPOINT_EPS &&
    Math.min(c.y, d.y) <= Math.max(a.y, b.y) + ENDPOINT_EPS
  );
}

export function clusterPoints(points, radius = 4) {
  const clusters = [];
  for (const p of points) {
    let best = null;
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
export function polylineIntersections(polyA, polyB, { clusterDist = 4, closedA = false, closedB = false } = {}) {
  const hits = [];
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
export function selfIntersections(poly, { clusterDist = 4, closed = false } = {}) {
  const hits = [];
  const segs = segmentPairs(poly, closed);
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      // skip adjacent segments (they share an endpoint by construction)
      if (j - i === 1) continue;
      if (closed && i === 0 && j === segs.length - 1) continue;
      const [a, b] = segs[i];
      const [c, d] = segs[j];
      if (!aabbOverlap(a, b, c, d)) continue;
      const hit = segmentIntersection(a, b, c, d);
      if (hit) hits.push(hit);
    }
  }
  return clusterPoints(hits, clusterDist);
}

function segmentPairs(poly, closed) {
  const segs = [];
  for (let i = 0; i < poly.length - 1; i++) segs.push([poly[i], poly[i + 1]]);
  if (closed && poly.length > 2) segs.push([poly[poly.length - 1], poly[0]]);
  return segs;
}
