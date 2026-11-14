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

import { Generators, Operators } from './registry.ts';
import { supportsSpatial } from './capabilities.ts';
import { resolveParams } from '../animation/animatable.ts';
import { createStdlib } from '../math/stdlib.ts';
import { analyzeAll } from '../analysis/differential.ts';
import { analyzeGeometry } from '../geometry/analysis.ts';
import { bboxAll, splitCurveAtDiscontinuities } from '../sampling/sampling.ts';
import { validateGeometry } from '../geometry/validate.ts';
import { projectionForGeometry, projectWorldCurves, projectWorldMeshes } from '../view/projection.ts';
import { resolveFrame, SPACE } from '../view/transform.ts';
import { tessellateSurfaceWithMapping } from '../geometry/surfaceTessellation.ts';
import { mapGeometryPoints } from '../geometry/transformGeometry.ts';
import { meshWireframeCurves } from '../geometry/wireframe.ts';
import { isSurface, isMesh } from '../geometry/contracts.ts';
import { isInstanceLayer } from './layers.ts';
import type {
  EngineBBox,
  EngineCurve,
  EngineError,
  EngineEvaluation,
  EngineGeometry,
  EngineLayerResult,
  EnginePoint,
  EngineStats,
  EvaluateOptions,
  MeshEntry,
  Rec,
  StageCacheEntry,
  StageLike,
  InstanceSource,
} from './engineTypes.ts';
import type { DocumentShape, LayerShape, OperatorStageShape } from './documentTypes.ts';
import type { GeneratorDefinition, OperatorDefinition, StageDefinition } from './registry.ts';
import type { ResolutionError } from '../animation/animatable.ts';
import type { AllCurveAnalysis } from '../analysis/differential.ts';

const STAGE_CACHE = new WeakMap<object, StageCacheEntry>();
const ANALYSIS_CACHE = new WeakMap<object, AllCurveAnalysis>();
const WORLD_ANALYSIS_CACHE = new WeakMap<object, unknown>();
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
 * @param {{time?: number, quality?: object, cacheKey?: object, bypassCache?: boolean, layerIndex?: number}} options
 * @returns {{curves, analysis, errors, stats, bbox}}
 */
export function evaluateDocument(document: DocumentShape, options: EvaluateOptions = {}): EngineEvaluation {
  if (Array.isArray(document.layers) && document.layers.length) {
    return evaluateLayers(document, options);
  }
  const generatorDef = Generators.get(document.generator!.id);
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
  const errors: EngineError[] = [];
  const scope = createStdlib(seed);
  const ctx = { time, seed, scope, quality, document, timeline: document.animation?.timeline ?? null, layerIndex: options.layerIndex ?? 0 };

  // Cache key for each stage. World generation never depends on the camera;
  // seed/time/quality flow into every stage.
  const qualitySig = JSON.stringify(quality);
  const timelineSig = JSON.stringify(document.animation?.timeline ?? null);
  const cacheKey = (stage: StageLike): string => JSON.stringify([
    seed, time, qualitySig, timelineSig,
    stage.id, stage.params, stage.mods, stage.enabled,
  ]);

  let curves: EngineCurve[] = [];
  const stages: StageLike[] = [document.generator!, ...(document.operators ?? [])] as StageLike[];
  const cacheOwner = options.cacheKey ?? document;
  const prev = (options.bypassCache ? null : STAGE_CACHE.get(cacheOwner)) ?? null;
  const signatures: string[] = [];
  let reusedUntil = -1;

  if (
    prev &&
    prev.time === time &&
    prev.seed === seed &&
    prev.qualitySig === qualitySig
  ) {
    // reuse the longest valid prefix of stages
    for (let i = 0; i < stages.length && i < prev.signatures.length; i++) {
      if (prev.signatures[i] !== cacheKey(stages[i]!)) break;
      reusedUntil = i;
    }
  }

  if (reusedUntil >= 0 && prev) {
    curves = prev.stageOutputs[reusedUntil] ?? [];
    signatures.push(...prev.signatures.slice(0, reusedUntil + 1));
  }

  const stageOutputs: EngineCurve[][] = signatures.length && prev ? [...prev.stageOutputs.slice(0, reusedUntil + 1)] : [];
  const stageTimes = new Array(stages.length).fill(0);
  let peakPoints = totalPoints(curves);

  for (let i = reusedUntil + 1; i < stages.length; i++) {
    const stage = stages[i]!;
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
      curves = runGuarded(() => (def.sample as unknown as (params: Record<string, unknown>, ctx: unknown) => EngineCurve[])(params, ctx), errors, 'generator', 0) ?? [];
      curves = applyPlaneFit(curves, params);
    } else {
      const def = Operators.get(stage.id);
      const params = resolveParams(def.params, stage.params, stage.mods, {
        ...ctx, stagePath: `operators[${i - 1}].params`,
      }, tagErrors(errors, 'operator', i - 1));
      curves = runGuarded(() => (def.apply as unknown as (curves: EngineCurve[], params: Record<string, unknown>, ctx: unknown) => EngineCurve[])(curves, params, ctx), errors, 'operator', i - 1) ?? curves;
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

  const cacheEntry: StageCacheEntry = {
    time,
    seed,
    qualitySig,
    signatures,
    stageOutputs,
  };
  if (!options.bypassCache) STAGE_CACHE.set(cacheOwner, cacheEntry);
  (evaluateDocument as unknown as { _cache?: StageCacheEntry })._cache = cacheEntry;

  const bbox = bboxAll(curves);
  const stats: EngineStats = {
    evalMs: now() - t0,
    analysisMs: 0,
    stageTimes,
    curveCount: curves.length,
    pointCount,
    peakPoints,
    arcLength: Math.round(arcLengthAll(curves)),
  };

  const result: EngineEvaluation = { curves, surfaceMappings: [], space: SPACE.ARTBOARD, errors, stats, bbox };

  // Differential geometry (tangents/normals/curvature/inflections) is
  // only needed by a few render passes/overlays. Compute it on first
  // access instead of on every animation frame or mutation probe.
  let analysis: AllCurveAnalysis | null = null;
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

const WORLD_CACHE = new WeakMap<object, { signature: string; geometry: EngineGeometry[] }>();
const VIEW_CACHE = new WeakMap<object, { signature: string; curves: EngineCurve[] }>();
const SURFACE_CACHE = new WeakMap<object, { signature: string; surfaces: EngineGeometry[] }>();
const MESH_CACHE = new WeakMap<object, MeshEntry>();
const MESH_VIEW_CACHE = new WeakMap<object, { signature: string; meshes: EngineGeometry[]; curves: EngineCurve[] }>();
const INSTANCE_CACHE = new WeakMap<object, { signature: string; result: EngineEvaluation }>();
const WORLD_CACHE_VERSION = 1;

function evaluateSurfaceDocument(document: DocumentShape, options: EvaluateOptions, generatorDef: GeneratorDefinition): EngineEvaluation {
  const t0 = now();
  const time = options.time ?? document.animation?.time ?? 0;
  const seed = document.seed ?? 1;
  const quality = options.quality ?? {};
  const errors: EngineError[] = [];
  const scope = createStdlib(seed);
  const ctx = { time, seed, scope, quality, document, timeline: document.animation?.timeline ?? null, layerIndex: options.layerIndex ?? 0 };
  const params = resolveParams(generatorDef.params, document.generator!.params, document.generator!.mods, {
    ...ctx, stagePath: 'generator.params',
  }, tagErrors(errors, 'generator', 0));
  const stages: StageLike[] = [document.generator!, ...(document.operators ?? [])] as StageLike[];
  const worldOps: Array<{ stage: StageLike; def: OperatorDefinition; index: number }> = [];
  const viewOps: Array<{ stage: StageLike; def: OperatorDefinition; index: number }> = [];
  for (let i = 1; i < stages.length; i++) {
    const stage = stages[i]!;
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
    document.generator!.mods,
    worldOps.map(({ stage, def }) => [def.id, stage.params, stage.mods, stage.enabled]),
  ]);
  const cacheKey = options.cacheKey ?? document;
  let surfaces: EngineGeometry[];
  const cached = options.bypassCache ? null : SURFACE_CACHE.get(cacheKey);
  if (cached?.signature === signature) {
    surfaces = cached.surfaces;
  } else {
    surfaces = runGuarded(() => (generatorDef.generate as unknown as (params: Record<string, unknown>, ctx: unknown) => EngineGeometry[])(params, ctx), errors, 'generator', 0) ?? [];
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
      surfaces = runGuarded(() => (def.apply as unknown as (surfaces: EngineGeometry[], params: Record<string, unknown>, ctx: unknown) => EngineGeometry[])(surfaces, opParams, ctx), errors, 'operator', index) ?? surfaces;
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
}: {
  document: DocumentShape;
  surfaces: EngineGeometry[];
  fit?: number;
  ctx: Parameters<typeof resolveParams>[3];
  errors: EngineError[];
  viewOps?: Array<{ stage: StageLike; def: OperatorDefinition; index: number }>;
  stage?: string;
  index?: number;
  source?: InstanceSource | null;
  meshIdFor?: ((surface: EngineGeometry, index: number) => string) | null;
  t0?: number;
}): EngineEvaluation {
  let meshEntry = MESH_CACHE.get(surfaces);
  if (!meshEntry) {
    const built = surfaces.map((item: EngineGeometry, surfaceIndex: number): { mesh: EngineGeometry; mapping: Rec | null } | null => {
      if (isMesh(item)) return { mesh: item, mapping: null };
      if (!isSurface(item)) {
        errors.push({ stage, index, message: `surface pipeline cannot render ${item?.kind ?? 'unknown'} geometry` });
        return null;
      }
      try {
        return tessellateSurfaceWithMapping(item, meshIdFor ? { id: meshIdFor(item, surfaceIndex) } : {}) as { mesh: EngineGeometry; mapping: Rec | null };
      } catch (error) {
        errors.push({ stage, index, message: error instanceof Error ? error.message : String(error) });
        return null;
      }
    }).filter((entry): entry is { mesh: EngineGeometry; mapping: Rec | null } => Boolean(entry));
    meshEntry = {
      meshes: built.map((entry) => entry.mesh),
      surfaceMappings: built.map((entry) => entry.mapping).filter((mapping): mapping is Rec => Boolean(mapping)),
    };
    if (source) annotateInstanceGeometry(meshEntry, surfaces, source);
    if (!errors.length && built.length === surfaces.length) MESH_CACHE.set(surfaces, meshEntry);
  }
  const entry: MeshEntry = meshEntry;
  const meshes = entry.meshes;
  const surfaceMappings = entry.surfaceMappings;

  const projection = projectionForGeometry(surfaces, (document.view?.projection ?? '3d') as never);
  const viewSignature = JSON.stringify([WORLD_CACHE_VERSION, projection, document.view?.camera ?? null, fit]);
  let meshViews = MESH_VIEW_CACHE.get(meshes);
  if (!meshViews || meshViews.signature !== viewSignature) {
    const projected = projectWorldMeshes(meshes as never, {
      camera: document.view?.camera as never,
      projection: projection as never,
      fit: fit,
    }) as unknown as EngineGeometry[];
    meshViews = { signature: viewSignature, meshes: projected, curves: meshWireframeCurves(projected) as EngineCurve[] };
    MESH_VIEW_CACHE.set(meshes, meshViews);
  }
  const views = meshViews;
  let curves = enforceBudget(views.curves);
  for (const { stage, def, index } of viewOps) {
    const opParams = resolveParams(def.params, stage.params, stage.mods, {
      ...ctx, stagePath: `operators[${index}].params`,
    }, tagErrors(errors, 'operator', index));
    curves = runGuarded(() => (def.apply as unknown as (curves: EngineCurve[], params: Record<string, unknown>, ctx: unknown) => EngineCurve[])(curves, opParams, ctx), errors, 'operator', index) ?? curves;
    curves = sanitizeCurves(curves);
    curves = enforceBudget(curves);
  }
  curves = enforceBudget(curves);
  const pointCount = totalPoints(curves);
  const stats: EngineStats = {
    evalMs: now() - t0,
    analysisMs: 0,
    stageTimes: [],
    curveCount: curves.length,
    pointCount,
    peakPoints: pointCount,
    arcLength: Math.round(arcLengthAll(curves)),
    worldPointCount: geometryPointCount(surfaces),
  };
  const result: EngineEvaluation = {
    curves,
    meshes,
    surfaceMappings,
    renderMeshes: views.meshes,
    geometry: surfaces,
    space: SPACE.WORLD,
    worldBBox: bboxGeometry(surfaces),
    viewProjection: projection,
    appliedProjection: projection,
    errors,
    stats,
    bbox: bboxAll(curves) as EngineBBox | null,
  };
  let analysis: AllCurveAnalysis | null = null;
  Object.defineProperty(result, 'analysis', {
    enumerable: true, configurable: true,
    get() { if (!analysis) analysis = cachedAnalysis(curves); return analysis; },
  });
  let worldAnalysis: unknown = null;
  Object.defineProperty(result, 'worldAnalysis', {
    enumerable: true, configurable: true,
    get() { if (!worldAnalysis) worldAnalysis = analyzeGeometry(surfaces); return worldAnalysis; },
  });
  return result;
}

function annotateInstanceGeometry(meshEntry: MeshEntry, surfaces: EngineGeometry[], source: InstanceSource): void {
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

function evaluateSpatialDocument(document: DocumentShape, options: EvaluateOptions, generatorDef: GeneratorDefinition): EngineEvaluation {
  const t0 = now();
  const time = options.time ?? document.animation?.time ?? 0;
  const seed = document.seed ?? 1;
  const quality = options.quality ?? {};
  const errors: EngineError[] = [];
  const scope = createStdlib(seed);
  const ctx = {
    time, seed, scope, quality, document,
    timeline: document.animation?.timeline ?? null,
    layerIndex: options.layerIndex ?? 0,
  };
  const stages: StageLike[] = [document.generator!, ...(document.operators ?? [])] as StageLike[];
  const worldOps: Array<{ stage: StageLike; def: OperatorDefinition; index: number }> = [];
  const viewOps: Array<{ stage: StageLike; def: OperatorDefinition; index: number }> = [];
  for (let i = 1; i < stages.length; i++) {
    const stage = stages[i]!;
    if (stage.enabled === false) continue;
    const def = Operators.get(stage.id);
    if (def.space === 'world') worldOps.push({ stage, def, index: i - 1 });
    else viewOps.push({ stage, def, index: i - 1 });
  }

  const generatorParams = resolveParams(generatorDef.params, document.generator!.params, document.generator!.mods, {
    ...ctx, stagePath: 'generator.params',
  }, tagErrors(errors, 'generator', 0));
  const signature = JSON.stringify([
    WORLD_CACHE_VERSION,
    seed,
    time,
    quality,
    generatorDef.id,
    worldParamView(generatorParams),
    document.generator!.mods,
    worldOps.map(({ stage, def }) => [def.id, stage.params, stage.mods, stage.enabled]),
  ]);
  const cacheKey = options.cacheKey ?? document;
  let cached = options.bypassCache ? null : WORLD_CACHE.get(cacheKey);
  let worldGeometry: EngineGeometry[];
  if (cached?.signature === signature) {
    worldGeometry = cached.geometry;
  } else {
    worldGeometry = runGuarded(() => (generatorDef.generate as unknown as (params: Record<string, unknown>, ctx: unknown) => EngineGeometry[])(generatorParams, ctx), errors, 'generator', 0) ?? [];
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
      worldGeometry = runGuarded(() => (def.apply as unknown as (geometry: EngineGeometry[], params: Record<string, unknown>, ctx: unknown) => EngineGeometry[])(worldGeometry, params, ctx), errors, 'operator', index) ?? worldGeometry;
      worldGeometry = sanitizeGeometry(worldGeometry, errors, 'operator', index);
    }
    if (!errors.length && !options.bypassCache) WORLD_CACHE.set(cacheKey, { signature, geometry: worldGeometry });
  }

  const projection = projectionForGeometry(worldGeometry, (document.view?.projection ?? '3d') as never);
  const viewSignature = JSON.stringify([
    WORLD_CACHE_VERSION,
    projection,
    document.view?.camera ?? null,
    Number(generatorParams.fit) || 0,
    generatorParams.depthOcclusion,
    generatorParams.depthAttenuation,
    viewOps.map(({ stage, def }) => [def.id, stage.params, stage.mods, stage.enabled]),
  ]);
  let viewCurves: EngineCurve[] = [];
  const cachedView = options.bypassCache ? null : VIEW_CACHE.get(worldGeometry);
  if (!errors.length && cachedView?.signature === viewSignature) {
    viewCurves = cachedView.curves;
  } else {
    viewCurves = sanitizeCurves(projectWorldCurves(worldGeometry as never, {
      camera: document.view?.camera as never,
      projection: projection as never,
      fit: Number(generatorParams.fit) || 0,
      depthFade: generatorParams.depthOcclusion as never,
      depthStrength: generatorParams.depthAttenuation as never,
    }) as never);
    for (const { stage, def, index } of viewOps) {
      const params = resolveParams(def.params, stage.params, stage.mods, {
        ...ctx, stagePath: `operators[${index}].params`,
      }, tagErrors(errors, 'operator', index));
      viewCurves = runGuarded(() => (def.apply as unknown as (curves: EngineCurve[], params: Record<string, unknown>, ctx: unknown) => EngineCurve[])(viewCurves, params, ctx), errors, 'operator', index) ?? viewCurves;
      viewCurves = sanitizeCurves(viewCurves);
      viewCurves = enforceBudget(viewCurves);
    }
    viewCurves = enforceBudget(viewCurves);
    if (!errors.length && !options.bypassCache) VIEW_CACHE.set(worldGeometry, { signature: viewSignature, curves: viewCurves });
  }
  viewCurves = enforceBudget(viewCurves);

  const pointCount = totalPoints(viewCurves);
  const worldBBox = bboxGeometry(worldGeometry);
  const stats: EngineStats = {
    evalMs: now() - t0,
    analysisMs: 0,
    stageTimes: [],
    curveCount: viewCurves.length,
    pointCount,
    peakPoints: pointCount,
    arcLength: Math.round(arcLengthAll(viewCurves)),
    worldPointCount: geometryPointCount(worldGeometry),
  };
  const result: EngineEvaluation = {
    curves: viewCurves,
    surfaceMappings: [],
    geometry: worldGeometry,
    space: SPACE.WORLD,
    worldBBox,
    viewProjection: projection,
    appliedProjection: projection,
    errors,
    stats,
    bbox: bboxAll(viewCurves) as EngineBBox | null,
  };
  let analysis: AllCurveAnalysis | null = null;
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
  let worldAnalysis: unknown = null;
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

function cachedAnalysis(curves: EngineCurve[]): AllCurveAnalysis {
  let value = ANALYSIS_CACHE.get(curves);
  if (!value) {
    value = analyzeAll(curves);
    ANALYSIS_CACHE.set(curves, value);
  }
  return value;
}

function operatorAccepts(def: StageDefinition, item: EngineGeometry): boolean {
  return Array.isArray(def.accepts) ? def.accepts.includes(item.kind as string) : true;
}

function worldParamView(params: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...params };
  delete copy.fit;
  delete copy.depthOcclusion;
  delete copy.depthAttenuation;
  return copy;
}

function sanitizeGeometry(geometry: unknown, errors: EngineError[], stage: string, index: number): EngineGeometry[] {
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

function geometryPointCount(geometry: EngineGeometry[]): number {
  return geometry.reduce((total, item) => {
    if (item.points) return total + item.points.length;
    if (item.vertices) return total + item.vertices.length;
    if (item.grid?.points) return total + item.grid.points.flat().length;
    return total;
  }, 0);
}

function bboxGeometry(geometry: EngineGeometry[]): EngineBBox {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const item of geometry) {
    const points = item.points
      ?? item.vertices
      ?? (item.grid?.points ? item.grid.points.flat() : []);
    for (const point of points) {
      const z = Number(point.z ?? 0);
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (z < minZ) minZ = z;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
      if (z > maxZ) maxZ = z;
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

function evaluateLayers(document: DocumentShape, options: EvaluateOptions = {}): EngineEvaluation {
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
    const evaluation = evaluateDocument(subdocument as unknown as DocumentShape, { ...options, time, layerIndex: index, cacheKey: layer });
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
    const grouped = new Map<string, EngineCurve[]>(layerResults.filter((layer): layer is EngineLayerResult => Boolean(layer)).map((layer) => [layer.id, []]));
    for (const curve of capped) {
      const id = curve.meta?.layerId;
      if (typeof id === 'string' && grouped.has(id)) grouped.get(id)?.push(curve);
    }
    for (const layer of layerResults) if (layer) layer.curves = grouped.get(layer.id) ?? [];
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
  let analysis: AllCurveAnalysis | null = null;
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

function hiddenLayerResult(layer: LayerShape | undefined, index: number, document: DocumentShape): EngineLayerResult {
  return {
    id: layer?.id ?? `layer-${index}`,
    name: layer?.name ?? `Layer ${index + 1}`,
    visible: false,
    locked: Boolean(layer?.locked),
    type: layer?.type ?? (isInstanceLayer(layer) ? 'instance' : 'generator'),
    source: isInstanceLayer(layer) ? { ...(layer?.source ?? {}) } : null,
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

function tagLayerErrors(layerErrors: EngineError[], layer: LayerShape, index: number): EngineError[] {
  return (layerErrors ?? []).map((error) => ({
    ...error,
    layerId: layer.id,
    layerIndex: index,
  }));
}

function buildLayerResult(layer: LayerShape, index: number, evaluation: EngineEvaluation, layerErrors: EngineError[], {
  visible = true,
  geometryVisible = true,
  sourceLayer = null,
}: { visible?: boolean; geometryVisible?: boolean; sourceLayer?: LayerShape | null } = {}): EngineLayerResult {
  const curves = visible
    ? evaluation.curves.map((curve) => ({
      ...curve,
      meta: { ...curve.meta, layerId: layer.id, layerName: layer.name },
    }))
    : [];
  const layerResult: EngineLayerResult = {
    id: layer.id,
    name: layer.name,
    visible,
    locked: Boolean(layer.locked),
    type: layer.type ?? (isInstanceLayer(layer) ? 'instance' : 'generator'),
    source: isInstanceLayer(layer)
      ? { ...(layer.source ?? {}), sourceLayerName: sourceLayer?.name ?? null }
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
  let layerAnalysis: AllCurveAnalysis | null = null;
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

function evaluateInstanceLayer(document: DocumentShape, options: EvaluateOptions, layer: LayerShape, sourceLayer: LayerShape | null, sourceEvaluation: EngineEvaluation | null): EngineEvaluation {
  const t0 = now();
  const time = options.time ?? document.animation?.time ?? 0;
  const quality = options.quality ?? {};
  const errors: EngineError[] = [];
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

  let surfaces: EngineGeometry[] = sourceSurfaces.map((surface, index) => cloneInstanceSurface(surface as EngineGeometry, layer, sourceLayer, index));
  for (let opIndex = 0; opIndex < (layer.operators ?? []).length; opIndex++) {
    const stage = layer.operators![opIndex]!;
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
    surfaces = runGuarded(() => (def.apply as unknown as (surfaces: EngineGeometry[], params: Record<string, unknown>, ctx: unknown) => EngineGeometry[])(surfaces, opParams, ctx), errors, 'instance', layerIndex) ?? surfaces;
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

function cloneInstanceSurface(surface: EngineGeometry, layer: LayerShape, sourceLayer: LayerShape, index: number): EngineGeometry {
  const cloned = mapGeometryPoints(surface, (point: EnginePoint) => ({ ...point }), {
    id: `${layer.id}:surface:${index}`,
  }) as EngineGeometry;
  cloned.meta = {
    ...(surface.meta ?? {}),
    instanceLayerId: layer.id,
    sourceLayerId: sourceLayer.id,
    sourceSurfaceId: surface.id ?? null,
  };
  return cloned;
}

function emptyWorldEvaluation(errors: EngineError[], t0: number): EngineEvaluation {
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

function layerGeometrySignature(layer: LayerShape, document: DocumentShape, options: EvaluateOptions): string {
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

function applyPlaneFit(curves: EngineCurve[], params: Record<string, unknown>): EngineCurve[] {
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

function totalPoints(curves: EngineCurve[]): number {
  let total = 0;
  for (const c of curves) total += c.points.length;
  return total;
}

function arcLengthAll(curves: EngineCurve[]): number {
  let total = 0;
  for (const c of curves) {
    const pts = c.points;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[i - 1]!;
      total += Math.hypot(a.x - b.x, a.y - b.y);
    }
    if (c.closed && pts.length > 2) {
      const first = pts[0]!;
      const last = pts[pts.length - 1]!;
      total += Math.hypot(first.x - last.x, first.y - last.y);
    }
  }
  return total;
}

function runGuarded<T>(fn: () => T, errors: EngineError[], stage: string, index: number): T | null {
  try {
    return fn();
  } catch (error) {
    const source = (error && typeof error === 'object' ? error : {}) as Rec;
    const entry: EngineError = {
      stage,
      index,
      message: error instanceof Error ? error.message : String(error),
      ...(source.key !== undefined ? { key: String(source.key) } : {}),
      ...(source.span !== undefined ? { span: source.span } : {}),
    };
    errors.push(entry);
    return null;
  }
}

function tagErrors(errors: EngineError[], stage: string, index: number): ResolutionError[] {
  const proxy: ResolutionError[] = [];
  proxy.push = (...items: ResolutionError[]) => {
    for (const item of items) errors.push({ stage, index, ...item });
    return proxy.length;
  };
  return proxy;
}

/** Drop degenerate curves, split discontinuities, normalize closure. */
function sanitizeCurves(curves: unknown): EngineCurve[] {
  if (!Array.isArray(curves)) return [];
  const out: EngineCurve[] = [];
  for (const raw of curves) {
    const c = (raw && typeof raw === 'object' ? raw : {}) as EngineCurve;
    if (!c || !Array.isArray(c.points) || c.points.length < 2) continue;
    const split = splitCurveAtDiscontinuities(c.points, { closed: Boolean(c.closed) });
    const segments = split.segments;
    if (!segments.length) continue;
    if (segments.length === 1) {
      out.push({
        id: c.id ?? nextId(),
        points: segments[0] ?? [],
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
function enforceBudget(curves: EngineCurve[]): EngineCurve[] {
  let total = 0;
  const out: EngineCurve[] = [];
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

function decimate<T>(points: T[], target: number): T[] {
  const stride = points.length / target;
  const out: T[] = [];
  for (let i = 0; i < target; i++) out.push(points[Math.floor(i * stride)] as T);
  return out;
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
