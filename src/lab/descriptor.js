/**
 * descriptor.js — deterministic figure descriptor (version 1).
 *
 * Pure and DOM-free. The descriptor is computed from already-evaluated
 * curves, never from pixels. It is the shared language of the analysis
 * panel, the future notebook and the AI advisor.
 *
 * Contract: openspec/specs/figure-observation/spec.md
 */

import { analyzeCurve } from '../analysis/differential.js';
import { bboxAll, resampleUniform } from '../sampling/sampling.js';
import { selfIntersections, polylineIntersections } from '../analysis/intersections.js';
import { canonicalStringify, sha256Hex } from './hash.js';

const EPS = 1e-9;
const INTERSECTION_POINT_BUDGET = 160;
const SYMMETRY_BINS = 128;

/**
 * @param {object} document
 * @param {Array<{points:Array, closed:boolean}>} curves
 * @param {{hash?: boolean}} options
 */
export function computeDescriptor(document, curves, { hash = true, layers = null } = {}) {
  const safeCurves = Array.isArray(curves) ? curves.filter((c) => c && Array.isArray(c.points)) : [];
  const box = bboxAll(safeCurves);
  const analyses = safeCurves.map((c) => analyzeCurve(c.points, c.closed));

  const curveCount = safeCurves.length;
  const pointCount = safeCurves.reduce((sum, c) => sum + c.points.length, 0);
  const closed = curveCount > 0 && safeCurves.every((c) => c.closed);

  let area = 0;
  let perimeter = 0;
  let areaWeight = 0;
  let centroidX = 0;
  let centroidY = 0;
  for (let i = 0; i < safeCurves.length; i++) {
    const c = safeCurves[i];
    const a = analyses[i];
    perimeter += a.arcLength;
    if (c.closed) {
      const absArea = Math.abs(a.area);
      area += absArea;
      areaWeight += absArea;
      centroidX += a.centroid.x * absArea;
      centroidY += a.centroid.y * absArea;
    }
  }
  if (areaWeight > EPS) {
    centroidX /= areaWeight;
    centroidY /= areaWeight;
  } else if (pointCount > 0) {
    let sx = 0;
    let sy = 0;
    for (const c of safeCurves) for (const p of c.points) { sx += p.x; sy += p.y; }
    centroidX = sx / pointCount;
    centroidY = sy / pointCount;
  } else {
    centroidX = 0;
    centroidY = 0;
  }

  const compactness = perimeter > EPS ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
  const curvature = curvatureStats(analyses);
  const inflections = analyses.reduce((sum, a) => sum + a.inflections.length, 0);
  const intersections = countIntersections(safeCurves, pointCount);
  const fourier = fourierStats(safeCurves, analyses);
  const complexity = complexityStats(safeCurves);
  const topology = topologyStats(safeCurves, analyses);
  const layerDescriptors = Array.isArray(layers)
    ? layers.filter((layer) => layer.visible !== false).map((layer) => {
      const layerDocument = {
        ...document,
        generator: layer.generator,
        operators: layer.operators,
        layers: undefined,
      };
      return {
        ...computeDescriptor(layerDocument, layer.curves ?? [], { hash: false }),
        layerId: layer.id,
        layerName: layer.name,
      };
    })
    : undefined;

  return {
    version: 1,
    documentHash: hash ? sha256Hex(canonicalStringify(document)) : '',
    generator: {
      id: document?.generator?.id ?? '',
      params: document?.generator?.params ?? {},
      mods: document?.generator?.mods ?? {},
    },
    operators: (document?.operators ?? []).map((op) => ({
      id: op.id,
      enabled: op.enabled !== false,
      params: op.params ?? {},
      mods: op.mods ?? {},
    })),
    curveCount,
    pointCount,
    closed,
    bbox: {
      minX: finite(box.minX),
      minY: finite(box.minY),
      maxX: finite(box.maxX),
      maxY: finite(box.maxY),
      width: finite(box.width),
      height: finite(box.height),
      aspect: box.height > EPS ? finite(box.width / box.height) : 0,
    },
    area: finite(area),
    perimeter: finite(perimeter),
    compactness: finite(compactness),
    centroid: { x: finite(centroidX), y: finite(centroidY) },
    symmetry: symmetryStats(safeCurves, analyses, box),
    curvature,
    inflections,
    selfIntersections: intersections.self,
    crossings: intersections.total,
    analysis: { intersectionsSampled: intersections.sampled },
    fourier,
    complexity,
    coverage: coverageStats(safeCurves, box),
    topology,
    ...(layerDescriptors ? { layers: layerDescriptors } : {}),
  };
}

function curvatureStats(analyses) {
  const values = [];
  for (const a of analyses) {
    for (let i = 0; i < a.curvatures.length; i++) {
      const v = Math.abs(a.curvatures[i]);
      if (Number.isFinite(v)) values.push(v);
    }
  }
  if (!values.length) return { mean: 0, p95: 0, entropy: 0 };

  values.sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const p95 = values[Math.min(values.length - 1, Math.floor(values.length * 0.95))];
  const max = values[values.length - 1];
  const hist = new Array(32).fill(0);
  if (max > EPS) {
    for (const v of values) {
      const bin = Math.min(31, Math.floor((v / max) * 32));
      hist[bin]++;
    }
  } else {
    hist[0] = values.length;
  }
  let entropy = 0;
  for (const count of hist) {
    if (!count) continue;
    const p = count / values.length;
    entropy -= p * Math.log2(p);
  }
  return {
    mean: finite(mean),
    p95: finite(p95),
    entropy: finite(entropy / Math.log2(32)),
  };
}

function countIntersections(curves, pointCount) {
  if (!curves.length) return { self: 0, total: 0, sampled: false };
  const sampled = pointCount > INTERSECTION_POINT_BUDGET;
  const budgetCurves = sampled
    ? decimateCurves(curves, INTERSECTION_POINT_BUDGET)
    : curves;

  let self = 0;
  for (const c of budgetCurves) {
    if (c.points.length < 4) continue;
    self += selfIntersections(c.points, { closed: c.closed }).length;
  }
  let between = 0;
  for (let i = 0; i < budgetCurves.length; i++) {
    for (let j = i + 1; j < budgetCurves.length; j++) {
      between += polylineIntersections(budgetCurves[i].points, budgetCurves[j].points, {
        closedA: budgetCurves[i].closed,
        closedB: budgetCurves[j].closed,
      }).length;
    }
  }
  return { self, total: self + between, sampled };
}

function decimateCurves(curves, budget) {
  const total = curves.reduce((s, c) => s + c.points.length, 0) || 1;
  return curves.map((c) => {
    const target = Math.max(2, Math.floor((c.points.length / total) * budget));
    return { ...c, points: resampleUniform(c.points, target, c.closed) };
  });
}

function symmetryStats(curves, analyses, box) {
  const closed = curves
    .map((c, i) => ({ c, a: analyses[i] }))
    .filter(({ c }) => c.closed && c.points.length >= 8)
    .sort((x, y) => y.a.arcLength - x.a.arcLength);
  if (!closed.length) return { folds: 1, score: 0 };

  const target = closed[0].c;
  const points = resampleUniform(target.points, SYMMETRY_BINS, true);
  const cx = box.cx;
  const cy = box.cy;
  const sig = new Float64Array(SYMMETRY_BINS);
  for (let i = 0; i < SYMMETRY_BINS; i++) {
    const p = points[i];
    sig[i] = Math.hypot(p.x - cx, p.y - cy);
  }

  const mean = sig.reduce((s, v) => s + v, 0) / SYMMETRY_BINS;
  let variance = 0;
  for (let i = 0; i < SYMMETRY_BINS; i++) variance += (sig[i] - mean) ** 2;
  const std = Math.sqrt(variance / SYMMETRY_BINS);
  // A constant radial signature (circle) has only floating-point noise;
  // treat it as continuously symmetric rather than reporting a spurious fold.
  if (std < Math.max(1e-6, Math.abs(mean) * 1e-3)) return { folds: 1, score: 1 };

  for (let i = 0; i < SYMMETRY_BINS; i++) sig[i] = (sig[i] - mean) / std;

  const correlations = new Float64Array(SYMMETRY_BINS);
  let bestCorr = -Infinity;
  for (let shift = 1; shift < SYMMETRY_BINS; shift++) {
    let corr = 0;
    for (let i = 0; i < SYMMETRY_BINS; i++) {
      corr += sig[i] * sig[(i + shift) % SYMMETRY_BINS];
    }
    corr /= SYMMETRY_BINS;
    correlations[shift] = corr;
    if (corr > bestCorr) bestCorr = corr;
  }

  // Prefer the smallest shift that is nearly as good as the best one:
  // a 6-fold rosette also correlates at 2-fold and 3-fold shifts.
  const threshold = Math.max(0.5, bestCorr * 0.985);
  let bestShift = 1;
  for (let shift = 1; shift < SYMMETRY_BINS; shift++) {
    if (correlations[shift] >= threshold) {
      bestShift = shift;
      break;
    }
  }

  const folds = Math.max(1, Math.min(32, Math.round(SYMMETRY_BINS / bestShift)));
  return { folds, score: Math.max(0, Math.min(1, bestCorr)) };
}

function fourierStats(curves, analyses) {
  if (!curves.length) return { topHarmonics: [], spectralCentroid: 0 };
  const ranked = curves
    .map((c, i) => ({ c, a: analyses[i] }))
    .filter(({ c }) => c.points.length >= 8)
    .sort((x, y) => {
      if (x.c.closed !== y.c.closed) return x.c.closed ? -1 : 1;
      return y.a.arcLength - x.a.arcLength;
    });
  if (!ranked.length) return { topHarmonics: [], spectralCentroid: 0 };

  const target = ranked[0].c;
  const N = 512;
  const points = resampleUniform(target.points, N, target.closed);
  const maxHarmonic = Math.min(32, Math.floor(N / 2) - 1);
  const amps = [];
  for (let n = 1; n <= maxHarmonic; n++) {
    let re = 0;
    let im = 0;
    for (let k = 0; k < N; k++) {
      const angle = (2 * Math.PI * n * k) / N;
      re += points[k].x * Math.cos(angle) + points[k].y * Math.sin(angle);
      im += points[k].y * Math.cos(angle) - points[k].x * Math.sin(angle);
    }
    amps.push({ n, amp: (2 * Math.hypot(re, im)) / N });
  }
  const total = amps.reduce((s, h) => s + h.amp, 0);
  const top = [...amps].sort((a, b) => b.amp - a.amp).slice(0, 5).map((h) => h.n);
  const centroid = total > EPS
    ? amps.reduce((s, h) => s + h.n * h.amp, 0) / total
    : 0;
  return {
    topHarmonics: top,
    spectralCentroid: finite(centroid),
  };
}

function complexityStats(curves) {
  if (!curves.length) return { turningNumber: 0, fractalDimension: 1 };
  const target = curves.reduce((best, c) => (c.points.length > best.points.length ? c : best), curves[0]);
  // Sample as an open polyline: the closing segment is a rendering concern
  // and would create a spurious hairpin at a near-duplicate endpoint.
  const points = resampleUniform(target.points, 256, false);

  let turning = 0;
  for (let i = 1; i < points.length - 1; i++) {
    turning += angleBetween(points[i - 1], points[i], points[i + 1]);
  }
  const turningNumber = Math.abs(turning) / (2 * Math.PI);
  return {
    turningNumber: finite(turningNumber),
    fractalDimension: finite(boxDimension(points)),
  };
}

function angleBetween(a, b, c) {
  const ax = b.x - a.x; const ay = b.y - a.y;
  const bx = c.x - b.x; const by = c.y - b.y;
  const cross = ax * by - ay * bx;
  const dot = ax * bx + ay * by;
  return Math.atan2(cross, dot);
}

function boxDimension(points) {
  const box = bboxAll([{ points }]);
  const diagonal = box.diagonal;
  if (!Number.isFinite(diagonal) || diagonal < EPS) return 1;
  const divisions = [8, 16, 32, 64];
  const xs = [];
  const ys = [];
  for (const n of divisions) {
    const size = diagonal / n;
    const cells = new Set();
    for (const p of points) {
      const x = Math.floor((p.x - box.minX) / size);
      const y = Math.floor((p.y - box.minY) / size);
      cells.add(`${x},${y}`);
    }
    xs.push(Math.log(n));
    ys.push(Math.log(Math.max(1, cells.size)));
  }
  const meanX = xs.reduce((s, v) => s + v, 0) / xs.length;
  const meanY = ys.reduce((s, v) => s + v, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return Math.max(1, Math.min(2, den > EPS ? num / den : 1));
}

function coverageStats(curves, box) {
  if (!curves.length || box.width < EPS || box.height < EPS) return 0;
  const G = 64;
  const cells = new Set();
  const cellW = box.width / G;
  const cellH = box.height / G;
  for (const c of curves) {
    for (const p of c.points) {
      const x = Math.min(G - 1, Math.max(0, Math.floor((p.x - box.minX) / cellW)));
      const y = Math.min(G - 1, Math.max(0, Math.floor((p.y - box.minY) / cellH)));
      cells.add(y * G + x);
    }
  }
  return finite(cells.size / (G * G));
}

function topologyStats(curves, analyses) {
  const components = countComponents(curves);
  let holes = 0;
  for (let i = 0; i < curves.length; i++) {
    if (!curves[i].closed || curves[i].points.length < 4) continue;
    const innerArea = Math.abs(analyses[i].area);
    for (let j = 0; j < curves.length; j++) {
      if (i === j || !curves[j].closed || curves[j].points.length < 4) continue;
      const outerArea = Math.abs(analyses[j].area);
      if (outerArea <= innerArea + EPS) continue;
      const probe = analyses[i].centroid;
      if (pointInPolygon(probe, curves[j].points)) {
        holes++;
        break;
      }
    }
  }
  return { components, holes };
}

function countComponents(curves) {
  const n = curves.length;
  if (!n) return 0;
  const boxes = curves.map((c) => bboxAll([c]));
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (boxesOverlap(boxes[i], boxes[j])) union(i, j);
    }
  }
  const roots = new Set();
  for (let i = 0; i < n; i++) roots.add(find(i));
  return roots.size;
}

function boxesOverlap(a, b) {
  return (
    a.minX <= b.maxX + 1e-6 && b.minX <= a.maxX + 1e-6 &&
    a.minY <= b.maxY + 1e-6 && b.minY <= a.maxY + 1e-6
  );
}

function pointInPolygon(pt, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (
      a.y > pt.y !== b.y > pt.y &&
      pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function finite(value) {
  return Number.isFinite(value) ? value : 0;
}
