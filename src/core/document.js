/**
 * document.js — the GlyphDocument: the serializable soul of a glyph (G2).
 *
 *   { version, name, seed, generator: {id, params, mods},
 *     operators: [{id, params, mods, enabled}], view, animation }
 *
 * The document is ALL the engine needs: render, export, share, mutate.
 * v1 presets migrate to `bilateral-spline` documents automatically.
 */

import { Generators, Operators } from './registry.js';
import { sanitizeParams } from './schema.js';

export const DOCUMENT_VERSION = 2;

export const DEFAULT_VIEW = {
  modes: ['stroke'],
  overlays: {},
  strokeWeight: 2,
  guides: true,
};

export const DEFAULT_ANIMATION = {
  playing: false,
  speed: 1,
  time: 0,
};

/** Fresh document for a generator (schema defaults). */
export function createDocument(generatorId = 'parametric', overrides = {}) {
  const generator = Generators.get(generatorId);
  return {
    version: DOCUMENT_VERSION,
    name: overrides.name ?? generator.name,
    seed: overrides.seed ?? 1,
    generator: {
      id: generatorId,
      params: { ...sanitizeParams(generator.params, overrides.generator?.params) },
      mods: { ...(overrides.generator?.mods ?? {}) },
    },
    operators: sanitizeOperators(overrides.operators ?? []),
    view: { ...DEFAULT_VIEW, ...(overrides.view ?? {}) },
    animation: { ...DEFAULT_ANIMATION, ...(overrides.animation ?? {}) },
  };
}

/**
 * Produce a complete, valid document from arbitrary input.
 * Unknown generators/operators are dropped, params sanitized against
 * schemas, view/animation fields defaulted. Never throws on shape
 * problems — throws only on unparseable JSON upstream.
 */
export function sanitizeDocument(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // v1 migration: { app:'glyph-lab', version:1, name, params:{width,…} }
  if (raw.version === 1 || (raw.app === 'glyph-lab' && raw.params && !raw.generator)) {
    return migrateV1Document(raw);
  }

  const generatorId = Generators.has(raw.generator?.id) ? raw.generator.id : 'parametric';
  const generator = Generators.get(generatorId);

  const view = { ...DEFAULT_VIEW, ...(raw.view ?? {}) };
  view.modes = Array.isArray(view.modes) ? view.modes.filter((m) => typeof m === 'string') : ['stroke'];
  if (!view.modes.length) view.modes = ['stroke'];
  view.strokeWeight = clamp(Number(view.strokeWeight), 0.1, 40, 2);
  view.guides = Boolean(view.guides);
  view.overlays = view.overlays && typeof view.overlays === 'object' ? view.overlays : {};

  const animation = { ...DEFAULT_ANIMATION, ...(raw.animation ?? {}) };
  animation.playing = Boolean(animation.playing);
  animation.speed = clamp(Number(animation.speed), 0.05, 8, 1);
  animation.time = clamp(Number(animation.time), -1e6, 1e6, 0);

  return {
    version: DOCUMENT_VERSION,
    name: typeof raw.name === 'string' ? raw.name : generator.name,
    seed: clamp(Number(raw.seed), 0, 1e9, 1),
    generator: {
      id: generatorId,
      params: sanitizeParams(generator.params, raw.generator?.params),
      mods: sanitizeMods(raw.generator?.mods),
    },
    operators: sanitizeOperators(raw.operators),
    view,
    animation,
  };
}

function sanitizeOperators(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw.slice(0, 32)) {
    if (!entry || !Operators.has(entry.id)) continue;
    const def = Operators.get(entry.id);
    out.push({
      id: entry.id,
      enabled: entry.enabled !== false,
      params: sanitizeParams(def.params, entry.params),
      mods: sanitizeMods(entry.mods),
    });
  }
  return out;
}

function sanitizeMods(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value.trim()) out[key] = value;
  }
  return out;
}

/** v1 params map 1:1 onto the bilateral-spline generator schema. */
export function migrateV1Document(raw) {
  const v1Params = raw.params ?? raw;
  const doc = createDocument('bilateral-spline', {
    name: raw.name ?? 'V1 Glyph',
    generator: { params: v1Params },
  });
  if (typeof v1Params.strokeWeight === 'number') {
    doc.view.strokeWeight = clamp(v1Params.strokeWeight, 0.1, 40, 2);
  }
  return doc;
}

function clamp(v, lo, hi, dflt) {
  if (!Number.isFinite(v)) return dflt;
  return Math.min(hi, Math.max(lo, v));
}
