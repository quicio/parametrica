/**
 * core/layers.js — layer graph helpers for generator and instance layers.
 *
 * Instance layers reference one generator layer by id. This module stays pure
 * and DOM-free so engine, document sanitization and UI share the same rules.
 */

export const MAX_LAYERS = 32;
export const MAX_INSTANCE_LAYERS = 24;

export function isInstanceLayer(layer) {
  if (!layer || typeof layer !== 'object') return false;
  if (layer.type === 'instance') return true;
  if (layer.type === 'generator') return false;
  return Boolean(layer.source?.layerId);
}

export function isGeneratorLayer(layer) {
  return Boolean(layer) && !isInstanceLayer(layer);
}

export function findLayerById(document, layerId) {
  if (!document || !Array.isArray(document.layers) || !layerId) return null;
  return document.layers.find((layer) => layer?.id === layerId) ?? null;
}

export function layerIndexById(document, layerId) {
  if (!document || !Array.isArray(document.layers) || !layerId) return -1;
  return document.layers.findIndex((layer) => layer?.id === layerId);
}

export function sourceLayerFor(document, layer) {
  if (!isInstanceLayer(layer)) return null;
  return findLayerById(document, layer.source?.layerId);
}

export function sourceGeneratorFor(document, layer) {
  const source = sourceLayerFor(document, layer);
  return source?.generator ?? null;
}

/** Explicit replacement for implicit document.generator resolution. */
export function generatorForLayer(document, layer) {
  if (isInstanceLayer(layer)) return sourceGeneratorFor(document, layer);
  return layer?.generator ?? null;
}

export function dependentInstances(document, layerId) {
  if (!document || !Array.isArray(document.layers) || !layerId) return [];
  return document.layers.filter((layer) => (
    isInstanceLayer(layer) && layer.source?.layerId === layerId
  ));
}

export function countInstanceLayers(document) {
  if (!document || !Array.isArray(document.layers)) return 0;
  return document.layers.filter(isInstanceLayer).length;
}

export function canAddInstanceLayer(document) {
  if (!document || !Array.isArray(document.layers)) return false;
  if (document.layers.length >= MAX_LAYERS) return false;
  return countInstanceLayers(document) < MAX_INSTANCE_LAYERS;
}

export function instanceSourceCandidates(document) {
  if (!document || !Array.isArray(document.layers)) return [];
  return document.layers
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => isGeneratorLayer(layer));
}
