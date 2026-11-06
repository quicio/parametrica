/**
 * geometry/latticeNetwork.js — deterministic cellular strut network on a
 * surface of revolution.
 *
 * The profile is unrolled into a cylinder of nominal radius so cells are
 * roughly the requested size in millimetres. Seed points are area-weighted
 * to follow the real lateral surface, then clipped into a periodic Voronoi
 * diagram. The output is the shared cell-edge network (the future struts),
 * not a closed solid.
 */

const TAU = Math.PI * 2;

export function buildRevolveLattice({
  radiusAt,
  height = 200,
  top = null,
  floor = 3,
  cellSize = 20,
  seed = 1,
  samples = 6,
} = {}) {
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 200;
  const safeCell = Math.max(4, Number(cellSize) || 20);
  const zMin = Math.max(0, Math.min(Number(floor) || 0, safeHeight * 0.5));
  const hasTop = top !== null && top !== undefined && Number.isFinite(Number(top));
  const requestedTop = hasTop ? Number(top) : safeHeight;
  const zMax = Math.max(zMin + 1, Math.min(safeHeight, requestedTop));
  const radiusAtV = (v) => {
    const value = Number(radiusAt?.(Math.max(0, Math.min(1, v))));
    return Number.isFinite(value) && value > 1e-6 ? value : 1e-6;
  };
  const radiusAtZ = (z) => radiusAtV(z / safeHeight);

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
  const count = Math.max(4, Math.round(area / (safeCell * safeCell)));
  const maxRadius = Math.max(...Array.from({ length: 64 }, (_, i) => radiusAtZ(zMin + ((zMax - zMin) * i) / 63)));

  const random = mulberry32(hashSeed(seed));
  const seeds = [];
  let guard = count * 64 + 1024;
  while (seeds.length < count && guard-- > 0) {
    const z = zMin + (zMax - zMin) * random();
    if (random() * maxRadius > radiusAtZ(z)) continue;
    const theta = random() * TAU;
    seeds.push({ theta, z, x: theta * meanRadius });
  }
  if (seeds.length < 4) {
    return {
      curves: [],
      stats: { cells: 0, edges: 0, area, meanRadius, cellSize: safeCell, seed },
    };
  }

  // Two Lloyd steps even out the cells and remove most slivers. The
  // diagram is periodic around theta, so centroids are wrapped back by
  // one circumference before they move.
  let cells = voronoiCells(seeds, { period, zMin, zMax, cellSize: safeCell });
  for (let pass = 0; pass < 2; pass++) {
    if (cells.length !== seeds.length) break;
    for (let i = 0; i < seeds.length; i++) {
      const centroid = polygonCentroid(cells[i]);
      if (!centroid) continue;
      let x = centroid[0];
      while (x - seeds[i].x > period / 2) x -= period;
      while (x - seeds[i].x < -period / 2) x += period;
      seeds[i].x = x;
      seeds[i].theta = x / meanRadius;
      seeds[i].z = Math.max(zMin, Math.min(zMax, centroid[1]));
    }
    cells = voronoiCells(seeds, { period, zMin, zMax, cellSize: safeCell });
  }

  const edges = new Map();
  for (const polygon of cells) {
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const thetaA = a[0] / meanRadius;
      const thetaB = b[0] / meanRadius;
      const keyA = vertexKey(thetaA, a[1]);
      const keyB = vertexKey(thetaB, b[1]);
      if (keyA === keyB) continue;
      const key = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
      if (edges.has(key)) continue;
      const edge = { thetaA, zA: a[1], thetaB, zB: b[1] };
      const pa = surfacePoint(thetaA, a[1], radiusAtV, safeHeight);
      const pb = surfacePoint(thetaB, b[1], radiusAtV, safeHeight);
      const length = Math.hypot(pb.x - pa.x, pb.y - pa.y, pb.z - pa.z);
      if (length < Math.max(1.5, safeCell * 0.1)) continue;
      edge.key = key;
      edge.length = length;
      edges.set(key, edge);
    }
  }

  const curves = [];
  let minEdge = Infinity;
  let maxEdge = 0;
  let totalEdge = 0;
  for (const edge of edges.values()) {
    const points = [];
    const steps = Math.max(2, Math.floor(samples) || 6);
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const theta = edge.thetaA + (edge.thetaB - edge.thetaA) * t;
      const z = edge.zA + (edge.zB - edge.zA) * t;
      points.push(surfacePoint(theta, z, radiusAtV, safeHeight));
    }
    curves.push({
      points,
      length: edge.length,
      meta: { lattice: true },
    });
    minEdge = Math.min(minEdge, edge.length);
    maxEdge = Math.max(maxEdge, edge.length);
    totalEdge += edge.length;
  }
  curves.sort((a, b) => (a.points[0].z - b.points[0].z) || (a.points[0].x - b.points[0].x));

  return {
    curves,
    stats: {
      cells: cells.length,
      seeds: seeds.length,
      edges: curves.length,
      area,
      meanRadius,
      cellSize: safeCell,
      seed,
      minEdge: Number.isFinite(minEdge) ? minEdge : 0,
      maxEdge,
      meanEdge: curves.length ? totalEdge / curves.length : 0,
    },
  };
}

function voronoiCells(seeds, { period, zMin, zMax, cellSize }) {
  const cells = [];
  for (let i = 0; i < seeds.length; i++) {
    const own = seeds[i];
    let polygon = [
      [own.x - period, zMin],
      [own.x + period, zMin],
      [own.x + period, zMax],
      [own.x - period, zMax],
    ];
    for (let j = 0; j < seeds.length && polygon.length >= 3; j++) {
      for (let k = -1; k <= 1; k++) {
        if (j === i && k === 0) continue;
        const otherX = seeds[j].x + k * period;
        const otherZ = seeds[j].z;
        const dx = otherX - own.x;
        const dz = otherZ - own.z;
        if (Math.hypot(dx, dz) > cellSize * 3.2) continue;
        polygon = clipHalfPlane(
          polygon,
          2 * dx,
          2 * dz,
          otherX * otherX + otherZ * otherZ - own.x * own.x - own.z * own.z,
        );
      }
    }
    if (polygon.length >= 3) cells.push(polygon);
  }
  return cells;
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

function surfacePoint(theta, z, radiusAtV, height) {
  const v = Math.max(0, Math.min(1, z / height));
  const radius = radiusAtV(v);
  return {
    x: radius * Math.cos(theta),
    y: radius * Math.sin(theta),
    z,
  };
}

function vertexKey(theta, z) {
  const wrapped = ((theta % TAU) + TAU) % TAU;
  return `${Math.round(wrapped * 1e5)}:${Math.round(z * 1e3)}`;
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
