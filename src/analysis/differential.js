/**
 * differential.js — live mathematics (spec §10).
 *
 * Differential geometry of sampled curves, computed with central finite
 * differences: tangents, normals, signed curvature, inflection points,
 * arc length, enclosed area, centroid. Everything the visualization
 * overlays and the telemetry read out.
 */

const EPS = 1e-9;

/**
 * @param {Array<{x,y}>} points
 * @param {boolean} closed
 * @returns {{
 *   tangents: Array, normals: Array, curvatures: Float64Array,
 *   inflections: number[], arcLength: number, area: number, centroid: {x,y}
 * }}
 */
export function analyzeCurve(points, closed = false) {
  const n = points.length;
  if (n < 3) {
    return {
      tangents: [], normals: [], curvatures: new Float64Array(n),
      inflections: [], arcLength: 0, area: 0, centroid: { x: 0, y: 0 },
    };
  }

  const at = (i) => points[((i % n) + n) % n];
  const clampAt = (i) => points[Math.min(n - 1, Math.max(0, i))];
  const get = closed ? at : clampAt;

  const tangents = new Array(n);
  const normals = new Array(n);
  const curvatures = new Float64Array(n);

  let arcLength = 0;
  for (let i = 0; i < n - 1; i++) {
    arcLength += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  if (closed) arcLength += Math.hypot(points[0].x - points[n - 1].x, points[0].y - points[n - 1].y);

  for (let i = 0; i < n; i++) {
    const prev = get(i - 1);
    const next = get(i + 1);
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || EPS;
    const tx = dx / len;
    const ty = dy / len;
    tangents[i] = { x: tx, y: ty };
    normals[i] = { x: -ty, y: tx };
  }

  // Signed curvature: κ = 2·cross(b−a, c−a) / (|ab|·|bc|·|ca|)
  for (let i = 0; i < n; i++) {
    const a = get(i - 1);
    const b = points[i];
    const c = get(i + 1);
    const abx = b.x - a.x; const aby = b.y - a.y;
    const bcx = c.x - b.x; const bcy = c.y - b.y;
    const cax = c.x - a.x; const cay = c.y - a.y;
    const cross = abx * cay - aby * cax;
    const denom = Math.hypot(abx, aby) * Math.hypot(bcx, bcy) * Math.hypot(cax, cay);
    curvatures[i] = denom < EPS ? 0 : (2 * cross) / denom;
  }

  const inflections = [];
  for (let i = 0; i < n; i++) {
    const j = closed ? (i + 1) % n : i + 1;
    if (j >= n) break;
    const k0 = curvatures[i];
    const k1 = curvatures[j];
    if ((k0 < 0 && k1 > 0) || (k0 > 0 && k1 < 0)) inflections.push(i);
  }

  // Shoelace area + centroid (meaningful for closed curves)
  let area = 0;
  let cx = 0; let cy = 0;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p = points[i];
    const q = points[(i + 1) % n];
    const cross = p.x * q.y - q.x * p.y;
    area += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  area /= 2;
  if (Math.abs(area) > EPS) {
    cx /= 6 * area;
    cy /= 6 * area;
  }

  return { tangents, normals, curvatures, inflections, arcLength, area, centroid: { x: cx, y: cy } };
}

/** Analyze all curves; attaches per-curve results and totals. */
export function analyzeAll(curves) {
  const perCurve = curves.map((c) => analyzeCurve(c.points, c.closed));
  return {
    perCurve,
    totalArcLength: perCurve.reduce((s, a) => s + a.arcLength, 0),
    totalPoints: curves.reduce((s, c) => s + c.points.length, 0),
  };
}
