/**
 * geometry/transformGeometry.ts — world-space point mapping for every
 * canonical geometry kind.
 *
 * Operators transform world geometry, never projected/render coordinates.
 * Mapping a Surface only changes its grid vertices; domain, rows/cols and
 * closure stay untouched, so its SurfaceMapping remains valid. Mapping a Mesh
 * drops cached normals because they depend on the transformed positions.
 */

import { GEOMETRY_KIND } from './contracts.ts';

type Rec = Record<string, unknown>;

interface MapOptions {
  id?: string | undefined;
}

export function mapGeometryPoints<P>(item: unknown, mapPoint: (point: P) => P, { id }: MapOptions = {}): unknown {
  if (!item || typeof item !== 'object') return item;
  const source = item as Rec;
  const resolvedId = id ?? (source.id as string | undefined);
  if (source.kind === GEOMETRY_KIND.SOLID) {
    const boundary = source.boundary as Rec | undefined;
    return {
      ...source,
      id: resolvedId,
      boundary: mapGeometryPoints(boundary, mapPoint, { id: boundary?.id as string | undefined }),
      shells: ((source.shells as Rec[] | undefined) ?? []).map((shell) =>
        mapGeometryPoints(shell, mapPoint, { id: shell?.id as string | undefined })),
      closed: false,
      volume: null,
      validation: null,
    };
  }
  // Generators still emit legacy plain curves without a `kind` field; the
  // structural fallbacks keep those operators backwards compatible.
  if (Array.isArray(source.points)) {
    return { ...source, id: resolvedId, points: (source.points as P[]).map(mapPoint) };
  }
  const grid = source.grid as { points?: unknown[][] } | undefined;
  if (Array.isArray(grid?.points)) {
    return {
      ...source,
      id: resolvedId,
      grid: {
        ...grid,
        points: (grid.points as P[][]).map((row) => row.map(mapPoint)),
      },
    };
  }
  if (Array.isArray(source.vertices)) {
    return {
      ...source,
      id: resolvedId,
      vertices: (source.vertices as P[]).map(mapPoint),
      normals: null,
      faceNormals: null,
    };
  }
  return { ...source, id: resolvedId };
}

export function cloneGeometry(item: unknown, { id }: MapOptions = {}): unknown {
  return mapGeometryPoints<Rec>(item, (point) => ({ ...point }), { id });
}
