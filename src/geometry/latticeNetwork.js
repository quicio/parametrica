/**
 * geometry/latticeNetwork.js — deterministic cellular network on a surface of
 * revolution.
 *
 * The network is derived from a normalized LatticeSpec. It exposes nodes,
 * edges, cells and opening widths; the generator still consumes the edge
 * curves for preview. The unrolled metric `X = θ·R_ref` is an approximation:
 * cell areas are measured on the surface, distances are not geodesic.
 */

import {
  LATTICE_ALGORITHM_VERSION,
  latticeSpecHash,
  normalizeLatticeSpec,
} from './latticeSpec.js';

const TAU = Math.PI * 2;
const EPS = 1e-6;

export function buildRevolveLattice(options = {}) {
  const started = now();
  const {
    radiusAt,
    densityAt = null,
    samples = 6,
    seedWeight = 'radius2',
    spec: providedSpec = null,
    densityError = null,
  } = options;
  const spec = providedSpec ?? normalizeLatticeSpec(options);
  const height = spec.surface.height;
  const zMin = spec.surface.zMin;
  const zMax = spec.surface.zMax;
  const cellSize = spec.cell.targetSize;
  const density = spec.cell.density;
  const strutRadius = spec.clearance.strutDiameter / 2;
  const minOpeningWidth = spec.clearance.minOpeningWidth;
  const zScale = 1 / Math.max(0.25, spec.cell.aspect);
  const zMinScaled = zMin * zScale;
  const zMaxScaled = zMax * zScale;
  const specHash = latticeSpecHash(spec);
  const radiusAtV = (v) => {
    const value = Number(radiusAt?.(Math.max(0, Math.min(1, v))));
    return Number.isFinite(value) && value > 1e-6 ? value : 1e-6;
  };
  const radiusAtZ = (z) => radiusAtV(z / height);
  const densityAtPoint = (theta, z) => {
    const value = Number(densityAt?.(theta, z));
    return Number.isFinite(value) && value > 0 ? value : density;
  };
  const densityAtZ = (z) => {
    let total = 0;
    const samplesTheta = 8;
    for (let i = 0; i < samplesTheta; i++) {
      total += densityAtPoint((TAU * i) / samplesTheta, z);
    }
    return total / samplesTheta;
  };

  const M = 192;
  let area = 0;
  let radiusIntegral = 0;
  for (let i = 0; i < M; i++) {
    const z0 = zMin + ((zMax - zMin) * i) / M;
    const z1 = zMin + ((zMax - zMin) * (i + 1)) / M;
    const r0 = radiusAtZ(z0);
    const r1 = radiusAtZ(z1);
    const dz = z1 - z0;
    area += Math.PI * (r0 + r1) * Math.hypot(dz, r1 - r0);
    radiusIntegral += ((r0 + r1) / 2) * dz;
  }
  const meanRadius = radiusIntegral / Math.max(1e-9, zMax - zMin);
  const period = meanRadius * TAU;
  const meanDensity = meanDensityOver(zMin, zMax, densityAtZ);
  let count = Math.max(4, Math.round((area * meanDensity) / (cellSize * cellSize)));
  const budgetExceeded = count > spec.budget.maxCells;
  if (budgetExceeded) count = spec.budget.maxCells;
  const maxRadius = Math.max(...Array.from({ length: 64 }, (_, i) => radiusAtZ(zMin + ((zMax - zMin) * i) / 63)));
  const maxDensity = maxDensityOver(zMin, zMax, densityAtZ);
  const maxWeight = (seedWeight === 'radius' ? maxRadius : maxRadius * maxRadius) * maxDensity;

  const random = mulberry32(hashSeed(spec.cell.seed));
  const seeds = [];
  let guard = count * 64 + 1024;
  while (seeds.length < count && guard-- > 0) {
    const z = zMin + (zMax - zMin) * random();
    const theta = random() * TAU;
    const radius = radiusAtZ(z);
    const weight = (seedWeight === 'radius' ? radius : radius * radius)
      * densityAtPoint(theta, z);
    if (random() * maxWeight > weight) continue;
    seeds.push({
      theta,
      z,
      x: theta * meanRadius,
      zs: z * zScale,
    });
  }
  if (seeds.length < 4) {
    return emptyNetwork({ spec, area, meanRadius, cellSize, specHash, densityError });
  }

  // Extra jitter is the controlled organic knob. 0 keeps the area-weighted
  // seed field; higher values perturb it before the power/Lloyd solve.
  const jitter = spec.cell.irregularity * cellSize * 0.35;
  if (jitter > 0) {
    for (const seed of seeds) {
      seed.x += (random() - 0.5) * jitter;
      seed.z = clamp(seed.z + (random() - 0.5) * jitter, zMin, zMax);
      seed.zs = seed.z * zScale;
      seed.theta = seed.x / meanRadius;
    }
  }

  const weights = new Array(seeds.length).fill(0);
  const maxPowerWeight = cellSize * cellSize * 8;
  let cellEntries;
  for (let iteration = 0; iteration < spec.cell.relaxation; iteration++) {
    cellEntries = powerCells(seeds, weights, {
      period,
      zMinScaled,
      zMaxScaled,
      cellSize,
      zScale,
    });
    for (const { polygon, owner } of cellEntries) {
      const centroid = polygonCentroid(polygon);
      if (!centroid) continue;
      const centroidZ = centroid[1] / zScale;
      const target = targetAreaAt(
        cellSize,
        densityAtPoint(centroid[0] / meanRadius, clamp(centroidZ, zMin, zMax)),
      );
      const surfaceArea = surfaceAreaOfPolygon(
        polygon,
        meanRadius,
        zScale,
        radiusAtV,
        height,
      );
      const boundary = polygonTouchesBand(polygon, zMinScaled, zMaxScaled);
      if (!boundary) {
        weights[owner] = clamp(
          weights[owner] + 0.18 * (target - surfaceArea),
          -maxPowerWeight,
          maxPowerWeight,
        );
        let x = centroid[0];
        while (x - seeds[owner].x > period / 2) x -= period;
        while (x - seeds[owner].x < -period / 2) x += period;
        seeds[owner].x = x;
        seeds[owner].theta = x / meanRadius;
        seeds[owner].z = clamp(centroidZ, zMin, zMax);
        seeds[owner].zs = seeds[owner].z * zScale;
      }
    }
  }
  cellEntries = powerCells(seeds, weights, {
    period,
    zMinScaled,
    zMaxScaled,
    cellSize,
    zScale,
  });

  const cellsData = [];
  const nodesById = new Map();
  const edgesByKey = new Map();
  let minCellArea = Infinity;
  let maxCellArea = 0;
  let totalCellArea = 0;
  let interiorCellAreaSquares = 0;
  let interiorCellAreaTotal = 0;
  let interiorCellCount = 0;
  let boundaryCellCount = 0;
  let openingsBelowTarget = 0;
  let minOpeningWidthActual = Infinity;
  let maxOpeningWidthActual = 0;
  let totalOpeningWidth = 0;

  for (const entry of cellEntries) {
    const polygon = entry.polygon;
    const index = entry.owner;
    const actualPolygon = polygon.map(([x, zs]) => [x / meanRadius, zs / zScale]);
    const xzPolygon = actualPolygon.map(([theta, z]) => [theta * meanRadius, z]);
    const surfaceArea = surfaceAreaOfPolygon(
      polygon,
      meanRadius,
      zScale,
      radiusAtV,
      height,
    );
    const centroid = polygonCentroid(polygon);
    const centroidZ = centroid ? centroid[1] / zScale : zMin;
    const targetArea = targetAreaAt(
      cellSize,
      densityAtPoint(centroid ? centroid[0] / meanRadius : 0, clamp(centroidZ, zMin, zMax)),
    );
    const boundary = polygonTouchesBand(polygon, zMinScaled, zMaxScaled) || actualPolygon.some(
      ([, z]) => z <= zMin + EPS || z >= zMax - EPS,
    );
    const opening = insetConvexPolygon(xzPolygon, strutRadius);
    const openingWidth = opening.length >= 3 ? polygonInradius(opening) * 2 : 0;
    const openingArea = opening.length >= 3 ? polygonArea2d(opening) : 0;
    const invalidOpening = openingWidth + EPS < minOpeningWidth;
    const openingCentroid = opening.length >= 3 ? polygonCentroid(opening) : null;
    const openingCenter = {
      theta: openingCentroid ? normalizeTheta(openingCentroid[0] / meanRadius) : normalizeTheta(centroid ? centroid[0] / meanRadius : 0),
      z: openingCentroid ? openingCentroid[1] : clamp(centroidZ, zMin, zMax),
    };
    const cellId = `c-${index}`;
    const nodeIds = actualPolygon.map(([theta, z]) => {
      const key = vertexKey(theta, z);
      if (!nodesById.has(key)) {
        const point = surfacePoint(normalizeTheta(theta), z, radiusAtV, height);
        nodesById.set(key, {
          id: `n-${key}`,
          u: normalizeTheta(theta),
          v: z / height,
          x: point.x,
          y: point.y,
          z: point.z,
          degree: 0,
          boundary: z <= zMin + EPS || z >= zMax - EPS,
        });
      }
      return nodesById.get(key).id;
    });
    const cell = {
      id: cellId,
      nodeIds,
      polygon: actualPolygon,
      surfaceArea,
      targetArea,
      openingPolygon: opening.map(([x, z]) => [x / meanRadius, z]),
      openingCenter,
      openingWidth,
      openingArea,
      boundary,
      invalidOpening,
      mergedInto: null,
    };
    cellsData.push(cell);
    minCellArea = Math.min(minCellArea, surfaceArea);
    maxCellArea = Math.max(maxCellArea, surfaceArea);
    totalCellArea += surfaceArea;
    if (!boundary) {
      interiorCellCount += 1;
      interiorCellAreaTotal += surfaceArea;
      interiorCellAreaSquares += surfaceArea * surfaceArea;
      minOpeningWidthActual = Math.min(minOpeningWidthActual, openingWidth);
      maxOpeningWidthActual = Math.max(maxOpeningWidthActual, openingWidth);
      totalOpeningWidth += openingWidth;
    }
    if (boundary) boundaryCellCount += 1;
    if (invalidOpening) openingsBelowTarget += 1;

    for (let i = 0; i < actualPolygon.length; i++) {
      const a = actualPolygon[i];
      const b = actualPolygon[(i + 1) % actualPolygon.length];
      const thetaA = a[0];
      const thetaB = b[0];
      const keyA = vertexKey(thetaA, a[1]);
      const keyB = vertexKey(thetaB, b[1]);
      if (keyA === keyB) continue;
      const key = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
      let edge = edgesByKey.get(key);
      if (!edge) {
        const pa = surfacePoint(normalizeTheta(thetaA), a[1], radiusAtV, height);
        const pb = surfacePoint(normalizeTheta(thetaB), b[1], radiusAtV, height);
        const length = Math.hypot(pb.x - pa.x, pb.y - pa.y, pb.z - pa.z);
        if (length < Math.max(1.5, cellSize * 0.1)) continue;
        edge = {
          id: `e-${key}`,
          a: nodesById.get(keyA)?.id ?? `n-${keyA}`,
          b: nodesById.get(keyB)?.id ?? `n-${keyB}`,
          length,
          samples: [],
          cellIds: [],
        };
        const steps = Math.max(2, Math.floor(samples) || 6);
        for (let step = 0; step < steps; step++) {
          const t = step / (steps - 1);
          const theta = thetaA + (thetaB - thetaA) * t;
          const z = a[1] + (b[1] - a[1]) * t;
          edge.samples.push(surfacePoint(theta, z, radiusAtV, height));
        }
        edgesByKey.set(key, edge);
      }
      if (!edge.cellIds.includes(cellId)) edge.cellIds.push(cellId);
    }
  }

  for (const edge of edgesByKey.values()) {
    const nodeA = nodesById.get(edgeKeyForNode(edge.a));
    const nodeB = nodesById.get(edgeKeyForNode(edge.b));
    if (nodeA) nodeA.degree += 1;
    if (nodeB) nodeB.degree += 1;
  }

  const meanCellArea = cellsData.length ? totalCellArea / cellsData.length : 0;
  const interiorMeanArea = interiorCellCount ? interiorCellAreaTotal / interiorCellCount : 0;
  const interiorVariance = interiorCellCount
    ? Math.max(0, interiorCellAreaSquares / interiorCellCount - interiorMeanArea * interiorMeanArea)
    : 0;
  const cellAreaCv = interiorMeanArea > 0 ? Math.sqrt(interiorVariance) / interiorMeanArea : 0;
  const curves = Array.from(edgesByKey.values()).map((edge) => ({
    points: edge.samples,
    length: edge.length,
    edgeId: edge.id,
    cellIds: [...edge.cellIds],
    meta: { lattice: true, edgeId: edge.id },
  }));
  curves.sort((a, b) => (a.points[0].z - b.points[0].z) || (a.points[0].x - b.points[0].x));

  const minEdge = curves.reduce((min, curve) => Math.min(min, curve.length), Infinity);
  const maxEdge = curves.reduce((max, curve) => Math.max(max, curve.length), 0);
  const totalEdge = curves.reduce((sum, curve) => sum + curve.length, 0);
  const nodes = Array.from(nodesById.values());
  const edges = Array.from(edgesByKey.values());
  const floorCells = cellsData.filter((cell) => cell.boundary && cell.polygon.some(([, z]) => z <= zMin + EPS));
  const rimCells = cellsData.filter((cell) => cell.boundary && cell.polygon.some(([, z]) => z >= zMax - EPS));
  const networkHash = hashString(
    `${specHash}:${cellsData.map((cell) => cell.id).join('|')}:${edges.map((edge) => edge.id).join('|')}`,
  );

  return {
    spec,
    specHash,
    networkHash,
    algorithmVersion: LATTICE_ALGORITHM_VERSION,
    curves,
    seeds: seeds.map((seed, index) => ({ theta: seed.theta, z: seed.z, cellId: `c-${index}` })),
    nodes,
    edges,
    cells: cellsData,
    bands: {
      floor: { zMin, zMax: zMin, cellIds: floorCells.map((cell) => cell.id) },
      rim: { zMin: zMax, zMax, cellIds: rimCells.map((cell) => cell.id) },
    },
    stats: {
      cells: cellsData.length,
      interiorCellCount,
      boundaryCellCount,
      seeds: seeds.length,
      nodes: nodes.length,
      edges: edges.length,
      area,
      meanRadius,
      cellSize,
      seed: spec.cell.seed,
      specHash,
      algorithmVersion: LATTICE_ALGORITHM_VERSION,
      densityMode: spec.cell.densityMode,
      densityError,
      boundaryMode: spec.cell.boundaryMode,
      iterations: spec.cell.relaxation,
      budgetExceeded,
      minEdge: Number.isFinite(minEdge) ? minEdge : 0,
      maxEdge,
      meanEdge: curves.length ? totalEdge / curves.length : 0,
      minCellArea: Number.isFinite(minCellArea) ? minCellArea : 0,
      maxCellArea,
      meanCellArea,
      cellAreaCv,
      networkHash,
      minOpeningWidth: Number.isFinite(minOpeningWidthActual) ? minOpeningWidthActual : 0,
      maxOpeningWidth: maxOpeningWidthActual,
      meanOpeningWidth: interiorCellCount ? totalOpeningWidth / interiorCellCount : 0,
      openingsBelowTarget,
      generationMs: Math.round(now() - started),
    },
  };
}

function emptyNetwork({ spec, area, meanRadius, cellSize, specHash, densityError }) {
  return {
    spec,
    specHash,
    networkHash: `${specHash}-empty`,
    algorithmVersion: LATTICE_ALGORITHM_VERSION,
    curves: [],
    seeds: [],
    nodes: [],
    edges: [],
    cells: [],
    bands: { floor: { zMin: spec.surface.zMin, zMax: spec.surface.zMin, cellIds: [] }, rim: { zMin: spec.surface.zMax, zMax: spec.surface.zMax, cellIds: [] } },
    stats: {
      cells: 0, interiorCellCount: 0, boundaryCellCount: 0, seeds: 0, nodes: 0,
      edges: 0, area, meanRadius, cellSize, seed: spec.cell.seed, specHash,
      algorithmVersion: LATTICE_ALGORITHM_VERSION, densityMode: spec.cell.densityMode,
      densityError, boundaryMode: spec.cell.boundaryMode, iterations: 0,
      budgetExceeded: false, minEdge: 0, maxEdge: 0, meanEdge: 0,
      minCellArea: 0, maxCellArea: 0, meanCellArea: 0, cellAreaCv: 0,
      minOpeningWidth: 0, maxOpeningWidth: 0, meanOpeningWidth: 0,
      openingsBelowTarget: 0, generationMs: 0,
    },
  };
}

function powerCells(seeds, weights, { period, zMinScaled, zMaxScaled, cellSize, zScale }) {
  const cells = [];
  for (let i = 0; i < seeds.length; i++) {
    const own = seeds[i];
    const ownZ = own.zs ?? own.z * zScale;
    let polygon = [
      [own.x - period, zMinScaled],
      [own.x + period, zMinScaled],
      [own.x + period, zMaxScaled],
      [own.x - period, zMaxScaled],
    ];
    for (let j = 0; j < seeds.length && polygon.length >= 3; j++) {
      const otherZ = seeds[j].zs ?? seeds[j].z * zScale;
      for (let k = -1; k <= 1; k++) {
        if (j === i && k === 0) continue;
        const otherX = seeds[j].x + k * period;
        const dx = otherX - own.x;
        const dz = otherZ - ownZ;
        if (Math.hypot(dx, dz) > cellSize * 3.2) continue;
        const c = otherX * otherX + otherZ * otherZ
          - own.x * own.x - ownZ * ownZ
          + (weights[i] ?? 0) - (weights[j] ?? 0);
        polygon = clipHalfPlane(polygon, 2 * dx, 2 * dz, c);
      }
    }
    if (polygon.length >= 3) cells.push({ owner: i, polygon });
  }
  return cells;
}

function surfaceAreaOfPolygon(polygon, meanRadius, zScale, radiusAtV, height) {
  const points = polygon.map(([x, zs]) => {
    const theta = x / meanRadius;
    const z = zs / zScale;
    return surfacePoint(theta, z, radiusAtV, height);
  });
  return polygonArea3d(points);
}

function targetAreaAt(cellSize, density) {
  const safeDensity = Number.isFinite(density) && density > 0 ? density : 1;
  return (cellSize * cellSize) / safeDensity;
}

function polygonTouchesBand(polygon, zMinScaled, zMaxScaled) {
  return polygon.some(([, zs]) => zs <= zMinScaled + EPS || zs >= zMaxScaled - EPS);
}

function polygonCentroid(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return null;
  let twiceArea = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = a[0] * b[1] - b[0] * a[1];
    twiceArea += cross;
    cx += (a[0] + b[0]) * cross;
    cz += (a[1] + b[1]) * cross;
  }
  if (Math.abs(twiceArea) < 1e-9) return null;
  return [cx / (3 * twiceArea), cz / (3 * twiceArea)];
}

/** Inset a convex polygon by distance, using the existing half-plane clip. */
function insetConvexPolygon(polygon, distance) {
  if (distance <= 0 || !Array.isArray(polygon) || polygon.length < 3) return polygon;
  let result = polygon.map((point) => [...point]);
  for (let i = 0; i < polygon.length && result.length >= 3; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    if (length < 1e-9) continue;
    const nx = -dz / length;
    const nz = dx / length;
    const ax = a[0] + nx * distance;
    const az = a[1] + nz * distance;
    result = clipHalfPlane(result, dz, -dx, dz * ax - dx * az);
  }
  return result;
}

function polygonInradius(polygon) {
  const centroid = polygonCentroid(polygon);
  if (!centroid) return 0;
  let min = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    if (length < 1e-9) continue;
    const distance = Math.abs(dx * (centroid[1] - a[1]) - dz * (centroid[0] - a[0])) / length;
    min = Math.min(min, distance);
  }
  return Number.isFinite(min) ? min : 0;
}

function polygonArea2d(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(area) / 2;
}

function surfacePoint(theta, z, radiusAtV, height) {
  const v = Math.max(0, Math.min(1, z / height));
  const radius = radiusAtV(v);
  return {
    x: radius * Math.cos(theta),
    y: radius * Math.sin(theta),
    z,
  };
}

function polygonArea3d(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    nx += a.y * b.z - a.z * b.y;
    ny += a.z * b.x - a.x * b.z;
    nz += a.x * b.y - a.y * b.x;
  }
  return 0.5 * Math.hypot(nx, ny, nz);
}

function vertexKey(theta, z) {
  return `${Math.round(normalizeTheta(theta) * 1e5)}:${Math.round(z * 1e3)}`;
}

function normalizeTheta(theta) {
  return ((theta % TAU) + TAU) % TAU;
}

function edgeKeyForNode(nodeId) {
  return String(nodeId ?? '').replace(/^n-/, '');
}

/** Sutherland–Hodgman clip against a·x + b·z <= c. */
function clipHalfPlane(polygon, a, b, c) {
  if (!Array.isArray(polygon) || polygon.length < 3) return [];
  const out = [];
  const eps = 1e-9;
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i];
    const q = polygon[(i + 1) % polygon.length];
    const dp = a * p[0] + b * p[1] - c;
    const dq = a * q[0] + b * q[1] - c;
    if (dp <= eps) out.push(p);
    if ((dp < -eps && dq > eps) || (dp > eps && dq < -eps)) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

function meanDensityOver(zMin, zMax, densityAtZ) {
  let total = 0;
  const samples = 64;
  for (let i = 0; i < samples; i++) {
    total += densityAtZ(zMin + ((zMax - zMin) * (i + 0.5)) / samples);
  }
  return total / samples;
}

function maxDensityOver(zMin, zMax, densityAtZ) {
  let max = 0.25;
  const samples = 64;
  for (let i = 0; i < samples; i++) {
    max = Math.max(max, densityAtZ(zMin + ((zMax - zMin) * i) / (samples - 1)));
  }
  return max;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(seed) {
  const value = Number.isFinite(Number(seed)) ? Math.floor(Number(seed)) : 1;
  return (value * 2654435761 + 0x9e3779b9) >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
function mulberry32(a) {
  return function next() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
