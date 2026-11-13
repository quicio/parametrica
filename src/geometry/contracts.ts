/**
 * geometry/contracts.ts — canonical geometry data kinds.
 *
 * Geometry is represented as discriminated plain data, not classes. World
 * coordinates are canonical; projection, depth and screen coordinates belong
 * to the view/render layer.
 */

export type Rec = Record<string, unknown>;

export interface Point2D {
  x: number;
  y: number;
  [key: string]: unknown;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface GeometryMeta {
  [key: string]: unknown;
}

export const GEOMETRY_KIND = Object.freeze({
  CURVE2D: 'curve2d',
  CURVE3D: 'curve3d',
  SURFACE: 'surface',
  MESH: 'mesh',
  SOLID: 'solid',
} as const);

export type GeometryKind = (typeof GEOMETRY_KIND)[keyof typeof GEOMETRY_KIND];

export const GEOMETRY_KINDS: readonly GeometryKind[] = Object.freeze(Object.values(GEOMETRY_KIND));

export interface Curve2D {
  kind: typeof GEOMETRY_KIND.CURVE2D;
  id?: string | undefined;
  dimension: 2;
  points: Point2D[];
  closed: boolean;
  meta: GeometryMeta;
  [key: string]: unknown;
}

export interface Curve3D {
  kind: typeof GEOMETRY_KIND.CURVE3D;
  id?: string | undefined;
  dimension: 3;
  points: Point3D[];
  closed: boolean;
  meta: GeometryMeta;
  [key: string]: unknown;
}

export interface SurfaceGrid {
  points: Point3D[][];
  rows?: number;
  cols?: number;
  [key: string]: unknown;
}

export interface Surface {
  kind: typeof GEOMETRY_KIND.SURFACE;
  id?: string | undefined;
  dimension: 3;
  domain: Rec;
  grid: SurfaceGrid;
  meta: GeometryMeta;
  [key: string]: unknown;
}

export interface Mesh {
  kind: typeof GEOMETRY_KIND.MESH;
  id?: string | undefined;
  dimension: 3;
  vertices: Point3D[];
  faces: number[][];
  normals: Point3D[] | null;
  faceNormals: Point3D[] | null;
  uvs: unknown;
  meta: GeometryMeta;
  [key: string]: unknown;
}

export interface Solid {
  kind: typeof GEOMETRY_KIND.SOLID;
  id?: string | undefined;
  dimension: 3;
  boundary: Mesh;
  shells: unknown[];
  closed: boolean;
  volume: number | null;
  validation: unknown;
  meta: GeometryMeta;
  [key: string]: unknown;
}

export type Geometry = Curve2D | Curve3D | Surface | Mesh | Solid;

const isKind = (value: unknown, kind: GeometryKind): boolean =>
  (value as { kind?: unknown } | null | undefined)?.kind === kind;

export function isCurve2D(value: unknown): value is Curve2D {
  return isKind(value, GEOMETRY_KIND.CURVE2D);
}

export function isCurve3D(value: unknown): value is Curve3D {
  return isKind(value, GEOMETRY_KIND.CURVE3D);
}

export function isSurface(value: unknown): value is Surface {
  return isKind(value, GEOMETRY_KIND.SURFACE);
}

export function isMesh(value: unknown): value is Mesh {
  return isKind(value, GEOMETRY_KIND.MESH);
}

export function isSolid(value: unknown): value is Solid {
  return isKind(value, GEOMETRY_KIND.SOLID);
}

export function isGeometry(value: unknown): value is Geometry {
  return GEOMETRY_KINDS.includes((value as { kind?: GeometryKind } | null | undefined)?.kind as GeometryKind);
}

export function geometryDimension(value: { dimension?: unknown } | null | undefined): 2 | 3 {
  return value?.dimension === 3 ? 3 : 2;
}

export function createCurve2D({ id, points, closed = false, meta = {} }: {
  id?: string | undefined;
  points: Point2D[];
  closed?: boolean;
  meta?: GeometryMeta;
}): Curve2D {
  return {
    kind: GEOMETRY_KIND.CURVE2D,
    id,
    dimension: 2,
    points,
    closed: Boolean(closed),
    meta,
  };
}

export function createCurve3D({ id, points, closed = false, meta = {} }: {
  id?: string | undefined;
  points: Point3D[];
  closed?: boolean;
  meta?: GeometryMeta;
}): Curve3D {
  return {
    kind: GEOMETRY_KIND.CURVE3D,
    id,
    dimension: 3,
    points,
    closed: Boolean(closed),
    meta,
  };
}

export function createSurface({ id, domain, grid, meta = {} }: {
  id?: string | undefined;
  domain: Rec;
  grid: SurfaceGrid;
  meta?: GeometryMeta;
}): Surface {
  return {
    kind: GEOMETRY_KIND.SURFACE,
    id,
    dimension: 3,
    domain,
    grid,
    meta,
  };
}

export function createMesh({ id, vertices, faces, normals = null, faceNormals = null, uvs = null, meta = {} }: {
  id?: string | undefined;
  vertices: Point3D[];
  faces: number[][];
  normals?: Point3D[] | null;
  faceNormals?: Point3D[] | null;
  uvs?: unknown;
  meta?: GeometryMeta;
}): Mesh {
  return {
    kind: GEOMETRY_KIND.MESH,
    id,
    dimension: 3,
    vertices,
    faces,
    normals,
    faceNormals,
    uvs,
    meta,
  };
}

export function createSolid({ id, boundary, shells = [], meta = {} }: {
  id?: string | undefined;
  boundary: Mesh;
  shells?: unknown[];
  meta?: GeometryMeta;
}): Solid {
  return {
    kind: GEOMETRY_KIND.SOLID,
    id,
    dimension: 3,
    boundary,
    shells,
    closed: false,
    volume: null,
    validation: null,
    meta,
  };
}
