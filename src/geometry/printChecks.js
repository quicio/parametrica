/**
 * geometry/printChecks.js — heuristic printability summary for a prepared mesh.
 *
 * This is not a slicer. It reports the two things a slicer would otherwise
 * surprise the user with: down-facing overhang area and bed contact. All
 * areas are returned in square millimetres when a world scale exists.
 */

import { millimetresPerUnit } from '../core/units.js';

export const DEFAULT_OVERHANG_ANGLE = 50;

export function analyzePrintability(mesh, {
  units = null,
  overhangAngle = DEFAULT_OVERHANG_ANGLE,
  minFeature = null,
} = {}) {
  const vertices = Array.isArray(mesh?.vertices) ? mesh.vertices : [];
  const faces = Array.isArray(mesh?.faces) ? mesh.faces : [];
  if (!vertices.length || !faces.length) {
    return {
      status: 'empty',
      overhangAngle,
      overhangRatio: 0,
      overhangAreaMm2: 0,
      bedContactAreaMm2: 0,
      totalAreaMm2: 0,
      minFeatureMm: null,
      warnings: ['no mesh to check'],
    };
  }
  const scale = millimetresPerUnit(units, 'world') ?? 1;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const point of vertices) {
    if (!Number.isFinite(point?.z)) continue;
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }
  const height = Math.max(0, maxZ - minZ);
  const bedTolerance = Math.max(0.05 / scale, height * 0.002);
  const threshold = -Math.sin((Math.max(0, Math.min(89, overhangAngle)) * Math.PI) / 180);
  let totalArea = 0;
  let overhangArea = 0;
  let bedContactArea = 0;

  for (const face of faces) {
    if (!Array.isArray(face) || face.length < 3) continue;
    const a = vertices[face[0]];
    if (!a) continue;
    for (let i = 1; i < face.length - 1; i++) {
      const b = vertices[face[i]];
      const c = vertices[face[i + 1]];
      if (!b || !c) continue;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const abz = b.z - a.z;
      const acx = c.x - a.x;
      const acy = c.y - a.y;
      const acz = c.z - a.z;
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      const length = Math.hypot(nx, ny, nz);
      if (!Number.isFinite(length) || length < 1e-12) continue;
      const area = 0.5 * length;
      totalArea += area;
      const down = nz / length;
      const atBed = a.z <= minZ + bedTolerance && b.z <= minZ + bedTolerance && c.z <= minZ + bedTolerance;
      if (down < threshold && !atBed) overhangArea += area;
      if (down < -0.9 && atBed) bedContactArea += area;
    }
  }

  const toMm2 = scale * scale;
  const hasFeature = minFeature !== null && minFeature !== undefined && Number.isFinite(Number(minFeature));
  const minFeatureMm = hasFeature ? Number(minFeature) * scale : null;
  const overhangRatio = totalArea > 0 ? overhangArea / totalArea : 0;
  const warnings = [];
  if (overhangRatio > 0.12) {
    warnings.push(`${Math.round(overhangRatio * 100)}% overhang beyond ${overhangAngle}°`);
  }
  if (bedContactArea * toMm2 <= 0) {
    warnings.push('no bed contact');
  }
  if (minFeatureMm !== null && minFeatureMm < 2) {
    warnings.push(`minimum feature ${minFeatureMm.toFixed(1)} mm is below 2 mm`);
  }
  return {
    status: warnings.length ? 'warning' : 'ok',
    overhangAngle,
    overhangRatio,
    overhangAreaMm2: overhangArea * toMm2,
    bedContactAreaMm2: bedContactArea * toMm2,
    totalAreaMm2: totalArea * toMm2,
    minFeatureMm,
    warnings,
    unit: scale === 1 ? 'mm' : 'scaled',
  };
}
