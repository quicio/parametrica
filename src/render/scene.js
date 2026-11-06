/**
 * render/scene.js — backend-neutral render scene contracts.
 *
 * The application builds this structure from world geometry and view state.
 * Renderers consume it; they do not read the document or App state. All curve
 * and mesh coordinates in a layer are artboard-space unless `space` says
 * otherwise; `transform` is the ViewTransform that produced them.
 */

export function createRenderScene({
  artboard,
  view,
  layers,
  overlays = [],
  transform = null,
  spatial = null,
  meta = {},
}) {
  return {
    kind: 'render-scene',
    artboard,
    view,
    layers,
    overlays,
    transform,
    spatial,
    meta,
  };
}

export function createRenderLayer({
  id,
  name,
  style,
  modes = null,
  colorMetric = null,
  curves,
  meshes = [],
  renderMeshes = null,
  bbox,
  appliedProjection = null,
  space = null,
  transform = null,
}) {
  return {
    id,
    name,
    style,
    modes,
    colorMetric,
    curves,
    meshes,
    renderMeshes: renderMeshes ?? meshes,
    bbox,
    appliedProjection,
    space,
    transform,
  };
}
