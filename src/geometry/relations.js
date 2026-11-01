/**
 * geometry/relations.js — explicit conversions between geometry kinds.
 */

import { createCurve3D, createSolid } from './contracts.js';
import { tessellateSurface } from './surfaceTessellation.js';
import { validateMesh, validateSolid } from './validate.js';

export function liftCurve2D(curve) {
  return createCurve3D({
    id: curve.id,
    closed: curve.closed,
    meta: curve.meta,
    points: curve.points.map((point) => ({ x: point.x, y: point.y, z: 0 })),
  });
}

export function surfaceToMesh(surface, { id = surface.id } = {}) {
  return tessellateSurface(surface, { id });
}

export function meshToSolid(mesh, { id = mesh.id, tolerance = 1e-6 } = {}) {
  const validation = validateMesh(mesh);
  if (!validation.ok || !validation.meta?.closed) {
    return { solid: null, validation };
  }
  const solid = createSolid({
    id,
    boundary: mesh,
    meta: { ...mesh.meta, tolerance },
  });
  solid.closed = true;
  solid.volume = validation.meta.volume;
  solid.validation = { ...validation.meta, tolerance };
  const solidValidation = validateSolid(solid);
  if (!solidValidation.ok) {
    return { solid: null, validation: solidValidation };
  }
  return { solid, validation: solidValidation };
}

export function solidToMesh(solid) {
  return solid.boundary;
}
