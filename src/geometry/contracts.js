/**
 * geometry/contracts.js — canonical geometry data kinds.
 *
 * Geometry is represented as discriminated plain data, not classes. World
 * coordinates are canonical; projection, depth and screen coordinates belong
 * to the view/render layer.
 */

export const GEOMETRY_KIND = Object.freeze({
  CURVE2D: 'curve2d',
  CURVE3D: 'curve3d',
  SURFACE: 'surface',
  MESH: 'mesh',
  SOLID: 'solid',
});

export const GEOMETRY_KINDS = Object.freeze(Object.values(GEOMETRY_KIND));

export function isCurve2D(value) {
  return value?.kind === GEOMETRY_KIND.CURVE2D;
}

export function isCurve3D(value) {
  return value?.kind === GEOMETRY_KIND.CURVE3D;
}

export function isSurface(value) {
  return value?.kind === GEOMETRY_KIND.SURFACE;
}

export function isMesh(value) {
  return value?.kind === GEOMETRY_KIND.MESH;
}

export function isSolid(value) {
  return value?.kind === GEOMETRY_KIND.SOLID;
}

export function isGeometry(value) {
  return GEOMETRY_KINDS.includes(value?.kind);
}

export function geometryDimension(value) {
  return value?.dimension === 3 ? 3 : 2;
}

export function createCurve2D({ id, points, closed = false, meta = {} }) {
  return {
    kind: GEOMETRY_KIND.CURVE2D,
    id,
    dimension: 2,
    points,
    closed: Boolean(closed),
    meta,
  };
}

export function createCurve3D({ id, points, closed = false, meta = {} }) {
  return {
    kind: GEOMETRY_KIND.CURVE3D,
    id,
    dimension: 3,
    points,
    closed: Boolean(closed),
    meta,
  };
}

export function createSurface({ id, domain, grid, meta = {} }) {
  return {
    kind: GEOMETRY_KIND.SURFACE,
    id,
    dimension: 3,
    domain,
    grid,
    meta,
  };
}

export function createMesh({ id, vertices, faces, normals = null, uvs = null, meta = {} }) {
  return {
    kind: GEOMETRY_KIND.MESH,
    id,
    dimension: 3,
    vertices,
    faces,
    normals,
    uvs,
    meta,
  };
}

export function createSolid({ id, boundary, shells = [], meta = {} }) {
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
