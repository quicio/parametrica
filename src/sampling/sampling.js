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
 * Adaptive sampling: a coarse uniform grid guarantees coverage, then the
 * interval with the largest chord error is split until either the
 * tolerance is met or the `samples` budget is exhausted.
 *
 * Contract (see openspec/changes/reliability-hardening):
 *  - `samples` is a hard upper bound on the output length;
 *  - the final endpoint `fn(t1)` is always present;
 *  - refinement is deterministic (largest error first, leftmost wins ties);
 *  - `minSteps` controls the initial coarse resolution, not the output.
 */
export function sampleAdaptive(fn, t0, t1, { minSteps = 128, maxDepth = 5, tolerance = null, samples = Infinity } = {}) {
  const requested = Number.isFinite(samples) ? Math.max(2, Math.floor(samples)) : Infinity;
  const requestedIntervals = Number.isFinite(requested) ? requested - 1 : Infinity;
  const intervals = Math.max(1, Math.min(Math.floor(minSteps), requestedIntervals));

  const coarse = sampleUniform(fn, t0, t1, intervals + 1);
  const diag = bbox(coarse).diagonal || 1;
  const tol = tolerance ?? diag / 600;

  // Chronological entries: { t, p }. Coarse endpoints are retained.
  const entries = coarse.map((p, i) => ({
    t: t0 + ((t1 - t0) * i) / intervals,
    p,
  }));

  // Max-heap of unresolved intervals, keyed by chord error. The tie
  // breaker (leftmost first) keeps the output deterministic.
  const heap = [];
  const tAt = (i) => t0 + ((t1 - t0) * i) / intervals;
  for (let i = 0; i < intervals; i++) {
    heapPush(heap, makeInterval(
      tAt(i), tAt(i + 1), coarse[i], coarse[i + 1], 0,
    ));
  }

  while (entries.length < requested && heap.length) {
    const top = heap[0];
    if (!(top.error > tol) || top.depth >= maxDepth) break;
    heapPop(heap);
    entries.push({ t: (top.a + top.b) / 2, p: top.pm });
    const depth = top.depth + 1;
    const left = makeInterval(top.a, top.mid, top.pa, top.pm, depth);
    const right = makeInterval(top.mid, top.b, top.pm, top.pb, depth);
    if (left.error > tol && depth < maxDepth) heapPush(heap, left);
    if (right.error > tol && depth < maxDepth) heapPush(heap, right);
  }

  entries.sort((a, b) => a.t - b.t);
  const out = [];
  for (const entry of entries) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.t - entry.t) < 1e-12) continue;
    out.push(entry.p);
  }
  return out.length >= 2 ? out : coarse.slice(0, 2);

  function makeInterval(a, b, pa, pb, depth) {
    const mid = (a + b) / 2;
    const pm = fn(mid);
    const d = distanceToChord(pm, pa, pb);
    const error = Number.isFinite(d) ? d : Infinity;
    return { a, b, mid, pa, pb, pm, depth, error };
  }
}

/** True when `a` should sit above `b` in the max-heap. */
function heapHigher(a, b) {
  if (a.error !== b.error) return a.error > b.error;
  return a.a < b.a;
}

function heapPush(heap, item) {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (!heapHigher(heap[i], heap[parent])) break;
    [heap[i], heap[parent]] = [heap[parent], heap[i]];
    i = parent;
  }
}

function heapPop(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let best = i;
      if (l < heap.length && heapHigher(heap[l], heap[best])) best = l;
      if (r < heap.length && heapHigher(heap[r], heap[best])) best = r;
      if (best === i) break;
      [heap[i], heap[best]] = [heap[best], heap[i]];
      i = best;
    }
  }
  return top;
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
