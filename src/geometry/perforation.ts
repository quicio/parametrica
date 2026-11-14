/**
 * geometry/perforation.ts — round-hole cutters for a hollow shell.
 *
 * This is the "perforated wall" alternative to the strut lattice: keep the
 * closed outer/inner shell and subtract seeded radial holes. Seed placement
 * comes from the same periodic Voronoi network used by the lattice, so the
 * hole layout is deterministic and roughly millimetre-sized.
 */

import { buildRevolveLattice } from './latticeNetwork.ts';
import { cylinderMesh } from './latticeSolid.ts';

type Rec = Record<string, unknown>;
interface Point3D { x: number; y: number; z: number; [key: string]: unknown }
interface ProfileSample { z: number; r: number }
interface SurfaceLike { grid?: { points?: unknown[][] } }
interface MeshLike { vertices?: unknown[] }

export interface RadiusProfile {
  minZ: number;
  maxZ: number;
  height: number;
  radiusAt: (z: number) => number;
}

export interface PerforationOptions {
  cellSize?: number;
  strut?: number;
  wall?: number;
  floor?: number;
  rim?: number;
  seed?: number;
  radialSegments?: number;
  profile?: RadiusProfile | null;
}

export interface PerforationResult {
  ok: boolean;
  cutters: unknown[];
  stats?: Rec;
  error: { code: string; message: string } | null;
}

export function buildPerforationCutters(shellMesh: unknown, {
  cellSize = 20,
  strut = 3.5,
  wall = 2.5,
  floor = 3,
  rim = 4,
  seed = 7,
  radialSegments = 12,
  profile = null,
}: PerforationOptions = {}): PerforationResult {
  const resolvedProfile = profile ?? radiusProfileFromMesh(shellMesh);
  if (!resolvedProfile) {
    return { ok: false, cutters: [], error: { code: 'invalid-shell', message: 'perforation needs a non-degenerate shell mesh' } };
  }
  const holeRadius = Math.max(1.5, (Number(cellSize) - Number(strut)) / 2);
  const localFloor = Math.max(0, Number(floor) || 0) + holeRadius;
  const localTop = resolvedProfile.height - Math.max(0, Number(rim) || 0) - holeRadius;
  if (localTop <= localFloor + holeRadius) {
    return { ok: false, cutters: [], error: { code: 'too-small', message: 'shell is too short for the requested holes' } };
  }
  const network = buildRevolveLattice({
    radiusAt: (v: number) => resolvedProfile.radiusAt(resolvedProfile.minZ + v * resolvedProfile.height),
    height: resolvedProfile.height,
    floor: localFloor,
    top: localTop,
    cellSize,
    seed,
    samples: 2,
  }) as { seeds: Array<{ theta: number; z: number }> };
  const cutters: unknown[] = [];
  for (const entry of network.seeds) {
    const z = resolvedProfile.minZ + entry.z;
    const radius = resolvedProfile.radiusAt(z);
    const dirX = Math.cos(entry.theta);
    const dirY = Math.sin(entry.theta);
    const a: Point3D = {
      x: (radius - Math.max(0, Number(wall) || 0) - 2) * dirX,
      y: (radius - Math.max(0, Number(wall) || 0) - 2) * dirY,
      z,
    };
    const b: Point3D = {
      x: (radius + 2) * dirX,
      y: (radius + 2) * dirY,
      z,
    };
    cutters.push(cylinderMesh(a, b, holeRadius, radialSegments, `perforation-${cutters.length}`));
  }
  return {
    ok: cutters.length > 0,
    cutters,
    stats: {
      mode: 'cutouts',
      holes: cutters.length,
      holeRadius,
      holeDiameter: holeRadius * 2,
      cellSize: Number(cellSize) || 20,
      strut: Number(strut) || 3.5,
      wall: Number(wall) || 2.5,
      floor: Number(floor) || 0,
      rim: Number(rim) || 0,
      seed: Number(seed) || 0,
    },
    error: cutters.length ? null : { code: 'empty', message: 'no perforation holes were generated' },
  };
}

/**
 * Outer radius R(z) sampled from the prepared shell. The outermost vertex in
 * each z bin is the outer wall; holes are positioned against that surface.
 */
/**
 * Exact R(z) from an evaluated Surface grid. The outer surface is the most
 * reliable profile source; the prepared shell mesh is only a fallback.
 */
export function radiusProfileFromSurface(surface: unknown): RadiusProfile | null {
  const rows = (surface as SurfaceLike | null | undefined)?.grid?.points;
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const samples: ProfileSample[] = [];
  // Surface grids are stored as points[u][v]. One v column is a constant-z
  // ring, which is exactly the radius profile we need.
  const cols = (rows[0] as unknown[] | undefined)?.length ?? 0;
  for (let column = 0; column < cols; column++) {
    let z = 0;
    let radius = 0;
    let count = 0;
    for (const row of rows as unknown[][]) {
      const point = row?.[column] as Point3D | null | undefined;
      if (!Number.isFinite(point?.z)) continue;
      z += point!.z;
      radius += Math.hypot(point!.x, point!.y);
      count += 1;
    }
    if (!count) continue;
    samples.push({ z: z / count, r: radius / count });
  }
  if (samples.length < 2) return null;
  samples.sort((a, b) => a.z - b.z);
  const minZ = samples[0]!.z;
  const maxZ = samples[samples.length - 1]!.z;
  const height = maxZ - minZ;
  if (!(height > 0)) return null;
  const radiusAt = (z: number): number => {
    if (z <= minZ) return samples[0]!.r;
    if (z >= maxZ) return samples[samples.length - 1]!.r;
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (samples[mid]!.z <= z) lo = mid;
      else hi = mid;
    }
    const a = samples[lo]!;
    const b = samples[hi]!;
    const span = b.z - a.z;
    const t = span > 1e-9 ? (z - a.z) / span : 0;
    return a.r + (b.r - a.r) * t;
  };
  return { minZ, maxZ, height, radiusAt };
}

export function radiusProfileFromMesh(mesh: unknown): RadiusProfile | null {
  const vertices = Array.isArray((mesh as MeshLike | null | undefined)?.vertices)
    ? (mesh as MeshLike).vertices as Point3D[]
    : [];
  if (!vertices.length) return null;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const point of vertices) {
    if (!Number.isFinite(point?.z)) continue;
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }
  const height = maxZ - minZ;
  if (!Number.isFinite(height) || height <= 0) return null;
  const bins = 192;
  const radii = new Array<number>(bins).fill(0);
  for (const point of vertices) {
    if (!Number.isFinite(point?.z)) continue;
    const t = Math.max(0, Math.min(1, (point.z - minZ) / height));
    const index = Math.min(bins - 1, Math.floor(t * bins));
    radii[index] = Math.max(radii[index]!, Math.hypot(point.x, point.y));
  }
  // Fill empty bins by walking to the nearest populated one.
  let last = 0;
  for (let i = 0; i < bins; i++) {
    if (radii[i]! > 0) last = radii[i]!;
    else radii[i] = last;
  }
  for (let i = bins - 2; i >= 0; i--) {
    if (radii[i]! <= 0) radii[i] = radii[i + 1]!;
  }
  const radiusAt = (z: number): number => {
    const t = Math.max(0, Math.min(1, (z - minZ) / height)) * (bins - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(bins - 1, i0 + 1);
    const f = t - i0;
    return radii[i0]! * (1 - f) + radii[i1]! * f;
  };
  return { minZ, maxZ, height, radiusAt };
}
