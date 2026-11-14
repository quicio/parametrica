/**
 * geometry/wallThickness.ts — deterministic mesh wall-thickness estimate.
 *
 * Samples triangle centroids and casts a ray into the material along the
 * inverted normal. A BVH over triangle bounds keeps the cost near
 * `samples × log(triangles)`. The result is an estimate, never a slicer
 * measurement.
 */

import { intersectRayTriangle } from '../domain/interaction/ray.ts';
import type { Ray3, Vec3 } from '../domain/interaction/ray.ts';

const DEFAULT_SAMPLES = 256;
const DEFAULT_MAX_TRIANGLES = 500_000;
const LEAF_SIZE = 8;
const MAX_DEPTH = 40;
const RAY_EPS = 1e-9;

export interface WallThicknessOptions {
  /** Millimetres per world unit. Defaults to 1 for a unitless document. */
  scale?: number | null;
  /** Maximum number of area-weighted surface samples. */
  samples?: number;
  /** Meshes above this triangle count report unavailable instead of stalling. */
  maxTriangles?: number;
}

export interface WallThicknessReport {
  available: boolean;
  method: 'raycast';
  scale: number;
  samples: number;
  triangles: number;
  hits: number;
  misses: number;
  fallbacks: number;
  minMm: number | null;
  p05Mm: number | null;
  medianMm: number | null;
  reason: string | null;
}

interface Triangle {
  ax: number; ay: number; az: number;
  bx: number; by: number; bz: number;
  cx: number; cy: number; cz: number;
  nx: number; ny: number; nz: number;
  area: number;
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
  centroidX: number; centroidY: number; centroidZ: number;
}

interface Bounds {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}

interface BvhNode {
  bounds: Bounds;
  indices: number[] | null;
  left: BvhNode | null;
  right: BvhNode | null;
}

interface PointLike { x?: unknown; y?: unknown; z?: unknown }

/** Estimate the material thickness of a triangular/polygonal mesh. */
export function measureWallThickness(
  mesh: unknown,
  options: WallThicknessOptions = {},
): WallThicknessReport | null {
  const vertices = readVertices(mesh);
  const faces = readFaces(mesh);
  if (!vertices.length || !faces.length) return null;

  const scale = Number.isFinite(Number(options.scale)) && Number(options.scale) > 0
    ? Number(options.scale)
    : 1;
  const sampleBudget = clampInt(options.samples, 1, 20_000, DEFAULT_SAMPLES);
  const maxTriangles = clampInt(options.maxTriangles, 1, 2_000_000, DEFAULT_MAX_TRIANGLES);
  if (hasBoundary(faces, vertices.length)) {
    return report({ scale, reason: 'Mesh is not closed; wall thickness needs paired surfaces' });
  }
  const triangles = triangulate(vertices, faces);

  if (!triangles.length) {
    return report({ scale, triangles: 0, reason: 'Mesh has no non-degenerate triangles' });
  }
  if (triangles.length > maxTriangles) {
    return report({
      scale,
      triangles: triangles.length,
      reason: `Mesh has ${triangles.length} triangles; wall sampling is capped at ${maxTriangles}`,
    });
  }

  orientOutward(triangles);
  const bounds = boundsOf(triangles);
  const diagonal = Math.hypot(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    bounds.maxZ - bounds.minZ,
  );
  const offset = Math.max(RAY_EPS, diagonal * 1e-6);
  const order = spatialOrder(triangles);
  const root = buildBvh(triangles, order, 0, order.length - 1, 0);
  const picks = sampleIndices(triangles, sampleBudget);
  const distances: number[] = [];
  let misses = 0;
  let fallbacks = 0;

  for (const index of picks) {
    const triangle = triangles[index];
    if (!triangle) continue;
    const px = triangle.centroidX;
    const py = triangle.centroidY;
    const pz = triangle.centroidZ;
    const dx = -triangle.nx;
    const dy = -triangle.ny;
    const dz = -triangle.nz;
    const inward = cast(root, triangles, px + dx * offset, py + dy * offset, pz + dz * offset, dx, dy, dz);
    if (inward !== null) {
      distances.push(inward + offset);
      continue;
    }
    const outward = cast(root, triangles, px - dx * offset, py - dy * offset, pz - dz * offset, -dx, -dy, -dz);
    if (outward !== null) {
      fallbacks++;
      distances.push(outward + offset);
    } else {
      misses++;
    }
  }

  if (!distances.length) {
    return report({
      scale,
      triangles: triangles.length,
      samples: picks.length,
      misses,
      reason: 'No surface pair was found along the sampled normals',
    });
  }

  distances.sort((a, b) => a - b);
  const last = distances.length - 1;
  const min = distances[0] ?? 0;
  const p05 = distances[Math.min(last, Math.floor(last * 0.05))] ?? min;
  const median = distances[Math.min(last, Math.floor(last * 0.5))] ?? min;
  return report({
    available: true,
    scale,
    triangles: triangles.length,
    samples: picks.length,
    hits: distances.length,
    misses,
    fallbacks,
    minMm: min * scale,
    p05Mm: p05 * scale,
    medianMm: median * scale,
  });
}

function report({
  available = false,
  scale = 1,
  triangles = 0,
  samples = 0,
  hits = 0,
  misses = 0,
  fallbacks = 0,
  minMm = null,
  p05Mm = null,
  medianMm = null,
  reason = null,
}: {
  available?: boolean;
  scale?: number;
  triangles?: number;
  samples?: number;
  hits?: number;
  misses?: number;
  fallbacks?: number;
  minMm?: number | null;
  p05Mm?: number | null;
  medianMm?: number | null;
  reason?: string | null;
} = {}): WallThicknessReport {
  return {
    available,
    method: 'raycast',
    scale,
    samples,
    triangles,
    hits,
    misses,
    fallbacks,
    minMm,
    p05Mm,
    medianMm,
    reason,
  };
}

function readVertices(mesh: unknown): Vec3[] {
  const source = mesh && typeof mesh === 'object' ? mesh as { vertices?: unknown } : null;
  const raw = Array.isArray(source?.vertices) ? source.vertices : [];
  const out: Vec3[] = [];
  for (const point of raw as PointLike[]) {
    const x = Number(point?.x);
    const y = Number(point?.y);
    const z = Number(point?.z);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) out.push({ x, y, z });
    else out.push({ x: 0, y: 0, z: 0 });
  }
  return out;
}

function readFaces(mesh: unknown): number[][] {
  const source = mesh && typeof mesh === 'object' ? mesh as { faces?: unknown } : null;
  const raw = Array.isArray(source?.faces) ? source.faces : [];
  return raw.filter((face): face is number[] => Array.isArray(face) && face.length >= 3);
}

function hasBoundary(faces: number[][], vertexCount: number): boolean {
  const edges = new Map<string, number>();
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      if (!Number.isInteger(a) || !Number.isInteger(b) || a! < 0 || b! < 0 || a! >= vertexCount || b! >= vertexCount) continue;
      const key = a! < b! ? `${a}:${b}` : `${b}:${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  for (const count of edges.values()) {
    if (count === 1) return true;
  }
  return false;
}

function triangulate(vertices: Vec3[], faces: number[][]): Triangle[] {
  const out: Triangle[] = [];
  for (const face of faces) {
    const first = vertices[face[0] ?? -1];
    if (!first) continue;
    for (let i = 1; i < face.length - 1; i++) {
      const b = vertices[face[i] ?? -1];
      const c = vertices[face[i + 1] ?? -1];
      if (!b || !c) continue;
      const triangle = makeTriangle(first, b, c);
      if (triangle) out.push(triangle);
    }
  }
  return out;
}

function makeTriangle(a: Vec3, b: Vec3, c: Vec3): Triangle | null {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const acx = c.x - a.x;
  const acy = c.y - a.y;
  const acz = c.z - a.z;
  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;
  const length = Math.hypot(nx, ny, nz);
  if (!Number.isFinite(length) || length < 1e-12) return null;
  return {
    ax: a.x, ay: a.y, az: a.z,
    bx: b.x, by: b.y, bz: b.z,
    cx: c.x, cy: c.y, cz: c.z,
    nx: nx / length, ny: ny / length, nz: nz / length,
    area: 0.5 * length,
    minX: Math.min(a.x, b.x, c.x),
    minY: Math.min(a.y, b.y, c.y),
    minZ: Math.min(a.z, b.z, c.z),
    maxX: Math.max(a.x, b.x, c.x),
    maxY: Math.max(a.y, b.y, c.y),
    maxZ: Math.max(a.z, b.z, c.z),
    centroidX: (a.x + b.x + c.x) / 3,
    centroidY: (a.y + b.y + c.y) / 3,
    centroidZ: (a.z + b.z + c.z) / 3,
  };
}

/** Flip normals when the enclosed signed volume is negative. */
function orientOutward(triangles: Triangle[]): void {
  let volume6 = 0;
  for (const t of triangles) {
    volume6 += t.ax * (t.by * t.cz - t.bz * t.cy)
      + t.ay * (t.bz * t.cx - t.bx * t.cz)
      + t.az * (t.bx * t.cy - t.by * t.cx);
  }
  if (volume6 >= 0) return;
  for (const t of triangles) {
    t.nx = -t.nx;
    t.ny = -t.ny;
    t.nz = -t.nz;
  }
}

function boundsOf(triangles: Triangle[]): Bounds {
  const bounds: Bounds = {
    minX: Infinity, minY: Infinity, minZ: Infinity,
    maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity,
  };
  for (const t of triangles) {
    bounds.minX = Math.min(bounds.minX, t.minX);
    bounds.minY = Math.min(bounds.minY, t.minY);
    bounds.minZ = Math.min(bounds.minZ, t.minZ);
    bounds.maxX = Math.max(bounds.maxX, t.maxX);
    bounds.maxY = Math.max(bounds.maxY, t.maxY);
    bounds.maxZ = Math.max(bounds.maxZ, t.maxZ);
  }
  return bounds;
}

function spatialOrder(triangles: Triangle[]): number[] {
  const bounds = boundsOf(triangles);
  const spanX = Math.max(1e-12, bounds.maxX - bounds.minX);
  const spanY = Math.max(1e-12, bounds.maxY - bounds.minY);
  const spanZ = Math.max(1e-12, bounds.maxZ - bounds.minZ);
  const codes = triangles.map((t) => {
    const x = Math.max(0, Math.min(1023, Math.floor(((t.centroidX - bounds.minX) / spanX) * 1023)));
    const y = Math.max(0, Math.min(1023, Math.floor(((t.centroidY - bounds.minY) / spanY) * 1023)));
    const z = Math.max(0, Math.min(1023, Math.floor(((t.centroidZ - bounds.minZ) / spanZ) * 1023)));
    return mortonCode(x, y, z);
  });
  const order = triangles.map((_, index) => index);
  order.sort((a, b) => (codes[a] ?? 0) - (codes[b] ?? 0) || a - b);
  return order;
}

function mortonCode(x: number, y: number, z: number): number {
  let code = 0;
  for (let bit = 0; bit < 10; bit++) {
    code |= ((x >> bit) & 1) << (bit * 3);
    code |= ((y >> bit) & 1) << (bit * 3 + 1);
    code |= ((z >> bit) & 1) << (bit * 3 + 2);
  }
  return code;
}

function buildBvh(
  triangles: Triangle[],
  order: number[],
  start: number,
  end: number,
  depth: number,
): BvhNode {
  const bounds = boundsOfRange(triangles, order, start, end);
  const count = end - start + 1;
  if (count <= LEAF_SIZE || depth >= MAX_DEPTH) {
    return { bounds, indices: order.slice(start, end + 1), left: null, right: null };
  }
  const middle = start + Math.floor(count / 2);
  return {
    bounds,
    indices: null,
    left: buildBvh(triangles, order, start, middle - 1, depth + 1),
    right: buildBvh(triangles, order, middle, end, depth + 1),
  };
}

function boundsOfRange(triangles: Triangle[], order: number[], start: number, end: number): Bounds {
  const bounds: Bounds = {
    minX: Infinity, minY: Infinity, minZ: Infinity,
    maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity,
  };
  for (let i = start; i <= end; i++) {
    const t = triangles[order[i] ?? -1];
    if (!t) continue;
    bounds.minX = Math.min(bounds.minX, t.minX);
    bounds.minY = Math.min(bounds.minY, t.minY);
    bounds.minZ = Math.min(bounds.minZ, t.minZ);
    bounds.maxX = Math.max(bounds.maxX, t.maxX);
    bounds.maxY = Math.max(bounds.maxY, t.maxY);
    bounds.maxZ = Math.max(bounds.maxZ, t.maxZ);
  }
  return bounds;
}

/** Area-weighted deterministic picks. Small meshes sample every triangle. */
function sampleIndices(triangles: Triangle[], budget: number): number[] {
  if (triangles.length <= budget) {
    return triangles.map((_, index) => index);
  }
  let total = 0;
  const cumulative: number[] = [];
  for (const triangle of triangles) {
    total += triangle.area;
    cumulative.push(total);
  }
  if (!(total > 0)) return triangles.slice(0, budget).map((_, index) => index);
  const picks: number[] = [];
  for (let i = 0; i < budget; i++) {
    const target = ((i + 0.5) / budget) * total;
    let low = 0;
    let high = cumulative.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if ((cumulative[middle] ?? 0) < target) low = middle + 1;
      else high = middle;
    }
    picks.push(low);
  }
  return picks;
}

function cast(
  root: BvhNode,
  triangles: Triangle[],
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
): number | null {
  const ray: Ray3 = {
    kind: 'orthographic',
    projection: 'xy',
    origin: { x: ox, y: oy, z: oz },
    direction: { x: dx, y: dy, z: dz },
    artboardPoint: { x: 0, y: 0 },
  };
  const stack: BvhNode[] = [root];
  let best = Infinity;
  while (stack.length) {
    const node = stack.pop();
    if (!node || !rayHitsBounds(node.bounds, ox, oy, oz, dx, dy, dz, best)) continue;
    if (node.indices) {
      for (const index of node.indices) {
        const t = triangles[index];
        if (!t) continue;
        const hit = intersectRayTriangle(
          ray,
          { x: t.ax, y: t.ay, z: t.az },
          { x: t.bx, y: t.by, z: t.bz },
          { x: t.cx, y: t.cy, z: t.cz },
        );
        if (hit && hit.t < best) best = hit.t;
      }
      continue;
    }
    if (node.left) stack.push(node.left);
    if (node.right) stack.push(node.right);
  }
  return Number.isFinite(best) ? best : null;
}

function rayHitsBounds(
  bounds: Bounds,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxT: number,
): boolean {
  let tmin = 0;
  let tmax = maxT;
  const axes: Array<[number, number, number, number]> = [
    [ox, dx, bounds.minX, bounds.maxX],
    [oy, dy, bounds.minY, bounds.maxY],
    [oz, dz, bounds.minZ, bounds.maxZ],
  ];
  for (const [origin, direction, min, max] of axes) {
    if (Math.abs(direction) < 1e-12) {
      if (origin < min || origin > max) return false;
      continue;
    }
    let t1 = (min - origin) / direction;
    let t2 = (max - origin) / direction;
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  return true;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
