/**
 * geometry/remesh.ts — deterministic voxel remeshing for repair and CSG.
 *
 * A boolean inside/outside field is sampled on a regular grid, then an
 * iso-surface is extracted with marching tetrahedra. The result is welded,
 * oriented and validated by the existing repair/validation pipeline.
 */

import { createMesh, isMesh, isSolid } from './contracts.ts';
import type { Mesh, Point3D } from './contracts.ts';
import { repairMesh } from './repair.ts';
import type { RepairReport, RepairResult } from './repair.ts';
import { validateMesh } from './validate.ts';
import type { ValidationResult } from './validate.ts';

type Rec = Record<string, unknown>;
type Axis = 'x' | 'y' | 'z';

interface BBox {
  min: Point3D;
  max: Point3D;
}

interface Triangle {
  a: Point3D;
  b: Point3D;
  c: Point3D;
  normal: Point3D;
  bbox: BBox;
}

interface BvhNode {
  bbox: BBox;
  indices?: number[] | undefined;
  left?: BvhNode | undefined;
  right?: BvhNode | undefined;
}

export interface TriangleBvh {
  root: BvhNode;
  triangles: Triangle[];
}

interface ClosestPoint {
  point: Point3D;
  distance: number;
}

interface FeatureEdge {
  a: Point3D;
  b: Point3D;
}

interface GridCorner {
  index: number;
  point: Point3D;
}

interface ProjectOptions {
  bvhs: TriangleBvh[];
  meshes: Mesh[];
  cell: number;
  featureAngle: number;
  featureSnap: number;
}

export interface RemeshOptions {
  operation?: string;
  resolution?: number;
  maxPoints?: number;
  tolerance?: number;
  project?: boolean;
  featureAngle?: number;
  featureSnap?: number;
}

export interface RemeshStats {
  resolution: number;
  grid: number[];
  triangles?: number;
  volume?: number | null;
  projected?: boolean;
  featureEdges?: number;
  projectionFallback?: boolean;
  [key: string]: unknown;
}

export interface RemeshResult {
  ok: boolean;
  empty: boolean;
  mesh: Mesh | null;
  validation?: ValidationResult;
  error?: { code: string; message: string };
  stats?: RemeshStats;
  report?: RepairReport;
}

export const DEFAULT_REMESH_RESOLUTION = 64;
export const DEFAULT_REMESH_MAX_POINTS = 2_000_000;

/**
 * @param inputs Mesh/Solid values
 */
export function remesh(inputs: unknown, {
  operation = 'union',
  resolution = DEFAULT_REMESH_RESOLUTION,
  maxPoints = DEFAULT_REMESH_MAX_POINTS,
  tolerance = 1e-4,
  project = true,
  featureAngle = 40,
  featureSnap = 2,
}: RemeshOptions = {}): RemeshResult {
  const meshes = (Array.isArray(inputs) ? inputs : [inputs]).map(boundaryMesh).filter((mesh): mesh is Mesh => Boolean(mesh));
  if (!meshes.length) return { ok: false, empty: true, mesh: null, error: { code: 'invalid-operand', message: 'remesh requires Mesh/Solid input' } };
  const bvhs = meshes.map((mesh) => buildTriangleBvh(mesh));
  const bbox = meshes.reduce((box, mesh) => mergeBbox(box, meshBbox(mesh)), emptyBbox());
  const maxExtent = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z);
  if (!Number.isFinite(maxExtent) || maxExtent <= 0) {
    return { ok: false, empty: true, mesh: null, error: { code: 'degenerate', message: 'remesh requires a non-degenerate bbox' } };
  }
  const n = Math.max(8, Math.floor(Number(resolution) || DEFAULT_REMESH_RESOLUTION));
  const cell = maxExtent / n;
  const pad = cell * 2;
  const min = { x: bbox.min.x - pad, y: bbox.min.y - pad, z: bbox.min.z - pad };
  const max = { x: bbox.max.x + pad, y: bbox.max.y + pad, z: bbox.max.z + pad };
  const nx = Math.max(2, Math.ceil((max.x - min.x) / cell) + 1);
  const ny = Math.max(2, Math.ceil((max.y - min.y) / cell) + 1);
  const nz = Math.max(2, Math.ceil((max.z - min.z) / cell) + 1);
  const points = nx * ny * nz;
  if (points > maxPoints) {
    return {
      ok: false,
      empty: false,
      mesh: null,
      error: { code: 'complexity', message: `remesh grid has ${points} points (limit ${maxPoints})` },
      stats: { resolution: n, grid: [nx, ny, nz] },
    };
  }

  const inside = new Uint8Array(points);
  for (let k = 0; k < nz; k++) {
    const z = min.z + k * cell;
    for (let j = 0; j < ny; j++) {
      const y = min.y + j * cell;
      for (let i = 0; i < nx; i++) {
        const x = min.x + i * cell;
        const point = { x, y, z };
        let value = false;
        for (let m = 0; m < bvhs.length; m++) {
          const inMesh = insideMesh(bvhs[m]!, point);
          if (m === 0) value = inMesh;
          else if (operation === 'union') value = value || inMesh;
          else if (operation === 'intersection') value = value && inMesh;
          else if (operation === 'difference') value = value && !inMesh;
        }
        inside[(k * ny + j) * nx + i] = value ? 1 : 0;
      }
    }
  }

  const vertices: Point3D[] = [];
  const faces: number[][] = [];
  const edgeVertices = new Map<string, number>();
  const vertexForEdge = (a: number, b: number, pa: Point3D, pb: Point3D, va: number, vb: number): number => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const existing = edgeVertices.get(key);
    if (existing !== undefined) return existing;
    const t = (0.5 - va) / (vb - va);
    const point = {
      x: pa.x + (pb.x - pa.x) * t,
      y: pa.y + (pb.y - pa.y) * t,
      z: pa.z + (pb.z - pa.z) * t,
    };
    const index = vertices.length;
    vertices.push(point);
    edgeVertices.set(key, index);
    return index;
  };

  const corner = (i: number, j: number, k: number): GridCorner => ({
    index: (k * ny + j) * nx + i,
    point: { x: min.x + i * cell, y: min.y + j * cell, z: min.z + k * cell },
  });
  const tetrahedra: number[][] = [
    [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6],
    [0, 7, 4, 6], [0, 4, 5, 6], [0, 5, 1, 6],
  ];

  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const corners: GridCorner[] = [
          corner(i, j, k), corner(i + 1, j, k), corner(i + 1, j + 1, k), corner(i, j + 1, k),
          corner(i, j, k + 1), corner(i + 1, j, k + 1), corner(i + 1, j + 1, k + 1), corner(i, j + 1, k + 1),
        ];
        for (const tetra of tetrahedra) {
          const values = tetra.map((index) => inside[corners[index]!.index]!);
          const insideCount = values.reduce<number>((sum, value) => sum + value, 0);
          if (insideCount === 0 || insideCount === 4) continue;
          if (insideCount === 1) {
            const a = tetra[values.indexOf(1)]!;
            const b = tetra.filter((_, index) => values[index] === 0);
            addTriangle(vertices, faces, vertexForEdge, corners, a, b[0]!, b[1]!, b[2]!, values, tetra);
          } else if (insideCount === 3) {
            const a = tetra[values.indexOf(0)]!;
            const b = tetra.filter((_, index) => values[index] === 1);
            addTriangle(vertices, faces, vertexForEdge, corners, a, b[0]!, b[1]!, b[2]!, values, tetra);
          } else {
            const insideCorners = tetra.filter((_, index) => values[index] === 1);
            const outsideCorners = tetra.filter((_, index) => values[index] === 0);
            const [a, b] = insideCorners as [number, number];
            const [c, d] = outsideCorners as [number, number];
            const ac = edgeVertex(vertexForEdge, corners, tetra, values, a, c);
            const ad = edgeVertex(vertexForEdge, corners, tetra, values, a, d);
            const bd = edgeVertex(vertexForEdge, corners, tetra, values, b, d);
            const bc = edgeVertex(vertexForEdge, corners, tetra, values, b, c);
            faces.push([ac, ad, bd], [ac, bd, bc]);
          }
        }
      }
    }
  }

  if (!faces.length) {
    return { ok: true, empty: true, mesh: null, stats: { resolution: n, grid: [nx, ny, nz] } };
  }
  let raw = createMesh({ id: 'remesh', vertices, faces, meta: { source: 'remesh', operation, resolution: n } });
  let repaired: RepairResult = repairMesh(raw, { tolerance, capStrategy: 'auto', orient: true, topology: 'split' });
  let projectionFallback = false;
  if (project) {
    const projected = projectToSurface(raw, { bvhs, meshes, cell, featureAngle, featureSnap });
    const projectedRepaired = repairMesh(projected, { tolerance, capStrategy: 'auto', orient: true, topology: 'split' });
    if (projectedRepaired.mesh && projectedRepaired.validation?.ok) {
      raw = projected;
      repaired = projectedRepaired;
    } else {
      projectionFallback = true;
    }
  }
  const output = (repaired.mesh as Mesh | null | undefined) ?? raw;
  const validation = repaired.validation ?? validateMesh(raw);
  return {
    ok: Boolean(repaired.mesh),
    empty: false,
    mesh: output,
    validation,
    stats: {
      resolution: n,
      grid: [nx, ny, nz],
      triangles: output.faces.length,
      volume: (validation?.meta?.volume as number | null | undefined) ?? null,
      projected: Boolean(raw.meta?.projected) && !projectionFallback,
      featureEdges: projectionFallback ? 0 : Number(raw.meta?.featureEdges ?? 0),
      projectionFallback,
    },
    report: repaired.report,
  };
}

function addTriangle(
  vertices: Point3D[],
  faces: number[][],
  vertexForEdge: (a: number, b: number, pa: Point3D, pb: Point3D, va: number, vb: number) => number,
  corners: GridCorner[],
  a: number,
  b: number,
  c: number,
  d: number,
  values: number[],
  tetra: number[],
): void {
  const ab = edgeVertex(vertexForEdge, corners, tetra, values, a, b);
  const ac = edgeVertex(vertexForEdge, corners, tetra, values, a, c);
  const ad = edgeVertex(vertexForEdge, corners, tetra, values, a, d);
  faces.push([ab, ac, ad]);
}

function edgeVertex(
  vertexForEdge: (a: number, b: number, pa: Point3D, pb: Point3D, va: number, vb: number) => number,
  corners: GridCorner[],
  tetra: number[],
  values: number[],
  a: number,
  b: number,
): number {
  const ia = corners[a]!.index;
  const ib = corners[b]!.index;
  return vertexForEdge(ia, ib, corners[a]!.point, corners[b]!.point, valueAt(tetra, values, a), valueAt(tetra, values, b));
}

function valueAt(tetra: number[], values: number[], cornerIndex: number): number {
  const position = tetra.indexOf(cornerIndex);
  return values[position]!;
}

function projectToSurface(mesh: Mesh, { bvhs, meshes, cell, featureAngle, featureSnap }: ProjectOptions): Mesh {
  const features = collectFeatureEdges(meshes, featureAngle);
  const vertices = mesh.vertices.map((vertex) => {
    let bestPoint: Point3D | null = null;
    let bestDistance = Infinity;
    for (const bvh of bvhs) {
      const closest = closestPointOnMesh(bvh, vertex);
      if (closest && closest.distance < bestDistance) {
        bestDistance = closest.distance;
        bestPoint = closest.point;
      }
    }
    for (const edge of features) {
      const point = closestPointOnSegment(vertex, edge.a, edge.b);
      const edgeDistance = distance(vertex, point);
      if (edgeDistance < bestDistance && edgeDistance <= bestDistance + cell * featureSnap) {
        bestDistance = edgeDistance;
        bestPoint = point;
      }
    }
    return bestPoint && bestDistance <= cell * featureSnap * 2 ? { ...bestPoint } : { ...vertex };
  });
  return createMesh({
    id: mesh.id,
    vertices,
    faces: mesh.faces.map((face) => [...face]),
    normals: null,
    faceNormals: null,
    uvs: null,
    meta: { ...mesh.meta, projected: true, featureEdges: features.length },
  });
}

function collectFeatureEdges(meshes: Mesh[], featureAngle: number): FeatureEdge[] {
  const threshold = Math.cos((Math.max(1, Math.min(179, featureAngle)) * Math.PI) / 180);
  const edges: FeatureEdge[] = [];
  for (const mesh of meshes) {
    const map = new Map<string, { a: number; b: number; faces: number[][] }>();
    for (const face of mesh.faces) {
      for (let i = 0; i < face.length; i++) {
        const a = face[i]!;
        const b = face[(i + 1) % face.length]!;
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        const entry = map.get(key) ?? { a: Math.min(a, b), b: Math.max(a, b), faces: [] };
        entry.faces.push(face);
        map.set(key, entry);
      }
    }
    for (const entry of map.values()) {
      if (entry.faces.length !== 2) continue;
      const n1 = faceNormal(mesh.vertices, entry.faces[0]!);
      const n2 = faceNormal(mesh.vertices, entry.faces[1]!);
      if (!n1 || !n2) continue;
      if (n1.x * n2.x + n1.y * n2.y + n1.z * n2.z < threshold) {
        edges.push({ a: mesh.vertices[entry.a]!, b: mesh.vertices[entry.b]! });
      }
    }
  }
  return edges;
}

function faceNormal(vertices: Point3D[], face: number[]): Point3D | null {
  const a = vertices[face[0]!];
  const b = vertices[face[1]!];
  const c = vertices[face[2]!];
  if (!a || !b || !c) return null;
  const normal = cross(subtract(b, a), subtract(c, a));
  const length = Math.hypot(normal.x, normal.y, normal.z);
  return length > 1e-12 ? { x: normal.x / length, y: normal.y / length, z: normal.z / length } : null;
}

export function closestPointOnMesh(entry: TriangleBvh, point: Point3D): ClosestPoint | null {
  let best: ClosestPoint | null = null;
  const stack: Array<BvhNode | undefined> = [entry.root];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    const boxDistance = distanceToBox(point, node.bbox);
    if (best && boxDistance > best.distance) continue;
    if (node.indices) {
      for (const index of node.indices) {
        const triangle = entry.triangles[index]!;
        const candidate = closestPointOnTriangle(point, triangle.a, triangle.b, triangle.c);
        const candidateDistance = distance(point, candidate);
        if (!best || candidateDistance < best.distance) best = { point: candidate, distance: candidateDistance };
      }
    } else {
      stack.push(node.left, node.right);
    }
  }
  return best;
}

function closestPointOnTriangle(point: Point3D, a: Point3D, b: Point3D, c: Point3D): Point3D {
  const ab = subtract(b, a);
  const ac = subtract(c, a);
  const ap = subtract(point, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return { ...a };
  const bp = subtract(point, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return { ...b };
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return { x: a.x + ab.x * v, y: a.y + ab.y * v, z: a.z + ab.z * v };
  }
  const cp = subtract(point, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return { ...c };
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return { x: a.x + ac.x * w, y: a.y + ac.y * w, z: a.z + ac.z * w };
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return { x: b.x + (c.x - b.x) * w, y: b.y + (c.y - b.y) * w, z: b.z + (c.z - b.z) * w };
  }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return { x: a.x + ab.x * v + ac.x * w, y: a.y + ab.y * v + ac.y * w, z: a.z + ab.z * v + ac.z * w };
}

function closestPointOnSegment(point: Point3D, a: Point3D, b: Point3D): Point3D {
  const ab = subtract(b, a);
  const lengthSquared = dot(ab, ab);
  if (lengthSquared <= 1e-18) return { ...a };
  const t = Math.max(0, Math.min(1, dot(subtract(point, a), ab) / lengthSquared));
  return { x: a.x + ab.x * t, y: a.y + ab.y * t, z: a.z + ab.z * t };
}

function distance(a: Point3D, b: Point3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function distanceToBox(point: Point3D, bbox: BBox): number {
  const dx = Math.max(bbox.min.x - point.x, 0, point.x - bbox.max.x);
  const dy = Math.max(bbox.min.y - point.y, 0, point.y - bbox.max.y);
  const dz = Math.max(bbox.min.z - point.z, 0, point.z - bbox.max.z);
  return Math.hypot(dx, dy, dz);
}

/* ———————— BVH / inside ———————— */

export function buildTriangleBvh(mesh: Mesh): TriangleBvh {
  const triangles: Triangle[] = [];
  for (const face of mesh.faces) {
    if (!Array.isArray(face) || face.length < 3) continue;
    for (let i = 1; i < face.length - 1; i++) {
      const a = mesh.vertices[face[0]!];
      const b = mesh.vertices[face[i]!];
      const c = mesh.vertices[face[i + 1]!];
      if (!a || !b || !c) continue;
      triangles.push({
        a, b, c,
        normal: normalize(cross(subtract(b, a), subtract(c, a))),
        bbox: {
          min: { x: Math.min(a.x, b.x, c.x), y: Math.min(a.y, b.y, c.y), z: Math.min(a.z, b.z, c.z) },
          max: { x: Math.max(a.x, b.x, c.x), y: Math.max(a.y, b.y, c.y), z: Math.max(a.z, b.z, c.z) },
        },
      });
    }
  }
  return { root: buildNode(triangles, triangles.map((_, index) => index)), triangles };
}

function buildNode(triangles: Triangle[], indices: number[]): BvhNode {
  const bbox = indices.reduce((box, index) => mergeBbox(box, triangles[index]!.bbox), emptyBbox());
  if (indices.length <= 8) return { bbox, indices };
  const extent = {
    x: bbox.max.x - bbox.min.x,
    y: bbox.max.y - bbox.min.y,
    z: bbox.max.z - bbox.min.z,
  };
  const axis: Axis = extent.x >= extent.y && extent.x >= extent.z ? 'x' : (extent.y >= extent.z ? 'y' : 'z');
  const sorted = [...indices].sort((a, b) => {
    const ca = centroid(triangles[a]!.bbox)[axis];
    const cb = centroid(triangles[b]!.bbox)[axis];
    return ca - cb || a - b;
  });
  const middle = Math.floor(sorted.length / 2);
  return { bbox, left: buildNode(triangles, sorted.slice(0, middle)), right: buildNode(triangles, sorted.slice(middle)) };
}

export function insideMesh(entry: TriangleBvh, point: Point3D): boolean {
  return insideMeshWithDirection(entry, point, normalize({ x: 1, y: 0.371390676, z: 0.529 }));
}

export function insideMeshMulti(entry: TriangleBvh, point: Point3D): boolean {
  const directions = [
    normalize({ x: 1, y: 0.371390676, z: 0.529 }),
    normalize({ x: -0.271, y: 1, z: 0.613 }),
    normalize({ x: 0.417, y: -0.529, z: 1 }),
  ];
  let inside = 0;
  for (const direction of directions) {
    if (insideMeshWithDirection(entry, point, direction)) inside++;
  }
  return inside >= 2;
}

export function windingNumber(entry: TriangleBvh, point: Point3D, direction: Point3D): number {
  const origin = { x: point.x + 1e-7, y: point.y + 1e-7, z: point.z + 1e-7 };
  let winding = 0;
  const stack: Array<BvhNode | undefined> = [entry.root];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !rayBox(origin, direction, current.bbox)) continue;
    if (current.indices) {
      for (const index of current.indices) {
        const triangle = entry.triangles[index]!;
        if (!rayTriangle(origin, direction, triangle)) continue;
        winding += dot(triangle.normal, direction) >= 0 ? 1 : -1;
      }
    } else {
      stack.push(current.left, current.right);
    }
  }
  return winding;
}

export function windingNumberMulti(entry: TriangleBvh, point: Point3D): number {
  const directions = [
    normalize({ x: 1, y: 0.371390676, z: 0.529 }),
    normalize({ x: -0.271, y: 1, z: 0.613 }),
    normalize({ x: 0.417, y: -0.529, z: 1 }),
  ];
  const values = directions.map((direction) => windingNumber(entry, point, direction));
  values.sort((a, b) => a - b);
  return values[1]!;
}

export function insideMeshWithDirection(entry: TriangleBvh, point: Point3D, direction: Point3D): boolean {
  const origin = { x: point.x + 1e-7, y: point.y + 1e-7, z: point.z + 1e-7 };
  let hits = 0;
  const stack: Array<BvhNode | undefined> = [entry.root];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !rayBox(origin, direction, current.bbox)) continue;
    if (current.indices) {
      for (const index of current.indices) {
        if (rayTriangle(origin, direction, entry.triangles[index] ?? null)) hits++;
      }
    } else {
      stack.push(current.left, current.right);
    }
  }
  return (hits & 1) === 1;
}

function rayBox(origin: Point3D, direction: Point3D, bbox: BBox): boolean {
  let tmin = -Infinity;
  let tmax = Infinity;
  for (const axis of ['x', 'y', 'z'] as Axis[]) {
    if (Math.abs(direction[axis]) < 1e-12) {
      if (origin[axis] < bbox.min[axis] || origin[axis] > bbox.max[axis]) return false;
    } else {
      const inv = 1 / direction[axis];
      let t1 = (bbox.min[axis] - origin[axis]) * inv;
      let t2 = (bbox.max[axis] - origin[axis]) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return tmax >= 0;
}

function rayTriangle(origin: Point3D, direction: Point3D, triangle: Triangle | null): boolean {
  if (!triangle) return false;
  const { a, b, c } = triangle;
  const e1 = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const e2 = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const p = cross(direction, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-12) return false;
  const inv = 1 / det;
  const t = { x: origin.x - a.x, y: origin.y - a.y, z: origin.z - a.z };
  const u = dot(t, p) * inv;
  if (u < 0 || u > 1) return false;
  const q = cross(t, e1);
  const v = dot(direction, q) * inv;
  if (v < 0 || u + v > 1) return false;
  const hitDistance = dot(e2, q) * inv;
  return hitDistance > 1e-9;
}

function boundaryMesh(geometry: unknown): Mesh | null {
  if (isSolid(geometry)) return isMesh(geometry.boundary) ? geometry.boundary : null;
  if (isMesh(geometry)) return geometry;
  return null;
}

function meshBbox(mesh: Mesh): BBox {
  return (mesh.vertices ?? []).reduce<BBox>((box, point) => ({
    min: {
      x: Math.min(box.min.x, point.x),
      y: Math.min(box.min.y, point.y),
      z: Math.min(box.min.z, point.z),
    },
    max: {
      x: Math.max(box.max.x, point.x),
      y: Math.max(box.max.y, point.y),
      z: Math.max(box.max.z, point.z),
    },
  }), emptyBbox());
}

function emptyBbox(): BBox {
  return { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
}

function mergeBbox(a: BBox, b: BBox): BBox {
  return {
    min: {
      x: Math.min(a.min.x, b.min.x),
      y: Math.min(a.min.y, b.min.y),
      z: Math.min(a.min.z, b.min.z),
    },
    max: {
      x: Math.max(a.max.x, b.max.x),
      y: Math.max(a.max.y, b.max.y),
      z: Math.max(a.max.z, b.max.z),
    },
  };
}

function centroid(bbox: BBox): Point3D {
  return { x: (bbox.min.x + bbox.max.x) / 2, y: (bbox.min.y + bbox.max.y) / 2, z: (bbox.min.z + bbox.max.z) / 2 };
}

function cross(a: Point3D, b: Point3D): Point3D {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function dot(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(vector: Point3D): Point3D {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function subtract(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
