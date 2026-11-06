/**
 * geometry/selfIntersectionRepair.js — explicit remesh-based resolution of
 * self-intersecting fabrication meshes.
 *
 * The first implementation uses the deterministic signed-distance remesher.
 * Local exact splitting remains future work; the report names the strategy
 * actually used and never claims an exact topology-preserving repair.
 */

import { detectSelfIntersections } from './selfIntersection.js';
import { remesh } from './remesh.js';
import { repairMesh } from './repair.js';
import { validateMesh } from './validate.js';

export const DEFAULT_SELF_INTERSECTION_STRATEGY = 'auto';
export const SELF_INTERSECTION_STRATEGIES = Object.freeze(['none', 'remesh', 'auto']);

export function repairSelfIntersections(mesh, {
  tolerance = 1e-4,
  maxHoleEdges = 256,
  capStrategy = 'auto',
  topology = 'none',
  nonOrientable = 'cut',
  maxTopologyEdges = 4096,
  strategy = DEFAULT_SELF_INTERSECTION_STRATEGY,
  remeshResolution = 64,
} = {}) {
  const requested = SELF_INTERSECTION_STRATEGIES.includes(strategy) ? strategy : DEFAULT_SELF_INTERSECTION_STRATEGY;
  const base = repairMesh(mesh, {
    tolerance,
    maxHoleEdges,
    capStrategy,
    orient: true,
    topology,
    nonOrientable,
    maxTopologyEdges,
  });
  const report = {
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

  const result = remesh([base.mesh], {
    operation: 'union',
    resolution: remeshResolution,
    tolerance,
  });
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
  const validation = result.validation ?? validateMesh(result.mesh);
  const beforeVolume = base.validation?.meta?.volume;
  const afterVolume = validation?.meta?.volume;
  report.volumeDelta = Number.isFinite(beforeVolume) && Number.isFinite(afterVolume)
    ? afterVolume - beforeVolume
    : null;
  report.triangleDelta = result.mesh.faces.length - base.mesh.faces.length;
  report.errors = validation.errors ?? [];
  return { mesh: result.mesh, validation, report };
}
