/**
 * engine.js — the mathematical pipeline (spec §4).
 *
 *   generator → operator stack → analysis → stats
 *
 * Pure and DOM-free: fully testable in Node. Includes a per-stage
 * memoization cache: editing stage k only re-evaluates stages ≥ k
 * (when animation is off; during animation everything re-evaluates
 * because `time` flows into every stage).
 */

import { Generators, Operators } from './registry.js';
import { supportsSpatial } from './capabilities.js';
import { resolveParams } from '../animation/animatable.ts';
import { createStdlib } from '../math/stdlib.js';
import { analyzeAll } from '../analysis/differential.ts';
import { analyzeGeometry } from '../geometry/analysis.js';
import { bboxAll, splitCurveAtDiscontinuities } from '../sampling/sampling.js';
import { validateGeometry } from '../geometry/validate.js';
import { projectionForGeometry, projectWorldCurves, projectWorldMeshes } from '../view/projection.ts';
import { resolveFrame, SPACE } from '../view/transform.ts';
import { tessellateSurfaceWithMapping } from '../geometry/surfaceTessellation.js';
import { mapGeometryPoints } from '../geometry/transformGeometry.js';
import { meshWireframeCurves } from '../geometry/wireframe.js';
import { isSurface, isMesh } from '../geometry/contracts.js';
import { isInstanceLayer } from './layers.js';

const STAGE_CACHE = new WeakMap();
const ANALYSIS_CACHE = new WeakMap();
const WORLD_ANALYSIS_CACHE = new WeakMap();
const MAX_POINTS_PER_CURVE = 50_000;
const MAX_TOTAL_POINTS = 200_000;

export const POINT_LIMITS = Object.freeze({
  perCurve: MAX_POINTS_PER_CURVE,
  total: MAX_TOTAL_POINTS,
});

let curveId = 0;
const nextId = () => `c${curveId++}`;

/**
 * @param {object} document  GlyphDocument (sanitized)
 * @param {{time?: number, quality?: object}} options
 * @returns {{curves, analysis, errors, stats, bbox}}
 */
export function evaluateDocument(document, options = {}) {
  if (Array.isArray(document.layers) && document.layers.length) {
    return evaluateLayers(document, options);
  }
  const generatorDef = Generators.get(document.generator.id);
  if (typeof generatorDef.generate === 'function' && generatorDef.capabilities?.geometryKind === 'surface') {
    return evaluateSurfaceDocument(document, options, generatorDef);
  }
  if (typeof generatorDef.generate === 'function' && supportsSpatial(generatorDef)) {
    return evaluateSpatialDocument(document, options, generatorDef);
  }
  const t0 = now();
  const time = options.time ?? document.animation?.time ?? 0;
  const seed = document.seed ?? 1;
  const quality = options.quality ?? {};
  const errors = [];
  const scope = createStdlib(seed);
  const ctx = { time, seed, scope, quality, document, timeline: document.animation?.timeline ?? null, layerIndex: options.layerIndex ?? 0 };

  // Cache key for each stage. World generation never depends on the camera;
  // seed/time/quality flow into every stage.
  const qualitySig = JSON.stringify(quality);
  const timelineSig = JSON.stringify(document.animation?.timeline ?? null);
  const cacheKey = (stage) => JSON.stringify([
    seed, time, qualitySig, timelineSig,
    stage.id, stage.params, stage.mods, stage.enabled,
  ]);

  let curves = [];
  const stages = [document.generator, ...(document.operators ?? [])];
  const cacheOwner = options.cacheKey ?? document;
  const prev = options.bypassCache ? null : STAGE_CACHE.get(cacheOwner);
  const signatures = [];
  let reusedUntil = -1;

  if (
    prev &&
    prev.time === time &&
    prev.seed === seed &&
    prev.qualitySig === qualitySig
  ) {
    // reuse the longest valid prefix of stages
    for (let i = 0; i < stages.length && i < prev.signatures.length; i++) {
      if (prev.signatures[i] !== cacheKey(stages[i])) break;
      reusedUntil = i;
    }
  }

  if (reusedUntil >= 0) {
    curves = prev.stageOutputs[reusedUntil];
    signatures.push(...prev.signatures.slice(0, reusedUntil + 1));
  }

  const stageOutputs = signatures.length ? [...prev.stageOutputs.slice(0, reusedUntil + 1)] : [];
  const stageTimes = new Array(stages.length).fill(0);
  let peakPoints = totalPoints(curves);

  for (let i = reusedUntil + 1; i < stages.length; i++) {
    const stage = stages[i];
    signatures.push(cacheKey(stage));
    if (i > 0 && stage.enabled === false) {
      const points = totalPoints(curves);
      if (points > peakPoints) peakPoints = points;
      stageOutputs.push(curves);
      continue;
    }
    const before = now();
    if (i === 0) {
      const def = Generators.get(stage.id);
      const params = resolveParams(def.params, stage.params, stage.mods, {
        ...ctx, stagePath: 'generator.params',
      }, tagErrors(errors, 'generator', 0));
      curves = runGuarded(() => def.sample(params, ctx), errors, 'generator', 0) ?? [];
      curves = applyPlaneFit(curves, params);
    } else {
      const def = Operators.get(stage.id);
      const params = resolveParams(def.params, stage.params, stage.mods, {
        ...ctx, stagePath: `operators[${i - 1}].params`,
      }, tagErrors(errors, 'operator', i - 1));
      curves = runGuarded(() => def.apply(curves, params, ctx), errors, 'operator', i - 1) ?? curves;
    }
    curves = sanitizeCurves(curves);
    // Budget after EVERY stage: topology operators can multiply points,
    // and we must not feed an unbounded array into the next stage.
    curves = enforceBudget(curves);
    const points = totalPoints(curves);
    if (points > peakPoints) peakPoints = points;
    stageTimes[i] = now() - before;
    stageOutputs.push(curves);
  }

  curves = enforceBudget(curves);
  const pointCount = totalPoints(curves);
  if (pointCount > peakPoints) peakPoints = pointCount;

  const cacheEntry = {
    time,
    seed,
    qualitySig,
    signatures,
    stageOutputs,
  };
  if (!options.bypassCache) STAGE_CACHE.set(cacheOwner, cacheEntry);
  evaluateDocument._cache = cacheEntry;

  const bbox = bboxAll(curves);
  const stats = {
    evalMs: now() - t0,
    analysisMs: 0,
    stageTimes,
    curveCount: curves.length,
    pointCount,
    peakPoints,
    arcLength: Math.round(arcLengthAll(curves)),
  };

  const result = { curves, surfaceMappings: [], space: SPACE.ARTBOARD, errors, stats, bbox };

  // Differential geometry (tangents/normals/curvature/inflections) is
  // only needed by a few render passes/overlays. Compute it on first
  // access instead of on every animation frame or mutation probe.
  let analysis = null;
  Object.defineProperty(result, 'analysis', {
    enumerable: true,
    configurable: true,
    get() {
      if (!analysis) {
        const a0 = now();
        analysis = cachedAnalysis(curves);
        stats.analysisMs = now() - a0;
      }
      return analysis;
    },
  });

  return result;
}

const WORLD_CACHE = new WeakMap();
const VIEW_CACHE = new WeakMap();
const SURFACE_CACHE = new WeakMap();
const MESH_CACHE = new WeakMap();
const MESH_VIEW_CACHE = new WeakMap();
const INSTANCE_CACHE = new WeakMap();
const WORLD_CACHE_VERSION = 1;

function evaluateSurfaceDocument(document, options, generatorDef) {
  const t0 = now();
  const time = options.time ?? document.animation?.time ?? 0;
  const seed = document.seed ?? 1;
  const quality = options.quality ?? {};
  const errors = [];
  const scope = createStdlib(seed);
  const ctx = { time, seed, scope, quality, document, timeline: document.animation?.timeline ?? null, layerIndex: options.layerIndex ?? 0 };
  const params = resolveParams(generatorDef.params, document.generator.params, document.generator.mods, {
    ...ctx, stagePath: 'generator.params',
  }, tagErrors(errors, 'generator', 0));
  const stages = [document.generator, ...(document.operators ?? [])];
  const worldOps = [];
  const viewOps = [];
  for (let i = 1; i < stages.length; i++) {
    const stage = stages[i];
    if (stage.enabled === false) continue;
    const def = Operators.get(stage.id);
    if (def.space === 'world') worldOps.push({ stage, def, index: i - 1 });
    else viewOps.push({ stage, def, index: i - 1 });
  }
  const signature = JSON.stringify([
    WORLD_CACHE_VERSION,
    seed,
    time,
    quality,
    generatorDef.id,
    worldParamView(params),
    document.generator.mods,
    worldOps.map(({ stage, def }) => [def.id, stage.params, stage.mods, stage.enabled]),
  ]);
  const cacheKey = options.cacheKey ?? document;
  let surfaces;
  const cached = options.bypassCache ? null : SURFACE_CACHE.get(cacheKey);
  if (cached?.signature === signature) {
    surfaces = cached.surfaces;
  } else {
    surfaces = runGuarded(() => generatorDef.generate(params, ctx), errors, 'generator', 0) ?? [];
    surfaces = sanitizeGeometry(surfaces, errors, 'generator', 0).filter((item) => isSurface(item));
    for (const { stage, def, index } of worldOps) {
      const rejected = surfaces.find((item) => !operatorAccepts(def, item));
      if (rejected) {
        errors.push({
          stage: 'operator',
          index,
          message: `${def.name} does not accept ${rejected.kind} geometry`,
        });
        continue;
      }
      const opParams = resolveParams(def.params, stage.params, stage.mods, {
        ...ctx, stagePath: `operators[${index}].params`,
      }, tagErrors(errors, 'operator', index));
      surfaces = runGuarded(() => def.apply(surfaces, opParams, ctx), errors, 'operator', index) ?? surfaces;
      surfaces = sanitizeGeometry(surfaces, errors, 'operator', index);
    }
    surfaces = surfaces.map((surface, index) => ({
      ...surface,
      id: `${generatorDef.id}:${options.layerIndex ?? 0}:surface:${index}`,
    }));
    if (!errors.length && !options.bypassCache) SURFACE_CACHE.set(cacheKey, { signature, surfaces });
  }

  return evaluateSurfaceGeometry({
    document,
    surfaces,
    fit: Number(params.fit) || 0,
    ctx,
    errors,
    viewOps,
    t0,
  });
}

function evaluateSurfaceGeometry({
  document,
  surfaces,
  fit = 0,
  ctx,
  errors,
  viewOps = [],
  stage = 'generator',
  index = 0,
  source = null,
  meshIdFor = null,
  t0 = now(),
}) {
  let meshEntry = MESH_CACHE.get(surfaces);
  if (!meshEntry) {
    const built = surfaces.map((item, surfaceIndex) => {
      if (isMesh(item)) return { mesh: item, mapping: null };
      if (!isSurface(item)) {
        errors.push({ stage, index, message: `surface pipeline cannot render ${item?.kind ?? 'unknown'} geometry` });
        return null;
      }
      try {
        return tessellateSurfaceWithMapping(item, meshIdFor ? { id: meshIdFor(item, surfaceIndex) } : {});
      } catch (error) {
        errors.push({ stage, index, message: error.message });
        return null;
      }
    }).filter(Boolean);
    meshEntry = {
      meshes: built.map((entry) => entry.mesh),
      surfaceMappings: built.map((entry) => entry.mapping).filter(Boolean),
    };
    if (source) annotateInstanceGeometry(meshEntry, surfaces, source);
    if (!errors.length && built.length === surfaces.length) MESH_CACHE.set(surfaces, meshEntry);
  }
  const meshes = meshEntry.meshes;
  const surfaceMappings = meshEntry.surfaceMappings;

  const projection = projectionForGeometry(surfaces, document.view?.projection ?? '3d');
  const viewSignature = JSON.stringify([WORLD_CACHE_VERSION, projection, document.view?.camera ?? null, fit]);
  let meshViews = MESH_VIEW_CACHE.get(meshes);
  if (!meshViews || meshViews.signature !== viewSignature) {
    const projected = projectWorldMeshes(meshes, {
      camera: document.view?.camera,
      projection,
      fit: fit,
    });
    meshViews = { signature: viewSignature, meshes: projected, curves: meshWireframeCurves(projected) };
    MESH_VIEW_CACHE.set(meshes, meshViews);
  }
  let curves = enforceBudget(meshViews.curves);
  for (const { stage, def, index } of viewOps) {
    const opParams = resolveParams(def.params, stage.params, stage.mods, {
      ...ctx, stagePath: `operators[${index}].params`,
    }, tagErrors(errors, 'operator', index));
    curves = runGuarded(() => def.apply(curves, opParams, ctx), errors, 'operator', index) ?? curves;
    curves = sanitizeCurves(curves);
    curves = enforceBudget(curves);
  }
  curves = enforceBudget(curves);
  const pointCount = totalPoints(curves);
  const stats = {
    evalMs: now() - t0,
    analysisMs: 0,
    stageTimes: [],
    curveCount: curves.length,
    pointCount,
    peakPoints: pointCount,
    arcLength: Math.round(arcLengthAll(curves)),
    worldPointCount: geometryPointCount(surfaces),
  };
  const result = {
    curves,
    meshes,
    surfaceMappings,
    renderMeshes: meshViews.meshes,
    geometry: surfaces,
    space: SPACE.WORLD,
    worldBBox: bboxGeometry(surfaces),
    viewProjection: projection,
    appliedProjection: projection,
    errors,
    stats,
    bbox: bboxAll(curves),
  };
  let analysis = null;
  Object.defineProperty(result, 'analysis', {
    enumerable: true, configurable: true,
    get() { if (!analysis) analysis = cachedAnalysis(curves); return analysis; },
  });
  let worldAnalysis = null;
  Object.defineProperty(result, 'worldAnalysis', {
    enumerable: true, configurable: true,
    get() { if (!worldAnalysis) worldAnalysis = analyzeGeometry(surfaces); return worldAnalysis; },
  });
  return result;
}

function annotateInstanceGeometry(meshEntry, surfaces, source) {
  meshEntry.meshes.forEach((mesh, index) => {
    const surface = surfaces[index];
    mesh.meta = {
      ...(mesh.meta ?? {}),
      instanceLayerId: source.instanceLayerId,
      sourceLayerId: source.sourceLayerId,
      ...(surface?.meta?.sourceSurfaceId ? { sourceSurfaceId: surface.meta.sourceSurfaceId } : {}),
    };
  });
  for (const mapping of meshEntry.surfaceMappings) {
    mapping.instanceLayerId = source.instanceLayerId;
    mapping.sourceLayerId = source.sourceLayerId;
    const surface = surfaces.find((item) => item?.id === mapping.surfaceId);
    if (surface?.meta?.sourceSurfaceId) mapping.sourceSurfaceId = surface.meta.sourceSurfaceId;
  }
}

function evaluateSpatialDocument(document, options, generatorDef) {
  const t0 = now();
  const time = options.time ?? document.animation?.time ?? 0;
  const seed = document.seed ?? 1;
  const quality = options.quality ?? {};
  const errors = [];
  const scope = createStdlib(seed);
  const ctx = {
    time, seed, scope, quality, document,
    timeline: document.animation?.timeline ?? null,
    layerIndex: options.layerIndex ?? 0,
  };
  const stages = [document.generator, ...(document.operators ?? [])];
  const worldOps = [];
  const viewOps = [];
  for (let i = 1; i < stages.length; i++) {
    const stage = stages[i];
    if (stage.enabled === false) continue;
    const def = Operators.get(stage.id);
    if (def.space === 'world') worldOps.push({ stage, def, index: i - 1 });
    else viewOps.push({ stage, def, index: i - 1 });
  }

  const generatorParams = resolveParams(generatorDef.params, document.generator.params, document.generator.mods, {
    ...ctx, stagePath: 'generator.params',
  }, tagErrors(errors, 'generator', 0));
  const signature = JSON.stringify([
    WORLD_CACHE_VERSION,
    seed,
    time,
    quality,
    generatorDef.id,
    worldParamView(generatorParams),
    document.generator.mods,
    worldOps.map(({ stage, def }) => [def.id, stage.params, stage.mods, stage.enabled]),
  ]);
  const cacheKey = options.cacheKey ?? document;
  let cached = options.bypassCache ? null : WORLD_CACHE.get(cacheKey);
  let worldGeometry;
  if (cached?.signature === signature) {
    worldGeometry = cached.geometry;
  } else {
    worldGeometry = runGuarded(() => generatorDef.generate(generatorParams, ctx), errors, 'generator', 0) ?? [];
    worldGeometry = sanitizeGeometry(worldGeometry, errors, 'generator', 0);
    for (const { stage, def, index } of worldOps) {
      const rejected = worldGeometry.find((item) => !operatorAccepts(def, item));
      if (rejected) {
        errors.push({
          stage: 'operator',
          index,
          message: `${def.name} does not accept ${rejected.kind} geometry`,
        });
        continue;
      }
      const params = resolveParams(def.params, stage.params, stage.mods, {
        ...ctx, stagePath: `operators[${index}].params`,
      }, tagErrors(errors, 'operator', index));
      worldGeometry = runGuarded(() => def.apply(worldGeometry, params, ctx), errors, 'operator', index) ?? worldGeometry;
      worldGeometry = sanitizeGeometry(worldGeometry, errors, 'operator', index);
    }
    if (!errors.length && !options.bypassCache) WORLD_CACHE.set(cacheKey, { signature, geometry: worldGeometry });
  }

  const projection = projectionForGeometry(worldGeometry, document.view?.projection ?? '3d');
  const viewSignature = JSON.stringify([
    WORLD_CACHE_VERSION,
    projection,
    document.view?.camera ?? null,
    Number(generatorParams.fit) || 0,
    generatorParams.depthOcclusion,
    generatorParams.depthAttenuation,
    viewOps.map(({ stage, def }) => [def.id, stage.params, stage.mods, stage.enabled]),
  ]);
  let viewCurves;
  const cachedView = options.bypassCache ? null : VIEW_CACHE.get(worldGeometry);
  if (!errors.length && cachedView?.signature === viewSignature) {
    viewCurves = cachedView.curves;
  } else {
    viewCurves = sanitizeCurves(projectWorldCurves(worldGeometry, {
      camera: document.view?.camera,
      projection,
      fit: Number(generatorParams.fit) || 0,
      depthFade: generatorParams.depthOcclusion,
      depthStrength: generatorParams.depthAttenuation,
    }));
    for (const { stage, def, index } of viewOps) {
      const params = resolveParams(def.params, stage.params, stage.mods, {
        ...ctx, stagePath: `operators[${index}].params`,
      }, tagErrors(errors, 'operator', index));
      viewCurves = runGuarded(() => def.apply(viewCurves, params, ctx), errors, 'operator', index) ?? viewCurves;
      viewCurves = sanitizeCurves(viewCurves);
      viewCurves = enforceBudget(viewCurves);
    }
    viewCurves = enforceBudget(viewCurves);
    if (!errors.length && !options.bypassCache) VIEW_CACHE.set(worldGeometry, { signature: viewSignature, curves: viewCurves });
  }
  viewCurves = enforceBudget(viewCurves);

  const pointCount = totalPoints(viewCurves);
  const worldBBox = bboxGeometry(worldGeometry);
  const stats = {
    evalMs: now() - t0,
    analysisMs: 0,
    stageTimes: [],
    curveCount: viewCurves.length,
    pointCount,
    peakPoints: pointCount,
    arcLength: Math.round(arcLengthAll(viewCurves)),
    worldPointCount: geometryPointCount(worldGeometry),
  };
  const result = {
    curves: viewCurves,
    surfaceMappings: [],
    geometry: worldGeometry,
    space: SPACE.WORLD,
    worldBBox,
    viewProjection: projection,
    appliedProjection: projection,
    errors,
    stats,
    bbox: bboxAll(viewCurves),
  };
  let analysis = null;
  Object.defineProperty(result, 'analysis', {
    enumerable: true,
    configurable: true,
    get() {
      if (!analysis) {
        const a0 = now();
        analysis = cachedAnalysis(viewCurves);
        stats.analysisMs = now() - a0;
      }
      return analysis;
    },
  });
  let worldAnalysis = null;
  Object.defineProperty(result, 'worldAnalysis', {
    enumerable: true,
    configurable: true,
    get() {
      if (!worldAnalysis) {
        let value = WORLD_ANALYSIS_CACHE.get(worldGeometry);
        if (!value) {
          value = analyzeGeometry(worldGeometry);
          WORLD_ANALYSIS_CACHE.set(worldGeometry, value);
        }
        worldAnalysis = value;
      }
      return worldAnalysis;
    },
  });
  return result;
}

function cachedAnalysis(curves) {
  let value = ANALYSIS_CACHE.get(curves);
  if (!value) {
    value = analyzeAll(curves);
    ANALYSIS_CACHE.set(curves, value);
  }
  return value;
}

function operatorAccepts(def, item) {
  return Array.isArray(def.accepts) ? def.accepts.includes(item.kind) : true;
}

function worldParamView(params) {
  const copy = { ...params };
  delete copy.fit;
  delete copy.depthOcclusion;
  delete copy.depthAttenuation;
  return copy;
}

function sanitizeGeometry(geometry, errors, stage, index) {
  if (!Array.isArray(geometry)) return [];
  const out = [];
  for (const item of geometry) {
    const validation = validateGeometry(item);
    if (!validation.ok) {
      errors.push({ stage, index, message: validation.errors[0] ?? 'invalid geometry' });
      continue;
    }
    out.push(item);
  }
  return out;
}

function geometryPointCount(geometry) {
  return geometry.reduce((total, item) => {
    if (item.points) return total + item.points.length;
    if (item.vertices) return total + item.vertices.length;
    if (item.grid?.points) return total + item.grid.points.flat().length;
    return total;
  }, 0);
}

function bboxGeometry(geometry) {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const item of geometry) {
    const points = item.points
      ?? item.vertices
      ?? (item.grid?.points ? item.grid.points.flat() : []);
    for (const point of points) {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.z < minZ) minZ = point.z;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
      if (point.z > maxZ) maxZ = point.z;
    }
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, width: 0, height: 0, depth: 0, diagonal: 0, cx: 0, cy: 0, cz: 0 };
  }
  return {
    minX, minY, minZ, maxX, maxY, maxZ,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
    diagonal: Math.hypot(maxX - minX, maxY - minY, maxZ - minZ),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    cz: (minZ + maxZ) / 2,
  };
}

function evaluateLayers(document, options = {}) {
  const t0 = now();
  const time = options.time ?? document.animation?.time ?? 0;
  const errors = [];
  const layerResults = new Array(document.layers.length);
  const evaluations = new Map();
  const layerById = new Map();
  for (const layer of document.layers) {
    if (layer?.id && !layerById.has(layer.id)) layerById.set(layer.id, layer);
  }

  // A hidden source is evaluated only when a visible instance needs it.
  const neededSourceIds = new Set();
  for (const layer of document.layers) {
    if (isInstanceLayer(layer) && layer.visible !== false && layer.source?.layerId) {
      neededSourceIds.add(layer.source.layerId);
    }
  }

  const combined = [];
  let peakPoints = 0;
  let arcLength = 0;
  let curveCount = 0;
  let pointCount = 0;

  // Phase 1: generator layers, in document order.
  for (let index = 0; index < document.layers.length; index++) {
    const layer = document.layers[index];
    if (!layer || isInstanceLayer(layer)) continue;
    const visible = layer.visible !== false;
    const neededAsSource = neededSourceIds.has(layer.id);
    if (!visible && !neededAsSource) {
      layerResults[index] = hiddenLayerResult(layer, index, document);
      continue;
    }
    const subdocument = {
      version: 2,
      name: layer.name,
      seed: layer.seed ?? document.seed ?? 1,
      generator: layer.generator,
      operators: layer.operators ?? [],
      view: document.view,
      animation: document.animation,
    };
    const evaluation = evaluateDocument(subdocument, { ...options, time, layerIndex: index, cacheKey: layer });
    evaluations.set(layer.id, evaluation);
    const layerErrors = tagLayerErrors(evaluation.errors, layer, index);
    if (layerErrors.length) errors.push(...layerErrors);
    const layerResult = buildLayerResult(layer, index, evaluation, layerErrors, {
      visible,
      geometryVisible: visible,
    });
    layerResults[index] = layerResult;
    if (visible) {
      combined.push(...layerResult.curves);
      peakPoints += evaluation.stats.peakPoints ?? evaluation.stats.pointCount;
      arcLength += evaluation.stats.arcLength;
      curveCount += evaluation.stats.curveCount;
      pointCount += evaluation.stats.pointCount;
    }
  }

  // Phase 2: instance layers, in document order.
  for (let index = 0; index < document.layers.length; index++) {
    const layer = document.layers[index];
    if (!layer || !isInstanceLayer(layer)) continue;
    if (layer.visible === false) {
      layerResults[index] = hiddenLayerResult(layer, index, document);
      continue;
    }
    const sourceLayer = layerById.get(layer.source?.layerId) ?? null;
    const sourceEvaluation = sourceLayer && !isInstanceLayer(sourceLayer)
      ? evaluations.get(sourceLayer.id) ?? null
      : null;
    const evaluation = evaluateInstanceLayer(document, { ...options, time, layerIndex: index }, layer, sourceLayer, sourceEvaluation);
    const layerErrors = tagLayerErrors(evaluation.errors, layer, index);
    if (layerErrors.length) errors.push(...layerErrors);
    const layerResult = buildLayerResult(layer, index, evaluation, layerErrors, {
      visible: true,
      geometryVisible: true,
      sourceLayer,
    });
    layerResults[index] = layerResult;
    combined.push(...layerResult.curves);
    peakPoints += evaluation.stats.peakPoints ?? evaluation.stats.pointCount;
    arcLength += evaluation.stats.arcLength;
    curveCount += evaluation.stats.curveCount;
    pointCount += evaluation.stats.pointCount;
  }

  const capped = enforceBudget(combined);
  if (capped.length !== combined.length || pointCount > MAX_TOTAL_POINTS) {
    const grouped = new Map(layerResults.map((layer) => [layer.id, []]));
    for (const curve of capped) {
      const id = curve.meta?.layerId;
      if (grouped.has(id)) grouped.get(id).push(curve);
    }
    for (const layer of layerResults) layer.curves = grouped.get(layer.id) ?? [];
    pointCount = totalPoints(capped);
    curveCount = capped.length;
    arcLength = Math.round(arcLengthAll(capped));
  }

  const bbox = bboxAll(capped);
  const stats = {
    evalMs: now() - t0,
    analysisMs: 0,
    stageTimes: [],
    curveCount,
    pointCount,
    peakPoints: Math.max(peakPoints, pointCount),
    arcLength: Math.round(arcLength),
  };
  const spatialProjection = layerResults.some((layer) => layer.appliedProjection)
    ? (document.view?.projection ?? '3d')
    : null;
  const worldGeometry = layerResults.flatMap((layer) => layer.geometry ?? []);
  const meshes = layerResults.flatMap((layer) => layer.meshes ?? []);
  const renderMeshes = layerResults.flatMap((layer) => layer.renderMeshes ?? []);
  const surfaceMappings = layerResults.flatMap((layer) => layer.surfaceMappings ?? []);
  const visibleSpaces = new Set(layerResults.filter((layer) => layer.visible !== false).map((layer) => layer.space));
  const space = visibleSpaces.size === 1
    ? [...visibleSpaces][0]
    : (visibleSpaces.size > 1 ? SPACE.MIXED : SPACE.ARTBOARD);
  const result = {
    curves: capped,
    meshes,
    surfaceMappings,
    renderMeshes,
    geometry: worldGeometry,
    space,
    worldBBox: worldGeometry.length ? bboxGeometry(worldGeometry) : null,
    errors,
    stats,
    bbox,
    layers: layerResults,
    appliedProjection: spatialProjection,
    viewProjection: spatialProjection,
  };
  let analysis = null;
  Object.defineProperty(result, 'analysis', {
    enumerable: true,
    configurable: true,
    get() {
      if (!analysis) {
        const a0 = now();
        analysis = analyzeAll(capped);
        stats.analysisMs = now() - a0;
      }
      return analysis;
    },
  });
  return result;
}

function hiddenLayerResult(layer, index, document) {
  return {
    id: layer?.id ?? `layer-${index}`,
    name: layer?.name ?? `Layer ${index + 1}`,
    visible: false,
    locked: Boolean(layer?.locked),
    type: layer?.type ?? (isInstanceLayer(layer) ? 'instance' : 'generator'),
    source: isInstanceLayer(layer) ? { ...layer.source } : null,
    style: layer?.style ?? document.view?.style,
    ...(layer?.trace ? { trace: layer.trace } : {}),
    generator: layer?.generator ?? null,
    renderGenerator: layer?.generator ?? null,
    operators: layer?.operators ?? [],
    curves: [],
    stats: null,
    bbox: null,
    errors: [],
  };
}

function tagLayerErrors(layerErrors, layer, index) {
  return (layerErrors ?? []).map((error) => ({
    ...error,
    layerId: layer.id,
    layerIndex: index,
  }));
}

function buildLayerResult(layer, index, evaluation, layerErrors, {
  visible = true,
  geometryVisible = true,
  sourceLayer = null,
} = {}) {
  const curves = visible
    ? evaluation.curves.map((curve) => ({
      ...curve,
      meta: { ...curve.meta, layerId: layer.id, layerName: layer.name },
    }))
    : [];
  const layerResult = {
    id: layer.id,
    name: layer.name,
    visible,
    locked: Boolean(layer.locked),
    type: layer.type ?? (isInstanceLayer(layer) ? 'instance' : 'generator'),
    source: isInstanceLayer(layer)
      ? { ...layer.source, sourceLayerName: sourceLayer?.name ?? null }
      : null,
    modes: Array.isArray(layer.modes) && layer.modes.length ? layer.modes : null,
    colorMetric: layer.colorMetric ?? null,
    style: layer.style,
    ...(layer.trace ? { trace: layer.trace } : {}),
    ...(layer.fabricationRole === 'cutter' ? { fabricationRole: 'cutter' } : {}),
    generator: layer.generator ?? null,
    renderGenerator: sourceLayer?.generator ?? layer.generator ?? null,
    operators: layer.operators,
    curves,
    space: evaluation.space ?? (evaluation.geometry ? SPACE.WORLD : SPACE.ARTBOARD),
    geometry: geometryVisible ? evaluation.geometry ?? null : null,
    meshes: geometryVisible ? evaluation.meshes ?? [] : [],
    surfaceMappings: geometryVisible ? evaluation.surfaceMappings ?? [] : [],
    renderMeshes: geometryVisible ? evaluation.renderMeshes ?? [] : [],
    appliedProjection: geometryVisible ? evaluation.appliedProjection ?? null : null,
    viewProjection: geometryVisible ? evaluation.viewProjection ?? null : null,
    worldBBox: geometryVisible ? evaluation.worldBBox ?? null : null,
    stats: visible ? evaluation.stats : null,
    bbox: visible ? evaluation.bbox : null,
    errors: layerErrors,
  };
  let layerAnalysis = null;
  Object.defineProperty(layerResult, 'analysis', {
    enumerable: true,
    configurable: true,
    get() {
      if (!layerAnalysis) layerAnalysis = analyzeAll(layerResult.curves);
      return layerAnalysis;
    },
  });
  return layerResult;
}

const INSTANCE_ALLOWED_OPERATORS = new Set(['translate', 'rotate', 'scale']);

function evaluateInstanceLayer(document, options, layer, sourceLayer, sourceEvaluation) {
  const t0 = now();
  const time = options.time ?? document.animation?.time ?? 0;
  const quality = options.quality ?? {};
  const errors = [];
  const layerIndex = options.layerIndex ?? 0;

  if (!sourceLayer) {
    errors.push({ stage: 'instance', index: layerIndex, message: 'Instance source layer not found' });
    return emptyWorldEvaluation(errors, t0);
  }
  if (isInstanceLayer(sourceLayer)) {
    errors.push({ stage: 'instance', index: layerIndex, message: 'Instance source cannot be another instance' });
    return emptyWorldEvaluation(errors, t0);
  }
  if (!sourceEvaluation) {
    errors.push({ stage: 'instance', index: layerIndex, message: 'Instance source was not evaluated' });
    return emptyWorldEvaluation(errors, t0);
  }
  if (sourceEvaluation.errors?.length) {
    errors.push({ stage: 'instance', index: layerIndex, message: 'Source layer has errors' });
    return emptyWorldEvaluation(errors, t0);
  }

  const sourceSurfaces = (sourceEvaluation.geometry ?? []).filter(isSurface);
  if (!sourceSurfaces.length) {
    errors.push({ stage: 'instance', index: layerIndex, message: 'Instance source must produce Surface geometry' });
    return emptyWorldEvaluation(errors, t0);
  }

  const timeKey = time;
  const signature = JSON.stringify([
    WORLD_CACHE_VERSION,
    'instance',
    layer.id,
    sourceLayer.id,
    layerGeometrySignature(sourceLayer, document, options),
    (layer.operators ?? []).map((stage) => [stage.id, stage.params, stage.mods, stage.enabled]),
    timeKey,
    quality,
  ]);
  const cached = options.bypassCache ? null : INSTANCE_CACHE.get(layer);
  if (cached?.signature === signature) return cached.result;

  const seed = sourceLayer.seed ?? document.seed ?? 1;
  const ctx = {
    time,
    seed,
    scope: createStdlib(seed),
    quality,
    document,
    timeline: document.animation?.timeline ?? null,
    layerIndex,
  };

  let surfaces = sourceSurfaces.map((surface, index) => cloneInstanceSurface(surface, layer, sourceLayer, index));
  for (let opIndex = 0; opIndex < (layer.operators ?? []).length; opIndex++) {
    const stage = layer.operators[opIndex];
    if (stage.enabled === false) continue;
    const def = Operators.get(stage.id);
    if (!INSTANCE_ALLOWED_OPERATORS.has(def.id)) {
      errors.push({
        stage: 'instance',
        index: layerIndex,
        message: `${def.name} is not allowed on an instance layer`,
      });
      return emptyWorldEvaluation(errors, t0);
    }
    const rejected = surfaces.find((item) => !operatorAccepts(def, item));
    if (rejected) {
      errors.push({
        stage: 'instance',
        index: layerIndex,
        message: `${def.name} does not accept ${rejected.kind} geometry`,
      });
      return emptyWorldEvaluation(errors, t0);
    }
    const opParams = resolveParams(def.params, stage.params, stage.mods, {
      ...ctx, stagePath: `operators[${opIndex}].params`,
    }, tagErrors(errors, 'instance', layerIndex));
    surfaces = runGuarded(() => def.apply(surfaces, opParams, ctx), errors, 'instance', layerIndex) ?? surfaces;
    surfaces = sanitizeGeometry(surfaces, errors, 'instance', layerIndex);
  }

  surfaces = surfaces.map((surface, index) => ({
    ...surface,
    id: `${layer.id}:surface:${index}`,
    meta: {
      ...(surface.meta ?? {}),
      instanceLayerId: layer.id,
      sourceLayerId: sourceLayer.id,
      sourceSurfaceId: surface.meta?.sourceSurfaceId ?? null,
    },
  }));

  const result = evaluateSurfaceGeometry({
    document,
    options,
    surfaces,
    fit: Number(sourceLayer.generator?.params?.fit) || 0,
    ctx,
    errors,
    viewOps: [],
    stage: 'instance',
    index: layerIndex,
    source: { instanceLayerId: layer.id, sourceLayerId: sourceLayer.id },
    meshIdFor: (_surface, index) => `${layer.id}:mesh:${index}`,
    t0,
  });
  if (!errors.length && !options.bypassCache) INSTANCE_CACHE.set(layer, { signature, result });
  return result;
}

function cloneInstanceSurface(surface, layer, sourceLayer, index) {
  const cloned = mapGeometryPoints(surface, (point) => ({ ...point }), {
    id: `${layer.id}:surface:${index}`,
  });
  cloned.meta = {
    ...(surface.meta ?? {}),
    instanceLayerId: layer.id,
    sourceLayerId: sourceLayer.id,
    sourceSurfaceId: surface.id ?? null,
  };
  return cloned;
}

function emptyWorldEvaluation(errors, t0) {
  const bbox = bboxAll([]);
  return {
    curves: [],
    meshes: [],
    surfaceMappings: [],
    renderMeshes: [],
    geometry: [],
    space: SPACE.WORLD,
    worldBBox: bboxGeometry([]),
    viewProjection: '3d',
    appliedProjection: '3d',
    errors,
    stats: {
      evalMs: now() - t0,
      analysisMs: 0,
      stageTimes: [],
      curveCount: 0,
      pointCount: 0,
      peakPoints: 0,
      arcLength: 0,
      worldPointCount: 0,
    },
    bbox,
  };
}

function layerGeometrySignature(layer, document, options) {
  return JSON.stringify([
    layer.id,
    layer.seed ?? document.seed ?? 1,
    layer.generator?.id ?? null,
    layer.generator?.params ?? null,
    layer.generator?.mods ?? null,
    (layer.operators ?? []).map((stage) => [stage.id, stage.params, stage.mods, stage.enabled]),
    options.time ?? document.animation?.time ?? 0,
    options.quality ?? {},
  ]);
}

function applyPlaneFit(curves, params) {
  const fit = Number(params?.fit ?? params?.size);
  if (!Number.isFinite(fit) || fit <= 0) return curves;
  const frame = resolveFrame({
    bounds: bboxAll(curves),
    mode: 'composition',
    anchor: 'bbox',
    fit,
  });
  return curves.map((curve) => ({
    ...curve,
    points: curve.points.map((point) => ({
      ...point,
      x: point.x * frame.scale + frame.tx,
      y: point.y * frame.scale + frame.ty,
    })),
  }));
}

function totalPoints(curves) {
  let total = 0;
  for (const c of curves) total += c.points.length;
  return total;
}

function arcLengthAll(curves) {
  let total = 0;
  for (const c of curves) {
    const pts = c.points;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    if (c.closed && pts.length > 2) {
      total += Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
    }
  }
  return total;
}

function runGuarded(fn, errors, stage, index) {
  try {
    return fn();
  } catch (e) {
    const entry = { stage, index, message: e.message };
    if (e.key) entry.key = e.key;
    if (e.span) entry.span = e.span;
    errors.push(entry);
    return null;
  }
}

function tagErrors(errors, stage, index) {
  const proxy = [];
  proxy.push = (...items) => {
    for (const item of items) errors.push({ stage, index, ...item });
    return proxy.length;
  };
  return proxy;
}

/** Drop degenerate curves, split discontinuities, normalize closure. */
function sanitizeCurves(curves) {
  if (!Array.isArray(curves)) return [];
  const out = [];
  for (const c of curves) {
    if (!c || !Array.isArray(c.points) || c.points.length < 2) continue;
    const split = splitCurveAtDiscontinuities(c.points, { closed: Boolean(c.closed) });
    const segments = split.segments;
    if (!segments.length) continue;
    if (segments.length === 1) {
      out.push({
        id: c.id ?? nextId(),
        points: segments[0],
        closed: split.closed,
        meta: split.broken ? { ...(c.meta ?? {}), discontinuity: true } : (c.meta ?? {}),
      });
      continue;
    }
    segments.forEach((points, index) => {
      out.push({
        id: `${c.id ?? nextId()}-s${index}`,
        points,
        closed: false,
        meta: { ...(c.meta ?? {}), discontinuity: true, segment: index },
      });
    });
  }
  return out;
}

/** Hard budgets (spec §4.3): decimate rather than freeze. */
function enforceBudget(curves) {
  let total = 0;
  const out = [];
  for (const c of curves) {
    let points = c.points;
    if (points.length > MAX_POINTS_PER_CURVE) {
      points = decimate(points, MAX_POINTS_PER_CURVE);
    }
    if (total + points.length > MAX_TOTAL_POINTS) {
      const remaining = MAX_TOTAL_POINTS - total;
      if (remaining < 2) break;
      points = decimate(points, remaining);
    }
    total += points.length;
    out.push({ ...c, points });
  }
  return out;
}

function decimate(points, target) {
  const stride = points.length / target;
  const out = [];
  for (let i = 0; i < target; i++) out.push(points[Math.floor(i * stride)]);
  return out;
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
