/**
 * geometry/robustPredicates.ts — dependency-free robust geometry kernel.
 *
 * Fast double determinants are used when safely away from zero; near
 * cancellation falls back to exact integer determinants derived from the
 * IEEE-754 representation. The kernel is deterministic and side-effect free.
 */

export interface Point2DLike {
  x: number;
  y: number;
  z?: number | undefined;
}

export interface Point3DLike {
  x: number;
  y: number;
  z: number;
}

export interface Bounds3DLike {
  min: Point3DLike;
  max: Point3DLike;
}

export interface Box3DLike {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ?: number | undefined;
  maxZ?: number | undefined;
}

export type ToleranceInput = Point2DLike[] | Bounds3DLike | Box3DLike | null | undefined;

export interface ToleranceOptions {
  factor?: number;
  floor?: number;
  ceiling?: number;
}

export interface ToleranceResult {
  epsilon: number;
  diagonal: number;
  maxAbs: number;
}

export interface SegmentHit {
  kind: 'segment';
  start: Point3DLike;
  end: Point3DLike;
}

export interface PointHit {
  kind: 'point';
  point: Point3DLike;
}

export interface CoplanarHit {
  kind: 'coplanar';
}

export type TriangleIntersection = SegmentHit | PointHit | CoplanarHit | null;

type Axis = 'x' | 'y' | 'z';

interface DecodedDouble {
  mantissa: bigint;
  exponent: number;
}

interface PlaneIntervalValue {
  t: number;
  point: Point3DLike;
}

interface PlaneInterval {
  min: number;
  max: number;
  values: PlaneIntervalValue[];
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

const EPS = Number.EPSILON;
const ORIENT2D_BOUND = 8;
const ORIENT3D_BOUND = 32;
const scratch = new DataView(new ArrayBuffer(8));

export function orient2dSign(a: Point2DLike, b: Point2DLike, c: Point2DLike): number {
  if (!finitePoint(a) || !finitePoint(b) || !finitePoint(c)) return 0;
  const detleft = (a.x - c.x) * (b.y - c.y);
  const detright = (a.y - c.y) * (b.x - c.x);
  const det = detleft - detright;
  const bound = (Math.abs(detleft) + Math.abs(detright)) * EPS * ORIENT2D_BOUND;
  if (Math.abs(det) > bound) return sign(det);
  return exactOrient2dSign(a, b, c);
}

export function orient3dSign(a: Point3DLike, b: Point3DLike, c: Point3DLike, d: Point3DLike): number {
  if (!finitePoint(a) || !finitePoint(b) || !finitePoint(c) || !finitePoint(d)) return 0;
  const bax = b.x - a.x; const bay = b.y - a.y; const baz = b.z - a.z;
  const cax = c.x - a.x; const cay = c.y - a.y; const caz = c.z - a.z;
  const dax = d.x - a.x; const day = d.y - a.y; const daz = d.z - a.z;
  const term0 = cay * daz - caz * day;
  const term1 = cax * daz - caz * dax;
  const term2 = cax * day - cay * dax;
  const det = bax * term0 - bay * term1 + baz * term2;
  const bound = (
    Math.abs(bax * term0) + Math.abs(bay * term1) + Math.abs(baz * term2)
  ) * EPS * ORIENT3D_BOUND;
  if (Math.abs(det) > bound) return sign(det);
  return exactOrient3dSign(a, b, c, d);
}

export function exactOrient2dSign(a: Point2DLike, b: Point2DLike, c: Point2DLike): number {
  const scaled = scaleCoordinates([a.x, a.y, b.x, b.y, c.x, c.y]);
  if (!scaled) return 0;
  const [ax, ay, bx, by, cx, cy] = scaled as [bigint, bigint, bigint, bigint, bigint, bigint];
  const det = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  return det > 0n ? 1 : det < 0n ? -1 : 0;
}

export function exactOrient3dSign(a: Point3DLike, b: Point3DLike, c: Point3DLike, d: Point3DLike): number {
  const scaled = scaleCoordinates([
    a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z,
  ]);
  if (!scaled) return 0;
  const [ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz] = scaled as [
    bigint, bigint, bigint, bigint, bigint, bigint,
    bigint, bigint, bigint, bigint, bigint, bigint,
  ];
  const bax = bx - ax; const bay = by - ay; const baz = bz - az;
  const cax = cx - ax; const cay = cy - ay; const caz = cz - az;
  const dax = dx - ax; const day = dy - ay; const daz = dz - az;
  const det = bax * (cay * daz - caz * day)
    - bay * (cax * daz - caz * dax)
    + baz * (cax * day - cay * dax);
  return det > 0n ? 1 : det < 0n ? -1 : 0;
}

/**
 * Adaptive epsilon from sampled points, bounds or a min/max box.
 */
export function adaptiveTolerance(input: ToleranceInput, {
  factor = 1e-7,
  floor = 1e-9,
  ceiling = 1e-3,
}: ToleranceOptions = {}): ToleranceResult {
  const points = pointsOf(input);
  if (!points.length) {
    return { epsilon: floor, diagonal: 0, maxAbs: 0 };
  }
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  let maxAbs = 0;
  for (const point of points) {
    if (!finitePoint(point)) continue;
    const z = point.z as number;
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (z < minZ) minZ = z;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
    if (z > maxZ) maxZ = z;
    maxAbs = Math.max(maxAbs, Math.abs(point.x), Math.abs(point.y), Math.abs(z));
  }
  if (!Number.isFinite(minX)) return { epsilon: floor, diagonal: 0, maxAbs: 0 };
  const diagonal = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ);
  const raw = Math.max(diagonal * factor, maxAbs * EPS * 8);
  const epsilon = Math.min(Math.max(raw, floor), ceiling);
  return { epsilon, diagonal, maxAbs };
}

export function snapRound(value: unknown, grid: unknown): number {
  const number = Number(value);
  const spacing = Number(grid);
  if (!Number.isFinite(number) || !Number.isFinite(spacing) || spacing <= 0) return number;
  return Math.round(number / spacing) * spacing;
}

export function snapPoint(point: { x?: unknown; y?: unknown; z?: unknown } | null | undefined, grid: unknown): Point3DLike {
  return {
    x: snapRound(point?.x, grid),
    y: snapRound(point?.y, grid),
    z: snapRound(point?.z, grid),
  };
}

export function segmentsIntersect2D(a: Point2DLike, b: Point2DLike, c: Point2DLike, d: Point2DLike): boolean {
  const o1 = orient2dSign(a, b, c);
  const o2 = orient2dSign(a, b, d);
  const o3 = orient2dSign(c, d, a);
  const o4 = orient2dSign(c, d, b);
  if (o1 === 0 && onSegment(a, b, c)) return true;
  if (o2 === 0 && onSegment(a, b, d)) return true;
  if (o3 === 0 && onSegment(c, d, a)) return true;
  if (o4 === 0 && onSegment(c, d, b)) return true;
  return (o1 > 0 && o2 < 0 || o1 < 0 && o2 > 0)
    && (o3 > 0 && o4 < 0 || o3 < 0 && o4 > 0);
}

export function pointInTriangle2D(point: Point2DLike, a: Point2DLike, b: Point2DLike, c: Point2DLike): boolean {
  const o1 = orient2dSign(a, b, point);
  const o2 = orient2dSign(b, c, point);
  const o3 = orient2dSign(c, a, point);
  const hasNegative = o1 < 0 || o2 < 0 || o3 < 0;
  const hasPositive = o1 > 0 || o2 > 0 || o3 > 0;
  return !(hasNegative && hasPositive);
}

/**
 * Classify two triangles.
 */
export function triangleTriangleIntersection(
  a: Point3DLike, b: Point3DLike, c: Point3DLike,
  d: Point3DLike, e: Point3DLike, f: Point3DLike,
): TriangleIntersection {
  if (![a, b, c, d, e, f].every(finitePoint)) return null;
  const sidesA = [
    orient3dSign(d, e, f, a),
    orient3dSign(d, e, f, b),
    orient3dSign(d, e, f, c),
  ];
  if (allPositive(sidesA) || allNegative(sidesA)) return null;
  const sidesB = [
    orient3dSign(a, b, c, d),
    orient3dSign(a, b, c, e),
    orient3dSign(a, b, c, f),
  ];
  if (allPositive(sidesB) || allNegative(sidesB)) return null;
  if (sidesA.every((side) => side === 0) && sidesB.every((side) => side === 0)) {
    return coplanarOverlap(a, b, c, d, e, f) ? { kind: 'coplanar' } : null;
  }

  const normalA = cross(subtract(b, a), subtract(c, a));
  const normalB = cross(subtract(e, d), subtract(f, d));
  const direction = cross(normalA, normalB);
  const axis = dominantAxis(direction);
  if (Math.abs(direction[axis]) < 1e-18) return null;

  const intervalA = planeInterval([a, b, c], sidesA, axis);
  const intervalB = planeInterval([d, e, f], sidesB, axis);
  if (!intervalA || !intervalB) return null;
  const startT = Math.max(intervalA.min, intervalB.min);
  const endT = Math.min(intervalA.max, intervalB.max);
  if (endT < startT) return null;
  const start = pointAt(intervalA, intervalB, startT) ?? pointAt(intervalB, intervalA, startT);
  const end = pointAt(intervalA, intervalB, endT) ?? pointAt(intervalB, intervalA, endT);
  if (!start || !end) return null;
  if (Math.abs(endT - startT) <= 1e-12) return { kind: 'point', point: start };
  return { kind: 'segment', start, end };
}

function coplanarOverlap(
  a: Point3DLike, b: Point3DLike, c: Point3DLike,
  d: Point3DLike, e: Point3DLike, f: Point3DLike,
): boolean {
  const normal = cross(subtract(b, a), subtract(c, a));
  const axis = dominantAxis(normal);
  const project = (point: Point3DLike): Point2DLike => {
    if (axis === 'x') return { x: point.y, y: point.z };
    if (axis === 'y') return { x: point.x, y: point.z };
    return { x: point.x, y: point.y };
  };
  const ta = [a, b, c].map(project);
  const tb = [d, e, f].map(project);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (segmentsIntersect2D(ta[i]!, ta[(i + 1) % 3]!, tb[j]!, tb[(j + 1) % 3]!)) return true;
    }
  }
  if (ta.some((point) => pointInTriangle2D(point, tb[0]!, tb[1]!, tb[2]!))) return true;
  return tb.some((point) => pointInTriangle2D(point, ta[0]!, ta[1]!, ta[2]!));
}

function planeInterval(points: Point3DLike[], sides: number[], axis: Axis): PlaneInterval | null {
  const values: PlaneIntervalValue[] = [];
  for (let i = 0; i < 3; i++) {
    const current = sides[i]!;
    if (current === 0) {
      values.push({ t: points[i]![axis], point: { ...points[i]! } });
      continue;
    }
    const next = sides[(i + 1) % 3]!;
    if (next === 0) continue;
    if (current * next < 0) {
      const t = current / (current - next);
      const point: Point3DLike = {
        x: points[i]!.x + (points[(i + 1) % 3]!.x - points[i]!.x) * t,
        y: points[i]!.y + (points[(i + 1) % 3]!.y - points[i]!.y) * t,
        z: points[i]!.z + (points[(i + 1) % 3]!.z - points[i]!.z) * t,
      };
      values.push({ t: point[axis], point });
    }
  }
  if (!values.length) return null;
  return {
    min: Math.min(...values.map((value) => value.t)),
    max: Math.max(...values.map((value) => value.t)),
    values,
  };
}

function pointAt(interval: PlaneInterval, other: PlaneInterval, t: number): Point3DLike | null {
  const match = interval.values.find((value) => Math.abs(value.t - t) <= 1e-12);
  if (match) return match.point;
  const otherMatch = other.values.find((value) => Math.abs(value.t - t) <= 1e-12);
  return otherMatch?.point ?? null;
}

function scaleCoordinates(values: number[]): bigint[] | null {
  const decoded: DecodedDouble[] = [];
  let minExponent = Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) return null;
    const entry = decodeDouble(value);
    decoded.push(entry);
    if (entry.exponent < minExponent) minExponent = entry.exponent;
  }
  if (!Number.isFinite(minExponent)) return null;
  return decoded.map((entry) => entry.mantissa << BigInt(entry.exponent - minExponent));
}

function decodeDouble(value: number): DecodedDouble {
  if (value === 0) return { mantissa: 0n, exponent: 0 };
  scratch.setFloat64(0, value, false);
  const bits = scratch.getBigUint64(0, false);
  const negative = (bits >> 63n) === 1n;
  const exponentBits = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & ((1n << 52n) - 1n);
  let mantissa: bigint;
  let exponent: number;
  if (exponentBits === 0) {
    mantissa = fraction;
    exponent = -1074;
  } else {
    mantissa = (1n << 52n) | fraction;
    exponent = exponentBits - 1023 - 52;
  }
  return { mantissa: negative ? -mantissa : mantissa, exponent };
}

function onSegment(a: Point2DLike, b: Point2DLike, point: Point2DLike): boolean {
  return point.x >= Math.min(a.x, b.x)
    && point.x <= Math.max(a.x, b.x)
    && point.y >= Math.min(a.y, b.y)
    && point.y <= Math.max(a.y, b.y);
}

function allPositive(values: number[]): boolean {
  return values.every((value) => value > 0);
}

function allNegative(values: number[]): boolean {
  return values.every((value) => value < 0);
}

function sign(value: number): number {
  return value > 0 ? 1 : value < 0 ? -1 : 0;
}

function finitePoint(point: Point2DLike | null | undefined): point is Point2DLike {
  return Boolean(point)
    && Number.isFinite(point!.x)
    && Number.isFinite(point!.y)
    && Number.isFinite((point as Point3DLike).z ?? 0);
}

function pointsOf(input: ToleranceInput): Point2DLike[] {
  if (Array.isArray(input)) return input;
  if (!input) return [];
  const bounds = input as Bounds3DLike;
  if (bounds.min && bounds.max) {
    return [
      { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
      { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
    ];
  }
  const box = input as Box3DLike;
  if (['minX', 'maxX', 'minY', 'maxY'].every((key) => Number.isFinite(box[key as keyof Box3DLike]))) {
    return [
      { x: box.minX, y: box.minY, z: box.minZ ?? 0 },
      { x: box.maxX, y: box.maxY, z: box.maxZ ?? 0 },
    ];
  }
  return [];
}

function subtract(a: Point3DLike, b: Point3DLike): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dominantAxis(vector: Vector3): Axis {
  const ax = Math.abs(vector.x);
  const ay = Math.abs(vector.y);
  const az = Math.abs(vector.z);
  if (ax >= ay && ax >= az) return 'x';
  return ay >= az ? 'y' : 'z';
}
