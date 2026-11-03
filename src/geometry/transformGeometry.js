/**
 * geometry/transformGeometry.js — world-space point mapping for every
 * canonical geometry kind.
 *
 * Operators transform world geometry, never projected/render coordinates.
 * Mapping a Surface only changes its grid vertices; domain, rows/cols and
 * closure stay untouched, so its SurfaceMapping remains valid. Mapping a Mesh
 * drops cached normals because they depend on the transformed positions.
 */

import { GEOMETRY_KIND } from './contracts.js';

export function mapGeometryPoints(item, mapPoint, { id = item?.id } = {}) {
  if (!item || typeof item !== 'object') return item;
  if (item.kind === GEOMETRY_KIND.SOLID) {
    return {
      ...item,
      id,
      boundary: mapGeometryPoints(item.boundary, mapPoint, { id: item.boundary?.id }),
      shells: (item.shells ?? []).map((shell) => mapGeometryPoints(shell, mapPoint, { id: shell?.id })),
      closed: false,
      volume: null,
      validation: null,
    };
  }
  // Generators still emit legacy plain curves without a `kind` field; the
  // structural fallbacks keep those operators backwards compatible.
  if (Array.isArray(item.points)) {
    return { ...item, id, points: item.points.map(mapPoint) };
  }
  if (Array.isArray(item.grid?.points)) {
    return {
      ...item,
      id,
      grid: {
        ...item.grid,
        points: item.grid.points.map((row) => row.map(mapPoint)),
      },
    };
  }
  if (Array.isArray(item.vertices)) {
    return {
      ...item,
      id,
      vertices: item.vertices.map(mapPoint),
      normals: null,
      faceNormals: null,
    };
  }
  return { ...item, id };
}

export function cloneGeometry(item, { id = item?.id } = {}) {
  return mapGeometryPoints(item, (point) => ({ ...point }), { id });
}
