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

import { Generators, Operators } from './registry.ts';
import { sanitizeParams } from './schema.ts';
import { OVERLAYS } from '../domain/overlays.ts';
import { createTimeline, sanitizeTimeline } from '../animation/timeline.ts';
import { createDefaultFillGradient, sanitizeFillGradient, DEFAULT_FILL_GRADIENT } from './fillGradient.ts';
import { createFrame, DEFAULT_FRAME, sanitizeFrame } from '../view/transform.ts';
import { createReference, DEFAULT_REFERENCE, sanitizeReference } from '../view/spatialReference.ts';
import { createDefaultUnits, sanitizeUnits, DEFAULT_UNITS } from '../domain/units.ts';
import { createCoordinates, sanitizeCoordinates, DEFAULT_COORDINATES } from '../view/viewportCoordinates.ts';
import { sanitizePassStyle } from '../domain/passStyle.ts';
import { CAP_STRATEGIES } from '../domain/fabrication.ts';
import { MAX_LAYERS, isInstanceLayer, sourceLayerFor } from './layers.ts';
import type {
  AnimationShape,
  ArtboardShape,
  CameraShape,
  DocumentOverrides,
  DocumentShape,
  FillStyleShape,
  GeneratorStageShape,
  LayerOverrides,
  LayerShape,
  OperatorStageShape,
  Rec,
  StyleShape,
  ViewShape,
  FabricationGroupShape,
} from './documentTypes.ts';

export const DOCUMENT_VERSION = 3;

/** Default state for every overlay toggle — derived from OVERLAYS, all off. */
const DEFAULT_OVERLAYS = Object.fromEntries(OVERLAYS.map((o) => [o.id, false]));

/**
 * Default camera state for 3D-projected generators. The renderer
 * reads this when the generator attaches per-point depth. 2D
 * generators ignore it (they emit z=0 by construction). Defaults
 * give a three-quarter orbit view: yaw = −30°, pitch ≈ 34°, fov = 320.
 */
const DEFAULT_CAMERA = {
  yaw:   -Math.PI / 6,
  pitch: 0.6,
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
import { DEFAULT_MANUFACTURING_PROFILE, sanitizeManufacturingProfile } from '../domain/manufacturingProfile.ts';

export const COLOR_METRICS = Object.freeze(['auto', 'height', 'radius', 'curvature', 'arc']);
export const DEFAULT_COLOR_RAMP = Object.freeze(['#ffd400', '#8a2be2', '#1e5bff']);
export const FABRICATION_SCOPES = Object.freeze(['single', 'active-layer', 'composition']);
export const FABRICATION_BOOLEANS = Object.freeze(['none', 'union', 'difference', 'intersection']);
export const FABRICATION_FORMATS = Object.freeze(['stl', '3mf']);
export const FABRICATION_TOPOLOGY = Object.freeze(['none', 'split', 'remove']);
export const FABRICATION_NON_ORIENTABLE = Object.freeze(['cut', 'reject']);
export const FABRICATION_CSG_STRATEGIES = Object.freeze(['auto', 'manifold', 'bsp', 'remesh']);
export const DEFAULT_FABRICATION = Object.freeze({
  groups: Object.freeze([]),
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
  lattice: false,
  latticeMode: 'struts',
  latticeCellSize: 20,
  latticeStrut: 3.5,
  latticeWall: 2.5,
  latticeFloor: 3,
  latticeRim: 4,
  latticeSeed: 7,
  latticePreview: 'solid',
  finishQuality: 'standard',
  jointStyle: 'technical',
  curveStyle: 'polyline',
  envelope: 'centerline',
  radiusProfile: 'constant',
  taper: 0.85,
  manufacturing: DEFAULT_MANUFACTURING_PROFILE,
  quality: 'custom',
});

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function stringIn(values: readonly string[], value: unknown): value is string {
  return typeof value === 'string' && values.includes(value);
}

export function sanitizeFabricationGroups(raw: unknown): FabricationGroupShape[] {
  if (!Array.isArray(raw)) return [];
  const out: FabricationGroupShape[] = [];
  for (const entry of raw.slice(0, 16)) {
    if (!entry || typeof entry !== 'object') continue;
    const group = entry as Rec;
    const op = stringIn(FABRICATION_BOOLEANS, group.op) && group.op !== 'none' ? group.op : null;
    const layers = Array.isArray(group.layers)
      ? [...new Set(group.layers.filter((id): id is string => typeof id === 'string' && Boolean(id)))].slice(0, 64)
      : [];
    if (!op || !layers.length) continue;
    out.push({
      op,
      layers,
      name: typeof group.name === 'string' ? group.name.trim().slice(0, 60) : '',
    });
  }
  return out;
}

export function sanitizeFabricationSettings(raw: unknown): Rec {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Rec;
  const tolerance = Number(source.tolerance);
  const maxHoleEdges = Number(source.maxHoleEdges);
  return {
    groups: sanitizeFabricationGroups(source.groups),
    weld: source.weld === true,
    cap: source.cap === true,
    tolerance: Number.isFinite(tolerance) && tolerance > 0
      ? Math.min(Math.max(tolerance, 1e-9), 1)
      : DEFAULT_FABRICATION.tolerance,
    maxHoleEdges: Number.isFinite(maxHoleEdges)
      ? Math.min(Math.max(Math.floor(maxHoleEdges), 3), 4096)
      : DEFAULT_FABRICATION.maxHoleEdges,
    scope: stringIn(FABRICATION_SCOPES, source.scope) ? source.scope as string : DEFAULT_FABRICATION.scope,
    boolean: (stringIn(FABRICATION_SCOPES, source.scope) ? source.scope as string : DEFAULT_FABRICATION.scope) === 'single'
      ? 'none'
      : (stringIn(FABRICATION_BOOLEANS, source.boolean) ? source.boolean as string : DEFAULT_FABRICATION.boolean),
    repair: source.repair === true,
    capStrategy: stringIn(CAP_STRATEGIES, source.capStrategy) ? source.capStrategy as string : DEFAULT_FABRICATION.capStrategy,
    format: stringIn(FABRICATION_FORMATS, source.format) ? source.format as string : DEFAULT_FABRICATION.format,
    topology: stringIn(FABRICATION_TOPOLOGY, source.topology) ? source.topology as string : DEFAULT_FABRICATION.topology,
    nonOrientable: stringIn(FABRICATION_NON_ORIENTABLE, source.nonOrientable) ? source.nonOrientable as string : DEFAULT_FABRICATION.nonOrientable,
    csgStrategy: stringIn(FABRICATION_CSG_STRATEGIES, source.csgStrategy) ? source.csgStrategy as string : DEFAULT_FABRICATION.csgStrategy,
    selfIntersections: stringIn(['none', 'sdf', 'remesh', 'auto'], source.selfIntersections) ? source.selfIntersections as string : DEFAULT_FABRICATION.selfIntersections,
    remeshResolution: Number.isFinite(Number(source.remeshResolution))
      ? Math.min(Math.max(Math.floor(Number(source.remeshResolution)), 16), 192)
      : DEFAULT_FABRICATION.remeshResolution,
    lattice: source.lattice === true,
    latticeMode: stringIn(['struts', 'cutouts'], source.latticeMode) ? source.latticeMode as string : 'struts',
    latticeCellSize: clampNumber(source.latticeCellSize, 5, 80, 20),
    latticeStrut: clampNumber(source.latticeStrut, 1, 12, 3.5),
    latticeWall: clampNumber(source.latticeWall, 0.5, 20, 2.5),
    latticeFloor: clampNumber(source.latticeFloor, 0, 40, 3),
    latticeRim: clampNumber(source.latticeRim, 0, 20, 4),
    latticeSeed: clampNumber(source.latticeSeed, 0, 9999, 7),
    latticePreview: stringIn(['network', 'solid'], source.latticePreview) ? source.latticePreview as string : 'solid',
    finishQuality: stringIn(['draft', 'standard', 'high'], source.finishQuality) ? source.finishQuality as string : 'standard',
    jointStyle: stringIn(['technical', 'rounded', 'blend', 'auto'], source.jointStyle) ? source.jointStyle as string : 'technical',
    curveStyle: stringIn(['polyline', 'organic'], source.curveStyle) ? source.curveStyle as string : 'polyline',
    envelope: stringIn(['centerline', 'outer'], source.envelope) ? source.envelope as string : 'centerline',
    radiusProfile: stringIn(['constant', 'taper'], source.radiusProfile) ? source.radiusProfile as string : 'constant',
    taper: clampNumber(source.taper, 0.25, 1, 0.85),
    manufacturing: sanitizeManufacturingProfile(source.manufacturing),
    quality: stringIn(['custom', 'draft', 'standard', 'high'], source.quality) ? source.quality as string : 'custom',
  };
}

export function createDefaultArtboard(): ArtboardShape {
  return { ...DEFAULT_ARTBOARD };
}

export function createDefaultStyle(): StyleShape {
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
export function sanitizeProjection(value: unknown): string {
  return PROJECTIONS.includes(value as string) ? value as string : '3d';
}

/** Optional custom gradient ramp: 2–6 hex colors, otherwise the default. */
export function sanitizeColorRamp(value: unknown): string[] | null {
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
function createPreviewSettings(): Rec {
  return {
    backend: 'p5',
    material: 'ceramic',
    quality: 'standard',
    exposure: 1,
    background: '#070809',
    shadow: true,
    contactShadow: true,
    ao: false,
    lighting: 'studio',
  };
}

function sanitizePreviewSettings(raw: unknown): Rec {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Rec;
  const exposure = Number(source.exposure);
  return {
    backend: source.backend === 'webgl' ? 'webgl' : 'p5',
    material: stringIn(['clay', 'ceramic', 'matte', 'custom'], source.material)
      ? source.material as string
      : 'ceramic',
    quality: stringIn(['draft', 'standard', 'high'], source.quality) ? source.quality as string : 'standard',
    exposure: Number.isFinite(exposure) ? Math.min(2, Math.max(0.25, exposure)) : 1,
    background: color(source.background, '#070809'),
    shadow: source.shadow !== false,
    contactShadow: source.contactShadow !== false,
    ao: source.ao === true,
    lighting: stringIn(['studio', 'soft', 'directional'], source.lighting) ? source.lighting as string : 'studio',
  };
}

export function createDefaultView(): ViewShape {
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
    preview: createPreviewSettings(),
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
  preview: Object.freeze(createPreviewSettings()),
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
function mergeView(base: ViewShape, raw: unknown): ViewShape {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Rec;
  const sourceStyle = (source.style && typeof source.style === 'object' ? source.style : {}) as Rec;
  const sourceStroke = (sourceStyle.stroke && typeof sourceStyle.stroke === 'object' ? sourceStyle.stroke : {}) as Rec;
  const sourceFill = (sourceStyle.fill && typeof sourceStyle.fill === 'object' ? sourceStyle.fill : {}) as Rec;
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
    preview: sanitizePreviewSettings(source.preview ?? base.preview),
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

function sanitizeArtboard(raw: unknown): ArtboardShape {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Rec;
  return {
    width: clamp(Number(source.width), 240, 4096, DEFAULT_ARTBOARD.width),
    height: clamp(Number(source.height), 240, 4096, DEFAULT_ARTBOARD.height),
    background: color(source.background, DEFAULT_ARTBOARD.background),
    margin: clamp(Number(source.margin), 0, 120, DEFAULT_ARTBOARD.margin),
  };
}

function sanitizePassOpacity(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key) continue;
    const n = Number(value);
    if (Number.isFinite(n)) out[key] = clamp(n, 0, 1, 1);
  }
  return out;
}

function sanitizeStyle(raw: unknown, fallbackWidth: number = 0.5): StyleShape {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Rec;
  const stroke = (source.stroke && typeof source.stroke === 'object' ? source.stroke : {}) as Rec;
  const fill = (source.fill && typeof source.fill === 'object' ? source.fill : {}) as Rec;
  const caps = ['butt', 'round', 'square'];
  const joins = ['miter', 'round', 'bevel'];
  const blends = ['normal', 'multiply', 'screen', 'difference'];
  return {
    stroke: {
      color: color(stroke.color, DEFAULT_STYLE.stroke.color),
      width: clamp(Number(stroke.width), 0.1, 40, clamp(Number(fallbackWidth), 0.1, 40, DEFAULT_STYLE.stroke.width)),
      opacity: clamp(Number(stroke.opacity), 0, 1, DEFAULT_STYLE.stroke.opacity),
      cap: stringIn(caps, stroke.cap) ? stroke.cap as string : DEFAULT_STYLE.stroke.cap,
      join: stringIn(joins, stroke.join) ? stroke.join as string : DEFAULT_STYLE.stroke.join,
    },
    fill: {
      enabled: Boolean(fill.enabled),
      color: color(fill.color, DEFAULT_STYLE.fill.color),
      opacity: clamp(Number(fill.opacity), 0, 1, DEFAULT_STYLE.fill.opacity),
      gradient: sanitizeFillGradient(fill.gradient),
    },
    blend: stringIn(blends, source.blend) ? source.blend as string : DEFAULT_STYLE.blend,
  };
}

function color(value: unknown, dflt: string): string {
  return typeof value === 'string' && COLOR_RE.test(value) ? value : dflt;
}

let layerCounter = 0;

/** Next readable layer id that does not collide with the current document. */
export function nextLayerId(document: DocumentShape | null | undefined): string {
  const used = new Set((document?.layers ?? []).map((layer) => layer?.id).filter(Boolean));
  let id;
  do {
    layerCounter++;
    id = `layer-${layerCounter}`;
  } while (used.has(id));
  return id;
}

function reserveLayerCounter(layers: unknown): void {
  let max = 0;
  for (const layer of (Array.isArray(layers) ? layers : [])) {
    const id = (layer && typeof layer === 'object' ? (layer as Rec).id : null);
    const match = /^layer-(\d+)$/.exec(typeof id === 'string' ? id : '');
    if (match) max = Math.max(max, Number(match[1]));
  }
  layerCounter = Math.max(layerCounter, max);
}

/** Create one independent layer with a fresh generator/operator stack. */
export function createLayer(generatorId: string = 'parametric', overrides: LayerOverrides = {}): LayerShape {
  const generator = Generators.get(generatorId);
  layerCounter++;
  const trace = sanitizeTrace(overrides.trace);
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
    colorMetric: stringIn(COLOR_METRICS, overrides.colorMetric) ? overrides.colorMetric as string : null,
    generator: {
      id: generatorId,
      params: { ...sanitizeParams(generator.params, (overrides.generator as Rec | undefined)?.params) },
      mods: { ...((overrides.generator as Rec | undefined)?.mods as Record<string, string> ?? {}) },
    },
    operators: sanitizeOperators(overrides.operators ?? []),
    style: sanitizeStyle(overrides.style, Number(overrides.strokeWeight ?? DEFAULT_STYLE.stroke.width)),
    ...(trace ? { trace } : {}),
    ...(overrides.fabricationRole === 'cutter' ? { fabricationRole: 'cutter' } : {}),
  };
}

/** Fresh instance layer referencing one generator layer. */
export function createInstanceLayer(sourceLayerId: unknown, overrides: LayerOverrides = {}): LayerShape {
  layerCounter++;
  const trace = sanitizeTrace(overrides.trace);
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
    colorMetric: stringIn(COLOR_METRICS, overrides.colorMetric) ? overrides.colorMetric as string : null,
    source: { layerId: String(sourceLayerId ?? '') },
    generator: null,
    operators: sanitizeOperators(overrides.operators ?? []),
    style: sanitizeStyle(overrides.style, Number(overrides.strokeWeight ?? DEFAULT_STYLE.stroke.width)),
    ...(trace ? { trace } : {}),
  };
}

/**
 * Expose the active layer's generator/operators on the document for the
 * existing single-layer editor and all current slices. Properties are
 * non-enumerable so JSON stays canonical (`layers` is the source of truth).
 */
export function attachLayerAliases<T>(document: T): T {
  const doc = document as unknown as DocumentShape;
  if (!doc || !Array.isArray(doc.layers) || !doc.layers.length) return document;
  if (doc.activeLayer == null) doc.activeLayer = 0;
  Object.defineProperties(doc, {
    seed: {
      configurable: true,
      enumerable: true,
      get() {
        const layer = doc.layers[doc.activeLayer];
        if (isInstanceLayer(layer)) return (sourceLayerFor(doc, layer) as LayerShape | null)?.seed ?? 1;
        return layer?.seed ?? 1;
      },
      set(value) {
        const next = clamp(Number(value), 0, 1e9, 1);
        for (const layer of doc.layers) {
          if (!isInstanceLayer(layer)) layer.seed = next;
        }
      },
    },
    generator: {
      configurable: true,
      enumerable: false,
      get() { return doc.layers[doc.activeLayer]?.generator; },
      set(value) {
        const layer = doc.layers[doc.activeLayer];
        if (layer) layer.generator = value as GeneratorStageShape | null;
      },
    },
    operators: {
      configurable: true,
      enumerable: false,
      get() { return doc.layers[doc.activeLayer]?.operators ?? []; },
      set(value) {
        const layer = doc.layers[doc.activeLayer];
        if (layer) layer.operators = value as OperatorStageShape[];
      },
    },
  });
  return document;
}

function normalizeLayerIds(layers: LayerShape[]): LayerShape[] {
  const seen = new Set<string>();
  const canonical = new Map<string, string>();
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    if (!layer) continue;
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

function sanitizeTrace(raw: unknown): { group: string; hole: boolean; depth: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Rec;
  const group = typeof source.group === 'string' ? source.group.trim().slice(0, 64) : '';
  if (!group) return null;
  return {
    group,
    hole: Boolean(source.hole),
    depth: Math.max(0, Math.min(32, Math.floor(Number(source.depth) || 0))),
  };
}

function sanitizeLayer(raw: unknown, index: number, fallbackStyle: StyleShape, fallbackSeed: number = 1): LayerShape {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Rec;
  const sourceLayer = (source.source && typeof source.source === 'object' ? source.source : {}) as Rec;
  const instance = source.type === 'instance' || Boolean(sourceLayer.layerId);
  if (instance) {
    const sourceLayerId = typeof sourceLayer.layerId === 'string' ? sourceLayer.layerId : '';
    const trace = sanitizeTrace(source.trace);
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
      colorMetric: stringIn(COLOR_METRICS, source.colorMetric) ? source.colorMetric as string : null,
      source: { layerId: sourceLayerId },
      generator: null,
      operators: sanitizeOperators(source.operators),
      style: sanitizeStyle(source.style ?? fallbackStyle, fallbackStyle.stroke.width),
      ...(trace ? { trace } : {}),
    };
  }
  const rawGenerator = (source.generator && typeof source.generator === 'object' ? source.generator : {}) as Rec;
  const generatorId = typeof rawGenerator.id === 'string' && Generators.has(rawGenerator.id) ? rawGenerator.id : 'parametric';
  const generator = Generators.get(generatorId);
  const trace = sanitizeTrace(source.trace);
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
    colorMetric: stringIn(COLOR_METRICS, source.colorMetric) ? source.colorMetric as string : null,
    generator: {
      id: generatorId,
      params: sanitizeParams(generator.params, rawGenerator.params),
      mods: sanitizeMods(rawGenerator.mods),
    },
    operators: sanitizeOperators(source.operators),
    style: sanitizeStyle(source.style ?? fallbackStyle, fallbackStyle.stroke.width),
    ...(trace ? { trace } : {}),
    ...(source.fabricationRole === 'cutter' ? { fabricationRole: 'cutter' } : {}),
  };
}

export const DEFAULT_ANIMATION = Object.freeze({
  playing: false,
  speed: 1,
  time: 0,
});

export function createDefaultAnimation(): AnimationShape {
  return { ...DEFAULT_ANIMATION, timeline: createTimeline() };
}

/** Fresh document for a generator (schema defaults). */
export function createDocument(generatorId: string = 'parametric', overrides: DocumentOverrides = {}): DocumentShape {
  const generator = Generators.get(generatorId);
  const rawView = (overrides.view && typeof overrides.view === 'object' ? overrides.view : {}) as Rec;
  const rawAnimation = (overrides.animation && typeof overrides.animation === 'object' ? overrides.animation : {}) as Rec;
  const view = mergeView(createDefaultView(), overrides.view);
  view.projection = sanitizeProjection(view.projection);
  view.layout = stringIn(VIEW_LAYOUTS, view.layout) ? view.layout as string : 'single';
  view.colorMetric = stringIn(COLOR_METRICS, view.colorMetric) ? view.colorMetric as string : 'auto';
  view.passOpacity = sanitizePassOpacity(view.passOpacity);
  view.colorRamp = sanitizeColorRamp(view.colorRamp);
  view.artboard = sanitizeArtboard(rawView.artboard);
  const style = sanitizeStyle(rawView.style, Number(rawView.strokeWeight ?? view.strokeWeight));
  view.style = style;
  view.strokeWeight = style.stroke.width;
  const layer = createLayer(generatorId, {
    name: overrides.name ?? generator.name,
    seed: clamp(Number(overrides.seed), 0, 1e9, 1),
    generator: overrides.generator,
    operators: overrides.operators,
    style,
    trace: overrides.trace,
  });
  layer.style = style;
  const document = {
    version: DOCUMENT_VERSION,
    name: overrides.name ?? generator.name,
    seed: clamp(Number(overrides.seed), 0, 1e9, 1),
    activeLayer: 0,
    layers: [layer],
    view,
    animation: {
      ...createDefaultAnimation(),
      ...(rawAnimation as Partial<AnimationShape>),
      timeline: sanitizeTimeline(rawAnimation.timeline),
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
export function sanitizeDocument(rawInput: unknown): DocumentShape | null {
  if (!rawInput || typeof rawInput !== 'object') return null;
  const raw = rawInput as Rec;

  // v1 migration: { app:'glyph-lab', version:1, name, params:{width,…} }
  // (legacy app id; v0 uses 'parametrica' but both are accepted for reads)
  if (raw.version === 1 || (isLegacyApp(raw.app) && raw.params && !raw.generator)) {
    return migrateV1Document(raw);
  }

  const rawView = (raw.view && typeof raw.view === 'object' ? raw.view : {}) as Rec;
  const rawAnimation = (raw.animation && typeof raw.animation === 'object' ? raw.animation : {}) as Rec;
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
  const rawOverlays = (rawView.overlays && typeof rawView.overlays === 'object' ? rawView.overlays : {}) as Rec;
  const filteredRaw = Object.fromEntries(
    Object.entries(rawOverlays).filter(([k]) => registered.has(k))
  );
  view.overlays = { ...DEFAULT_OVERLAYS, ...filteredRaw } as Record<string, boolean>;
  // Camera: same merge pattern. Each axis clamped to its physical range
  // (yaw free, pitch bounded away from the gimbal-lock poles).
  const rawCam = (rawView.camera && typeof rawView.camera === 'object' ? rawView.camera : {}) as Rec;
  view.camera = {
    yaw:   clamp(Number(rawCam.yaw   ?? DEFAULT_CAMERA.yaw),   -Math.PI, Math.PI,                    DEFAULT_CAMERA.yaw),
    pitch: clamp(Number(rawCam.pitch ?? DEFAULT_CAMERA.pitch), -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05, DEFAULT_CAMERA.pitch),
    fov:   clamp(Number(rawCam.fov   ?? DEFAULT_CAMERA.fov),   MIN_CAMERA_FOV, MAX_CAMERA_FOV,      DEFAULT_CAMERA.fov),
  };
  view.artboard = sanitizeArtboard(rawView.artboard);
  view.projection = sanitizeProjection(view.projection);
  view.layout = stringIn(VIEW_LAYOUTS, view.layout) ? view.layout as string : 'single';
  view.colorMetric = stringIn(COLOR_METRICS, view.colorMetric) ? view.colorMetric as string : 'auto';
  view.passOpacity = sanitizePassOpacity(view.passOpacity);
  view.colorRamp = sanitizeColorRamp(view.colorRamp);
  const fallbackStyle = sanitizeStyle(rawView.style, view.strokeWeight);
  const seed = clamp(Number(raw.seed), 0, 1e9, 1);

  const rawLayers = Array.isArray(raw.layers) && raw.layers.length ? raw.layers.slice(0, MAX_LAYERS) : null;
  let layers = rawLayers
    ? rawLayers.map((layer, index) => sanitizeLayer(layer, index, fallbackStyle, seed))
    : [sanitizeLayer({
      generator: raw.generator,
      operators: raw.operators,
      seed,
      style: rawView.style,
    }, 0, fallbackStyle, seed)];
  layers = normalizeLayerIds(layers);

  let activeLayer = Number.isInteger(raw.activeLayer) ? Number(raw.activeLayer) : 0;
  activeLayer = Math.max(0, Math.min(layers.length - 1, activeLayer));
  const active = layers[activeLayer] ?? layers[0];
  if (!active) return null;
  // Keep the legacy view style pointing at the active layer; all render and
  // export paths use layer.style in v3.
  view.style = active.style;
  view.strokeWeight = active.style.stroke.width;

  const animation = { ...createDefaultAnimation(), ...(rawAnimation as Partial<AnimationShape>) } as AnimationShape;
  animation.playing = Boolean(animation.playing);
  animation.speed = clamp(Number(animation.speed), 0.05, 8, 1);
  animation.time = clamp(Number(animation.time), -1e6, 1e6, 0);
  animation.timeline = sanitizeTimeline(rawAnimation.timeline);

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

function sanitizeOperators(raw: unknown): OperatorStageShape[] {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw.slice(0, 32)) {
    if (!entry || typeof entry !== 'object') continue;
    const op = entry as Rec;
    if (typeof op.id !== 'string' || !Operators.has(op.id)) continue;
    const def = Operators.get(op.id);
    const params = sanitizeParams(def.params, op.params);
    if (typeof def.migrateParams === 'function') (def.migrateParams as unknown as (params: Record<string, unknown>, raw: unknown) => void)(params, op.params);
    out.push({
      id: op.id,
      enabled: op.enabled !== false,
      params,
      mods: sanitizeMods(op.mods),
    });
  }
  return out;
}

function sanitizeMods(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value.trim()) out[key] = value;
  }
  return out;
}

/** v1 params map 1:1 onto the bilateral-spline generator schema. */
export function migrateV1Document(raw: Rec): DocumentShape {
  const v1Params = (raw.params && typeof raw.params === 'object' ? raw.params : raw) as Rec;
  const doc = createDocument('bilateral-spline', {
    name: typeof raw.name === 'string' ? raw.name : 'V1 Glyph',
    generator: { params: v1Params },
  });
  if (typeof v1Params.strokeWeight === 'number') {
    doc.view.strokeWeight = clamp(v1Params.strokeWeight, 0.1, 40, 2);
    doc.view.style.stroke.width = doc.view.strokeWeight;
  }
  return doc;
}

function clamp(v: number, lo: number, hi: number, dflt: number): number {
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
export function isLegacyApp(id: unknown): boolean {
  return typeof id === 'string' && LEGACY_APP_IDS.has(id);
}
