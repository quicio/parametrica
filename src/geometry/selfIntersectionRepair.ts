/**
 * geometry/selfIntersectionRepair.ts — explicit remesh-based resolution of
 * self-intersecting fabrication meshes.
 *
 * The first implementation uses the deterministic signed-distance remesher.
 * Local exact splitting remains future work; the report names the strategy
 * actually used and never claims an exact topology-preserving repair.
 */

import { detectSelfIntersections } from './selfIntersection.ts';
import { remesh } from './remesh.ts';
import { sdfRepair } from './sdfRepair.ts';
import { isManifoldReady } from './manifoldEngine.ts';
import { repairMesh } from './repair.ts';
import { validateMesh } from './validate.ts';
import type { ValidationResult } from './validate.ts';

type Rec = Record<string, unknown>;
interface Point3D { x: number; y: number; z: number; [key: string]: unknown }
interface UsableMesh { kind: 'mesh'; vertices: Point3D[]; faces: number[][]; [key: string]: unknown }

export interface SelfIntersectionRepairOptions {
  tolerance?: number;
  maxHoleEdges?: number;
  capStrategy?: string;
  topology?: string;
  nonOrientable?: string;
  maxTopologyEdges?: number;
  strategy?: string;
  remeshResolution?: number;
}

export interface SelfIntersectionRepairResult {
  mesh: unknown;
  validation: ValidationResult;
  report: Rec;
}

interface RepairBase {
  mesh: unknown;
  validation: ValidationResult;
  report: Rec;
}

interface RemeshResult {
  ok?: boolean;
  mesh?: unknown;
  validation?: ValidationResult;
  error?: { message?: string };
  stats?: Rec;
}

export const DEFAULT_SELF_INTERSECTION_STRATEGY = 'auto';
export const SELF_INTERSECTION_STRATEGIES: readonly string[] = Object.freeze(['none', 'sdf', 'remesh', 'auto']);

export function repairSelfIntersections(mesh: unknown, {
  tolerance = 1e-4,
  maxHoleEdges = 256,
  capStrategy = 'auto',
  topology = 'none',
  nonOrientable = 'cut',
  maxTopologyEdges = 4096,
  strategy = DEFAULT_SELF_INTERSECTION_STRATEGY,
  remeshResolution = 64,
}: SelfIntersectionRepairOptions = {}): SelfIntersectionRepairResult {
  const requested = SELF_INTERSECTION_STRATEGIES.includes(strategy) ? strategy : DEFAULT_SELF_INTERSECTION_STRATEGY;
  const base = repairMesh(mesh, {
    tolerance,
    maxHoleEdges,
    capStrategy,
    orient: true,
    topology,
    nonOrientable,
    maxTopologyEdges,
  }) as unknown as RepairBase;
  const report: Rec = {
    ...base.report,
    selfIntersectionStrategy: 'none',
    selfIntersectionPairs: 0,
    remeshResolution: null,
    volumeDelta: null,
    triangleDelta: null,
  };
  if (!base.mesh) return { mesh: null, validation: base.validation, report };

  const detection = detectSelfIntersections(base.mesh);
  report.selfIntersectionPairs = detection.count;
  if (requested === 'none' || !detection.count) {
    return { mesh: base.mesh, validation: base.validation, report };
  }

  const preferSdf = requested === 'sdf' || (requested === 'auto' && isManifoldReady());
  if (preferSdf) {
    const sdfResult = sdfRepair(base.mesh, {
      resolution: remeshResolution,
      repairTolerance: tolerance,
    });
    if (sdfResult.ok) {
      report.selfIntersectionStrategy = 'sdf';
      report.remeshResolution = remeshResolution;
      report.edgeLength = (sdfResult.stats?.edgeLength as number | undefined) ?? null;
      report.projected = false;
      report.featureEdges = 0;
      return finishResult(base, sdfResult as RemeshResult, report);
    }
    if (requested === 'sdf') {
      return {
        mesh: null,
        validation: sdfResult.validation ?? { ok: false, errors: [sdfResult.error?.message ?? 'SDF repair failed'], warnings: [], meta: null },
        report: { ...report, errors: [sdfResult.error?.message ?? 'SDF repair failed'] },
      };
    }
  }

  const result = remesh([base.mesh], {
    operation: 'union',
    resolution: remeshResolution,
    tolerance,
  }) as RemeshResult;
  report.selfIntersectionStrategy = 'remesh';
  report.remeshResolution = remeshResolution;
  report.projected = Boolean(result.stats?.projected);
  report.featureEdges = result.stats?.featureEdges ?? 0;
  if (!result.ok) {
    return {
      mesh: null,
      validation: result.validation ?? { ok: false, errors: [result.error?.message ?? 'remesh failed'], warnings: [], meta: null },
      report: { ...report, errors: [result.error?.message ?? 'remesh failed'] },
    };
  }
  return finishResult(base, result, report);
}

function finishResult(base: RepairBase, result: RemeshResult, report: Rec): SelfIntersectionRepairResult {
  const validation = result.validation ?? validateMesh(result.mesh);
  const beforeVolume = (base.validation?.meta?.volume as number | null | undefined) ?? undefined;
  const afterVolume = (validation?.meta?.volume as number | null | undefined) ?? undefined;
  report.volumeDelta = Number.isFinite(beforeVolume) && Number.isFinite(afterVolume)
    ? (afterVolume as number) - (beforeVolume as number)
    : null;
  report.triangleDelta = (result.mesh as UsableMesh).faces.length - (base.mesh as UsableMesh).faces.length;
  report.errors = validation.errors ?? [];
  return { mesh: result.mesh, validation, report };
}
