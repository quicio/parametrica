/**
 * CatmullRom.js — non-uniform (centripetal) Catmull-Rom spline.
 *
 * Converts an ordered list of control points into a list of cubic Bézier
 * segments using the tangent formulation of Yuksel, Schaefer & Keyser
 * ("On the Parameterization of Catmull-Rom Curves", 2011).
 *
 * Properties that matter to Parametrica:
 *  - Interpolating: the curve passes through every control point,
 *    so axis crossings land exactly on x = 0.
 *  - Centripetal parameterization (alpha = 0.5): provably no cusps or
 *    self-intersections within a segment, no overshoot.
 *  - C1 continuous; tangent scaling keeps curvature visually G2.
 *  - Bézier output is the same mathematics we hand to both the p5
 *    renderer and the SVG exporter — one source of truth.
 */

const EPSILON = 1e-6;

/**
 * @param {Array<{x:number,y:number}>} points  control points, t = 0..1 order
 * @param {{tension?: number, alpha?: number}} opts
 * @returns {Array<{p0,p1,p2,p3}>} cubic Bézier segments
 */
export function toBezier(points, { tension = 0.25, alpha = 0.5 } = {}) {
  if (points.length < 2) throw new Error('CatmullRom: need at least 2 points');
  const pts = padEndpoints(points);
  const knots = computeKnots(pts, alpha);
  const tangentScale = 1 - tension * 0.9; // never reach 0 → never a corner

  const segments = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const P0 = pts[i - 1];
    const P1 = pts[i];
    const P2 = pts[i + 1];
    const P3 = pts[i + 2];
    const t0 = knots[i - 1];
    const t1 = knots[i];
    const t2 = knots[i + 1];
    const t3 = knots[i + 2];
    const dt = t2 - t1;

    // Yuksel non-uniform tangents (derivatives w.r.t. segment parameter).
    let m1x = dt * ((P1.x - P0.x) / (t1 - t0) - (P2.x - P0.x) / (t2 - t0) + (P2.x - P1.x) / dt);
    let m1y = dt * ((P1.y - P0.y) / (t1 - t0) - (P2.y - P0.y) / (t2 - t0) + (P2.y - P1.y) / dt);
    let m2x = dt * ((P2.x - P1.x) / dt - (P3.x - P1.x) / (t3 - t1) + (P3.x - P2.x) / (t3 - t2));
    let m2y = dt * ((P2.y - P1.y) / dt - (P3.y - P1.y) / (t3 - t1) + (P3.y - P2.y) / (t3 - t2));

    m1x *= tangentScale; m1y *= tangentScale;
    m2x *= tangentScale; m2y *= tangentScale;

    segments.push({
      p0: { x: P1.x, y: P1.y },
      p1: { x: P1.x + m1x / 3, y: P1.y + m1y / 3 },
      p2: { x: P2.x - m2x / 3, y: P2.y - m2y / 3 },
      p3: { x: P2.x, y: P2.y },
    });
  }
  return segments;
}

/** Evaluate one cubic Bézier segment at parameter u ∈ [0,1]. */
export function evalBezier(seg, u) {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return {
    x: a * seg.p0.x + b * seg.p1.x + c * seg.p2.x + d * seg.p3.x,
    y: a * seg.p0.y + b * seg.p1.y + c * seg.p2.y + d * seg.p3.y,
  };
}

/**
 * Sample a Bézier segment chain into a single polyline.
 * Segment joints are deduplicated; control points land exactly on samples.
 */
export function sampleSegments(segments, stepsPerSegment = 20) {
  const out = [];
  for (const seg of segments) {
    for (let i = 0; i <= stepsPerSegment; i++) {
      const pt = evalBezier(seg, i / stepsPerSegment);
      const last = out[out.length - 1];
      if (last && Math.hypot(last.x - pt.x, last.y - pt.y) < EPSILON) continue;
      out.push(pt);
    }
  }
  return out;
}

/**
 * Pad the open ends by point reflection so the spline has well-defined,
 * natural tangents at its entry and exit (which live outside the canvas).
 */
function padEndpoints(points) {
  const first = points[0];
  const second = points[1];
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return [
    { x: 2 * first.x - second.x, y: 2 * first.y - second.y },
    ...points,
    { x: 2 * last.x - prev.x, y: 2 * last.y - prev.y },
  ];
}

/** Centripetal knot sequence: t_{i+1} = t_i + |P_{i+1} − P_i|^alpha. */
function computeKnots(pts, alpha) {
  const knots = [0];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    knots.push(knots[i - 1] + Math.pow(Math.max(d, EPSILON), alpha));
  }
  return knots;
}
