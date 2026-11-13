/**
 * interaction/inspectionOverlay.ts — derive UI-only artboard geometry for an
 * inspected surface point, triangle and parametric cell.
 *
 * Nothing here mutates the evaluation or becomes part of RenderScene. The
 * overlay is intentionally disposable and is rebuilt from current data.
 */

interface Point2D { x: number; y: number }
interface Point3D { x: number; y: number; z?: number }
interface TransformLike { toArtboard: (point: Point3D) => Point2D | null }
interface MeshLike {
  id?: string;
  vertices?: unknown[];
  faces?: unknown[];
  [key: string]: unknown;
}
interface MappingFaceLike {
  cell?: { u: number; v: number };
  triangle?: number;
  indices?: number[];
}
interface MappingLike {
  meshId?: string;
  faces?: MappingFaceLike[];
  [key: string]: unknown;
}
interface LayerLike {
  id?: string;
  visible?: boolean;
  meshes?: MeshLike[];
  surfaceMappings?: MappingLike[];
  [key: string]: unknown;
}
interface EvaluationLike {
  layers?: LayerLike[];
  meshes?: MeshLike[];
  surfaceMappings?: MappingLike[];
}
interface SceneLayerLike {
  id?: string;
  transform?: TransformLike;
  [key: string]: unknown;
}
interface SceneLike {
  layers?: SceneLayerLike[];
  transform?: TransformLike;
}
interface InspectionResultLike {
  layerId?: string;
  meshId?: string;
  faceIndex: number;
  triangleIndices?: number[];
  world: Point3D;
  mappingStatus?: string;
  cell?: { u: number; v: number };
}

export interface InspectionOverlay {
  marker: Point2D;
  triangle: Point2D[] | null;
  cell: Point2D[] | null;
  mappingValid: boolean;
}

export function buildInspectionOverlay({ evaluation, scene, result }: {
  evaluation?: EvaluationLike | null;
  scene?: SceneLike | null;
  result?: InspectionResultLike | null;
} = {}): InspectionOverlay | null {
  if (!evaluation || !scene || !result) return null;
  const layer = layerFor(evaluation, result.layerId);
  if (!layer || layer.visible === false) return null;
  const mesh = (layer.meshes ?? []).find((entry) => entry.id === result.meshId);
  if (!mesh || !Array.isArray(mesh.vertices) || !Array.isArray(mesh.faces)) return null;
  const face = mesh.faces[result.faceIndex];
  if (!Array.isArray(face) || !sameIndices(face, result.triangleIndices)) return null;
  const sceneLayer = sceneLayerFor(scene, layer);
  const transform = sceneLayer?.transform ?? scene.transform;
  if (!transform) return null;

  const marker = transform.toArtboard(result.world);
  if (!marker) return null;
  const trianglePoints = (face as number[]).map((index) => (
    mesh.vertices![index] ? transform.toArtboard(mesh.vertices![index] as Point3D) : null
  ));
  const triangle = trianglePoints.every(Boolean) ? trianglePoints as Point2D[] : null;

  let cell: Point2D[] | null = null;
  if (result.mappingStatus === 'ok' && result.cell) {
    const mapping = (layer.surfaceMappings ?? []).find((entry) => entry.meshId === result.meshId);
    const cellFaces = mapping?.faces?.filter((entry) => (
      entry.cell?.u === result.cell!.u && entry.cell?.v === result.cell!.v
    )) ?? [];
    const first = cellFaces.find((entry) => entry.triangle === 0);
    const second = cellFaces.find((entry) => entry.triangle === 1);
    if (first && second) {
      const firstIndices = first.indices ?? [];
      const secondIndices = second.indices ?? [];
      const order = [firstIndices[0]!, firstIndices[1]!, firstIndices[2]!, secondIndices[2]!];
      if (new Set(order).size === 4) {
        const points = order.map((index) => (
          mesh.vertices![index] ? transform.toArtboard(mesh.vertices![index] as Point3D) : null
        ));
        if (points.every(Boolean)) cell = points as Point2D[];
      }
    }
  }

  return {
    marker,
    triangle,
    cell,
    mappingValid: result.mappingStatus === 'ok',
  };
}

function layerFor(evaluation: EvaluationLike, layerId: string | undefined): LayerLike | null {
  if (Array.isArray(evaluation.layers) && evaluation.layers.length) {
    return evaluation.layers.find((layer) => layer.id === layerId) ?? null;
  }
  if (!Array.isArray(evaluation.meshes) || !evaluation.meshes.length) return null;
  return {
    id: layerId ?? 'layer-0',
    visible: true,
    meshes: evaluation.meshes,
    surfaceMappings: evaluation.surfaceMappings ?? [],
  };
}

function sceneLayerFor(scene: SceneLike, layer: LayerLike): SceneLayerLike | null {
  if (!Array.isArray(scene.layers) || !scene.layers.length) return null;
  return scene.layers.find((entry) => entry.id === layer.id)
    ?? (scene.layers.length === 1 ? scene.layers[0]! : null);
}

function sameIndices(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
