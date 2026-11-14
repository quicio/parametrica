/**
 * geometry/sdfRepair.ts — signed-distance reconstruction through Manifold.
 *
 * The source mesh may self-intersect. We build a deterministic SDF from a
 * triangle BVH and multi-ray parity, then let Manifold.levelSet produce a
 * guaranteed manifold result.
 */

import { buildTriangleBvh, closestPointOnMesh, windingNumberMulti } from './remesh.ts';
import { manifoldLevelSet } from './manifoldEngine.ts';
import type { ValidationResult } from './validate.ts';

type Rec = Record<string, unknown>;
interface Point3D { x: number; y: number; z: number; [key: string]: unknown }
interface BBox {
  min: Point3D;
  max: Point3D;
}
interface MeshLike {
  kind?: string;
  vertices?: Point3D[];
  faces?: number[][];
}

export interface SdfRepairOptions {
  resolution?: number;
  edgeLength?: number | null;
  tolerance?: number | null;
  repairTolerance?: number;
}

export interface SdfRepairResult {
  ok: boolean;
  empty?: boolean;
  mesh: unknown;
  geometry?: unknown;
  validation?: ValidationResult | null;
  error?: { code: string; message: string };
  stats?: Rec;
}

export const DEFAULT_SDF_RESOLUTION = 64;

export function sdfRepair(mesh: unknown, {
  resolution = DEFAULT_SDF_RESOLUTION,
  edgeLength = null,
  tolerance = null,
  repairTolerance = 1e-4,
}: SdfRepairOptions = {}): SdfRepairResult {
  const source = mesh as MeshLike | null | undefined;
  if (!source || source.kind !== 'mesh' || !Array.isArray(source.vertices) || !Array.isArray(source.faces)) {
    return {
      ok: false,
      empty: false,
      mesh: null,
      error: { code: 'invalid-operand', message: 'sdfRepair requires a Mesh' },
    };
  }
  const bvh = buildTriangleBvh(source as never);
  const bbox = meshBbox(source);
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
  const length = Number.isFinite(edgeLength) && (edgeLength as number) > 0 ? edgeLength as number : diagonal / cells;
  const pad = length * 2;
  const bounds = {
    min: { x: bbox.min.x - pad, y: bbox.min.y - pad, z: bbox.min.z - pad },
    max: { x: bbox.max.x + pad, y: bbox.max.y + pad, z: bbox.max.z + pad },
  };
  const distanceTolerance = Number.isFinite(tolerance) && (tolerance as number) >= 0 ? tolerance as number : length * 0.1;
  const sdf = (point: Point3D | number[]): number => {
    const p: Point3D = Array.isArray(point)
      ? { x: point[0]!, y: point[1]!, z: point[2]! }
      : point;
    const closest = closestPointOnMesh(bvh, p) as { distance: number } | null;
    if (!closest) return -length;
    return (windingNumberMulti(bvh, p) as number) > 0.5 ? closest.distance : -closest.distance;
  };
  const levelSetOptions = {
    bounds,
    edgeLength: length,
    tolerance: distanceTolerance,
    repairTolerance,
  };
  const result = manifoldLevelSet(sdf, levelSetOptions as never) as unknown as Rec & { geometry?: unknown; stats?: Rec };
  return {
    ...result,
    ok: Boolean(result.ok),
    mesh: result.geometry ?? null,
    stats: {
      ...(result.stats ?? {}),
      resolution: cells,
      edgeLength: length,
      bounds,
      diagonal,
    },
  };
}

function meshBbox(mesh: MeshLike): BBox {
  const vertices = mesh.vertices ?? [];
  return vertices.reduce<BBox>((box, point) => ({
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
