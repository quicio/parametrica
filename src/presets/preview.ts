/** Deterministic preset thumbnails. */

import { evaluateDocument } from '../core/engine.ts';
import { curvesDataURL } from '../render/thumbnail.ts';
import { canonicalStringify, sha256Hex } from '../lab/hash.ts';

type Rec = Record<string, unknown>;

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
function previewDocument(document: unknown): unknown {
  if (!document || typeof document !== 'object') return document;
  const source = document as Rec;
  if (!Array.isArray(source.layers)) return document;
  const layers = source.layers as Rec[];
  const indexById = new Map(layers.map((layer, index) => [layer?.id, index]));
  return {
    ...source,
    layers: layers.map((layer) => {
      if (!layer || typeof layer !== 'object') return layer;
      const { id: _id, ...rest } = layer;
      if (rest.source && typeof rest.source === 'object') {
        const layerSource = rest.source as Rec;
        const sourceIndex = indexById.get(layerSource.layerId);
        rest.source = {
          ...layerSource,
          layerId: sourceIndex === undefined ? 'missing' : `layer-${sourceIndex}`,
        };
      }
      return rest;
    }),
  };
}

/** Stable cache key for a preset document at the current preview profile. */
export function previewKey(document: unknown, { size = PREVIEW_SIZE }: { size?: number } = {}): string {
  return sha256Hex(`${PREVIEW_VERSION}:${size}:${canonicalStringify(previewDocument(document))}`);
}

/**
 * Browser-only renderer. Returns a PNG data URL or null when the preset has no
 * drawable curves or evaluation fails.
 */
export function renderPresetPreview(document: unknown, { size = PREVIEW_SIZE }: { size?: number } = {}): string | null {
  if (!document || typeof document !== 'object') return null;
  try {
    const evaluation = evaluateDocument(document as never, { time: 0, bypassCache: true }) as {
      errors?: unknown[];
      curves?: unknown[];
      bbox?: unknown;
    };
    if (evaluation.errors?.length || !evaluation.curves?.length) return null;
    return curvesDataURL(evaluation.curves as never, {
      ...PREVIEW_PROFILE,
      size,
      bounds: (evaluation.bbox ?? null) as never,
    });
  } catch {
    return null;
  }
}
