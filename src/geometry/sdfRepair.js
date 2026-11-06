/**
 * geometry/sdfRepair.js — signed-distance reconstruction through Manifold.
 *
 * The source mesh may self-intersect. We build a deterministic SDF from a
 * triangle BVH and multi-ray parity, then let Manifold.levelSet produce a
 * guaranteed manifold result.
 */

import { buildTriangleBvh, closestPointOnMesh, windingNumberMulti } from './remesh.js';
import { manifoldLevelSet } from './manifoldEngine.js';

export const DEFAULT_SDF_RESOLUTION = 64;

export function sdfRepair(mesh, {
  resolution = DEFAULT_SDF_RESOLUTION,
  edgeLength = null,
  tolerance = null,
  repairTolerance = 1e-4,
} = {}) {
  if (!mesh || mesh.kind !== 'mesh' || !Array.isArray(mesh.vertices) || !Array.isArray(mesh.faces)) {
    return {
      ok: false,
      empty: false,
      mesh: null,
      error: { code: 'invalid-operand', message: 'sdfRepair requires a Mesh' },
    };
  }
  const bvh = buildTriangleBvh(mesh);
  const bbox = meshBbox(mesh);
  const diagonal = Math.hypot(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z);
  if (!Number.isFinite(diagonal) || diagonal <= 0) {
    return {
      ok: false,
      empty: true,
      mesh: null,
      error: { code: 'degenerate', message: 'sdfRepair requires a non-degenerate bbox' },
    };
  }
  const cells = Math.max(8, Math.floor(Number(resolution) || DEFAULT_SDF_RESOLUTION));
  const length = Number.isFinite(edgeLength) && edgeLength > 0 ? edgeLength : diagonal / cells;
  const pad = length * 2;
  const bounds = {
    min: { x: bbox.min.x - pad, y: bbox.min.y - pad, z: bbox.min.z - pad },
    max: { x: bbox.max.x + pad, y: bbox.max.y + pad, z: bbox.max.z + pad },
  };
  const distanceTolerance = Number.isFinite(tolerance) && tolerance >= 0 ? tolerance : length * 0.1;
  const sdf = (point) => {
    const p = Array.isArray(point) ? { x: point[0], y: point[1], z: point[2] } : point;
    const closest = closestPointOnMesh(bvh, p);
    if (!closest) return -length;
    return windingNumberMulti(bvh, p) > 0.5 ? closest.distance : -closest.distance;
  };
  const result = manifoldLevelSet(sdf, {
    bounds,
    edgeLength: length,
    tolerance: distanceTolerance,
    repairTolerance,
  });
  return {
    ...result,
    mesh: result.geometry ?? null,
    stats: {
      ...result.stats,
      resolution: cells,
      edgeLength: length,
      bounds,
      diagonal,
    },
  };
}

function meshBbox(mesh) {
  return (mesh.vertices ?? []).reduce((box, point) => ({
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
  }), {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
  });
}
