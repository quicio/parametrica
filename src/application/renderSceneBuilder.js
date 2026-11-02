/**
 * application/renderSceneBuilder.js — world/view evaluation to RenderScene.
 */

import { bboxAll } from '../sampling/sampling.js';
import { projectCurves, projectionFor } from '../render/projection.js';
import { projectWorldMeshes } from '../view/projection.js';
import { createRenderLayer, createRenderScene } from '../render/scene.js';

const SCENE_CACHE = new WeakMap();

export function buildRenderScene({ evaluation, document: doc, view = doc.view, projectionOverride = null }) {
  if (!evaluation) return createRenderScene({ artboard: view?.artboard, view, layers: [] });
  const signature = JSON.stringify([
    projectionOverride,
    view?.projection,
    view?.camera,
    view?.modes,
    view?.passOpacity,
    view?.style,
    view?.overlays,
    view?.colorRamp,
    view?.artboard,
  ]);
  const cached = SCENE_CACHE.get(evaluation);
  if (cached?.signature === signature) return cached.scene;

  const projection = projectionOverride ?? evaluation.viewProjection ?? projectionFor(evaluation.curves, view?.projection ?? '3d');
  const sourceGroups = Array.isArray(evaluation.layers) && evaluation.layers.length
    ? evaluation.layers.filter((layer) => layer.visible !== false && layer.curves.length)
    : [{ curves: evaluation.curves, meshes: evaluation.meshes ?? [], style: view?.style, bbox: evaluation.bbox, generator: doc.generator, appliedProjection: evaluation.appliedProjection }];

  const layers = sourceGroups.map((group) => {
    const applied = group.appliedProjection ?? evaluation.appliedProjection ?? null;
    const curves = applied === projection
      ? group.curves
      : projectCurves(group.curves, projection, {
        fit: Number(group.generator?.params?.fit) || 0,
      });
    const meshes = projectionOverride && projection !== '3d' && group.meshes?.length
      ? projectWorldMeshes(group.meshes, {
        projection,
        fit: Number(group.generator?.params?.fit) || 0,
      })
      : group.renderMeshes ?? (sourceGroups.length === 1 ? evaluation.renderMeshes ?? [] : []);
    return createRenderLayer({
      id: group.id,
      name: group.name,
      style: group.style ?? view?.style,
      modes: group.modes ?? null,
      colorMetric: group.colorMetric ?? null,
      curves,
      meshes,
      bbox: curves.length ? bboxAll(curves) : (group.bbox ?? evaluation.bbox),
      appliedProjection: applied,
    });
  });

  const curves = layers.flatMap((layer) => layer.curves);
  const scene = createRenderScene({
    artboard: view?.artboard,
    view,
    layers,
    meta: {
      projection,
      bbox: curves.length ? bboxAll(curves) : evaluation.bbox,
    },
  });
  SCENE_CACHE.set(evaluation, { signature, scene });
  return scene;
}
