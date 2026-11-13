/**
 * interaction/seamOverlay.ts — UI-only domain/seam overlay.
 *
 * A seam is a declaration from SurfaceMapping.domain, not proof of geometric
 * continuity. A closed seam is drawn at its logical end (u1/v1); an open axis
 * draws its two domain borders. Reverse seams are marked as twists without
 * implying an orientation.
 */

interface Point2D { x: number; y: number }
interface Point3D { x: number; y: number; z?: number }
interface UV { u: number; v: number }
interface TransformLike { toArtboard: (point: Point3D) => Point2D | null }
interface MeshLike {
  id?: string;
  vertices?: unknown[];
  faces?: unknown[];
  [key: string]: unknown;
}
interface MappingFaceLike {
  indices?: number[];
  uv?: Array<UV | null>;
  [key: string]: unknown;
}
interface DomainLike {
  u: number[];
  v: number[];
  closedU?: boolean;
  closedV?: boolean;
  twistU?: boolean;
  twistV?: boolean;
}
interface MappingLike {
  meshId?: string;
  faces?: MappingFaceLike[];
  domain?: DomainLike;
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

export interface SeamEdge {
  kind: string;
  points: Point2D[];
}

export interface SeamOverlay {
  status: 'unavailable' | 'declared' | 'borders' | 'partial' | 'empty';
  edges: SeamEdge[];
  seams: number;
  borders: number;
}

const UNAVAILABLE: SeamOverlay = { status: 'unavailable', edges: [], seams: 0, borders: 0 };

export function buildSeamOverlay({ evaluation, scene }: {
  evaluation?: EvaluationLike | null;
  scene?: SceneLike | null;
} = {}): SeamOverlay {
  if (!evaluation || !scene) return { ...UNAVAILABLE, edges: [] };
  const layers = inspectableLayers(evaluation);
  if (!layers.length) return { ...UNAVAILABLE, edges: [] };
  const edges: SeamEdge[] = [];
  const seen = new Set<string>();
  let meshes = 0;
  let mappedMeshes = 0;
  let invalidFaces = 0;
  let seams = 0;
  let borders = 0;

  for (const layer of layers) {
    const sceneLayer = sceneLayerFor(scene, layer);
    const transform = sceneLayer?.transform ?? scene.transform;
    if (!transform) continue;
    const mappings = new Map<string, MappingLike>();
    for (const mapping of layer.surfaceMappings ?? []) {
      if (mapping?.meshId) mappings.set(mapping.meshId, mapping);
    }
    for (const mesh of layer.meshes ?? []) {
      meshes++;
      const mapping = mappings.get(mesh.id!);
      if (!mappingUsable(mapping, mesh)) continue;
      mappedMeshes++;
      const faces = mesh.faces as unknown[][];
      const mappingFaces = mapping!.faces!;
      for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
        const face = faces[faceIndex]!;
        const mappingFace = mappingFaces[faceIndex];
        if (!Array.isArray(face) || face.length !== 3 || !mappingFace) continue;
        if (!sameIndices(face, mappingFace.indices) || !Array.isArray(mappingFace.uv) || mappingFace.uv.length !== 3) {
          invalidFaces++;
          continue;
        }
        if (!mappingFace.uv.every((uv) => Number.isFinite(uv?.u) && Number.isFinite(uv?.v))) {
          invalidFaces++;
          continue;
        }
        const domain = mapping!.domain!;
        for (const [a, b] of [[0, 1], [1, 2], [2, 0]] as Array<[number, number]>) {
          const kind = classifyEdge(mappingFace.uv[a]!, mappingFace.uv[b]!, domain);
          if (!kind) continue;
          const first = face[a] as number;
          const second = face[b] as number;
          const key = `${layer.id}:${mesh.id}:${Math.min(first, second)}:${Math.max(first, second)}:${kind}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const pa = (mesh.vertices as unknown[])[first];
          const pb = (mesh.vertices as unknown[])[second];
          if (!pa || !pb) continue;
          const a2 = transform.toArtboard(pa as Point3D);
          const b2 = transform.toArtboard(pb as Point3D);
          if (!a2 || !b2) continue;
          edges.push({ kind, points: [a2, b2] });
          if (kind.startsWith('seam-')) seams++;
          else borders++;
        }
      }
    }
  }

  const status: SeamOverlay['status'] = edges.length
    ? (mappedMeshes === meshes && invalidFaces === 0
      ? (seams > 0 ? 'declared' : 'borders')
      : 'partial')
    : (mappedMeshes === 0 || invalidFaces > 0 ? 'unavailable' : 'empty');
  return { status, edges, seams, borders };
}

function classifyEdge(uvA: UV, uvB: UV, domain: DomainLike): string | null {
  if (sameNumber(uvA.u, uvB.u)) {
    if (sameNumber(uvA.u, domain.u[1]!)) {
      return domain.closedU
        ? (domain.twistU ? 'seam-u-twist' : 'seam-u')
        : 'border-u1';
    }
    if (sameNumber(uvA.u, domain.u[0]!)) {
      return domain.closedU ? null : 'border-u0';
    }
  }
  if (sameNumber(uvA.v, uvB.v)) {
    if (sameNumber(uvA.v, domain.v[1]!)) {
      return domain.closedV
        ? (domain.twistV ? 'seam-v-twist' : 'seam-v')
        : 'border-v1';
    }
    if (sameNumber(uvA.v, domain.v[0]!)) {
      return domain.closedV ? null : 'border-v0';
    }
  }
  return null;
}

function mappingUsable(mapping: MappingLike | undefined, mesh: MeshLike): mapping is MappingLike {
  if (!mapping || !Array.isArray(mapping.faces) || mapping.faces.length !== (mesh.faces?.length ?? -1)) return false;
  const domain = mapping.domain;
  if (!Array.isArray(domain?.u) || !Array.isArray(domain?.v) || domain.u.length < 2 || domain.v.length < 2) return false;
  if (!Number.isFinite(domain.u[0]) || !Number.isFinite(domain.u[1])) return false;
  if (!Number.isFinite(domain.v[0]) || !Number.isFinite(domain.v[1])) return false;
  return domain.u[0] !== domain.u[1] && domain.v[0] !== domain.v[1];
}

function inspectableLayers(evaluation: EvaluationLike): LayerLike[] {
  if (Array.isArray(evaluation.layers) && evaluation.layers.length) {
    return evaluation.layers.filter((layer) => (
      layer.visible !== false && Array.isArray(layer.meshes) && layer.meshes.length > 0
    ));
  }
  if (!Array.isArray(evaluation.meshes) || !evaluation.meshes.length) return [];
  return [{
    id: 'layer-0',
    visible: true,
    meshes: evaluation.meshes,
    surfaceMappings: evaluation.surfaceMappings ?? [],
  }];
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

function sameNumber(a: number, b: number): boolean {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-9 * scale;
}
