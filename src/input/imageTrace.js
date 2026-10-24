/**
 * imageTrace.js — bounded, local image → contour → Fourier document.
 *
 * The pipeline is deliberately small and inspectable:
 *   grayscale → Otsu threshold → largest 4-connected component →
 *   Moore boundary → RDP simplification → arc-length resample →
 *   real Fourier coefficients → editable `fourier` document.
 *
 * The source image never enters the document. Only harmonic coefficients
 * are serialised. Pure functions in this module accept ImageData-like
 * objects (`{width, height, data}`) so the pipeline is Node-testable.
 */

import { createDocument } from '../core/document.js';

export const MAX_IMAGE_EDGE = 1024;
export const DEFAULT_HARMONICS = 32;
export const DEFAULT_SAMPLES = 512;
const TAU = Math.PI * 2;
const EPS = 1e-9;

/**
 * Trace one high-contrast silhouette.
 * @param {{width:number,height:number,data:Uint8ClampedArray|Uint8Array}} imageData
 * @param {{threshold?:number|null,invert?:boolean,harmonics?:number,samples?:number,simplifyEpsilon?:number}} options
 */
export function traceImageData(imageData, options = {}) {
  if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
    return { ok: false, reason: 'No image data to trace.' };
  }
  const width = Math.floor(imageData.width);
  const height = Math.floor(imageData.height);
  if (width < 3 || height < 3) return { ok: false, reason: 'Image is too small to trace.' };

  const gray = grayscale(imageData);
  const threshold = options.threshold == null
    ? otsuThreshold(gray)
    : clamp(Math.round(Number(options.threshold)), 0, 255);
  if (!Number.isFinite(threshold)) return { ok: false, reason: 'Threshold is not valid.' };

  const mask = binarize(gray, width, height, threshold, { invert: Boolean(options.invert) });
  let foreground = 0;
  for (let i = 0; i < mask.length; i++) foreground += mask[i];
  if (!foreground) return { ok: false, reason: 'No pixels pass the threshold. Adjust the threshold or invert.' };
  if (foreground === mask.length) return { ok: false, reason: 'The whole image is foreground; there is no contour.' };

  const padded = padMask(mask, width, height);
  const component = largestComponent(padded.mask, padded.width, padded.height);
  if (!component.best) return { ok: false, reason: 'No connected contour was found.' };

  const traced = traceBoundary(component.labels, component.best, padded.width, padded.height);
  if (traced.length < 8) return { ok: false, reason: 'The largest contour is too small to trace.' };

  const simplified = simplifyRDP(traced, options.simplifyEpsilon ?? 1);
  if (simplified.length < 3) return { ok: false, reason: 'The contour could not be simplified.' };

  const samples = Math.max(64, Math.min(2048, Math.floor(options.samples ?? DEFAULT_SAMPLES)));
  const resampled = resampleClosed(simplified, samples);
  const harmonics = Math.max(1, Math.min(64, Math.floor(options.harmonics ?? DEFAULT_HARMONICS)));
  const fourier = contourToFourier(resampled, harmonics);

  return {
    ok: true,
    threshold,
    width,
    height,
    mask,
    foreground,
    componentArea: component.area,
    contourPx: simplified,
    contour: fourier.contour,
    reconstruction: fourier.reconstruction,
    harmonicsX: fourier.harmonicsX,
    harmonicsY: fourier.harmonicsY,
    error: fourier.error,
    samples,
    harmonicCount: harmonics,
    pointCount: simplified.length,
  };
}

/** Rec. 601 luma, composited over white for transparent pixels. */
export function grayscale(imageData) {
  const { width, height, data } = imageData;
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    const alpha = data[p + 3] / 255;
    const luma = data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114;
    out[i] = luma * alpha + 255 * (1 - alpha);
  }
  return out;
}

/** Otsu's between-class variance threshold over a 0–255 histogram. */
export function otsuThreshold(gray) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) {
    hist[clamp(Math.round(gray[i]), 0, 255)] += 1;
  }
  const total = gray.length;
  if (!total) return 127;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestVariance = -1;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVariance) {
      bestVariance = between;
      best = t;
    }
  }
  return best;
}

/** 1 = foreground. By default dark pixels are foreground. */
export function binarize(gray, width, height, threshold, { invert = false } = {}) {
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    const dark = gray[i] <= threshold;
    mask[i] = (invert ? !dark : dark) ? 1 : 0;
  }
  return mask;
}

function padMask(mask, width, height) {
  const w = width + 2;
  const h = height + 2;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < height; y++) {
    out.set(mask.subarray(y * width, y * width + width), (y + 1) * w + 1);
  }
  return { mask: out, width: w, height: h };
}

/** Label 4-connected components and return the largest one. */
export function largestComponent(mask, width, height) {
  const labels = new Int32Array(width * height);
  const queue = new Int32Array(width * height);
  let next = 0;
  let best = 0;
  let bestArea = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || labels[i]) continue;
    next += 1;
    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    labels[i] = next;
    let area = 0;
    while (head < tail) {
      const index = queue[head++];
      area += 1;
      const x = index % width;
      const y = (index / width) | 0;
      if (x > 0) {
        const j = index - 1;
        if (mask[j] && !labels[j]) { labels[j] = next; queue[tail++] = j; }
      }
      if (x + 1 < width) {
        const j = index + 1;
        if (mask[j] && !labels[j]) { labels[j] = next; queue[tail++] = j; }
      }
      if (y > 0) {
        const j = index - width;
        if (mask[j] && !labels[j]) { labels[j] = next; queue[tail++] = j; }
      }
      if (y + 1 < height) {
        const j = index + width;
        if (mask[j] && !labels[j]) { labels[j] = next; queue[tail++] = j; }
      }
    }
    if (area > bestArea) {
      bestArea = area;
      best = next;
    }
  }
  return { labels, best, area: bestArea };
}

const NEIGHBOURS = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

/** Moore-neighbour boundary tracing for one label (coordinates unpadded). */
export function traceBoundary(labels, label, width, height) {
  let startIndex = -1;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === label) { startIndex = i; break; }
  }
  if (startIndex < 0) return [];
  const sx = startIndex % width;
  const sy = (startIndex / width) | 0;
  const isForeground = (x, y) => (
    x >= 0 && y >= 0 && x < width && y < height && labels[y * width + x] === label
  );

  const contour = [{ x: sx - 1, y: sy - 1 }];
  let cx = sx;
  let cy = sy;
  let bx = sx - 1;
  let by = sy;
  const limit = Math.max(64, width * height * 2);
  for (let step = 0; step < limit; step++) {
    const dx = bx - cx;
    const dy = by - cy;
    let dir = NEIGHBOURS.findIndex(([nx, ny]) => nx === dx && ny === dy);
    if (dir < 0) dir = 6;
    let found = null;
    let foundDir = -1;
    for (let k = 1; k <= 8; k++) {
      const nextDir = (dir + k) % 8;
      const nx = cx + NEIGHBOURS[nextDir][0];
      const ny = cy + NEIGHBOURS[nextDir][1];
      if (isForeground(nx, ny)) {
        found = { x: nx, y: ny };
        foundDir = nextDir;
        break;
      }
    }
    if (!found) break;
    const previous = NEIGHBOURS[(foundDir + 7) % 8];
    bx = cx + previous[0];
    by = cy + previous[1];
    cx = found.x;
    cy = found.y;
    if (cx === sx && cy === sy && contour.length > 3) break;
    contour.push({ x: cx - 1, y: cy - 1 });
  }
  return contour;
}

/** Ramer–Douglas–Peucker on an open polyline (closed polygon passed once). */
export function simplifyRDP(points, epsilon = 1) {
  if (!Array.isArray(points) || points.length <= 2) return Array.isArray(points) ? points.slice() : [];
  const eps = Math.max(0, Number(epsilon) || 0);
  if (!eps) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDistance = -1;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const distance = perpendicularDistance(points[i], points[first], points[last]);
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    if (maxDistance > eps && index > first) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  const out = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) out.push(points[i]);
  }
  return out;
}

function perpendicularDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < EPS) return Math.hypot(point.x - start.x, point.y - start.y);
  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / length;
}

/** Uniform arc-length samples on a closed polygon. */
export function resampleClosed(points, count = DEFAULT_SAMPLES) {
  const n = Math.max(3, Math.floor(count));
  if (!Array.isArray(points) || points.length < 2) return [];
  const lengths = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    lengths.push(length);
    total += length;
  }
  if (total < EPS) return [];
  const out = [];
  let segment = 0;
  let consumed = 0;
  for (let i = 0; i < n; i++) {
    const target = (total * i) / n;
    while (segment < lengths.length - 1 && consumed + lengths[segment] < target) {
      consumed += lengths[segment];
      segment += 1;
    }
    const a = points[segment];
    const b = points[(segment + 1) % points.length];
    const length = lengths[segment] || EPS;
    const t = clamp((target - consumed) / length, 0, 1);
    out.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    });
  }
  return out;
}

/**
 * Real Fourier decomposition around the centroid. Only coefficients 1..H
 * are kept; the DC term is omitted because the renderer recenters the
 * fitted curve.
 */
export function contourToFourier(points, harmonics = DEFAULT_HARMONICS) {
  const normalized = normalizePoints(points);
  const N = normalized.length;
  const H = Math.max(1, Math.min(64, Math.floor(harmonics)));
  const harmonicsX = [];
  const harmonicsY = [];
  for (let k = 1; k <= H; k++) {
    let xc = 0;
    let xs = 0;
    let yc = 0;
    let ys = 0;
    for (let n = 0; n < N; n++) {
      const angle = (TAU * k * n) / N;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      xc += normalized[n].x * c;
      xs += normalized[n].x * s;
      yc += normalized[n].y * c;
      ys += normalized[n].y * s;
    }
    xc = (2 * xc) / N;
    xs = (2 * xs) / N;
    yc = (2 * yc) / N;
    ys = (2 * ys) / N;
    const xAmp = Math.hypot(xc, xs);
    if (xAmp > 1e-6) {
      harmonicsX.push({
        freq: k,
        amp: round(xAmp),
        phase: round(Math.atan2(-xs, xc)),
        rot: 0,
        ox: 0,
        oy: 0,
      });
    }
    const yAmp = Math.hypot(yc, ys);
    if (yAmp > 1e-6) {
      harmonicsY.push({
        freq: k,
        amp: round(yAmp),
        phase: round(Math.atan2(yc, ys)),
        rot: Math.PI / 2,
        ox: 0,
        oy: 0,
      });
    }
  }
  const reconstruction = reconstructFromHarmonics(harmonicsX, harmonicsY, N);
  const error = reconstructionError(normalized, reconstruction);
  return { contour: normalized, reconstruction, harmonicsX, harmonicsY, error };
}

export function reconstructFromHarmonics(harmonicsX, harmonicsY, samples = DEFAULT_SAMPLES) {
  const n = Math.max(3, Math.floor(samples));
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (TAU * i) / n;
    let x = 0;
    let y = 0;
    for (const h of harmonicsX ?? []) {
      const w = h.freq * t + h.phase;
      x += h.amp * (Math.cos(w) * Math.cos(h.rot) + h.ox);
      y += h.amp * (Math.sin(w) * Math.sin(h.rot) + h.oy);
    }
    for (const h of harmonicsY ?? []) {
      const w = h.freq * t + h.phase;
      x += h.amp * (Math.cos(w) * Math.cos(h.rot) + h.ox);
      y += h.amp * (Math.sin(w) * Math.sin(h.rot) + h.oy);
    }
    out.push({ x, y });
  }
  return out;
}

export function reconstructionError(reference, reconstructed) {
  const n = Math.min(reference.length, reconstructed.length);
  if (!n) return { rms: 0, max: 0, relative: 0 };
  let sum = 0;
  let max = 0;
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(reference[i].x - reconstructed[i].x, reference[i].y - reconstructed[i].y);
    sum += d * d;
    if (d > max) max = d;
  }
  const rms = Math.sqrt(sum / n);
  const box = bounds(reference);
  const diagonal = Math.hypot(box.maxX - box.minX, box.maxY - box.minY) || 1;
  return { rms: round(rms, 5), max: round(max, 5), relative: round(rms / diagonal, 5) };
}

/** Build the editable document. Contains harmonics only, never image data. */
export function buildFourierDocument(result, { name = 'Traced contour', size = 420, samples = 1200 } = {}) {
  if (!result?.ok) throw new Error('Cannot build a document from an empty trace');
  return createDocument('fourier', {
    name,
    generator: {
      params: {
        harmonicsX: result.harmonicsX,
        harmonicsY: result.harmonicsY,
        samples,
        size,
      },
    },
  });
}

function normalizePoints(points) {
  const n = points.length;
  let cx = 0;
  let cy = 0;
  for (const point of points) {
    cx += point.x;
    cy += point.y;
  }
  cx /= n;
  cy /= n;
  let maxRadius = EPS;
  for (const point of points) {
    maxRadius = Math.max(maxRadius, Math.hypot(point.x - cx, point.y - cy));
  }
  return points.map((point) => ({
    x: (point.x - cx) / maxRadius,
    y: (point.y - cy) / maxRadius,
  }));
}

function bounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  return { minX, minY, maxX, maxY };
}

function round(value, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, lo, hi) {
  if (!Number.isFinite(value)) return lo;
  return Math.min(hi, Math.max(lo, value));
}
