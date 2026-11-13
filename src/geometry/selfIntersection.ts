/**
 * geometry/selfIntersection.ts — deterministic triangle self-intersection
 * diagnostics.
 *
 * Broad phase: a bounding-volume hierarchy split by the longest bbox axis.
 * Narrow phase: separated-plane interval tests plus a coplanar 2D fallback.
 * The detector reports face-index pairs and never edits the mesh.
 */

import { orient3dSign } from './robustPredicates.ts';
import type { Point3DLike } from './robustPredicates.ts';

type Axis = 'x' | 'y' | 'z';

interface BBox {
  min: Point3DLike;
  max: Point3DLike;
}

interface Triangle {
  faceIndex: number;
  points: [Point3DLike, Point3DLike, Point3DLike];
  bbox: BBox;
}

interface BvhNode {
  bbox: BBox;
  indices?: number[] | undefined;
  left?: BvhNode | undefined;
  right?: BvhNode | undefined;
}

interface Plane {
  normal: Point3DLike;
  d: number;
}

interface Interval {
  min: number;
  max: number;
}

export interface IntersectionPair {
  a: number;
  b: number;
}

export interface SelfIntersectionResult {
  supported: true;
  checked: true;
  count: number;
  pairs: IntersectionPair[];
  truncated: boolean;
  tolerance?: number;
}

export interface SelfIntersectionOptions {
  maxPairs?: number;
  tolerance?: number | null;
}

const DEFAULT_MAX_PAIRS = 32;
const LEAF_SIZE = 8;

export function detectSelfIntersections(
  mesh: unknown,
  { maxPairs = DEFAULT_MAX_PAIRS, tolerance = null }: SelfIntersectionOptions = {},
): SelfIntersectionResult {
  const limit = Math.max(1, Math.floor(Number(maxPairs) || DEFAULT_MAX_PAIRS));
  const triangles = buildTriangles(mesh);
  if (triangles.length < 2) {
    return { supported: true, checked: true, count: 0, pairs: [], truncated: false };
  }
  const eps = Number.isFinite(tolerance) && (tolerance as number) > 0
    ? (tolerance as number)
    : Math.max(1e-9, bboxDiagonal(triangles) * 1e-9);
  const root = buildBvh(triangles, triangles.map((_, index) => index));
  const pairs: IntersectionPair[] = [];
  let truncated = false;

  for (let i = 0; i < triangles.length && !truncated; i++) {
    const triangle = triangles[i]!;
    visit(root, (candidateIndex) => {
      if (candidateIndex <= i) return false;
      const candidate = triangles[candidateIndex]!;
      if (!bboxOverlap(triangle.bbox, candidate.bbox, eps)) return false;
      if (shareSpatialVertex(triangle.points, candidate.points, eps)) return false;
      if (!trianglesIntersect(triangle.points, candidate.points, eps)) return false;
      pairs.push({ a: triangle.faceIndex, b: candidate.faceIndex });
      if (pairs.length >= limit) {
        truncated = true;
        return true;
      }
      return false;
    }, triangle.bbox, eps);
  }

  return {
    supported: true,
    checked: true,
    count: pairs.length,
    pairs,
    truncated,
    tolerance: eps,
  };
}

function buildTriangles(mesh: unknown): Triangle[] {
  const source = mesh as { vertices?: unknown; faces?: unknown } | null | undefined;
  if (!source || !Array.isArray(source.vertices) || !Array.isArray(source.faces)) return [];
  const vertices = source.vertices as unknown[];
  const faces = source.faces as unknown[];
  const triangles: Triangle[] = [];
  for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
    const face = faces[faceIndex];
    if (!Array.isArray(face) || face.length < 3) continue;
    const points = face.slice(0, 3).map((index) => vertices[index as number]);
    if (points.some((point) => !finitePoint(point))) continue;
    const [a, b, c] = points as [Point3DLike, Point3DLike, Point3DLike];
    if (triangleArea(a, b, c) <= 1e-18) continue;
    triangles.push({ faceIndex, points: [a, b, c], bbox: triangleBbox([a, b, c]) });
  }
  return triangles;
}

function buildBvh(triangles: Triangle[], indices: number[]): BvhNode {
  const bbox = indices.reduce((box, index) => mergeBbox(box, triangles[index]!.bbox), emptyBbox());
  if (indices.length <= LEAF_SIZE) return { bbox, indices };
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
  const left = buildBvh(triangles, sorted.slice(0, middle));
  const right = buildBvh(triangles, sorted.slice(middle));
  return { bbox, left, right };
}

function visit(node: BvhNode | undefined, test: (index: number) => boolean, queryBbox: BBox, eps: number): boolean {
  if (!node || !bboxOverlap(node.bbox, queryBbox, eps)) return false;
  if (node.indices) {
    for (const index of node.indices) {
      if (test(index)) return true;
    }
    return false;
  }
  return visit(node.left, test, queryBbox, eps) || visit(node.right, test, queryBbox, eps);
}

function trianglesIntersect(a: Point3DLike[], b: Point3DLike[], eps: number): boolean {
  const planeA = planeOf(a);
  const planeB = planeOf(b);
  if (!planeA || !planeB) return false;

  const distA = a.map((point) => signedDistance(point, planeB));
  const sidesA = a.map((point, index) => robustSide(b, point, distA[index]!, eps));
  if (allPositive(sidesA) || allNegative(sidesA)) return false;
  const distB = b.map((point) => signedDistance(point, planeA));
  const sidesB = b.map((point, index) => robustSide(a, point, distB[index]!, eps));
  if (allPositive(sidesB) || allNegative(sidesB)) return false;

  const coplanar = sidesA.every((side) => side === 0) && sidesB.every((side) => side === 0);
  if (coplanar) return coplanarIntersect(a, b, planeA.normal, eps);

  const direction = cross(planeA.normal, planeB.normal);
  const axis = dominantAxis(direction);
  if (Math.abs(direction[axis]) <= eps) return false;
  const intervalA = planeInterval(a, sidesA, distA, axis, eps);
  const intervalB = planeInterval(b, sidesB, distB, axis, eps);
  if (!intervalA || !intervalB) return false;
  return intervalA.min <= intervalB.max + eps && intervalB.min <= intervalA.max + eps;
}

function robustSide(planePoints: Point3DLike[], point: Point3DLike, distance: number, eps: number): number {
  if (distance < -eps) return -1;
  if (distance > eps) return 1;
  return orient3dSign(planePoints[0]!, planePoints[1]!, planePoints[2]!, point);
}

function allPositive(values: number[]): boolean {
  return values.every((value) => value > 0);
}

function allNegative(values: number[]): boolean {
  return values.every((value) => value < 0);
}

function planeInterval(
  points: Point3DLike[],
  sides: number[],
  distances: number[],
  axis: Axis,
  eps: number,
): Interval | null {
  const values: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const current = sides[i]!;
    if (current === 0) {
      values.push(points[i]![axis]);
      continue;
    }
    const next = sides[(i + 1) % points.length]!;
    if (next === 0) continue;
    if (current * next < 0) {
      const d1 = distances[i]!;
      const d2 = distances[(i + 1) % points.length]!;
      const t = Math.abs(d1 - d2) <= eps ? 0.5 : d1 / (d1 - d2);
      const point: Point3DLike = {
        x: points[i]!.x + (points[(i + 1) % points.length]!.x - points[i]!.x) * t,
        y: points[i]!.y + (points[(i + 1) % points.length]!.y - points[i]!.y) * t,
        z: points[i]!.z + (points[(i + 1) % points.length]!.z - points[i]!.z) * t,
      };
      values.push(point[axis]);
    }
  }
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function coplanarIntersect(a: Point3DLike[], b: Point3DLike[], normal: Point3DLike, eps: number): boolean {
  const drop = dominantAxis(normal);
  const project = (point: Point3DLike): Point3DLike => {
    if (drop === 'x') return { x: point.y, y: point.z, z: 0 };
    if (drop === 'y') return { x: point.x, y: point.z, z: 0 };
    return { x: point.x, y: point.y, z: 0 };
  };
  const pa = a.map(project);
  const pb = b.map(project);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (segmentsIntersect2D(pa[i]!, pa[(i + 1) % 3]!, pb[j]!, pb[(j + 1) % 3]!, eps)) return true;
    }
  }
  return pa.some((point) => pointInTriangle2D(point, pb, eps))
    || pb.some((point) => pointInTriangle2D(point, pa, eps));
}

function segmentsIntersect2D(a: Point3DLike, b: Point3DLike, c: Point3DLike, d: Point3DLike, eps: number): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (Math.abs(o1) <= eps && onSegment(a, b, c, eps)) return true;
  if (Math.abs(o2) <= eps && onSegment(a, b, d, eps)) return true;
  if (Math.abs(o3) <= eps && onSegment(c, d, a, eps)) return true;
  if (Math.abs(o4) <= eps && onSegment(c, d, b, eps)) return true;
  return (o1 > eps && o2 < -eps || o1 < -eps && o2 > eps)
    && (o3 > eps && o4 < -eps || o3 < -eps && o4 > eps);
}

function pointInTriangle2D(point: Point3DLike, triangle: Point3DLike[], eps: number): boolean {
  const [a, b, c] = triangle as [Point3DLike, Point3DLike, Point3DLike];
  const o1 = orientation(a, b, point);
  const o2 = orientation(b, c, point);
  const o3 = orientation(c, a, point);
  const hasNegative = o1 < -eps || o2 < -eps || o3 < -eps;
  const hasPositive = o1 > eps || o2 > eps || o3 > eps;
  return !(hasNegative && hasPositive);
}

function orientation(a: Point3DLike, b: Point3DLike, c: Point3DLike): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a: Point3DLike, b: Point3DLike, point: Point3DLike, eps: number): boolean {
  return point.x >= Math.min(a.x, b.x) - eps
    && point.x <= Math.max(a.x, b.x) + eps
    && point.y >= Math.min(a.y, b.y) - eps
    && point.y <= Math.max(a.y, b.y) + eps;
}

function shareSpatialVertex(a: Point3DLike[], b: Point3DLike[], eps: number): boolean {
  const eps2 = eps * eps;
  for (const p of a) {
    for (const q of b) {
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const dz = p.z - q.z;
      if (dx * dx + dy * dy + dz * dz <= eps2) return true;
    }
  }
  return false;
}

function planeOf(points: Point3DLike[]): Plane | null {
  const [a, b, c] = points as [Point3DLike, Point3DLike, Point3DLike];
  const normal = cross(subtract(b, a), subtract(c, a));
  const length = Math.hypot(normal.x, normal.y, normal.z);
  if (length <= 1e-18) return null;
  const unit = { x: normal.x / length, y: normal.y / length, z: normal.z / length };
  return { normal: unit, d: -(unit.x * a.x + unit.y * a.y + unit.z * a.z) };
}

function signedDistance(point: Point3DLike, plane: Plane): number {
  return plane.normal.x * point.x + plane.normal.y * point.y + plane.normal.z * point.z + plane.d;
}

function dominantAxis(vector: Point3DLike): Axis {
  const ax = Math.abs(vector.x);
  const ay = Math.abs(vector.y);
  const az = Math.abs(vector.z);
  if (ax >= ay && ax >= az) return 'x';
  return ay >= az ? 'y' : 'z';
}

function cross(a: Point3DLike, b: Point3DLike): Point3DLike {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function subtract(a: Point3DLike, b: Point3DLike): Point3DLike {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function triangleArea(a: Point3DLike, b: Point3DLike, c: Point3DLike): number {
  const ab = subtract(b, a);
  const ac = subtract(c, a);
  const normal = cross(ab, ac);
  return 0.5 * Math.hypot(normal.x, normal.y, normal.z);
}

function triangleBbox(points: Point3DLike[]): BBox {
  return points.reduce<BBox>((box, point) => ({
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
  return {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
  };
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

function bboxOverlap(a: BBox, b: BBox, eps: number): boolean {
  return a.min.x <= b.max.x + eps && a.max.x >= b.min.x - eps
    && a.min.y <= b.max.y + eps && a.max.y >= b.min.y - eps
    && a.min.z <= b.max.z + eps && a.max.z >= b.min.z - eps;
}

function centroid(bbox: BBox): Point3DLike {
  return {
    x: (bbox.min.x + bbox.max.x) / 2,
    y: (bbox.min.y + bbox.max.y) / 2,
    z: (bbox.min.z + bbox.max.z) / 2,
  };
}

function bboxDiagonal(triangles: Triangle[]): number {
  const box = triangles.reduce((acc, triangle) => mergeBbox(acc, triangle.bbox), emptyBbox());
  return Math.hypot(
    box.max.x - box.min.x,
    box.max.y - box.min.y,
    box.max.z - box.min.z,
  );
}

function finitePoint(point: unknown): point is Point3DLike {
  const value = point as Point3DLike | null | undefined;
  return Boolean(value)
    && Number.isFinite(value!.x)
    && Number.isFinite(value!.y)
    && Number.isFinite(value!.z);
}
