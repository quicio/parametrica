/** Differential geometry of sampled curves. */

const EPS = 1e-9;

export interface DifferentialPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}
export interface Vector2 {
  x: number;
  y: number;
}
export interface CurveAnalysis {
  tangents: Vector2[];
  normals: Vector2[];
  curvatures: Float64Array;
  inflections: number[];
  arcLength: number;
  area: number;
  centroid: Vector2;
}
export interface CurveLike {
  points: DifferentialPoint[];
  closed?: boolean;
  [key: string]: unknown;
}
export interface AllCurveAnalysis {
  perCurve: CurveAnalysis[];
  totalArcLength: number;
  totalPoints: number;
}

export function analyzeCurve(points: ReadonlyArray<DifferentialPoint>, closed = false): CurveAnalysis {
  const n = points.length;
  if (n < 3) {
    return {
      tangents: [], normals: [], curvatures: new Float64Array(n),
      inflections: [], arcLength: 0, area: 0, centroid: { x: 0, y: 0 },
    };
  }

  const at = (i: number): DifferentialPoint => points[((i % n) + n) % n] as DifferentialPoint;
  const clampAt = (i: number): DifferentialPoint => points[Math.min(n - 1, Math.max(0, i))] as DifferentialPoint;
  const get = closed ? at : clampAt;

  const tangents: Vector2[] = new Array(n);
  const normals: Vector2[] = new Array(n);
  const curvatures = new Float64Array(n);

  let arcLength = 0;
  for (let i = 0; i < n - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    arcLength += Math.hypot(b.x - a.x, b.y - a.y);
  }
  if (closed) {
    const first = points[0];
    const last = points[n - 1];
    if (first && last) arcLength += Math.hypot(first.x - last.x, first.y - last.y);
  }

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
    const b = points[i] as DifferentialPoint;
    const c = get(i + 1);
    const abx = b.x - a.x; const aby = b.y - a.y;
    const bcx = c.x - b.x; const bcy = c.y - b.y;
    const cax = c.x - a.x; const cay = c.y - a.y;
    const cross = abx * cay - aby * cax;
    const denom = Math.hypot(abx, aby) * Math.hypot(bcx, bcy) * Math.hypot(cax, cay);
    curvatures[i] = denom < EPS ? 0 : (2 * cross) / denom;
  }

  const inflections: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = closed ? (i + 1) % n : i + 1;
    if (j >= n) break;
    const k0 = curvatures[i] ?? 0;
    const k1 = curvatures[j] ?? 0;
    if ((k0 < 0 && k1 > 0) || (k0 > 0 && k1 < 0)) inflections.push(i);
  }

  // Shoelace area + centroid (meaningful for closed curves)
  let area = 0;
  let cx = 0; let cy = 0;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p = points[i];
    const q = points[(i + 1) % n];
    if (!p || !q) continue;
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
export function analyzeAll(curves: ReadonlyArray<CurveLike>): AllCurveAnalysis {
  const perCurve = curves.map((c) => analyzeCurve(c.points, c.closed));
  return {
    perCurve,
    totalArcLength: perCurve.reduce((s, a) => s + a.arcLength, 0),
    totalPoints: curves.reduce((s, c) => s + c.points.length, 0),
  };
}
