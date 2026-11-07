/**
 * geometry/latticeJointBlend.js — timeboxed local SDF joint candidate.
 *
 * This module is a benchmark/spike surface. It builds one localized joint from
 * incident capsules and Manifold.levelSet. It is not the default joint path and
 * is not used by the production lattice unless a caller explicitly asks for it.
 */

import { manifoldLevelSet } from './manifoldEngine.js';
import { validateMesh } from './validate.js';

export function buildLocalJointSdf({
  branches = [],
  blendRadius = 0.9,
  edgeLength = 0.4,
  padding = 1.2,
} = {}) {
  const started = now();
  const valid = (Array.isArray(branches) ? branches : []).filter((branch) => (
    finitePoint(branch?.a) && finitePoint(branch?.b)
  ));
  if (valid.length < 3) {
    return {
      ok: false,
      geometry: null,
      validation: null,
      error: { code: 'insufficient-branches', message: 'local blend needs at least three incident branches' },
      stats: { branches: valid.length, buildMs: Math.round(now() - started) },
    };
  }
  const radius = Math.max(0.1, Number(valid[0].radius) || 1.75);
  const bounds = boundsOfBranches(valid, radius + padding);
  const sdf = (point) => {
    const p = Array.isArray(point)
      ? { x: point[0], y: point[1], z: point[2] }
      : point;
    let distance = Infinity;
    for (const branch of valid) {
      const branchRadius = Math.max(0.1, Number(branch.radius) || radius);
      const next = capsuleDistance(p, branch.a, branch.b, branchRadius);
      distance = distance === Infinity ? next : smoothMin(distance, next, Math.max(0.05, blendRadius));
    }
    return distance;
  };
  const result = manifoldLevelSet(sdf, {
    bounds,
    edgeLength: Math.max(0.1, Number(edgeLength) || 0.4),
  });
  if (!result.ok || !result.geometry) {
    return {
      ok: false,
      geometry: null,
      validation: result.validation ?? null,
      error: result.error ?? { code: 'levelset-failed', message: 'local SDF levelSet failed' },
      stats: { branches: valid.length, buildMs: Math.round(now() - started) },
    };
  }
  const validation = result.validation ?? validateMesh(result.geometry);
  return {
    ok: Boolean(validation?.ok),
    geometry: result.geometry,
    validation,
    stats: {
      method: 'sdf-levelset',
      branches: valid.length,
      blendRadius,
      edgeLength,
      triangles: result.geometry.faces.length,
      vertices: result.geometry.vertices.length,
      buildMs: Math.round(now() - started),
      source: result.stats ?? null,
    },
  };
}

export function benchmarkLocalJoint(options = {}) {
  const result = buildLocalJointSdf(options);
  return {
    ok: result.ok,
    method: 'sdf-levelset',
    stats: result.stats,
    validation: result.validation
      ? {
        ok: result.validation.ok,
        closed: result.validation.meta?.closed ?? false,
        manifold: result.validation.meta?.manifold ?? false,
        volume: result.validation.meta?.volume ?? null,
        errors: result.validation.errors ?? [],
      }
      : null,
    error: result.error?.message ?? null,
  };
}

function capsuleDistance(point, a, b, radius) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const apz = point.z - a.z;
  const denominator = abx * abx + aby * aby + abz * abz;
  const t = denominator > 1e-12
    ? Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / denominator))
    : 0;
  const dx = apx - abx * t;
  const dy = apy - aby * t;
  const dz = apz - abz * t;
  return radius - Math.hypot(dx, dy, dz);
}

function smoothMin(a, b, k) {
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
}

function boundsOfBranches(branches, padding) {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const branch of branches) {
    for (const point of [branch.a, branch.b]) {
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
      minZ = Math.min(minZ, point.z); maxZ = Math.max(maxZ, point.z);
    }
  }
  return {
    min: [minX - padding, minY - padding, minZ - padding],
    max: [maxX + padding, maxY + padding, maxZ + padding],
  };
}

function finitePoint(point) {
  return Number.isFinite(point?.x) && Number.isFinite(point?.y) && Number.isFinite(point?.z);
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
