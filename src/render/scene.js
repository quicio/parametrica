/**
 * render/scene.js — backend-neutral render scene contracts.
 *
 * The application builds this structure from world geometry and view state.
 * Renderers consume it; they do not read the document or App state.
 */

export function createRenderScene({ artboard, view, layers, overlays = [], meta = {} }) {
  return {
    kind: 'render-scene',
    artboard,
    view,
    layers,
    overlays,
    meta,
  };
}

export function createRenderLayer({ id, name, style, curves, bbox, appliedProjection = null }) {
  return {
    id,
    name,
    style,
    curves,
    bbox,
    appliedProjection,
  };
}
