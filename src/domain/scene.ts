/** Backend-neutral render scene contracts. */

export interface RenderLayer {
  id: string;
  name: string;
  style: unknown;
  modes: string[] | null;
  colorMetric: string | null;
  curves: unknown[];
  meshes: unknown[];
  renderMeshes: unknown[];
  bbox: unknown;
  appliedProjection: string | null;
  space: string | null;
  transform: unknown;
  [key: string]: unknown;
}

export interface RenderScene {
  kind: 'render-scene';
  artboard: unknown;
  view: unknown;
  layers: RenderLayer[];
  overlays: unknown[];
  transform: unknown;
  spatial: unknown;
  meta: Record<string, unknown>;
}

export function createRenderScene({
  artboard = null,
  view = null,
  layers = [],
  overlays = [],
  transform = null,
  spatial = null,
  meta = {},
}: {
  artboard?: unknown;
  view?: unknown;
  layers?: RenderLayer[];
  overlays?: unknown[];
  transform?: unknown;
  spatial?: unknown;
  meta?: Record<string, unknown>;
} = {}): RenderScene {
  return { kind: 'render-scene', artboard, view, layers, overlays, transform, spatial, meta };
}

export function createRenderLayer({
  id,
  name,
  style = null,
  modes = null,
  colorMetric = null,
  curves = [],
  meshes = [],
  renderMeshes = null,
  bbox = null,
  appliedProjection = null,
  space = null,
  transform = null,
}: {
  id: string;
  name: string;
  style?: unknown;
  modes?: string[] | null;
  colorMetric?: string | null;
  curves?: unknown[];
  meshes?: unknown[];
  renderMeshes?: unknown[] | null;
  bbox?: unknown;
  appliedProjection?: string | null;
  space?: string | null;
  transform?: unknown;
}): RenderLayer {
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
