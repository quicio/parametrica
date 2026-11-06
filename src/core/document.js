/**
 * document.js — the Parametrica Document: the serializable soul of a form (G2).
 *
 *   { version, name, seed, generator: {id, params, mods},
 *     operators: [{id, params, mods, enabled}], view, animation }
 *
 * The document is ALL the engine needs: render, export, share, mutate.
 * v1 glyph-lab presets migrate to `bilateral-spline` documents
 * automatically (dual-format read on `app: 'glyph-lab' | 'parametrica'`).
 */

import { Generators, Operators } from './registry.js';
import { sanitizeParams } from './schema.js';
import { OVERLAYS } from '../viz/overlays.js';
import { createTimeline, sanitizeTimeline } from '../animation/timeline.js';
import { createDefaultFillGradient, sanitizeFillGradient, DEFAULT_FILL_GRADIENT } from './fillGradient.js';
import { createFrame, DEFAULT_FRAME, sanitizeFrame } from '../view/transform.js';
import { createReference, DEFAULT_REFERENCE, sanitizeReference } from '../view/spatialReference.js';
import { createDefaultUnits, sanitizeUnits, DEFAULT_UNITS } from './units.js';
import { createCoordinates, sanitizeCoordinates, DEFAULT_COORDINATES } from '../view/viewportCoordinates.js';
import { sanitizePassStyle } from '../render/passStyle.js';
import { CAP_STRATEGIES } from '../geometry/repair.js';
import { MAX_LAYERS, isInstanceLayer, sourceLayerFor } from './layers.js';

export const DOCUMENT_VERSION = 3;

/** Default state for every overlay toggle — derived from OVERLAYS, all off. */
const DEFAULT_OVERLAYS = Object.fromEntries(OVERLAYS.map((o) => [o.id, false]));

/**
 * Default camera state for 3D-projected generators. The renderer
 * reads this when the generator attaches per-point depth. 2D
 * generators ignore it (they emit z=0 by construction). Defaults
 * give the classic Wikipedia-style isometric view: yaw = −30°, pitch
 * ≈ 20°, fov = 320.
 */
const DEFAULT_CAMERA = {
  yaw:   -Math.PI / 6,
  pitch: Math.PI / 9,
  fov:   320,
};
const MIN_CAMERA_FOV = 10;
const MAX_CAMERA_FOV = 2000;

const DEFAULT_ARTBOARD = {
  width: 900,
  height: 900,
  background: '#000000',
  margin: 0,
};

const DEFAULT_STYLE = {
  stroke: { color: '#ffffff', width: 0.5, opacity: 1, cap: 'round', join: 'round' },
  fill: { enabled: false, color: '#ffffff', opacity: 1, gradient: createDefaultFillGradient() },
  blend: 'normal',
};

const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const PROJECTIONS = Object.freeze(['3d', 'xy', 'xz', 'yz']);
export const VIEW_LAYOUTS = Object.freeze(['single', 'quad']);
export const COLOR_METRICS = Object.freeze(['auto', 'height', 'radius', 'curvature', 'arc']);
export const DEFAULT_COLOR_RAMP = Object.freeze(['#ffd400', '#8a2be2', '#1e5bff']);
export const FABRICATION_SCOPES = Object.freeze(['single', 'active-layer', 'composition']);
export const FABRICATION_BOOLEANS = Object.freeze(['none', 'union', 'difference', 'intersection']);
export const FABRICATION_FORMATS = Object.freeze(['stl', '3mf']);
export const FABRICATION_TOPOLOGY = Object.freeze(['none', 'split', 'remove']);
export const FABRICATION_NON_ORIENTABLE = Object.freeze(['cut', 'reject']);
export const FABRICATION_CSG_STRATEGIES = Object.freeze(['auto', 'manifold', 'bsp', 'remesh']);
export const DEFAULT_FABRICATION = Object.freeze({
  weld: false,
  cap: false,
  tolerance: 1e-4,
  maxHoleEdges: 256,
  scope: 'single',
  boolean: 'none',
  repair: false,
  capStrategy: 'auto',
  format: 'stl',
  topology: 'none',
  nonOrientable: 'cut',
  csgStrategy: 'auto',
  selfIntersections: 'none',
  remeshResolution: 64,
});

export function sanitizeFabricationSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const tolerance = Number(source.tolerance);
  const maxHoleEdges = Number(source.maxHoleEdges);
  return {
    weld: source.weld === true,
    cap: source.cap === true,
    tolerance: Number.isFinite(tolerance) && tolerance > 0
      ? Math.min(Math.max(tolerance, 1e-9), 1)
      : DEFAULT_FABRICATION.tolerance,
    maxHoleEdges: Number.isFinite(maxHoleEdges)
      ? Math.min(Math.max(Math.floor(maxHoleEdges), 3), 4096)
      : DEFAULT_FABRICATION.maxHoleEdges,
    scope: FABRICATION_SCOPES.includes(source.scope) ? source.scope : DEFAULT_FABRICATION.scope,
    boolean: (FABRICATION_SCOPES.includes(source.scope) ? source.scope : DEFAULT_FABRICATION.scope) === 'single'
      ? 'none'
      : (FABRICATION_BOOLEANS.includes(source.boolean) ? source.boolean : DEFAULT_FABRICATION.boolean),
    repair: source.repair === true,
    capStrategy: CAP_STRATEGIES.includes(source.capStrategy) ? source.capStrategy : DEFAULT_FABRICATION.capStrategy,
    format: FABRICATION_FORMATS.includes(source.format) ? source.format : DEFAULT_FABRICATION.format,
    topology: FABRICATION_TOPOLOGY.includes(source.topology) ? source.topology : DEFAULT_FABRICATION.topology,
    nonOrientable: FABRICATION_NON_ORIENTABLE.includes(source.nonOrientable) ? source.nonOrientable : DEFAULT_FABRICATION.nonOrientable,
    csgStrategy: FABRICATION_CSG_STRATEGIES.includes(source.csgStrategy) ? source.csgStrategy : DEFAULT_FABRICATION.csgStrategy,
    selfIntersections: ['none', 'sdf', 'remesh', 'auto'].includes(source.selfIntersections) ? source.selfIntersections : DEFAULT_FABRICATION.selfIntersections,
    remeshResolution: Number.isFinite(Number(source.remeshResolution))
      ? Math.min(Math.max(Math.floor(Number(source.remeshResolution)), 16), 192)
      : DEFAULT_FABRICATION.remeshResolution,
  };
}

export function createDefaultArtboard() {
  return { ...DEFAULT_ARTBOARD };
}

export function createDefaultStyle() {
  return {
    stroke: { ...DEFAULT_STYLE.stroke },
    fill: {
      ...DEFAULT_STYLE.fill,
      gradient: createDefaultFillGradient(),
    },
    blend: DEFAULT_STYLE.blend,
  };
}

/** Normalize a projection id; unknown/missing values fall back to 3D. */
export function sanitizeProjection(value) {
  return PROJECTIONS.includes(value) ? value : '3d';
}

/** Optional custom gradient ramp: 2–6 hex colors, otherwise the default. */
export function sanitizeColorRamp(value) {
  if (!Array.isArray(value)) return null;
  const colors = value
    .filter((colorValue) => typeof colorValue === 'string' && COLOR_RE.test(colorValue))
    .slice(0, 6);
  return colors.length >= 2 ? colors : null;
}

/**
 * Fresh default view for one document. Every call returns new objects:
 * documents must never share overlays/camera/modes references.
 */
export function createDefaultView() {
  return {
    modes: ['stroke'],
    overlays: { ...DEFAULT_OVERLAYS },
    strokeWeight: 0.5,
    guides: true,
    camera: { ...DEFAULT_CAMERA },
    artboard: createDefaultArtboard(),
    style: createDefaultStyle(),
    projection: '3d',
    layout: 'single',
    colorMetric: 'auto',
    passOpacity: {},
    colorRamp: null,
    frame: createFrame(),
    reference: createReference(),
    units: createDefaultUnits(),
    coordinates: createCoordinates(),
    passStyle: {},
    fabrication: sanitizeFabricationSettings(DEFAULT_FABRICATION),
  };
}

/**
 * Frozen template kept for external consumers/back-compat. Do not use it
 * as a document view: use createDefaultView() to avoid shared state.
 */
export const DEFAULT_VIEW = Object.freeze({
  ...createDefaultView(),
  modes: Object.freeze(['stroke']),
  overlays: Object.freeze({ ...DEFAULT_OVERLAYS }),
  camera: Object.freeze({ ...DEFAULT_CAMERA }),
  artboard: Object.freeze({ ...DEFAULT_ARTBOARD }),
  projection: '3d',
  layout: 'single',
  colorMetric: 'auto',
  passOpacity: Object.freeze({}),
  colorRamp: null,
  frame: Object.freeze({ ...DEFAULT_FRAME }),
  reference: Object.freeze({ ...DEFAULT_REFERENCE }),
  units: DEFAULT_UNITS,
  coordinates: DEFAULT_COORDINATES,
  passStyle: Object.freeze({}),
  fabrication: Object.freeze({ ...DEFAULT_FABRICATION }),
  style: Object.freeze({
    stroke: Object.freeze({ ...DEFAULT_STYLE.stroke }),
    fill: Object.freeze({
      ...DEFAULT_STYLE.fill,
      gradient: Object.freeze({
        ...DEFAULT_FILL_GRADIENT,
        colors: Object.freeze([...DEFAULT_FILL_GRADIENT.colors]),
      }),
    }),
    blend: DEFAULT_STYLE.blend,
  }),
});

/** Merge a raw/partial view over fresh defaults without sharing references. */
function mergeView(base, raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const sourceStyle = source.style && typeof source.style === 'object' ? source.style : {};
  const sourceStroke = sourceStyle.stroke && typeof sourceStyle.stroke === 'object' ? sourceStyle.stroke : {};
  const sourceFill = sourceStyle.fill && typeof sourceStyle.fill === 'object' ? sourceStyle.fill : {};
  return {
    ...base,
    ...source,
    modes: Array.isArray(source.modes) ? [...source.modes] : base.modes,
    overlays: {
      ...base.overlays,
      ...(source.overlays && typeof source.overlays === 'object' ? source.overlays : {}),
    },
    camera: {
      ...base.camera,
      ...(source.camera && typeof source.camera === 'object' ? source.camera : {}),
    },
    artboard: {
      ...base.artboard,
      ...(source.artboard && typeof source.artboard === 'object' ? source.artboard : {}),
    },
    frame: sanitizeFrame(source.frame, base.frame),
    reference: sanitizeReference(source.reference),
    units: sanitizeUnits(source.units ?? base.units),
    coordinates: sanitizeCoordinates(source.coordinates ?? base.coordinates),
    passStyle: sanitizePassStyle(source.passStyle ?? base.passStyle),
    fabrication: sanitizeFabricationSettings(source.fabrication ?? base.fabrication),
    passOpacity: {
      ...base.passOpacity,
      ...(source.passOpacity && typeof source.passOpacity === 'object' ? source.passOpacity : {}),
    },
    style: {
      ...base.style,
      ...sourceStyle,
      stroke: { ...base.style.stroke, ...sourceStroke },
      fill: { ...base.style.fill, ...sourceFill },
    },
  };
}

function sanitizeArtboard(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    width: clamp(Number(source.width), 240, 4096, DEFAULT_ARTBOARD.width),
    height: clamp(Number(source.height), 240, 4096, DEFAULT_ARTBOARD.height),
    background: color(source.background, DEFAULT_ARTBOARD.background),
    margin: clamp(Number(source.margin), 0, 120, DEFAULT_ARTBOARD.margin),
  };
}

function sanitizePassOpacity(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key) continue;
    const n = Number(value);
    if (Number.isFinite(n)) out[key] = clamp(n, 0, 1, 1);
  }
  return out;
}

function sanitizeStyle(raw, fallbackWidth = 0.5) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const stroke = source.stroke && typeof source.stroke === 'object' ? source.stroke : {};
  const fill = source.fill && typeof source.fill === 'object' ? source.fill : {};
  const caps = ['butt', 'round', 'square'];
  const joins = ['miter', 'round', 'bevel'];
  const blends = ['normal', 'multiply', 'screen', 'difference'];
  return {
    stroke: {
      color: color(stroke.color, DEFAULT_STYLE.stroke.color),
      width: clamp(Number(stroke.width), 0.1, 40, clamp(Number(fallbackWidth), 0.1, 40, DEFAULT_STYLE.stroke.width)),
      opacity: clamp(Number(stroke.opacity), 0, 1, DEFAULT_STYLE.stroke.opacity),
      cap: caps.includes(stroke.cap) ? stroke.cap : DEFAULT_STYLE.stroke.cap,
      join: joins.includes(stroke.join) ? stroke.join : DEFAULT_STYLE.stroke.join,
    },
    fill: {
      enabled: Boolean(fill.enabled),
      color: color(fill.color, DEFAULT_STYLE.fill.color),
      opacity: clamp(Number(fill.opacity), 0, 1, DEFAULT_STYLE.fill.opacity),
      gradient: sanitizeFillGradient(fill.gradient),
    },
    blend: blends.includes(source.blend) ? source.blend : DEFAULT_STYLE.blend,
  };
}

function color(value, dflt) {
  return typeof value === 'string' && COLOR_RE.test(value) ? value : dflt;
}

let layerCounter = 0;

/** Next readable layer id that does not collide with the current document. */
export function nextLayerId(document) {
  const used = new Set((document?.layers ?? []).map((layer) => layer?.id).filter(Boolean));
  let id;
  do {
    layerCounter++;
    id = `layer-${layerCounter}`;
  } while (used.has(id));
  return id;
}

function reserveLayerCounter(layers) {
  let max = 0;
  for (const layer of layers ?? []) {
    const match = /^layer-(\d+)$/.exec(layer?.id ?? '');
    if (match) max = Math.max(max, Number(match[1]));
  }
  layerCounter = Math.max(layerCounter, max);
}

/** Create one independent layer with a fresh generator/operator stack. */
export function createLayer(generatorId = 'parametric', overrides = {}) {
  const generator = Generators.get(generatorId);
  layerCounter++;
  return {
    type: 'generator',
    id: typeof overrides.id === 'string' && overrides.id ? overrides.id : `layer-${layerCounter}`,
    name: typeof overrides.name === 'string' ? overrides.name : generator.name,
    visible: overrides.visible !== false,
    locked: Boolean(overrides.locked),
    seed: clamp(Number(overrides.seed), 0, 1e9, 1),
    modes: Array.isArray(overrides.modes) && overrides.modes.length
      ? [...new Set(overrides.modes.filter((mode) => typeof mode === 'string'))]
      : null,
    colorMetric: COLOR_METRICS.includes(overrides.colorMetric) ? overrides.colorMetric : null,
    generator: {
      id: generatorId,
      params: { ...sanitizeParams(generator.params, overrides.generator?.params) },
      mods: { ...(overrides.generator?.mods ?? {}) },
    },
    operators: sanitizeOperators(overrides.operators ?? []),
    style: sanitizeStyle(overrides.style, overrides.strokeWeight ?? DEFAULT_STYLE.stroke.width),
  };
}

/** Fresh instance layer referencing one generator layer. */
export function createInstanceLayer(sourceLayerId, overrides = {}) {
  layerCounter++;
  const id = typeof overrides.id === 'string' && overrides.id
    ? overrides.id
    : `layer-${layerCounter}`;
  return {
    type: 'instance',
    id,
    name: typeof overrides.name === 'string' && overrides.name.trim()
      ? overrides.name.trim().slice(0, 80)
      : `Instance ${layerCounter}`,
    visible: overrides.visible !== false,
    locked: Boolean(overrides.locked),
    seed: null,
    modes: Array.isArray(overrides.modes) && overrides.modes.length
      ? [...new Set(overrides.modes.filter((mode) => typeof mode === 'string'))]
      : null,
    colorMetric: COLOR_METRICS.includes(overrides.colorMetric) ? overrides.colorMetric : null,
    source: { layerId: String(sourceLayerId ?? '') },
    generator: null,
    operators: sanitizeOperators(overrides.operators ?? []),
    style: sanitizeStyle(overrides.style, overrides.strokeWeight ?? DEFAULT_STYLE.stroke.width),
  };
}

/**
 * Expose the active layer's generator/operators on the document for the
 * existing single-layer editor and all current slices. Properties are
 * non-enumerable so JSON stays canonical (`layers` is the source of truth).
 */
export function attachLayerAliases(document) {
  if (!document || !Array.isArray(document.layers) || !document.layers.length) return document;
  if (document.activeLayer == null) document.activeLayer = 0;
  Object.defineProperties(document, {
    seed: {
      configurable: true,
      enumerable: true,
      get() {
        const layer = document.layers[document.activeLayer];
        if (isInstanceLayer(layer)) return sourceLayerFor(document, layer)?.seed ?? 1;
        return layer?.seed ?? 1;
      },
      set(value) {
        const next = clamp(Number(value), 0, 1e9, 1);
        for (const layer of document.layers) {
          if (!isInstanceLayer(layer)) layer.seed = next;
        }
      },
    },
    generator: {
      configurable: true,
      enumerable: false,
      get() { return document.layers[document.activeLayer]?.generator; },
      set(value) {
        const layer = document.layers[document.activeLayer];
        if (layer) layer.generator = value;
      },
    },
    operators: {
      configurable: true,
      enumerable: false,
      get() { return document.layers[document.activeLayer]?.operators ?? []; },
      set(value) {
        const layer = document.layers[document.activeLayer];
        if (layer) layer.operators = value;
      },
    },
  });
  return document;
}

function normalizeLayerIds(layers) {
  const seen = new Set();
  const canonical = new Map();
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    let id = layer.id;
    if (!id || seen.has(id)) {
      let candidate = `layer-${index + 1}`;
      let suffix = 2;
      while (seen.has(candidate)) candidate = `layer-${index + 1}-${suffix++}`;
      id = candidate;
    } else {
      canonical.set(layer.id, layer.id);
    }
    layer.id = id;
    seen.add(id);
  }
  for (const layer of layers) {
    if (!layer.source?.layerId) continue;
    const resolved = canonical.get(layer.source.layerId);
    if (resolved) layer.source.layerId = resolved;
  }
  reserveLayerCounter(layers);
  return layers;
}

function sanitizeLayer(raw, index, fallbackStyle, fallbackSeed = 1) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const instance = source.type === 'instance' || Boolean(source.source?.layerId);
  if (instance) {
    const sourceLayerId = typeof source.source?.layerId === 'string' ? source.source.layerId : '';
    return {
      type: 'instance',
      id: typeof source.id === 'string' && source.id ? source.id : `layer-${index + 1}`,
      name: typeof source.name === 'string' && source.name.trim()
        ? source.name.trim().slice(0, 80)
        : `Instance ${index + 1}`,
      visible: source.visible !== false,
      locked: Boolean(source.locked),
      seed: null,
      modes: Array.isArray(source.modes) && source.modes.length
        ? [...new Set(source.modes.filter((mode) => typeof mode === 'string'))]
        : null,
      colorMetric: COLOR_METRICS.includes(source.colorMetric) ? source.colorMetric : null,
      source: { layerId: sourceLayerId },
      generator: null,
      operators: sanitizeOperators(source.operators),
      style: sanitizeStyle(source.style ?? fallbackStyle, fallbackStyle?.stroke?.width),
    };
  }
  const generatorId = Generators.has(source.generator?.id) ? source.generator.id : 'parametric';
  const generator = Generators.get(generatorId);
  return {
    type: 'generator',
    id: typeof source.id === 'string' && source.id ? source.id : `layer-${index + 1}`,
    name: typeof source.name === 'string' && source.name.trim()
      ? source.name.trim().slice(0, 80)
      : generator.name,
    visible: source.visible !== false,
    locked: Boolean(source.locked),
    seed: clamp(Number(source.seed), 0, 1e9, fallbackSeed),
    modes: Array.isArray(source.modes) && source.modes.length
      ? [...new Set(source.modes.filter((mode) => typeof mode === 'string'))]
      : null,
    colorMetric: COLOR_METRICS.includes(source.colorMetric) ? source.colorMetric : null,
    generator: {
      id: generatorId,
      params: sanitizeParams(generator.params, source.generator?.params),
      mods: sanitizeMods(source.generator?.mods),
    },
    operators: sanitizeOperators(source.operators),
    style: sanitizeStyle(source.style ?? fallbackStyle, fallbackStyle?.stroke?.width),
  };
}

export const DEFAULT_ANIMATION = Object.freeze({
  playing: false,
  speed: 1,
  time: 0,
});

export function createDefaultAnimation() {
  return { ...DEFAULT_ANIMATION, timeline: createTimeline() };
}

/** Fresh document for a generator (schema defaults). */
export function createDocument(generatorId = 'parametric', overrides = {}) {
  const generator = Generators.get(generatorId);
  const view = mergeView(createDefaultView(), overrides.view);
  view.projection = sanitizeProjection(view.projection);
  view.layout = VIEW_LAYOUTS.includes(view.layout) ? view.layout : 'single';
  view.colorMetric = COLOR_METRICS.includes(view.colorMetric) ? view.colorMetric : 'auto';
  view.passOpacity = sanitizePassOpacity(view.passOpacity);
  view.colorRamp = sanitizeColorRamp(view.colorRamp);
  view.artboard = sanitizeArtboard(overrides.view?.artboard);
  const style = sanitizeStyle(overrides.view?.style, overrides.view?.strokeWeight ?? view.strokeWeight);
  view.style = style;
  view.strokeWeight = style.stroke.width;
  const layer = createLayer(generatorId, {
    name: overrides.name ?? generator.name,
    seed: overrides.seed ?? 1,
    generator: overrides.generator,
    operators: overrides.operators,
    style,
  });
  layer.style = style;
  const document = {
    version: DOCUMENT_VERSION,
    name: overrides.name ?? generator.name,
    seed: overrides.seed ?? 1,
    activeLayer: 0,
    layers: [layer],
    view,
    animation: {
      ...createDefaultAnimation(),
      ...(overrides.animation ?? {}),
      timeline: sanitizeTimeline(overrides.animation?.timeline),
    },
  };
  return attachLayerAliases(document);
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
  // (legacy app id; v0 uses 'parametrica' but both are accepted for reads)
  if (raw.version === 1 || (isLegacyApp(raw.app) && raw.params && !raw.generator)) {
    return migrateV1Document(raw);
  }

  const view = mergeView(createDefaultView(), raw.view);
  view.modes = Array.isArray(view.modes)
    ? [...new Set(view.modes.filter((m) => typeof m === 'string'))]
    : ['stroke'];
  if (!view.modes.length) view.modes = ['stroke'];
  view.strokeWeight = clamp(Number(view.strokeWeight), 0.1, 40, 2);
  view.guides = Boolean(view.guides);
  // Merge overlays: defaults as base, then only the keys that match a
  // registered OVERLAYS id. Foreign keys (typos, obsolete ids) are
  // dropped so they don't pollute the sanitized document.
  const registered = new Set(OVERLAYS.map((o) => o.id));
  const rawOverlays = (raw.view?.overlays && typeof raw.view.overlays === 'object') ? raw.view.overlays : {};
  const filteredRaw = Object.fromEntries(
    Object.entries(rawOverlays).filter(([k]) => registered.has(k))
  );
  view.overlays = { ...DEFAULT_OVERLAYS, ...filteredRaw };
  // Camera: same merge pattern. Each axis clamped to its physical range
  // (yaw free, pitch bounded away from the gimbal-lock poles).
  const rawCam = (raw.view?.camera && typeof raw.view.camera === 'object') ? raw.view.camera : {};
  view.camera = {
    yaw:   clamp(Number(rawCam.yaw   ?? DEFAULT_CAMERA.yaw),   -Math.PI, Math.PI,                    DEFAULT_CAMERA.yaw),
    pitch: clamp(Number(rawCam.pitch ?? DEFAULT_CAMERA.pitch), -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05, DEFAULT_CAMERA.pitch),
    fov:   clamp(Number(rawCam.fov   ?? DEFAULT_CAMERA.fov),   MIN_CAMERA_FOV, MAX_CAMERA_FOV,      DEFAULT_CAMERA.fov),
  };
  view.artboard = sanitizeArtboard(raw.view?.artboard);
  view.projection = sanitizeProjection(view.projection);
  view.layout = VIEW_LAYOUTS.includes(view.layout) ? view.layout : 'single';
  view.colorMetric = COLOR_METRICS.includes(view.colorMetric) ? view.colorMetric : 'auto';
  view.passOpacity = sanitizePassOpacity(view.passOpacity);
  view.colorRamp = sanitizeColorRamp(view.colorRamp);
  const fallbackStyle = sanitizeStyle(raw.view?.style, view.strokeWeight);
  const seed = clamp(Number(raw.seed), 0, 1e9, 1);

  const rawLayers = Array.isArray(raw.layers) && raw.layers.length ? raw.layers.slice(0, MAX_LAYERS) : null;
  let layers = rawLayers
    ? rawLayers.map((layer, index) => sanitizeLayer(layer, index, fallbackStyle, seed))
    : [sanitizeLayer({
      generator: raw.generator,
      operators: raw.operators,
      seed,
      style: raw.view?.style,
    }, 0, fallbackStyle, seed)];
  layers = normalizeLayerIds(layers);

  let activeLayer = Number.isInteger(raw.activeLayer) ? raw.activeLayer : 0;
  activeLayer = Math.max(0, Math.min(layers.length - 1, activeLayer));
  const active = layers[activeLayer];
  // Keep the legacy view style pointing at the active layer; all render and
  // export paths use layer.style in v3.
  view.style = active.style;
  view.strokeWeight = active.style.stroke.width;

  const animation = { ...createDefaultAnimation(), ...(raw.animation ?? {}) };
  animation.playing = Boolean(animation.playing);
  animation.speed = clamp(Number(animation.speed), 0.05, 8, 1);
  animation.time = clamp(Number(animation.time), -1e6, 1e6, 0);
  animation.timeline = sanitizeTimeline(raw.animation?.timeline);

  const document = {
    version: DOCUMENT_VERSION,
    name: typeof raw.name === 'string' ? raw.name : active.name,
    seed,
    activeLayer,
    layers,
    view,
    animation,
  };
  return attachLayerAliases(document);
}

function sanitizeOperators(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw.slice(0, 32)) {
    if (!entry || !Operators.has(entry.id)) continue;
    const def = Operators.get(entry.id);
    const params = sanitizeParams(def.params, entry.params);
    if (typeof def.migrateParams === 'function') def.migrateParams(params, entry.params);
    out.push({
      id: entry.id,
      enabled: entry.enabled !== false,
      params,
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
    doc.view.style.stroke.width = doc.view.strokeWeight;
  }
  return doc;
}

function clamp(v, lo, hi, dflt) {
  if (!Number.isFinite(v)) return dflt;
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Recognized app identifiers for incoming documents.
 * 'glyph-lab' is the legacy v1 brand; 'parametrica' is the current one.
 * Both are accepted on read so users don't lose saved presets across
 * the rename. Writes always emit the current id (see PresetManager).
 */
export const APP_ID = 'parametrica';
const LEGACY_APP_IDS = new Set(['glyph-lab']);
export function isLegacyApp(id) {
  return typeof id === 'string' && LEGACY_APP_IDS.has(id);
}
