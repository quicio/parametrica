/**
 * sampling.ts — curve sampling & normalization.
 *
 * Generators emit polylines; this module owns HOW the parameter domain
 * is walked: uniform sampling, curvature-driven adaptive refinement,
 * arc-length tables, uniform resampling and frame normalization.
 */

export interface Vec2 {
  x: number;
  y: number;
  [key: string]: unknown;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  diagonal: number;
  cx: number;
  cy: number;
  [key: string]: unknown;
}

export interface CurveLike {
  points: Vec2[];
  [key: string]: unknown;
}

export interface AdaptiveOptions {
  minSteps?: number;
  maxDepth?: number;
  tolerance?: number | null;
  samples?: number;
}

export interface SplitOptions {
  closed?: boolean;
  gapRatio?: number;
  minGapFraction?: number;
}

export interface SplitResult {
  segments: Vec2[][];
  closed: boolean;
  broken: boolean;
}

interface Entry {
  t: number;
  p: Vec2;
}

interface Interval {
  a: number;
  b: number;
  mid: number;
  pa: Vec2;
  pb: Vec2;
  pm: Vec2;
  depth: number;
  error: number;
}

const EPS = 1e-9;

/** Uniform sample of fn: t → {x, y}. */
export function sampleUniform<P extends Vec2>(fn: (t: number) => P, t0: number, t1: number, count: number): P[] {
  const n = Math.max(2, Math.floor(count));
  const out = new Array<P>(n);
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
export function sampleAdaptive<P extends Vec2>(
  fn: (t: number) => P,
  t0: number,
  t1: number,
  { minSteps = 128, maxDepth = 5, tolerance = null, samples = Infinity }: AdaptiveOptions = {},
): P[] {
  const requested = Number.isFinite(samples) ? Math.max(2, Math.floor(samples)) : Infinity;
  const requestedIntervals = Number.isFinite(requested) ? requested - 1 : Infinity;
  const intervals = Math.max(1, Math.min(Math.floor(minSteps), requestedIntervals));

  const coarse = sampleUniform(fn, t0, t1, intervals + 1);
  const diag = bbox(coarse).diagonal || 1;
  const tol = tolerance ?? diag / 600;

  // Chronological entries: { t, p }. Coarse endpoints are retained.
  const entries: Entry[] = coarse.map((p, i) => ({
    t: t0 + ((t1 - t0) * i) / intervals,
    p,
  }));

  // Max-heap of unresolved intervals, keyed by chord error. The tie
  // breaker (leftmost first) keeps the output deterministic.
  const heap: Interval[] = [];
  const tAt = (i: number): number => t0 + ((t1 - t0) * i) / intervals;
  for (let i = 0; i < intervals; i++) {
    heapPush(heap, makeInterval(
      tAt(i), tAt(i + 1), coarse[i]!, coarse[i + 1]!, 0,
    ));
  }

  while (entries.length < requested && heap.length) {
    const top = heap[0]!;
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
  const out: Vec2[] = [];
  // Points do not carry their parameter, so the historical duplicate check
  // never matched; keep emitting every refined entry.
  for (const entry of entries) out.push(entry.p);
  return (out.length >= 2 ? out : coarse.slice(0, 2)) as P[];

  function makeInterval(a: number, b: number, pa: Vec2, pb: Vec2, depth: number): Interval {
    const mid = (a + b) / 2;
    const pm = fn(mid);
    const d = distanceToChord(pm, pa, pb);
    const error = Number.isFinite(d) ? d : Infinity;
    return { a, b, mid, pa, pb, pm, depth, error };
  }
}

/** True when `a` should sit above `b` in the max-heap. */
function heapHigher(a: Interval, b: Interval): boolean {
  if (a.error !== b.error) return a.error > b.error;
  return a.a < b.a;
}

function heapPush(heap: Interval[], item: Interval): void {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (!heapHigher(heap[i]!, heap[parent]!)) break;
    [heap[i], heap[parent]] = [heap[parent]!, heap[i]!];
    i = parent;
  }
}

function heapPop(heap: Interval[]): Interval {
  const top = heap[0]!;
  const last = heap.pop();
  if (heap.length && last) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let best = i;
      if (l < heap.length && heapHigher(heap[l]!, heap[best]!)) best = l;
      if (r < heap.length && heapHigher(heap[r]!, heap[best]!)) best = r;
      if (best === i) break;
      [heap[i], heap[best]] = [heap[best]!, heap[i]!];
      i = best;
    }
  }
  return top;
}

function distanceToChord(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < EPS) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  const cx = a.x + Math.min(1, Math.max(0, t)) * dx;
  const cy = a.y + Math.min(1, Math.max(0, t)) * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

/**
 * Split a sampled polyline where consecutive points are too far apart to
 * belong to the same continuous stroke.
 *
 * Two sources of breaks are handled:
 *  - non-finite samples (poles such as tan(t), complex radii, …);
 *  - a gap much larger than the local sampling step (a jump across a
 *    discontinuity that still produced finite endpoints).
 *
 * The result keeps every continuous run as its own open polyline. A curve
 * only stays closed when it had no break and its last point really lands on
 * its first point.
 */
export function splitCurveAtDiscontinuities(
  points: unknown[] | null | undefined,
  { closed = false, gapRatio = 10, minGapFraction = 0.02 }: SplitOptions = {},
): SplitResult {
  if (!Array.isArray(points) || points.length < 2) {
    return { segments: [], closed: false, broken: false };
  }

  // First pass: cut at non-finite samples.
  const runs: Vec2[][] = [];
  let run: Vec2[] = [];
  let sawNonFinite = false;
  for (const raw of points) {
    const point = raw as Partial<Vec2> | null | undefined;
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      run.push(point as Vec2);
    } else {
      sawNonFinite = true;
      if (run.length >= 2) runs.push(run);
      run = [];
    }
  }
  if (run.length >= 2) runs.push(run);
  if (!runs.length) return { segments: [], closed: false, broken: sawNonFinite };

  // Second pass: split runs at disproportionate jumps.
  const out: Vec2[][] = [];
  let broken = sawNonFinite;
  for (const current of runs) {
    const diag = bbox(current).diagonal;
    if (current.length < 3 || diag < EPS) {
      out.push(current);
      continue;
    }
    const lengths: number[] = [];
    for (let i = 1; i < current.length; i++) {
      const d = Math.hypot(current[i]!.x - current[i - 1]!.x, current[i]!.y - current[i - 1]!.y);
      if (d > EPS) lengths.push(d);
    }
    if (lengths.length < 2) {
      out.push(current);
      continue;
    }
    const sorted = [...lengths].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    const threshold = Math.max(median * gapRatio, diag * minGapFraction, EPS);

    let start = 0;
    for (let i = 1; i < current.length; i++) {
      const d = Math.hypot(current[i]!.x - current[i - 1]!.x, current[i]!.y - current[i - 1]!.y);
      if (d > threshold) {
        const piece = current.slice(start, i);
        if (piece.length >= 2) out.push(piece);
        start = i;
        broken = true;
      }
    }
    const tail = current.slice(start);
    if (tail.length >= 2) out.push(tail);
  }

  if (!out.length) return { segments: [], closed: false, broken: true };
  const first = out[0]!;
  const last = out[out.length - 1]!;
  const box = bbox(out.flat());
  const gap = Math.hypot(last[last.length - 1]!.x - first[0]!.x, last[last.length - 1]!.y - first[0]!.y);
  // A closed curve does not have to repeat its first point: many operators
  // and spline samplers leave the closing segment implicit. Accept that
  // when the seam is no larger than a normal sampling step; a chord that
  // spans hundreds of steps is a genuinely open curve.
  const seamLengths: number[] = [];
  for (let i = 1; i < first.length; i++) {
    const d = Math.hypot(first[i]!.x - first[i - 1]!.x, first[i]!.y - first[i - 1]!.y);
    if (d > EPS) seamLengths.push(d);
  }
  seamLengths.sort((a, b) => a - b);
  const step = seamLengths.length ? seamLengths[Math.floor(seamLengths.length / 2)]! : 0;
  const tolerance = Math.max(1e-7, box.diagonal * 1e-5, step * 4);
  const closes = closed && out.length === 1 && gap <= tolerance;
  return { segments: out, closed: closes, broken: broken || (closed && !closes) };
}

/** Cumulative arc-length table for a polyline. */
export function arcLengthTable(points: Vec2[], closed = false): { table: Float64Array; total: number } {
  const n = points.length;
  const table = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    table[i] = table[i - 1]! + Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
  }
  let total = table[n - 1]!;
  if (closed && n > 2) {
    total += Math.hypot(points[0]!.x - points[n - 1]!.x, points[0]!.y - points[n - 1]!.y);
  }
  return { table, total };
}

/** Resample to `count` arc-length-uniform points. */
export function resampleUniform(points: Vec2[], count: number, closed = false): Vec2[] {
  const n = points.length;
  if (n < 2 || count < 2) return points.map((p) => ({ ...p }));
  const { table, total } = arcLengthTable(points, closed);
  if (total < EPS) return points.map((p) => ({ ...p }));

  const out: Vec2[] = [];
  const step = total / (closed ? count : count - 1);
  let seg = 0;
  const segCount = closed ? n : n - 1;

  for (let i = 0; i < count; i++) {
    const target = Math.min(total - EPS, i * step);
    while (seg < segCount - 1 && table[seg + 1]! < target) seg++;
    const a = points[seg]!;
    const b = points[(seg + 1) % n]!;
    const segStart = table[seg]!;
    const segLen = (table[seg + 1] ?? total) - segStart || EPS;
    const t = (target - segStart) / segLen;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/** Axis-aligned bounding box of a point cloud. */
export function bbox(points: ReadonlyArray<{ x: number; y: number }>): BBox {
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
export function bboxAll(curves: ReadonlyArray<{ points: ReadonlyArray<{ x: number; y: number }> }>): BBox {
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
export function fitCurves<T extends { points: ReadonlyArray<{ x: number; y: number }> }>(
  curves: ReadonlyArray<T>,
  size: number,
  { preserveAspect = true }: { preserveAspect?: boolean } = {},
): T[] {
  const box = bboxAll(curves);
  if (box.diagonal < EPS) return curves as unknown as T[];
  const sx = preserveAspect ? size / Math.max(box.width, box.height) : size / Math.max(box.width, EPS);
  const sy = preserveAspect ? sx : size / Math.max(box.height, EPS);
  return curves.map((c) => ({
    ...c,
    points: c.points.map((p) => ({
      ...p,
      x: (p.x - box.cx) * sx,
      y: (p.y - box.cy) * sy,
    })),
  })) as T[];
}

/** Translate curves so the combined bbox is centered on origin. */
export function centerCurves<T extends { points: ReadonlyArray<{ x: number; y: number }> }>(curves: ReadonlyArray<T>): T[] {
  const box = bboxAll(curves);
  return curves.map((c) => ({
    ...c,
    points: c.points.map((p) => ({ ...p, x: p.x - box.cx, y: p.y - box.cy })),
  })) as T[];
}
