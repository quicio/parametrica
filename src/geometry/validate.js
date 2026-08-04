/**
 * validate.js — geometric invariant enforcement.
 *
 * A generated glyph is only admissible when ALL of the following hold:
 *  1. the master spline never self-intersects,
 *  2. master ∩ mirror is EXACTLY two points (the intended crossings),
 *  3. both crossings lie on (within tolerance of) the vertical axis.
 *
 * Geometry is validated against sampled polylines with exact line
 * intersection tests. Runs in well under a millisecond, so it is used
 * both on parameter edits (telemetry) and inside the mutation loop.
 */

const AXIS_TOLERANCE = 3;   // px — how far a crossing may sit from x = 0
const CLUSTER_DIST = 8;     // px — merge hits this close into one crossing
const ENDPOINT_EPS = 1e-6;

/**
 * Full admissibility check.
 * @param {Array<{x,y}>} masterSamples
 * @param {Array<{x,y}>} mirrorSamples
 * @returns {{ok:boolean, reason:string|null, crossings:Array}}
 */
export function validateGlyph(masterSamples, mirrorSamples) {
  if (!allFinite(masterSamples) || !allFinite(mirrorSamples)) {
    return { ok: false, reason: 'non-finite geometry', crossings: [] };
  }

  const selfHits = countSelfIntersections(masterSamples);
  if (selfHits > 0) {
    return { ok: false, reason: `self-intersection ×${selfHits}`, crossings: [] };
  }

  const clusters = findCrossings(masterSamples, mirrorSamples);
  if (clusters.length !== 2) {
    return { ok: false, reason: `crossings = ${clusters.length}`, crossings: clusters };
  }
  for (const c of clusters) {
    if (Math.abs(c.x) > AXIS_TOLERANCE) {
      return { ok: false, reason: 'crossing off-axis', crossings: clusters };
    }
  }
  return { ok: true, reason: null, crossings: clusters };
}

function allFinite(poly) {
  for (const p of poly) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  }
  return true;
}

/**
 * Count intersections between non-adjacent segments of one polyline.
 * Consecutive segments share an endpoint by construction and are skipped.
 */
export function countSelfIntersections(poly) {
  let count = 0;
  const n = poly.length;
  for (let i = 0; i < n - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    for (let j = i + 2; j < n - 1; j++) {
      const c = poly[j];
      const d = poly[j + 1];
      if (!aabbOverlap(a, b, c, d)) continue;
      if (segmentIntersection(a, b, c, d)) count++;
    }
  }
  return count;
}

/**
 * Intersect two polylines and cluster the hits into distinct crossings.
 * Returns cluster centroids.
 */
export function findCrossings(polyA, polyB) {
  const hits = [];
  for (let i = 0; i < polyA.length - 1; i++) {
    const a = polyA[i];
    const b = polyA[i + 1];
    for (let j = 0; j < polyB.length - 1; j++) {
      const c = polyB[j];
      const d = polyB[j + 1];
      if (!aabbOverlap(a, b, c, d)) continue;
      const hit = segmentIntersection(a, b, c, d);
      if (hit) hits.push(hit);
    }
  }
  return clusterPoints(hits, CLUSTER_DIST);
}

function aabbOverlap(a, b, c, d) {
  return (
    Math.min(a.x, b.x) <= Math.max(c.x, d.x) + ENDPOINT_EPS &&
    Math.min(c.x, d.x) <= Math.max(a.x, b.x) + ENDPOINT_EPS &&
    Math.min(a.y, b.y) <= Math.max(c.y, d.y) + ENDPOINT_EPS &&
    Math.min(c.y, d.y) <= Math.max(a.y, b.y) + ENDPOINT_EPS
  );
}

/**
 * Exact segment intersection. Returns the intersection point or null.
 * Handles the shared-vertex case (the spline interpolates the axis
 * crossings, so master and mirror literally share points there).
 */
function segmentIntersection(a, b, c, d) {
  // Shared endpoints (within epsilon) count as an intersection.
  for (const p of [a, b]) {
    for (const q of [c, d]) {
      if (Math.hypot(p.x - q.x, p.y - q.y) < ENDPOINT_EPS) return { x: p.x, y: p.y };
    }
  }

  const rX = b.x - a.x;
  const rY = b.y - a.y;
  const sX = d.x - c.x;
  const sY = d.y - c.y;
  const denom = rX * sY - rY * sX;
  if (Math.abs(denom) < 1e-12) return null; // parallel / collinear

  const t = ((c.x - a.x) * sY - (c.y - a.y) * sX) / denom;
  const u = ((c.x - a.x) * rY - (c.y - a.y) * rX) / denom;
  if (t < -ENDPOINT_EPS || t > 1 + ENDPOINT_EPS) return null;
  if (u < -ENDPOINT_EPS || u > 1 + ENDPOINT_EPS) return null;

  return { x: a.x + t * rX, y: a.y + t * rY };
}

/** Greedy proximity clustering of intersection hits. */
function clusterPoints(points, radius) {
  const clusters = [];
  for (const p of points) {
    let best = null;
    let bestDist = Infinity;
    for (const cl of clusters) {
      const dist = Math.hypot(cl.x - p.x, cl.y - p.y);
      if (dist < radius && dist < bestDist) {
        best = cl;
        bestDist = dist;
      }
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
