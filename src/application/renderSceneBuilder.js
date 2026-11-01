/**
 * application/renderSceneBuilder.js — world/view evaluation to RenderScene.
 */

import { bboxAll } from '../sampling/sampling.js';
import { projectCurves, projectionFor } from '../render/projection.js';
import { createRenderLayer, createRenderScene } from '../render/scene.js';

const SCENE_CACHE = new WeakMap();

export function buildRenderScene({ evaluation, document: doc, view = doc.view }) {
  if (!evaluation) return createRenderScene({ artboard: view?.artboard, view, layers: [] });
  const signature = JSON.stringify([
    view?.projection,
    view?.camera,
    view?.modes,
    view?.style,
    view?.overlays,
    view?.colorRamp,
    view?.artboard,
  ]);
  const cached = SCENE_CACHE.get(evaluation);
  if (cached?.signature === signature) return cached.scene;

  const projection = evaluation.viewProjection ?? projectionFor(evaluation.curves, view?.projection ?? '3d');
  const sourceGroups = Array.isArray(evaluation.layers) && evaluation.layers.length
    ? evaluation.layers.filter((layer) => layer.visible !== false && layer.curves.length)
    : [{ curves: evaluation.curves, style: view?.style, bbox: evaluation.bbox, generator: doc.generator, appliedProjection: evaluation.appliedProjection }];

  const layers = sourceGroups.map((group) => {
    const applied = group.appliedProjection ?? evaluation.appliedProjection ?? null;
    const curves = applied === projection
      ? group.curves
      : projectCurves(group.curves, projection, {
        fit: Number(group.generator?.params?.fit) || 0,
      });
    return createRenderLayer({
      id: group.id,
      name: group.name,
      style: group.style ?? view?.style,
      curves,
      meshes: group.renderMeshes ?? (sourceGroups.length === 1 ? evaluation.renderMeshes ?? [] : []),
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
