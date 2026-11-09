/** World-space surface picking over canonical meshes and SurfaceMapping. */

import {
  intersectRayTriangle,
  orthoDepthForPoint,
  pointOnRay,
  rayForArtboardPoint,
} from './ray.ts';
import type { BoundsLike, OrthoDepth, Ray3, TransformLike, Vec2, Vec3 } from './ray.ts';

const TIE_EPS = 1e-9;

export interface Uv { u: number; v: number }
export interface MappingFace {
  indices: number[];
  uv: Uv[];
  cell: { u: number; v: number };
  triangle: unknown;
}
export interface SurfaceMapping {
  meshId?: string;
  surfaceId?: string;
  sourceSurfaceId?: string;
  faces?: MappingFace[];
}
export interface MeshLike {
  id?: string;
  vertices?: Vec3[];
  faces?: number[][];
  meta?: Record<string, unknown>;
}
export interface EvaluationLayerLike {
  id?: string;
  name?: string;
  visible?: boolean;
  type?: string;
  source?: {
    layerId?: string;
    sourceLayerName?: string | null;
    sourceSurfaceId?: string | null;
    [key: string]: unknown;
  };
  meshes?: MeshLike[];
  surfaceMappings?: SurfaceMapping[];
  [key: string]: unknown;
}
export interface SceneLayerLike {
  id?: string;
  transform?: unknown;
}
export interface SceneLike {
  layers?: SceneLayerLike[];
  transform?: unknown;
  meta?: {
    worldBBox?: BoundsLike | null;
    frame?: { mode?: string };
    [key: string]: unknown;
  };
}
export interface EvaluationLike {
  layers?: EvaluationLayerLike[];
  meshes?: MeshLike[];
  name?: string;
  surfaceMappings?: SurfaceMapping[];
  worldBBox?: BoundsLike | null;
  [key: string]: unknown;
}
export interface PickResult {
  kind: 'surface-pick';
  layerId: string | null;
  layerName: string | null;
  instance: boolean;
  sourceLayerId: string | null;
  sourceLayerName: string | null;
  sourceSurfaceId: string | null;
  meshId: string | null;
  surfaceId: string | null;
  faceIndex: number;
  triangleIndices: number[];
  barycentric: { a: number; b: number; c: number };
  world: Vec3;
  uv: Uv | null;
  cell: { u: number; v: number } | null;
  triangle: unknown;
  mappingStatus: 'ok' | 'missing' | 'mismatch';
  distance: number;
  orthoDepth: OrthoDepth | null;
  projection: string;
}

export function pickSurface({
  evaluation = null,
  scene = null,
  artboardPoint = null,
  bounds = null,
  activeLayerId = null,
}: {
  evaluation?: EvaluationLike | null;
  scene?: SceneLike | null;
  artboardPoint?: Vec2 | null;
  bounds?: BoundsLike | null;
  activeLayerId?: string | null;
} = {}): PickResult | null {
  if (!evaluation || !scene || !artboardPoint) return null;
  if (!Number.isFinite(artboardPoint.x) || !Number.isFinite(artboardPoint.y)) return null;
  const layers = inspectableLayers(evaluation, scene, activeLayerId);
  if (!layers.length) return null;
  const worldBBox = bounds ?? scene.meta?.worldBBox ?? evaluation.worldBBox ?? null;
  let best: PickResult | null = null;

  for (const layer of layers) {
    const sceneLayer = sceneLayerFor(scene, layer);
    const transform = sceneLayer?.transform ?? scene.transform ?? null;
    if (!transform || typeof transform !== 'object') continue;
    const ray = rayForArtboardPoint({ point: artboardPoint, transform: transform as TransformLike, worldBBox });
    if (!ray) continue;
    const mappings = mappingByMesh(layer.surfaceMappings);
    for (const mesh of layer.meshes ?? []) {
      const vertices = mesh.vertices;
      const faces = mesh.faces;
      if (!Array.isArray(vertices) || !Array.isArray(faces)) continue;
      for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
        const face = faces[faceIndex];
        if (!Array.isArray(face) || face.length !== 3) continue;
        const [i0, i1, i2] = face;
        if (typeof i0 !== 'number' || typeof i1 !== 'number' || typeof i2 !== 'number') continue;
        const a = vertices[i0];
        const b = vertices[i1];
        const c = vertices[i2];
        if (!a || !b || !c) continue;
        const hit = intersectRayTriangle(ray, a, b, c);
        if (!hit) continue;
        if (best && hit.t >= best.distance - TIE_EPS) continue;
        const mapping = mappings.get(mesh.id ?? '') ?? null;
        const mappingFace = mapping?.faces?.[faceIndex] ?? null;
        let mappingStatus: 'ok' | 'missing' | 'mismatch' = !mapping
          ? 'missing'
          : (!mappingFace || !sameIndices(mappingFace.indices, face) ? 'mismatch' : 'ok');
        const uv = mappingStatus === 'ok' ? interpolateUV(mappingFace?.uv, hit.barycentric) : null;
        const validUV = uv && Number.isFinite(uv.u) && Number.isFinite(uv.v);
        if (mappingStatus === 'ok' && !validUV) mappingStatus = 'mismatch';
        const world = pointOnRay(ray, hit.t);
        best = {
          kind: 'surface-pick',
          layerId: layer.id ?? null,
          layerName: layer.name ?? null,
          instance: layer.type === 'instance',
          sourceLayerId: layer.source?.layerId ?? stringOrNull(mesh.meta?.sourceLayerId),
          sourceLayerName: layer.source?.sourceLayerName ?? null,
          sourceSurfaceId: layer.source?.sourceSurfaceId
            ?? mapping?.sourceSurfaceId
            ?? stringOrNull(mesh.meta?.sourceSurfaceId),
          meshId: mesh.id ?? null,
          surfaceId: mapping?.surfaceId ?? stringOrNull(mesh.meta?.surfaceId),
          faceIndex,
          triangleIndices: [...face],
          barycentric: hit.barycentric,
          world,
          uv: mappingStatus === 'ok' ? uv : null,
          cell: mappingStatus === 'ok' && mappingFace ? { ...mappingFace.cell } : null,
          triangle: mappingStatus === 'ok' && mappingFace ? mappingFace.triangle : null,
          mappingStatus,
          distance: hit.t,
          orthoDepth: ray.kind === 'orthographic'
            ? orthoDepthForPoint(world, ray.projection)
            : null,
          projection: ray.projection,
        };
      }
    }
  }

  return best;
}

/** Revalidate a stored pick against the current evaluation. */
export function validatePickResult(result: PickResult | null | undefined, evaluation: EvaluationLike | null | undefined): boolean {
  if (!result || !evaluation) return false;
  const layer = evaluationLayer(evaluation, result.layerId);
  if (!layer || layer.visible === false) return false;
  const mesh = (layer.meshes ?? []).find((entry) => entry.id === result.meshId);
  const vertices = mesh?.vertices;
  const faces = mesh?.faces;
  if (!Array.isArray(vertices) || !Array.isArray(faces)) return false;
  const face = faces[result.faceIndex];
  if (!Array.isArray(face) || !sameIndices(face, result.triangleIndices)) return false;
  const [i0, i1, i2] = face;
  if (typeof i0 !== 'number' || typeof i1 !== 'number' || typeof i2 !== 'number') return false;
  const a = vertices[i0];
  const b = vertices[i1];
  const c = vertices[i2];
  const bary = result.barycentric;
  if (!a || !b || !c || !bary) return false;
  const world: Vec3 = {
    x: a.x * bary.a + b.x * bary.b + c.x * bary.c,
    y: a.y * bary.a + b.y * bary.b + c.y * bary.c,
    z: a.z * bary.a + b.z * bary.b + c.z * bary.c,
  };
  if (!samePoint(world, result.world)) return false;

  const mapping = (layer.surfaceMappings ?? []).find((entry) => entry.meshId === result.meshId) ?? null;
  const mappingFace = mapping?.faces?.[result.faceIndex] ?? null;
  const status = !mapping
    ? 'missing'
    : (!mappingFace || !sameIndices(mappingFace.indices, face) ? 'mismatch' : 'ok');
  if (status !== result.mappingStatus) return false;
  if (status !== 'ok') return true;
  if (!mappingFace) return false;
  const uv = interpolateUV(mappingFace.uv, bary);
  if (!uv || !Number.isFinite(uv.u) || !Number.isFinite(uv.v)) return false;
  if (!result.uv || !sameNumber(uv.u, result.uv.u) || !sameNumber(uv.v, result.uv.v)) return false;
  if (!result.cell || result.cell.u !== mappingFace.cell.u || result.cell.v !== mappingFace.cell.v) return false;
  return result.triangle === mappingFace.triangle;
}

function evaluationLayer(evaluation: EvaluationLike, layerId: string | null): EvaluationLayerLike | null {
  if (Array.isArray(evaluation.layers) && evaluation.layers.length) {
    return evaluation.layers.find((layer) => layer.id === layerId) ?? null;
  }
  if (!Array.isArray(evaluation.meshes) || !evaluation.meshes.length) return null;
  return {
    id: layerId ?? 'layer-0',
    name: evaluation.name ?? 'Surface',
    visible: true,
    meshes: evaluation.meshes,
    surfaceMappings: evaluation.surfaceMappings ?? [],
  };
}

function samePoint(a: Vec3 | null | undefined, b: Vec3 | null | undefined): boolean {
  if (!a || !b) return false;
  const scale = Math.max(1, Math.abs(a.x), Math.abs(a.y), Math.abs(a.z));
  return Math.abs(a.x - b.x) <= 1e-7 * scale
    && Math.abs(a.y - b.y) <= 1e-7 * scale
    && Math.abs(a.z - b.z) <= 1e-7 * scale;
}

function sameNumber(a: number, b: number): boolean {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-7 * scale;
}

function inspectableLayers(
  evaluation: EvaluationLike,
  scene: SceneLike,
  activeLayerId: string | null,
): EvaluationLayerLike[] {
  const layers: EvaluationLayerLike[] = Array.isArray(evaluation.layers) && evaluation.layers.length
    ? evaluation.layers.filter((layer) => (
      layer.visible !== false && Array.isArray(layer.meshes) && layer.meshes.length > 0
    ))
    : (Array.isArray(evaluation.meshes) && evaluation.meshes.length
      ? [{
        id: scene.layers?.[0]?.id ?? 'layer-0',
        name: evaluation.name ?? 'Surface',
        visible: true,
        meshes: evaluation.meshes,
        surfaceMappings: evaluation.surfaceMappings ?? [],
      }]
      : []);

  if (scene.meta?.frame?.mode === 'composition') {
    if (!activeLayerId) return [];
    return layers.filter((layer) => layer.id === activeLayerId);
  }
  return layers;
}

function sceneLayerFor(scene: SceneLike, layer: EvaluationLayerLike): SceneLayerLike | null {
  if (!Array.isArray(scene.layers) || !scene.layers.length) return null;
  return scene.layers.find((entry) => entry.id === layer.id)
    ?? (scene.layers.length === 1 ? scene.layers[0] ?? null : null);
}

function mappingByMesh(mappings: SurfaceMapping[] | null | undefined): Map<string, SurfaceMapping> {
  const map = new Map<string, SurfaceMapping>();
  for (const mapping of mappings ?? []) {
    if (mapping?.meshId) map.set(mapping.meshId, mapping);
  }
  return map;
}

function interpolateUV(
  uvs: Uv[] | null | undefined,
  barycentric: { a: number; b: number; c: number },
): Uv | null {
  if (!Array.isArray(uvs) || uvs.length !== 3) return null;
  const [a, b, c] = uvs;
  if (!a || !b || !c) return null;
  return {
    u: a.u * barycentric.a + b.u * barycentric.b + c.u * barycentric.c,
    v: a.v * barycentric.a + b.v * barycentric.b + c.v * barycentric.c,
  };
}

function sameIndices(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}
