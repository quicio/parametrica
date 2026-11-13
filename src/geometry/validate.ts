/**
 * geometry/validate.ts — geometry contracts and fabrication validation.
 */

import {
  GEOMETRY_KIND,
  isCurve2D,
  isCurve3D,
  isSurface,
  isMesh,
  isSolid,
} from './contracts.ts';
import type { Curve2D, Curve3D, Mesh, Point2D, Point3D, Solid, Surface } from './contracts.ts';
import { detectSelfIntersections } from './selfIntersection.ts';

type Rec = Record<string, unknown>;

export interface ValidationMeta {
  closed?: boolean;
  manifold?: boolean;
  oriented?: boolean;
  degenerateFaces?: number;
  selfIntersections?: unknown;
  volume?: number | null;
  tolerance?: number;
  volumeConsistent?: boolean;
  [key: string]: unknown;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  meta: ValidationMeta | null;
}

interface EdgeEntry {
  count: number;
  forward: number;
  backward: number;
  a: number;
  b: number;
}

interface SelfIntersectionSummary {
  supported: boolean;
  checked: boolean;
  count: number;
  pairs: unknown[];
  truncated: boolean;
  reason?: string;
}

const EPS = 1e-9;

export function validateGeometry(value: unknown): ValidationResult {
  if (isCurve2D(value)) return validateCurve2D(value);
  if (isCurve3D(value)) return validateCurve3D(value);
  if (isSurface(value)) return validateSurface(value);
  if (isMesh(value)) return validateMesh(value);
  if (isSolid(value)) return validateSolid(value);
  return result([`unknown geometry kind "${(value as { kind?: unknown } | null | undefined)?.kind}"`]);
}

export function validateCurve2D(value: unknown): ValidationResult {
  return validateCurve(value, false);
}

export function validateCurve3D(value: unknown): ValidationResult {
  return validateCurve(value, true);
}

function validateCurve(value: unknown, spatial: boolean): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const curve = value as (Curve2D | Curve3D) | null | undefined;
  if (!curve || curve.kind !== (spatial ? GEOMETRY_KIND.CURVE3D : GEOMETRY_KIND.CURVE2D)) {
    return result(['wrong curve kind']);
  }
  if (!Array.isArray(curve.points) || curve.points.length < 2) {
    return result(['curve needs at least two points']);
  }
  for (let i = 0; i < curve.points.length; i++) {
    const point = curve.points[i] as Point2D | Point3D | undefined;
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      errors.push(`non-finite point at index ${i}`);
      break;
    }
    if (spatial && !Number.isFinite((point as Point3D).z)) {
      errors.push(`non-finite z at index ${i}`);
      break;
    }
  }
  if (curve.closed && curve.points.length > 2) {
    const a = curve.points[0]!;
    const b = curve.points[curve.points.length - 1]!;
    const gap = spatial
      ? Math.hypot(a.x - b.x, a.y - b.y, (a as Point3D).z - (b as Point3D).z)
      : Math.hypot(a.x - b.x, a.y - b.y);
    if (gap > 1e-5) warnings.push('closed curve has an implicit closure seam');
  }
  return result(errors, warnings);
}

export function validateSurface(value: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isSurface(value)) return result(['wrong surface kind']);
  const surface: Surface = value;
  if (!Array.isArray(surface.grid?.points) || surface.grid.points.length < 2) {
    return result(['surface needs at least two rows']);
  }
  const rows = surface.grid.points;
  const cols = rows[0]?.length ?? 0;
  if (!Number.isInteger(surface.grid.rows) || surface.grid.rows !== rows.length) {
    errors.push('surface rows metadata does not match grid');
  }
  if (!Number.isInteger(surface.grid.cols) || surface.grid.cols !== cols) {
    errors.push('surface cols metadata does not match grid');
  }
  if (cols < 2) errors.push('surface needs at least two columns');
  for (let u = 0; u < rows.length; u++) {
    const row = rows[u]!;
    if (!Array.isArray(row) || row.length !== cols) {
      errors.push(`surface row ${u} is not rectangular`);
      break;
    }
    for (let v = 0; v < row.length; v++) {
      const p = row[v];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
        errors.push(`non-finite surface point at [${u},${v}]`);
        u = rows.length;
        break;
      }
    }
  }
  if (!Array.isArray(surface.domain?.u) || !Array.isArray(surface.domain?.v)) {
    errors.push('surface domain must contain u and v ranges');
  }
  const seamU = (surface.domain?.seamU ?? surface.meta?.seamU ?? 'normal') as string;
  const seamV = (surface.domain?.seamV ?? surface.meta?.seamV ?? 'normal') as string;
  if (!['normal', 'reverse'].includes(seamU)) errors.push('surface seamU must be normal or reverse');
  if (!['normal', 'reverse'].includes(seamV)) errors.push('surface seamV must be normal or reverse');
  if (seamU === 'reverse' && !surface.domain?.closedU) warnings.push('reverse U seam is ignored on an open axis');
  if (seamV === 'reverse' && !surface.domain?.closedV) warnings.push('reverse V seam is ignored on an open axis');
  if (surface.domain?.closedU && seamU === 'reverse' && cols >= 2 && rows.length >= 2) {
    const uniqueCols = surface.domain?.closedV ? cols - 1 : cols;
    const first = rows[0]!;
    const last = rows[rows.length - 1]!;
    let worst = 0;
    for (let v = 0; v < uniqueCols; v++) {
      const a = first[v];
      const b = last[uniqueCols - 1 - v];
      if (!a || !b) continue;
      const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (distance > worst) worst = distance;
    }
    if (worst > 1e-3) warnings.push('reverse U seam endpoints do not meet');
  }
  return result(errors, warnings);
}

export function validateMesh(value: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isMesh(value)) return result(['wrong mesh kind']);
  const mesh: Mesh = value;
  const vertices = mesh.vertices;
  const faces = mesh.faces;
  if (!Array.isArray(vertices) || vertices.length < 3) {
    return result(['mesh needs at least three vertices']);
  }
  for (let i = 0; i < vertices.length; i++) {
    const p = vertices[i];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      errors.push(`non-finite vertex at index ${i}`);
      break;
    }
  }
  if (!Array.isArray(faces) || !faces.length) {
    errors.push('mesh needs faces');
    return result(errors);
  }
  if (mesh.normals && (!Array.isArray(mesh.normals) || mesh.normals.length !== vertices.length)) {
    errors.push('mesh normals must match the vertex count');
  }
  if (mesh.faceNormals && (!Array.isArray(mesh.faceNormals) || mesh.faceNormals.length !== faces.length)) {
    errors.push('mesh faceNormals must match the face count');
  }
  if (mesh.uvs && (!Array.isArray(mesh.uvs) || mesh.uvs.length !== vertices.length)) {
    errors.push('mesh uvs must match the vertex count');
  }

  const edges = new Map<string, EdgeEntry>();
  let degenerateFaces = 0;
  let invalidFaces = 0;
  for (let fi = 0; fi < faces.length; fi++) {
    const face = faces[fi]!;
    if (!Array.isArray(face) || face.length < 3) {
      invalidFaces++;
      continue;
    }
    const distinct = new Set(face);
    if (distinct.size < 3 || face.some((index) => !Number.isInteger(index) || index < 0 || index >= vertices.length)) {
      invalidFaces++;
      continue;
    }
    if (Math.abs(faceArea(vertices, face)) < EPS) degenerateFaces++;
    for (let i = 0; i < face.length; i++) {
      const a = face[i]!;
      const b = face[(i + 1) % face.length]!;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const entry = edges.get(key) ?? { count: 0, forward: 0, backward: 0, a, b };
      entry.count++;
      if (a < b) entry.forward++;
      else entry.backward++;
      edges.set(key, entry);
    }
  }
  if (invalidFaces) errors.push(`${invalidFaces} invalid faces`);
  const boundaryEdges: string[] = [];
  const nonManifoldEdges: string[] = [];
  const inconsistentEdges: string[] = [];
  for (const [key, edge] of edges) {
    if (edge.count === 1) boundaryEdges.push(key);
    else if (edge.count !== 2) nonManifoldEdges.push(key);
    else if (edge.forward !== 1 || edge.backward !== 1) inconsistentEdges.push(key);
  }
  if (boundaryEdges.length) errors.push(`${boundaryEdges.length} open boundary edges`);
  if (nonManifoldEdges.length) errors.push(`${nonManifoldEdges.length} non-manifold edges`);
  if (inconsistentEdges.length) errors.push(`${inconsistentEdges.length} inconsistent edge orientations`);
  if (degenerateFaces) errors.push(`${degenerateFaces} degenerate faces`);

  const volume = boundaryEdges.length === 0 && nonManifoldEdges.length === 0
    ? signedMeshVolume(vertices, faces)
    : null;
  if (volume !== null && (!Number.isFinite(volume) || Math.abs(volume) < EPS)) {
    errors.push('mesh volume is zero or non-finite');
  }
  // Manifold guarantees a valid manifold solid upstream. Its float32 output can
  // trip the approximate local detector on near-degenerate slivers, so the
  // check is recorded as guaranteed rather than re-derived for those meshes.
  const guaranteed = mesh.meta?.manifoldGuaranteed === true;
  const selfIntersections: SelfIntersectionSummary = guaranteed
    ? { supported: true, checked: false, count: 0, pairs: [], truncated: false, reason: 'manifold-guaranteed' }
    : detectSelfIntersections(value) as SelfIntersectionSummary;
  if (!guaranteed && selfIntersections.count > 0) {
    errors.push(`${selfIntersections.count} self-intersecting triangle pairs`);
  }

  return result(errors, warnings, {
    closed: boundaryEdges.length === 0,
    manifold: nonManifoldEdges.length === 0,
    oriented: inconsistentEdges.length === 0,
    degenerateFaces,
    selfIntersections,
    volume: volume === null ? null : Number(volume.toFixed(9)),
  });
}

export function validateSolid(value: unknown): ValidationResult {
  if (!isSolid(value)) return result(['wrong solid kind']);
  const solid: Solid = value;
  const meshResult = validateMesh(solid.boundary);
  const errors = [...meshResult.errors];
  const validation: ValidationMeta = meshResult.meta ?? {};
  if (solid.closed !== true) errors.push('solid is not marked closed');

  if (!validation.closed) errors.push('solid boundary is not watertight');
  if (!validation.manifold) errors.push('solid boundary is not manifold');
  if (!validation.oriented) errors.push('solid boundary orientation is inconsistent');
  const volume = validation.volume;
  if (volume === null || volume === undefined || !Number.isFinite(volume) || Math.abs(volume) < EPS) {
    errors.push('solid volume is missing or invalid');
  }
  if (solid.closed === true && errors.length) {
    errors.push('solid was marked closed without a passing validation');
  }
  const solidValidation: ValidationMeta = {
    ...validation,
    tolerance: Number(solid.meta?.tolerance ?? 1e-6),
    volumeConsistent: volume !== null && volume !== undefined && Number.isFinite(volume),
  };
  return result(errors, meshResult.warnings, solidValidation);
}

function result(errors: string[] = [], warnings: string[] = [], meta: ValidationMeta | null = null): ValidationResult {
  return { ok: errors.length === 0, errors, warnings, meta };
}

function faceArea(vertices: Point3D[], face: number[]): number {
  if (face.length === 3) {
    return triangleArea(vertices[face[0]!]!, vertices[face[1]!]!, vertices[face[2]!]!);
  }
  let area = 0;
  const a = vertices[face[0]!]!;
  for (let i = 1; i < face.length - 1; i++) {
    area += triangleArea(a, vertices[face[i]!]!, vertices[face[i + 1]!]!);
  }
  return area;
}

function triangleArea(a: Point3D, b: Point3D, c: Point3D): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const acx = c.x - a.x;
  const acy = c.y - a.y;
  const acz = c.z - a.z;
  const cx = aby * acz - abz * acy;
  const cy = abz * acx - abx * acz;
  const cz = abx * acy - aby * acx;
  return 0.5 * Math.hypot(cx, cy, cz);
}

function signedMeshVolume(vertices: Point3D[], faces: number[][]): number {
  let volume = 0;
  for (const face of faces) {
    if (!Array.isArray(face) || face.length < 3) continue;
    const a = vertices[face[0]!]!;
    for (let i = 1; i < face.length - 1; i++) {
      const b = vertices[face[i]!]!;
      const c = vertices[face[i + 1]!]!;
      volume += (
        a.x * (b.y * c.z - b.z * c.y)
        - a.y * (b.x * c.z - b.z * c.x)
        + a.z * (b.x * c.y - b.y * c.x)
      ) / 6;
    }
  }
  return volume;
}
