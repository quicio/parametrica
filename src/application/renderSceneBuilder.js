/**
 * application/renderSceneBuilder.js — world/view evaluation to RenderScene.
 *
 * Spatial layers are projected from their canonical world geometry through a
 * single ViewTransform per scene (or per layer in composition mode). Curves,
 * meshes, wireframes and exporters all consume the resulting artboard-space
 * scene, so framing happens exactly once.
 */

import { bboxAll } from '../sampling/sampling.js';
import {
  boundsOfProjectedPoints,
  createViewTransform,
  DEFAULT_FRAME,
  projectPointToView,
  resolveEffectiveCamera,
  sanitizeFrame,
  SPACE,
} from '../view/transform.js';
import {
  applyViewTransformToCurves,
  applyViewTransformToMeshes,
  projectWorldCurvesToView,
  projectWorldMeshesToView,
  projectionForGeometry,
} from '../view/projection.js';
import { isMesh } from '../geometry/contracts.js';
import { meshWireframeCurves } from '../geometry/wireframe.js';
import { createRenderLayer, createRenderScene } from '../render/scene.js';

const SCENE_CACHE = new WeakMap();

export function buildRenderScene({ evaluation, document: doc, view = doc.view, projectionOverride = null }) {
  if (!evaluation) return createRenderScene({ artboard: view?.artboard, view, layers: [] });
  const signature = JSON.stringify([
    projectionOverride,
    view?.projection,
    view?.camera,
    view?.frame,
    view?.modes,
    view?.passOpacity,
    view?.style,
    view?.overlays,
    view?.colorRamp,
    view?.artboard,
    doc?.activeLayer,
    doc?.layers?.map((layer) => [
      layer.id,
      layer.visible,
      layer.modes,
      layer.colorMetric,
      layer.generator?.params?.fit,
    ]),
  ]);
  const cached = SCENE_CACHE.get(evaluation);
  if (cached?.signature === signature) return cached.scene;

  const groups = sourceGroups(evaluation, doc, view);
  const frameSpec = sanitizeFrame(view?.frame, DEFAULT_FRAME);
  const projection = resolveProjection(evaluation, groups, view, projectionOverride);
  const spatial = groups.filter(isSpatialGroup);
  const artboard = view?.artboard;

  const layerResults = [];
  let sceneTransform = null;

  if (frameSpec.mode === 'composition') {
    for (const group of groups) {
      const result = buildCompositionGroup(group, {
        projection,
        view,
        document: doc,
      });
      layerResults.push(result);
      if (!sceneTransform && result.transform) sceneTransform = result.transform;
    }
  } else {
    const pointLists = spatial.flatMap(groupWorldPointLists);
    const camera = resolveEffectiveCamera(view?.camera, pointLists);
    const prepared = spatial.map((group) => prepareSpatialGroup(group, { projection, view, camera }));
    const viewPoints = prepared.flatMap((entry) => entry.points);
    const bounds = boundsOfProjectedPoints(viewPoints);
    const fit = frameSpec.mode === 'world'
      ? null
      : resolveSceneFit(view, doc, spatial);
    const scale = frameSpec.mode === 'world'
      ? (frameSpec.scale ?? 1)
      : frameSpec.scale;
    sceneTransform = createViewTransform({
      projection,
      camera,
      frame: {
        mode: frameSpec.mode,
        anchor: frameSpec.anchor,
        fit,
        scale,
      },
      artboard,
      bounds,
      projectedOrigin: projectPointToView({ x: 0, y: 0, z: 0 }, projection, camera),
    });

    const preparedByGroup = new Map(spatial.map((group, index) => [group, prepared[index]]));
    for (const group of groups) {
      if (!isSpatialGroup(group)) {
        layerResults.push(buildArtboardGroup(group, view, projection));
        continue;
      }
      layerResults.push(applyPreparedGroup(group, preparedByGroup.get(group), sceneTransform, projection));
    }
  }

  const layers = layerResults.map(({ entry }) => entry);
  const curves = layers.flatMap((layer) => layer.curves);
  const hasArtboard = groups.some((group) => !isSpatialGroup(group));
  const scene = createRenderScene({
    artboard,
    view,
    layers,
    transform: sceneTransform,
    meta: {
      projection,
      bbox: curves.length ? bboxAll(curves) : (evaluation.bbox ?? null),
      space: spatial.length
        ? (hasArtboard ? SPACE.MIXED : SPACE.WORLD)
        : SPACE.ARTBOARD,
      frame: sceneTransform?.frame ?? null,
    },
  });
  SCENE_CACHE.set(evaluation, { signature, scene });
  return scene;
}

function sourceGroups(evaluation, doc, view) {
  if (Array.isArray(evaluation.layers) && evaluation.layers.length) {
    return evaluation.layers.filter((layer) => (
      layer.visible !== false && (
        (layer.curves?.length ?? 0) > 0
        || (layer.meshes?.length ?? 0) > 0
        || (layer.geometry?.length ?? 0) > 0
      )
    ));
  }
  return [{
    id: 'layer-0',
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
  }];
}

function resolveProjection(evaluation, groups, view, override) {
  if (override) return override;
  const world = groups.flatMap((group) => [
    ...(group.geometry ?? []),
    ...(group.meshes ?? []),
  ]);
  if (world.length) return projectionForGeometry(world, view?.projection ?? '3d');
  return evaluation.viewProjection ?? view?.projection ?? '3d';
}

function isSpatialGroup(group) {
  return Array.isArray(group.geometry) && group.geometry.length > 0;
}

function groupWorldPointLists(group) {
  const lists = [];
  for (const item of group.geometry ?? []) {
    if (Array.isArray(item.points)) lists.push(item.points);
    else if (item.grid?.points) lists.push(item.grid.points.flat());
    else if (Array.isArray(item.vertices)) lists.push(item.vertices);
  }
  for (const mesh of group.meshes ?? []) {
    if (Array.isArray(mesh.vertices)) lists.push(mesh.vertices);
  }
  return lists;
}

function worldCurvesOf(group) {
  return (group.geometry ?? []).filter((item) => Array.isArray(item.points));
}

function worldMeshesOf(group) {
  if (Array.isArray(group.meshes) && group.meshes.length) return group.meshes;
  return (group.geometry ?? []).filter((item) => isMesh(item));
}

function prepareSpatialGroup(group, { projection, view, camera = null }) {
  const curves = projectWorldCurvesToView(worldCurvesOf(group), {
    camera: camera ?? view?.camera,
    projection,
    depthFade: group.generator?.params?.depthOcclusion ?? true,
    depthStrength: group.generator?.params?.depthAttenuation ?? 0.55,
  });
  const meshes = projectWorldMeshesToView(worldMeshesOf(group), {
    camera: camera ?? view?.camera,
    projection,
    depthFade: group.generator?.params?.depthOcclusion ?? true,
    depthStrength: group.generator?.params?.depthAttenuation ?? 0.55,
  });
  return {
    curves,
    meshes,
    points: [
      ...curves.flatMap((curve) => curve.points ?? []),
      ...meshes.flatMap((mesh) => mesh.vertices ?? []),
    ],
  };
}

function applyPreparedGroup(group, prepared, transform, projection) {
  const curves = applyViewTransformToCurves(prepared.curves, transform);
  const meshes = applyViewTransformToMeshes(prepared.meshes, transform);
  const wireframe = meshWireframeCurves(meshes);
  return renderLayer(group, {
    curves: [...curves, ...wireframe],
    meshes,
    transform,
    projection,
    space: SPACE.WORLD,
  });
}

function buildCompositionGroup(group, { projection, view, document: doc }) {
  if (!isSpatialGroup(group)) {
    return buildArtboardGroup(group, view, projection);
  }
  const camera = resolveEffectiveCamera(view?.camera, groupWorldPointLists(group));
  const prepared = prepareSpatialGroup(group, { projection, view, camera });
  const transform = createViewTransform({
    projection,
    camera,
    frame: {
      mode: 'composition',
      anchor: 'bbox',
      fit: legacyFit(group, doc),
    },
    artboard: view?.artboard,
    bounds: boundsOfProjectedPoints(prepared.points),
    projectedOrigin: projectPointToView({ x: 0, y: 0, z: 0 }, projection, camera),
  });
  return applyPreparedGroup(group, prepared, transform, projection);
}

function buildArtboardGroup(group, view, projection) {
  return renderLayer(group, {
    curves: group.curves ?? [],
    meshes: group.renderMeshes ?? group.meshes ?? [],
    transform: null,
    projection: group.appliedProjection ?? projection,
    space: SPACE.ARTBOARD,
  });
}

function renderLayer(group, {
  curves,
  meshes,
  transform,
  projection,
  space,
}) {
  return {
    transform,
    space,
    entry: createRenderLayer({
      id: group.id,
      name: group.name,
      style: group.style ?? null,
      modes: group.modes ?? null,
      colorMetric: group.colorMetric ?? null,
      curves,
      meshes,
      renderMeshes: meshes,
      bbox: curves.length ? bboxAll(curves) : (meshBBox(meshes) ?? group.bbox ?? null),
      appliedProjection: projection,
    }),
  };
}

function resolveSceneFit(view, doc, spatialGroups) {
  const explicit = view?.frame?.fit;
  if (explicit !== null && explicit !== undefined && Number.isFinite(Number(explicit))) {
    return Number(explicit);
  }
  const active = doc?.layers?.[doc.activeLayer ?? 0] ?? doc?.layers?.[0];
  const activeGroup = spatialGroups.find((group) => group.id === active?.id);
  if (activeGroup) {
    const activeFit = Number(activeGroup.generator?.params?.fit);
    if (Number.isFinite(activeFit)) return activeFit;
  }
  for (const group of spatialGroups) {
    const fit = Number(group.generator?.params?.fit);
    if (Number.isFinite(fit)) return fit;
  }
  return 0;
}

function meshBBox(meshes) {
  const points = (meshes ?? []).flatMap((mesh) => mesh.vertices ?? []).filter(Boolean);
  return points.length ? bboxAll([{ points }]) : null;
}

function legacyFit(group, doc) {
  const fit = Number(group.generator?.params?.fit ?? doc?.generator?.params?.fit);
  return Number.isFinite(fit) ? fit : 0;
}
