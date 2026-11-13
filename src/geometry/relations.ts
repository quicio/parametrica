/**
 * geometry/relations.ts — explicit conversions between geometry kinds.
 */

import { createCurve3D, createSolid } from './contracts.ts';
import type { Curve2D, Curve3D, Mesh, Point3D, Solid, Surface } from './contracts.ts';
import { tessellateSurface } from './surfaceTessellation.js';
import { validateMesh, validateSolid } from './validate.js';

interface ValidationMeta {
  closed?: boolean;
  volume?: number;
  [key: string]: unknown;
}

interface ValidationResult {
  ok: boolean;
  meta?: ValidationMeta;
  [key: string]: unknown;
}

export function liftCurve2D(curve: Curve2D): Curve3D {
  return createCurve3D({
    id: curve.id,
    closed: curve.closed,
    meta: curve.meta,
    points: curve.points.map((point): Point3D => ({ x: point.x, y: point.y, z: 0 })),
  });
}

export function surfaceToMesh(surface: Surface, { id = surface.id }: { id?: string | undefined } = {}): Mesh {
  return tessellateSurface(surface, { id }) as Mesh;
}

export function meshToSolid(
  mesh: Mesh,
  { id = mesh.id, tolerance = 1e-6 }: { id?: string | undefined; tolerance?: number } = {},
): { solid: Solid | null; validation: ValidationResult } {
  const validation = validateMesh(mesh) as unknown as ValidationResult;
  if (!validation.ok || !validation.meta?.closed) {
    return { solid: null, validation };
  }
  const solid = createSolid({
    id,
    boundary: mesh,
    meta: { ...mesh.meta, tolerance },
  });
  solid.closed = true;
  solid.volume = validation.meta.volume as number;
  solid.validation = { ...validation.meta, tolerance };
  const solidValidation = validateSolid(solid) as unknown as ValidationResult;
  if (!solidValidation.ok) {
    return { solid: null, validation: solidValidation };
  }
  return { solid, validation: solidValidation };
}

export function solidToMesh(solid: Solid): Mesh {
  return solid.boundary;
}
