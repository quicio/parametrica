/**
 * geometry/analysis.ts — world-space analysis for geometry contracts.
 */

import { isCurve2D, isCurve3D, isSurface } from './contracts.ts';
import type { Curve2D, Point3D, Surface } from './contracts.ts';
import { surfaceArea } from './surfaceTessellation.ts';
import { analyzeCurve } from '../analysis/differential.ts';
import type { CurveAnalysis } from '../analysis/differential.ts';

type Rec = Record<string, unknown>;

interface Vector3 { x: number; y: number; z: number }

export interface BBox3 {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
  width: number; height: number; depth: number;
  diagonal: number;
  cx: number; cy: number; cz: number;
}

export interface Analysis3D {
  kind: 'analysis3d';
  arcLength: number;
  bbox: BBox3;
  curvature: Float64Array;
  torsion: Float64Array;
  closed: boolean;
}

export interface Analysis2D extends CurveAnalysis {
  kind: 'analysis2d';
}

export interface SurfaceAnalysis {
  kind: 'analysis-surface';
  area: number;
  bbox: BBox3;
  closedU: boolean;
  closedV: boolean;
  rows: number | undefined;
  cols: number | undefined;
}

export interface UnsupportedAnalysis {
  kind: 'unsupported';
  geometryKind: unknown;
}

/**
 * Loose analysis record: callers inspect whichever fields their geometry kind
 * produces, mirroring the previous structural behaviour.
 */
export interface GeometryAnalysis {
  kind: string;
  arcLength?: number;
  bbox?: BBox3;
  curvature?: Float64Array;
  torsion?: Float64Array;
  closed?: boolean;
  area?: number;
  closedU?: boolean;
  closedV?: boolean;
  rows?: number | undefined;
  cols?: number | undefined;
  geometryKind?: unknown;
}

export function analyzeCurve3D(points: Point3D[], closed = false): Analysis3D {
  const n = points.length;
  const at = (i: number): Point3D => points[closed ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i))]!;
  let arcLength = 0;
  for (let i = 1; i < n; i++) {
    arcLength += distance3(points[i - 1]!, points[i]!);
  }
  if (closed && n > 2) arcLength += distance3(points[n - 1]!, points[0]!);

  const curvature = new Float64Array(n);
  const torsion = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) continue;
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const v1 = sub3(p2, p0);
    const v2 = add3(sub3(p2, scale3(p1, 2)), p0);
    const cross = cross3(v1, v2);
    const speed = length3(v1) || 1e-9;
    curvature[i] = length3(cross) / (speed ** 3);
    const p3 = at(i + 2);
    const p_1 = at(i - 2);
    if (!closed && (i < 2 || i >= n - 2)) continue;
    const v3 = add3(
      sub3(scale3(p3, 2), scale3(p2, 2)),
      add3(scale3(p1, 2), scale3(p_1, -2)),
    );
    const crossLen = length3(cross);
    torsion[i] = crossLen < 1e-9 ? 0 : dot3(cross, v3) / (crossLen * crossLen);
  }

  const box = bbox3(points);
  return {
    kind: 'analysis3d',
    arcLength,
    bbox: box,
    curvature,
    torsion,
    closed: Boolean(closed),
  };
}

export function analyzeGeometry(geometry: unknown[]): GeometryAnalysis[] {
  return geometry.map((raw) => {
    if (isCurve3D(raw)) return analyzeCurve3D(raw.points, raw.closed) as GeometryAnalysis;
    if (isCurve2D(raw)) {
      const curve: Curve2D = raw;
      return { ...analyzeCurve(curve.points, curve.closed), kind: 'analysis2d' } as Analysis2D as GeometryAnalysis;
    }
    if (isSurface(raw)) {
      const surface: Surface = raw;
      const points = surface.grid.points.flat();
      return {
        kind: 'analysis-surface',
        area: surfaceArea(surface),
        bbox: bbox3(points),
        closedU: Boolean(surface.domain?.closedU),
        closedV: Boolean(surface.domain?.closedV),
        rows: surface.grid.rows,
        cols: surface.grid.cols,
      };
    }
    return { kind: 'unsupported', geometryKind: (raw as Rec | null | undefined)?.kind };
  });
}

export function bbox3(points: Point3D[]): BBox3 {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (p.z > maxZ) maxZ = p.z;
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

function distance3(a: Point3D, b: Point3D): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function sub3(a: Vector3, b: Vector3): Vector3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function add3(a: Vector3, b: Vector3): Vector3 { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function scale3(a: Vector3, s: number): Vector3 { return { x: a.x * s, y: a.y * s, z: a.z * s }; }
function dot3(a: Vector3, b: Vector3): number { return a.x * b.x + a.y * b.y + a.z * b.z; }
function length3(a: Vector3): number { return Math.hypot(a.x, a.y, a.z); }
function cross3(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
