/** Structural contracts for the evaluation pipeline. */

import type { AllCurveAnalysis } from '../analysis/differential.ts';

export type Rec = Record<string, unknown>;

export interface EnginePoint {
  x: number;
  y: number;
  z?: number;
  depth?: number;
  depthAlpha?: number;
  [key: string]: unknown;
}
export interface EngineCurve {
  id?: string;
  points: EnginePoint[];
  closed?: boolean;
  meta?: Rec;
  [key: string]: unknown;
}
export interface EngineGeometry {
  kind?: string;
  id?: string;
  points?: EnginePoint[];
  vertices?: EnginePoint[];
  faces?: number[][];
  grid?: { points?: EnginePoint[][]; [key: string]: unknown };
  meta?: Rec;
  source?: unknown;
  [key: string]: unknown;
}
export interface EngineError {
  stage: string;
  index: number;
  message: string;
  layerId?: string;
  layerIndex?: number;
  key?: string;
  span?: unknown;
  [key: string]: unknown;
}
export interface EngineStats {
  evalMs: number;
  analysisMs: number;
  stageTimes: number[];
  curveCount: number;
  pointCount: number;
  peakPoints: number;
  arcLength: number;
  worldPointCount?: number;
  [key: string]: unknown;
}
export interface EngineBBox {
  minX: number;
  minY: number;
  minZ?: number;
  maxX: number;
  maxY: number;
  maxZ?: number;
  width: number;
  height: number;
  depth?: number;
  diagonal?: number;
  cx: number;
  cy: number;
  cz?: number;
  [key: string]: unknown;
}
export interface EngineLayerResult {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  type: string;
  source: Rec | null;
  modes?: string[] | null;
  colorMetric?: string | null;
  style: unknown;
  trace?: unknown;
  fabricationRole?: string;
  generator: unknown;
  renderGenerator: unknown;
  operators: unknown;
  curves: EngineCurve[];
  space?: string;
  geometry?: EngineGeometry[] | null;
  meshes?: EngineGeometry[];
  surfaceMappings?: Rec[];
  renderMeshes?: EngineGeometry[];
  appliedProjection?: string | null;
  viewProjection?: string | null;
  worldBBox?: EngineBBox | null;
  stats: EngineStats | null;
  bbox: EngineBBox | null;
  errors: EngineError[];
  analysis?: AllCurveAnalysis;
  [key: string]: unknown;
}
export interface EngineEvaluation {
  curves: EngineCurve[];
  meshes?: EngineGeometry[];
  surfaceMappings?: Rec[];
  renderMeshes?: EngineGeometry[];
  geometry?: EngineGeometry[] | null;
  space?: string;
  worldBBox?: EngineBBox | null;
  viewProjection?: string | null;
  appliedProjection?: string | null;
  errors: EngineError[];
  stats: EngineStats;
  bbox: EngineBBox | null;
  layers?: EngineLayerResult[];
  analysis?: AllCurveAnalysis;
  worldAnalysis?: unknown;
  [key: string]: unknown;
}
export interface EvaluateOptions {
  time?: number;
  quality?: object;
  cacheKey?: object;
  bypassCache?: boolean;
  layerIndex?: number;
  [key: string]: unknown;
}
export interface StageLike {
  id: string;
  params: Record<string, unknown>;
  mods: Record<string, string>;
  enabled?: boolean;
  [key: string]: unknown;
}
export interface StageCacheEntry {
  time: number;
  seed: number;
  qualitySig: string;
  signatures: string[];
  stageOutputs: EngineCurve[][];
}
export interface MeshEntry {
  meshes: EngineGeometry[];
  surfaceMappings: Rec[];
}
export interface InstanceSource {
  instanceLayerId: string;
  sourceLayerId: string;
}
