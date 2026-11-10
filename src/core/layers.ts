/** Layer graph helpers for generator and instance layers. */

export const MAX_LAYERS = 32;
export const MAX_INSTANCE_LAYERS = 24;

export interface LayerSourceLike {
  layerId?: string;
}
export interface GeneratorLike {
  id?: string;
  params?: Record<string, unknown>;
  mods?: Record<string, unknown>;
}
export interface LayerLike {
  type?: string;
  id?: string;
  source?: LayerSourceLike | null;
  generator?: GeneratorLike | null;
}
export interface DocumentWithLayers {
  layers: LayerLike[];
  [key: string]: unknown;
}
export interface InstanceCandidate {
  layer: LayerLike;
  index: number;
}

export function isInstanceLayer(layer: unknown): boolean {
  if (!layer || typeof layer !== 'object') return false;
  const candidate = layer as LayerLike;
  if (candidate.type === 'instance') return true;
  if (candidate.type === 'generator') return false;
  return Boolean(candidate.source?.layerId);
}

export function isGeneratorLayer(layer: unknown): boolean {
  return Boolean(layer) && !isInstanceLayer(layer);
}

export function findLayerById(document: DocumentWithLayers | null | undefined, layerId: unknown): LayerLike | null {
  if (!document || !Array.isArray(document.layers) || !layerId) return null;
  return document.layers.find((layer) => layer?.id === layerId) ?? null;
}

export function layerIndexById(document: DocumentWithLayers | null | undefined, layerId: unknown): number {
  if (!document || !Array.isArray(document.layers) || !layerId) return -1;
  return document.layers.findIndex((layer) => layer?.id === layerId);
}

export function sourceLayerFor(document: DocumentWithLayers | null | undefined, layer: unknown): LayerLike | null {
  if (!isInstanceLayer(layer)) return null;
  return findLayerById(document, (layer as LayerLike).source?.layerId);
}

export function sourceGeneratorFor(document: DocumentWithLayers | null | undefined, layer: unknown): GeneratorLike | null {
  const source = sourceLayerFor(document, layer);
  return source?.generator ?? null;
}

/** Explicit replacement for implicit document.generator resolution. */
export function generatorForLayer(document: DocumentWithLayers | null | undefined, layer: unknown): GeneratorLike | null {
  if (isInstanceLayer(layer)) return sourceGeneratorFor(document, layer);
  return (layer as LayerLike | null | undefined)?.generator ?? null;
}

export function dependentInstances(document: DocumentWithLayers | null | undefined, layerId: unknown): LayerLike[] {
  if (!document || !Array.isArray(document.layers) || !layerId) return [];
  return document.layers.filter((layer) => (
    isInstanceLayer(layer) && layer.source?.layerId === layerId
  ));
}

export function countInstanceLayers(document: DocumentWithLayers | null | undefined): number {
  if (!document || !Array.isArray(document.layers)) return 0;
  return document.layers.filter(isInstanceLayer).length;
}

export function canAddInstanceLayer(document: DocumentWithLayers | null | undefined): boolean {
  if (!document || !Array.isArray(document.layers)) return false;
  if (document.layers.length >= MAX_LAYERS) return false;
  return countInstanceLayers(document) < MAX_INSTANCE_LAYERS;
}

export function instanceSourceCandidates(document: DocumentWithLayers | null | undefined): InstanceCandidate[] {
  if (!document || !Array.isArray(document.layers)) return [];
  return document.layers
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => isGeneratorLayer(layer));
}
