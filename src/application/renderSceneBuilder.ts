/** World/view evaluation to RenderScene. */

import { bboxAll } from '../sampling/sampling.js';
import {
  boundsOfProjectedPoints,
  createViewTransform,
  DEFAULT_FRAME,
  projectPointToView,
  resolveEffectiveCamera,
  sanitizeFrame,
  SPACE,
} from '../view/transform.ts';
import type { ProjectionId } from '../view/transform.ts';
import type { CameraState } from '../view/camera.ts';
import {
  applyViewTransformToCurves,
  applyViewTransformToMeshes,
  projectWorldCurvesToView,
  projectWorldMeshesToView,
  projectionForGeometry,
} from '../view/projection.ts';
import { isMesh } from '../geometry/contracts.js';
import { meshWireframeCurves } from '../geometry/wireframe.js';
import { sanitizeReference } from '../view/spatialReference.ts';
import { createRenderLayer, createRenderScene } from '../domain/scene.ts';
import type { RenderLayer, RenderScene } from '../domain/scene.ts';

type UnknownRecord = Record<string, unknown>;

interface VectorLike { x: number; y: number; z?: number; [key: string]: unknown }
interface CurveLike { points?: VectorLike[]; [key: string]: unknown }
interface MeshLike { vertices?: VectorLike[]; [key: string]: unknown }
interface StyleLike { fill?: UnknownRecord; stroke?: UnknownRecord; [key: string]: unknown }
interface TransformLike {
  camera?: unknown;
  frame?: unknown;
  [key: string]: unknown;
}
interface GroupLike {
  id?: string;
  name?: string;
  visible?: boolean;
  fabricationRole?: string;
  curves?: CurveLike[];
  meshes?: MeshLike[];
  renderMeshes?: MeshLike[];
  geometry?: UnknownRecord[] | null;
  style?: StyleLike | null;
  modes?: string[] | null;
  colorMetric?: string | null;
  generator?: UnknownRecord | null;
  renderGenerator?: UnknownRecord | null;
  bbox?: UnknownRecord | null;
  appliedProjection?: string | null;
  trace?: UnknownRecord;
  [key: string]: unknown;
}
interface EvaluationLike {
  layers?: GroupLike[];
  curves?: CurveLike[];
  meshes?: MeshLike[];
  geometry?: UnknownRecord[] | null;
  bbox?: UnknownRecord | null;
  worldBBox?: UnknownRecord | null;
  viewProjection?: string | null;
  appliedProjection?: string | null;
  [key: string]: unknown;
}
interface DocumentLike {
  view?: ViewLike;
  layers?: GroupLike[];
  activeLayer?: number;
  name?: string;
  generator?: UnknownRecord | null;
  [key: string]: unknown;
}
interface ViewLike {
  artboard?: unknown;
  projection?: string;
  camera?: unknown;
  frame?: UnknownRecord;
  modes?: string[];
  passOpacity?: UnknownRecord;
  style?: StyleLike;
  overlays?: UnknownRecord;
  colorRamp?: unknown;
  preview?: UnknownRecord;
  reference?: UnknownRecord;
  units?: UnknownRecord;
  [key: string]: unknown;
}
interface PreviewLike {
  mesh?: MeshLike;
  layerId?: string;
  [key: string]: unknown;
}
interface PreparedGroup {
  curves: CurveLike[];
  meshes: MeshLike[];
  points: VectorLike[];
}
interface LayerResult {
  transform: TransformLike | null;
  space: string;
  projection: string;
  entry: RenderLayer;
}

const SCENE_CACHE = new WeakMap<object, { signature: string; scene: RenderScene }>();
const PREVIEW_IDS = new WeakMap<object, number>();
let nextPreviewId = 1;

function generatorFit(layer: GroupLike): unknown {
  const generator = (layer.renderGenerator ?? layer.generator) as UnknownRecord | null;
  const params = generator?.params as UnknownRecord | undefined;
  return params?.fit;
}

function previewKeyOf(mesh: unknown): number | null {
  if (!mesh || typeof mesh !== 'object') return null;
  const key = mesh as object;
  if (!PREVIEW_IDS.has(key)) PREVIEW_IDS.set(key, nextPreviewId++);
  return PREVIEW_IDS.get(key) ?? null;
}

export function buildRenderScene({
  evaluation,
  document: doc,
  view = doc.view ?? {},
  projectionOverride = null,
  preview = null,
}: {
  evaluation: EvaluationLike | null;
  document: DocumentLike;
  view?: ViewLike;
  projectionOverride?: string | null;
  preview?: PreviewLike | null;
}): RenderScene {
  const previewKey = preview?.mesh ? previewKeyOf(preview.mesh) : null;
  if (!evaluation) return createRenderScene({ artboard: view?.artboard, view, layers: [] });
  const signature = JSON.stringify([
    projectionOverride,
    previewKey,
    preview?.layerId ?? null,
    view?.projection,
    view?.camera,
    view?.frame,
    view?.reference,
    view?.modes,
    view?.passOpacity,
    view?.style,
    view?.overlays,
    view?.colorRamp,
    view?.preview,
    view?.artboard,
    doc?.activeLayer,
    doc?.layers?.map((layer) => [
      layer.id,
      layer.visible,
      layer.modes,
      layer.colorMetric,
      generatorFit(layer),
    ]),
  ]);
  const cached = SCENE_CACHE.get(evaluation);
  if (cached?.signature === signature) return cached.scene;

  const groups = sourceGroups(evaluation, doc, view);
  const frameSpec = sanitizeFrame(view?.frame, DEFAULT_FRAME);
  const projection = resolveProjection(evaluation, groups, view, projectionOverride);
  const spatial = groups.filter(isSpatialGroup);
  const artboard = view?.artboard;

  const layerResults: LayerResult[] = [];
  let sceneTransform: TransformLike | null = null;

  if (frameSpec.mode === 'composition') {
    for (const group of groups) {
      const result = buildCompositionGroup(group, { projection, view, document: doc });
      layerResults.push(result);
      if (!sceneTransform && result.transform) sceneTransform = result.transform;
    }
  } else {
    const pointLists = spatial.flatMap(groupWorldPointLists);
    const camera = resolveEffectiveCamera(view?.camera as CameraState | null | undefined, pointLists);
    const prepared = spatial.map((group) => prepareSpatialGroup(group, { projection, view, camera }));
    const viewPoints = prepared.flatMap((entry) => entry.points);
    const bounds = boundsOfProjectedPoints(viewPoints);
    const fit = frameSpec.mode === 'world' ? null : resolveSceneFit(view, doc, spatial);
    const scale = frameSpec.mode === 'world' ? (frameSpec.scale ?? 1) : frameSpec.scale;
    sceneTransform = createViewTransform({
      projection,
      camera,
      frame: { mode: frameSpec.mode, anchor: frameSpec.anchor, fit, scale },
      artboard,
      bounds,
      projectedOrigin: projectPointToView({ x: 0, y: 0, z: 0 }, projection as ProjectionId, camera),
    } as never) as unknown as TransformLike;

    const preparedByGroup = new Map(spatial.map((group, index) => [group, prepared[index]]));
    for (const group of groups) {
      if (!isSpatialGroup(group)) {
        layerResults.push(buildArtboardGroup(group, view, projection));
        continue;
      }
      layerResults.push(applyPreparedGroup(group, preparedByGroup.get(group) ?? null, sceneTransform, projection));
    }
  }

  const layers = layerResults.map(({ entry }) => entry);
  if (preview?.mesh && preview.layerId) {
    const target = layerResults.find((result) => (
      result.entry.id === preview.layerId && result.transform
    ));
    if (target) {
      const targetTransform = target.transform as TransformLike;
      const projected = projectWorldMeshesToView([preview.mesh] as never, {
        camera: targetTransform.camera,
        projection: target.projection,
        depthFade: true,
        depthStrength: 0.55,
      } as never);
      const meshes = applyViewTransformToMeshes(projected, targetTransform as never);
      target.entry.meshes = meshes;
      target.entry.renderMeshes = meshes;
      target.entry.modes = ['lattice-preview'];
      const style = (target.entry.style ?? {}) as StyleLike;
      target.entry.style = {
        ...style,
        fill: { ...(style.fill ?? {}), enabled: true, opacity: 1, color: '#ffffff' },
        stroke: { ...(style.stroke ?? {}), opacity: 0.7 },
      };
      for (const result of layerResults) {
        if (result === target) continue;
        result.entry.curves = [];
        result.entry.meshes = [];
        result.entry.renderMeshes = [];
        result.entry.modes = [];
      }
    }
  }
  const curves = layers.flatMap((layer) => layer.curves);
  const hasArtboard = groups.some((group) => !isSpatialGroup(group));
  const activeId = doc?.layers?.[doc.activeLayer ?? 0]?.id;
  const activeResult = layerResults.find((result) => result.entry.id === activeId && result.transform);
  const referenceTransform = spatial.length
    ? (frameSpec.mode === 'composition' ? (activeResult?.transform ?? null) : sceneTransform)
    : null;
  const spatialScene = buildSpatialScene({ doc, view, preview });
  const scene = createRenderScene({
    artboard,
    view,
    layers,
    transform: sceneTransform,
    spatial: spatialScene,
    meta: {
      projection,
      bbox: curves.length ? bboxAll(curves as never) : (evaluation.bbox ?? null),
      worldBBox: spatial.length ? (evaluation.worldBBox ?? worldBoundsOfGroups(spatial)) : null,
      space: spatial.length ? (hasArtboard ? SPACE.MIXED : SPACE.WORLD) : SPACE.ARTBOARD,
      frame: (sceneTransform?.frame as UnknownRecord | undefined) ?? null,
      reference: sanitizeReference(view?.reference),
      referenceTransform,
    },
  });
  SCENE_CACHE.set(evaluation, { signature, scene });
  return scene;
}

export function buildSpatialScene({
  doc,
  view,
  preview,
}: {
  doc: DocumentLike;
  view: ViewLike;
  preview: PreviewLike | null;
}): UnknownRecord | null {
  if (!preview?.mesh || !preview.layerId) return null;
  const mesh = preview.mesh;
  if (!isMesh(mesh)) return null;
  const bounds = worldBoundsOfMeshes([mesh]);
  const layer = (doc?.layers ?? []).find((entry) => entry.id === preview.layerId);
  return {
    projection: '3d',
    camera: { ...((view?.camera as UnknownRecord | undefined) ?? {}) },
    units: { ...((view?.units as UnknownRecord | undefined) ?? {}) },
    frame: view?.frame ?? null,
    background: (view?.preview as UnknownRecord | undefined)?.background ?? null,
    bbox: bounds,
    reference: sanitizeReference(view?.reference),
    layers: [{
      id: preview.layerId,
      name: layer?.name ?? null,
      visible: true,
      opacity: 1,
      meshes: [mesh],
      material: view?.preview ?? null,
    }],
    source: 'fabrication-preview',
  };
}

function worldBoundsOfMeshes(meshes: MeshLike[]): UnknownRecord | null {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const mesh of meshes) {
    for (const point of mesh?.vertices ?? []) {
      if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y) || !Number.isFinite(point?.z)) continue;
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
      minZ = Math.min(minZ, point.z ?? 0); maxZ = Math.max(maxZ, point.z ?? 0);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return {
    minX, minY, minZ, maxX, maxY, maxZ,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
  };
}

function sourceGroups(evaluation: EvaluationLike, doc: DocumentLike, view: ViewLike): GroupLike[] {
  if (Array.isArray(evaluation.layers) && evaluation.layers.length) {
    return evaluation.layers.filter((layer) => (
      layer.visible !== false
      && layer.fabricationRole !== 'cutter'
      && (
        (layer.curves?.length ?? 0) > 0
        || (layer.meshes?.length ?? 0) > 0
        || (layer.geometry?.length ?? 0) > 0
      )
    ));
  }
  return [{
    id: doc?.layers?.[0]?.id ?? 'layer-0',
    name: doc?.name,
    curves: evaluation.curves ?? [],
    meshes: evaluation.meshes ?? [],
    geometry: evaluation.geometry ?? null,
    style: view?.style,
    modes: null,
    colorMetric: null,
    generator: doc?.generator,
    bbox: evaluation.bbox,
    appliedProjection: evaluation.appliedProjection ?? null,
  } as GroupLike];
}

function resolveProjection(
  evaluation: EvaluationLike,
  groups: GroupLike[],
  view: ViewLike,
  override: string | null,
): string {
  if (override) return override;
  const world = groups.flatMap((group) => [
    ...(group.geometry ?? []),
    ...(group.meshes ?? []),
  ]);
  if (world.length) return projectionForGeometry(world, (view?.projection ?? '3d') as ProjectionId);
  return evaluation.viewProjection ?? view?.projection ?? '3d';
}

function isSpatialGroup(group: GroupLike): boolean {
  return Array.isArray(group.geometry) && group.geometry.length > 0;
}

function groupWorldPointLists(group: GroupLike): VectorLike[][] {
  const lists: VectorLike[][] = [];
  for (const item of group.geometry ?? []) {
    if (Array.isArray(item.points)) lists.push(item.points as VectorLike[]);
    else if (item.grid && typeof item.grid === 'object') {
      const grid = item.grid as { points?: VectorLike[][] };
      if (Array.isArray(grid.points)) lists.push(grid.points.flat());
    } else if (Array.isArray(item.vertices)) lists.push(item.vertices as VectorLike[]);
  }
  for (const mesh of group.meshes ?? []) {
    if (Array.isArray(mesh.vertices)) lists.push(mesh.vertices);
  }
  return lists;
}

function worldCurvesOf(group: GroupLike): CurveLike[] {
  return (group.geometry ?? []).filter((item) => Array.isArray(item.points)) as CurveLike[];
}

function worldMeshesOf(group: GroupLike): MeshLike[] {
  if (Array.isArray(group.meshes) && group.meshes.length) return group.meshes;
  return (group.geometry ?? []).filter((item) => isMesh(item)) as MeshLike[];
}

function prepareSpatialGroup(
  group: GroupLike,
  { projection, view, camera = null }: { projection: string; view: ViewLike; camera?: unknown },
): PreparedGroup {
  const generator = (group.renderGenerator ?? group.generator) as UnknownRecord | null;
  const params = (generator?.params ?? {}) as UnknownRecord;
  const curves = projectWorldCurvesToView(worldCurvesOf(group) as never, {
    camera: camera ?? view?.camera,
    projection,
    depthFade: params.depthOcclusion ?? true,
    depthStrength: params.depthAttenuation ?? 0.55,
  } as never) as CurveLike[];
  const meshes = projectWorldMeshesToView(worldMeshesOf(group) as never, {
    camera: camera ?? view?.camera,
    projection,
    depthFade: params.depthOcclusion ?? true,
    depthStrength: params.depthAttenuation ?? 0.55,
  } as never) as MeshLike[];
  return {
    curves,
    meshes,
    points: [
      ...curves.flatMap((curve) => curve.points ?? []),
      ...meshes.flatMap((mesh) => mesh.vertices ?? []),
    ],
  };
}

function applyPreparedGroup(
  group: GroupLike,
  prepared: PreparedGroup | null,
  transform: TransformLike,
  projection: string,
): LayerResult {
  const safe = prepared ?? { curves: [], meshes: [], points: [] };
  const curves = applyViewTransformToCurves(safe.curves as never, transform as never) as CurveLike[];
  const meshes = applyViewTransformToMeshes(safe.meshes as never, transform as never) as MeshLike[];
  const wireframe = meshWireframeCurves(meshes) as unknown as CurveLike[];
  return renderLayer(group, {
    curves: [...curves, ...wireframe],
    meshes,
    transform,
    projection,
    space: SPACE.WORLD,
  });
}

function buildCompositionGroup(
  group: GroupLike,
  { projection, view, document: doc }: { projection: string; view: ViewLike; document: DocumentLike },
): LayerResult {
  if (!isSpatialGroup(group)) return buildArtboardGroup(group, view, projection);
  const camera = resolveEffectiveCamera(view?.camera as CameraState | null | undefined, groupWorldPointLists(group));
  const prepared = prepareSpatialGroup(group, { projection, view, camera });
  const transform = createViewTransform({
    projection,
    camera,
    frame: { mode: 'composition', anchor: 'bbox', fit: legacyFit(group, doc) },
    artboard: view?.artboard,
    bounds: boundsOfProjectedPoints(prepared.points),
    projectedOrigin: projectPointToView({ x: 0, y: 0, z: 0 }, projection as ProjectionId, camera),
  } as never) as unknown as TransformLike;
  return applyPreparedGroup(group, prepared, transform, projection);
}

function buildArtboardGroup(group: GroupLike, view: ViewLike, projection: string): LayerResult {
  return renderLayer(group, {
    curves: group.curves ?? [],
    meshes: group.renderMeshes ?? group.meshes ?? [],
    transform: null,
    projection: group.appliedProjection ?? projection,
    space: SPACE.ARTBOARD,
  });
}

function renderLayer(
  group: GroupLike,
  {
    curves,
    meshes,
    transform,
    projection,
    space,
  }: {
    curves: CurveLike[];
    meshes: MeshLike[];
    transform: TransformLike | null;
    projection: string;
    space: string;
  },
): LayerResult {
  const entry = createRenderLayer({
    id: group.id ?? '',
    name: group.name ?? '',
    style: group.style ?? null,
    modes: group.modes ?? null,
    colorMetric: group.colorMetric ?? null,
    curves,
    meshes,
    renderMeshes: meshes,
    bbox: curves.length ? bboxAll(curves as never) : (meshBBox(meshes) ?? group.bbox ?? null),
    appliedProjection: projection,
    space,
    transform,
  });
  if (group.trace) entry.trace = group.trace;
  return { transform, space, projection, entry };
}

function resolveSceneFit(view: ViewLike, doc: DocumentLike, spatialGroups: GroupLike[]): number {
  const explicit = view?.frame?.fit;
  if (explicit !== null && explicit !== undefined && Number.isFinite(Number(explicit))) {
    return Number(explicit);
  }
  const active = doc?.layers?.[doc.activeLayer ?? 0] ?? doc?.layers?.[0];
  const activeGroup = spatialGroups.find((group) => group.id === active?.id);
  if (activeGroup) {
    const activeFit = Number(((activeGroup.renderGenerator ?? activeGroup.generator) as UnknownRecord | null)?.params
      && (((activeGroup.renderGenerator ?? activeGroup.generator) as UnknownRecord).params as UnknownRecord).fit);
    if (Number.isFinite(activeFit)) return activeFit;
  }
  for (const group of spatialGroups) {
    const generator = (group.renderGenerator ?? group.generator) as UnknownRecord | null;
    const fit = Number((generator?.params as UnknownRecord | undefined)?.fit);
    if (Number.isFinite(fit)) return fit;
  }
  return 0;
}

function meshBBox(meshes: MeshLike[]): UnknownRecord | null {
  const points = (meshes ?? []).flatMap((mesh) => mesh.vertices ?? []).filter(Boolean);
  return points.length ? bboxAll([{ points } as never]) : null;
}

function worldBoundsOfGroups(groups: GroupLike[]): UnknownRecord | null {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const group of groups) {
    for (const points of groupWorldPointLists(group)) {
      for (const point of points) {
        if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) continue;
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
        const z = Number.isFinite(point.z) ? Number(point.z) : 0;
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
    }
  }
  if (!Number.isFinite(minX)) return null;
  return {
    minX, minY, minZ, maxX, maxY, maxZ,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
    diagonal: Math.hypot(maxX - minX, maxY - minY, maxZ - minZ),
  };
}

function legacyFit(group: GroupLike, doc: DocumentLike): number {
  const generator = (group.renderGenerator ?? group.generator) as UnknownRecord | null;
  const fit = Number((generator?.params as UnknownRecord | undefined)?.fit ?? (doc?.generator as UnknownRecord | null)?.params);
  return Number.isFinite(fit) ? fit : 0;
}
