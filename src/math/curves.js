/**
 * curves.js — spline mathematics shared by generators.
 *
 *  - Catmull-Rom → cubic Bézier (open + closed), from v1, extended.
 *  - Natural / periodic cubic spline interpolation (tridiagonal solve,
 *    periodic via Sherman–Morrison).
 *  - Bézier evaluation and sampling.
 */

/* ———————— Catmull-Rom (centripetal, Yuksel tangents) ———————— */

const EPS = 1e-6;

export function catmullRomToBezier(points, { tension = 0.25, alpha = 0.5, closed = false } = {}) {
  if (points.length < 2) throw new Error('catmullRomToBezier: need ≥ 2 points');
  const pts = closed ? padClosed(points) : padOpen(points);
  const knots = computeKnots(pts, alpha);
  const scale = 1 - tension * 0.9;
  const segments = [];

  // padded layout: open → n+2 points (n−1 segments), closed → n+3 (n segments);
  // in both cases segment indices run 1..pts.length−3.
  const last = pts.length - 3;
  for (let i = 1; i <= last; i++) {
    const P0 = pts[i - 1]; const P1 = pts[i]; const P2 = pts[i + 1]; const P3 = pts[i + 2];
    const t0 = knots[i - 1]; const t1 = knots[i]; const t2 = knots[i + 1]; const t3 = knots[i + 2];
    const dt = t2 - t1;
    let m1x = dt * ((P1.x - P0.x) / (t1 - t0) - (P2.x - P0.x) / (t2 - t0) + (P2.x - P1.x) / dt);
    let m1y = dt * ((P1.y - P0.y) / (t1 - t0) - (P2.y - P0.y) / (t2 - t0) + (P2.y - P1.y) / dt);
    let m2x = dt * ((P2.x - P1.x) / dt - (P3.x - P1.x) / (t3 - t1) + (P3.x - P2.x) / (t3 - t2));
    let m2y = dt * ((P2.y - P1.y) / dt - (P3.y - P1.y) / (t3 - t1) + (P3.y - P2.y) / (t3 - t2));
    m1x *= scale; m1y *= scale; m2x *= scale; m2y *= scale;
    segments.push({
      p0: { x: P1.x, y: P1.y },
      p1: { x: P1.x + m1x / 3, y: P1.y + m1y / 3 },
      p2: { x: P2.x - m2x / 3, y: P2.y - m2y / 3 },
      p3: { x: P2.x, y: P2.y },
    });
  }
  return segments;
}

function padOpen(points) {
  const f = points[0]; const s = points[1];
  const l = points[points.length - 1]; const q = points[points.length - 2];
  return [
    { x: 2 * f.x - s.x, y: 2 * f.y - s.y },
    ...points,
    { x: 2 * l.x - q.x, y: 2 * l.y - q.y },
  ];
}

function padClosed(points) {
  const n = points.length;
  return [points[n - 1], ...points, points[0], points[1]];
}

function computeKnots(pts, alpha) {
  const knots = [0];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    knots.push(knots[i - 1] + Math.pow(Math.max(d, EPS), alpha));
  }
  return knots;
}

export function evalBezier(seg, u) {
  const v = 1 - u;
  const a = v * v * v; const b = 3 * v * v * u; const c = 3 * v * u * u; const d = u * u * u;
  return {
    x: a * seg.p0.x + b * seg.p1.x + c * seg.p2.x + d * seg.p3.x,
    y: a * seg.p0.y + b * seg.p1.y + c * seg.p2.y + d * seg.p3.y,
  };
}

export function bezierToPoints(segments, perSegment = 20, { dropLast = false } = {}) {
  const out = [];
  for (const seg of segments) {
    for (let i = 0; i <= perSegment; i++) {
      const pt = evalBezier(seg, i / perSegment);
      const last = out[out.length - 1];
      if (last && Math.hypot(last.x - pt.x, last.y - pt.y) < EPS) continue;
      out.push(pt);
    }
  }
  if (dropLast && out.length > 1) out.pop();
  return out;
}

/* ———————— Natural / periodic cubic spline ———————— */

/**
 * Sample a cubic spline interpolating `points`.
 * closed=false → natural spline (second derivative 0 at ends).
 * closed=true  → periodic spline (C2 around the loop), solved with
 * Sherman–Morrison on the cyclic tridiagonal system.
 */
export function cubicSplinePoints(points, { closed = false, perSegment = 16 } = {}) {
  const n = points.length;
  if (n < 3) return points.map((p) => ({ ...p }));
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const Mx = closed ? periodicSecondDerivatives(xs) : naturalSecondDerivatives(xs);
  const My = closed ? periodicSecondDerivatives(ys) : naturalSecondDerivatives(ys);

  const out = [];
  const segCount = closed ? n : n - 1;
  for (let i = 0; i < segCount; i++) {
    const j = (i + 1) % n;
    const h = 1; // uniform parameterization
    for (let k = 0; k < perSegment; k++) {
      const t = k / perSegment;
      const a = 1 - t;
      out.push({
        x: a * xs[i] + t * xs[j] + ((a * a * a - a) * Mx[i] + (t * t * t - t) * Mx[j]) * (h * h) / 6,
        y: a * ys[i] + t * ys[j] + ((a * a * a - a) * My[i] + (t * t * t - t) * My[j]) * (h * h) / 6,
      });
    }
  }
  if (!closed) out.push({ ...points[n - 1] });
  return out;
}

/** Natural spline second derivatives (Thomas algorithm), h = 1. */
function naturalSecondDerivatives(v) {
  const n = v.length;
  const cp = new Array(n - 1).fill(0);
  const dp = new Array(n).fill(0);
  // interior: M[i-1] + 4 M[i] + M[i+1] = 6 (v[i-1] - 2 v[i] + v[i+1])
  const beta = [0];
  const gamma = [0];
  for (let i = 1; i < n - 1; i++) {
    const rhs = 6 * (v[i - 1] - 2 * v[i] + v[i + 1]);
    const denom = 4 - beta[i - 1];
    beta[i] = 1 / denom;
    gamma[i] = (rhs - gamma[i - 1]) / denom;
  }
  const M = new Array(n).fill(0);
  for (let i = n - 2; i >= 1; i--) M[i] = gamma[i] - beta[i] * M[i + 1];
  return M;
}

/**
 * Periodic spline second derivatives for the cyclic system
 *   M[i−1] + 4·M[i] + M[i+1] = rhs[i]   (indices mod n)
 * solved with the Numerical Recipes cyclic reduction:
 * A = B + u·vᵀ with B a plain tridiagonal matrix,
 *   u = [γ, 0, …, 0, α]ᵀ, v = [1, 0, …, 0, β/γ]ᵀ,  α = β = 1, γ = −4.
 * Then A⁻¹·rhs = y − z·(v·y)/(1 + v·z)  with B·y = rhs, B·z = u.
 */
function periodicSecondDerivatives(v) {
  const n = v.length;
  const rhs = v.map((_, i) => 6 * (v[(i - 1 + n) % n] - 2 * v[i] + v[(i + 1) % n]));

  const alpha = 1;
  const beta = 1;
  const gamma = -4;
  const diag = new Array(n).fill(4);
  diag[0] = 4 - gamma;            // 8
  diag[n - 1] = 4 - (alpha * beta) / gamma; // 4.25

  // Thomas algorithm for the plain tridiagonal B.
  const solveB = (b) => {
    const cp = new Array(n).fill(0);
    const dp = new Array(n).fill(0);
    cp[0] = 1 / diag[0];
    dp[0] = b[0] / diag[0];
    for (let i = 1; i < n; i++) {
      const denom = diag[i] - cp[i - 1]; // lower diagonal is 1 everywhere
      cp[i] = (i < n - 1 ? 1 : 0) / denom;
      dp[i] = (b[i] - dp[i - 1]) / denom;
    }
    const x = new Array(n).fill(0);
    x[n - 1] = dp[n - 1];
    for (let i = n - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
    return x;
  };

  const u = new Array(n).fill(0);
  u[0] = gamma;
  u[n - 1] = alpha;

  const y = solveB(rhs);
  const z = solveB(u);

  // v = [1, 0, …, 0, β/γ]
  const vDotY = y[0] + (beta / gamma) * y[n - 1];
  const vDotZ = z[0] + (beta / gamma) * z[n - 1];
  const factor = vDotY / (1 + vDotZ);
  return y.map((yi, i) => yi - z[i] * factor);
}
