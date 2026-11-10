/**
 * presets/preview.js — deterministic preset thumbnails.
 *
 * Previews are derived from the preset document, never from the live figure or
 * the active theme. Evaluation is bypass-cached and the result is rasterised
 * with the existing DOM-only polyline thumbnail helper.
 */

import { evaluateDocument } from '../core/engine.js';
import { curvesDataURL } from '../render/thumbnail.ts';
import { canonicalStringify, sha256Hex } from '../lab/hash.js';

export const PREVIEW_VERSION = 4;
export const PREVIEW_SIZE = 96;
export const START_WITH_PREVIEW_SIZE = 224;
export const PREVIEW_MAX_CHARS = 24_000;

const PREVIEW_PROFILE = {
  size: PREVIEW_SIZE,
  background: '#050505',
  stroke: '#e8e8e8',
  strokeWeight: 1.25,
};

/**
 * Layer ids are generated sequentially at document creation, so they are not
 * content. Strip them before hashing to keep the key stable across instances.
 */
function previewDocument(document) {
  if (!document || typeof document !== 'object' || !Array.isArray(document.layers)) {
    return document;
  }
  const indexById = new Map(document.layers.map((layer, index) => [layer?.id, index]));
  return {
    ...document,
    layers: document.layers.map((layer) => {
      if (!layer || typeof layer !== 'object') return layer;
      const { id: _id, ...rest } = layer;
      if (rest.source && typeof rest.source === 'object') {
        const sourceIndex = indexById.get(rest.source.layerId);
        rest.source = {
          ...rest.source,
          layerId: sourceIndex === undefined ? 'missing' : `layer-${sourceIndex}`,
        };
      }
      return rest;
    }),
  };
}

/** Stable cache key for a preset document at the current preview profile. */
export function previewKey(document, { size = PREVIEW_SIZE } = {}) {
  return sha256Hex(`${PREVIEW_VERSION}:${size}:${canonicalStringify(previewDocument(document))}`);
}

/**
 * Browser-only renderer. Returns a PNG data URL or null when the preset has no
 * drawable curves or evaluation fails.
 */
export function renderPresetPreview(document, { size = PREVIEW_SIZE } = {}) {
  if (!document || typeof document !== 'object') return null;
  try {
    const evaluation = evaluateDocument(document, { time: 0, bypassCache: true });
    if (evaluation.errors?.length || !evaluation.curves?.length) return null;
    return curvesDataURL(evaluation.curves, {
      ...PREVIEW_PROFILE,
      size,
      bounds: evaluation.bbox ?? null,
    });
  } catch {
    return null;
  }
}
