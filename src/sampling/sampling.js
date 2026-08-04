/**
 * sampling.js — curve sampling & normalization.
 *
 * Generators emit polylines; this module owns HOW the parameter domain
 * is walked: uniform sampling, curvature-driven adaptive refinement,
 * arc-length tables, uniform resampling and frame normalization.
 */

const EPS = 1e-9;

/** Uniform sample of fn: t → {x, y}. */
export function sampleUniform(fn, t0, t1, count) {
  const n = Math.max(2, Math.floor(count));
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = fn(t0 + ((t1 - t0) * i) / (n - 1));
  }
  return out;
}

/**
 * Adaptive sampling: the domain is first partitioned into a coarse
 * uniform grid (guaranteeing coverage even when the curve revisits the
 * same point — e.g. roses), then each interval refines recursively where
 * its midpoint deviates from the chord (curvature-aware). Tolerance is
 * derived from the coarse pass so it is scale-relative.
 *
 * `samples` is a hard upper bound on the output length. For simple
 * curves the output is naturally shorter than `samples`; for highly
 * detailed curves the adaptive refinement is capped so the user
 * always sees ≤ samples points regardless of curvature.
 */
export function sampleAdaptive(fn, t0, t1, { minSteps = 128, maxDepth = 5, tolerance = null, samples = Infinity } = {}) {
  const requested = Math.max(8, Math.floor(samples));
  const intervals = Math.max(8, Math.min(Math.floor(minSteps), requested));
  const coarse = sampleUniform(fn, t0, t1, intervals + 1);
  const diag = bbox(coarse).diagonal || 1;
  const tol = tolerance ?? diag / 600;

  const out = [coarse[0]];
  // Track remaining budget so total length never exceeds `samples`.
  // Each pushed point costs 1; each subdivision reserves 1 for the
  // midpoint and 1 for the b endpoint.
  let remaining = Math.max(0, requested - 1);

  for (let i = 0; i < intervals; i++) {
    if (remaining <= 0) break;
    const a = t0 + ((t1 - t0) * i) / intervals;
    const b = t0 + ((t1 - t0) * (i + 1)) / intervals;
    walk(a, b, coarse[i], coarse[i + 1], 0);
  }
  return out;

  function walk(a, b, pa, pb, depth) {
    if (remaining <= 0) return;
    const m = (a + b) / 2;
    const pm = fn(m);
    const refine = distanceToChord(pm, pa, pb) > tol && depth < maxDepth;
    if (refine) {
      // Subdivision: order must stay chronological (left half, then
      // midpoint, then right half). The midpoint belongs at the start
      // of the right half so we push it before recursing into it.
      walk(a, m, pa, pm, depth + 1);
      if (remaining >= 1) {
        out.push(pm);
        remaining -= 1;
      } else {
        return;
      }
      walk(m, b, pm, pb, depth + 1);
    } else {
      out.push(pb);
      remaining -= 1;
    }
  }
}

function distanceToChord(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < EPS) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  const cx = a.x + Math.min(1, Math.max(0, t)) * dx;
  const cy = a.y + Math.min(1, Math.max(0, t)) * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

/** Cumulative arc-length table for a polyline. */
export function arcLengthTable(points, closed = false) {
  const n = points.length;
  const table = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    table[i] = table[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  let total = table[n - 1];
  if (closed && n > 2) {
    total += Math.hypot(points[0].x - points[n - 1].x, points[0].y - points[n - 1].y);
  }
  return { table, total };
}

/** Resample to `count` arc-length-uniform points. */
export function resampleUniform(points, count, closed = false) {
  const n = points.length;
  if (n < 2 || count < 2) return points.map((p) => ({ ...p }));
  const { table, total } = arcLengthTable(points, closed);
  if (total < EPS) return points.map((p) => ({ ...p }));

  const out = [];
  const step = total / (closed ? count : count - 1);
  let seg = 0;
  const segCount = closed ? n : n - 1;

  for (let i = 0; i < count; i++) {
    const target = Math.min(total - EPS, i * step);
    while (seg < segCount - 1 && table[seg + 1] < target) seg++;
    const a = points[seg];
    const b = points[(seg + 1) % n];
    const segStart = table[seg];
    const segLen = (table[seg + 1] ?? total) - segStart || EPS;
    const t = (target - segStart) / segLen;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/** Axis-aligned bounding box of a point cloud. */
export function bbox(points) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const width = maxX - minX;
  const height = maxY - minY;
  return {
    minX, minY, maxX, maxY, width, height,
    diagonal: Math.hypot(width, height),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

/** Combined bbox across curves. */
export function bboxAll(curves) {
  const boxes = curves.filter((c) => c.points.length).map((c) => bbox(c.points));
  if (!boxes.length) return bbox([{ x: 0, y: 0 }]);
  const minX = Math.min(...boxes.map((b) => b.minX));
  const minY = Math.min(...boxes.map((b) => b.minY));
  const maxX = Math.max(...boxes.map((b) => b.maxX));
  const maxY = Math.max(...boxes.map((b) => b.maxY));
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX, height: maxY - minY,
    diagonal: Math.hypot(maxX - minX, maxY - minY),
    cx: (minX + maxX) / 2, cy: (minY + maxY) / 2,
  };
}

/** Scale + translate curves so the largest bbox side equals `size`, centered on origin. */
export function fitCurves(curves, size, { preserveAspect = true } = {}) {
  const box = bboxAll(curves);
  if (box.diagonal < EPS) return curves;
  const sx = preserveAspect ? size / Math.max(box.width, box.height) : size / Math.max(box.width, EPS);
  const sy = preserveAspect ? sx : size / Math.max(box.height, EPS);
  return curves.map((c) => ({
    ...c,
    points: c.points.map((p) => ({
      ...p,
      x: (p.x - box.cx) * sx,
      y: (p.y - box.cy) * sy,
    })),
  }));
}

/** Translate curves so the combined bbox is centered on origin. */
export function centerCurves(curves) {
  const box = bboxAll(curves);
  return curves.map((c) => ({
    ...c,
    points: c.points.map((p) => ({ ...p, x: p.x - box.cx, y: p.y - box.cy })),
  }));
}
