/**
 * geometry/validate.js — geometry contracts and fabrication validation.
 */

import {
  GEOMETRY_KIND,
  isCurve2D,
  isCurve3D,
  isSurface,
  isMesh,
  isSolid,
} from './contracts.js';

const EPS = 1e-9;

export function validateGeometry(value) {
  if (isCurve2D(value)) return validateCurve2D(value);
  if (isCurve3D(value)) return validateCurve3D(value);
  if (isSurface(value)) return validateSurface(value);
  if (isMesh(value)) return validateMesh(value);
  if (isSolid(value)) return validateSolid(value);
  return result([`unknown geometry kind "${value?.kind}"`]);
}

export function validateCurve2D(value) {
  return validateCurve(value, false);
}

export function validateCurve3D(value) {
  return validateCurve(value, true);
}

function validateCurve(value, spatial) {
  const errors = [];
  const warnings = [];
  if (!value || value.kind !== (spatial ? GEOMETRY_KIND.CURVE3D : GEOMETRY_KIND.CURVE2D)) {
    return result(['wrong curve kind']);
  }
  if (!Array.isArray(value.points) || value.points.length < 2) {
    return result(['curve needs at least two points']);
  }
  for (let i = 0; i < value.points.length; i++) {
    const point = value.points[i];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      errors.push(`non-finite point at index ${i}`);
      break;
    }
    if (spatial && !Number.isFinite(point.z)) {
      errors.push(`non-finite z at index ${i}`);
      break;
    }
  }
  if (value.closed && value.points.length > 2) {
    const a = value.points[0];
    const b = value.points[value.points.length - 1];
    const gap = spatial
      ? Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
      : Math.hypot(a.x - b.x, a.y - b.y);
    if (gap > 1e-5) warnings.push('closed curve has an implicit closure seam');
  }
  return result(errors, warnings);
}

export function validateSurface(value) {
  const errors = [];
  if (!value || value.kind !== GEOMETRY_KIND.SURFACE) return result(['wrong surface kind']);
  if (!Array.isArray(value.grid?.points) || value.grid.points.length < 2) {
    return result(['surface needs at least two rows']);
  }
  const rows = value.grid.points;
  const cols = rows[0]?.length ?? 0;
  if (!Number.isInteger(value.grid.rows) || value.grid.rows !== rows.length) {
    errors.push('surface rows metadata does not match grid');
  }
  if (!Number.isInteger(value.grid.cols) || value.grid.cols !== cols) {
    errors.push('surface cols metadata does not match grid');
  }
  if (cols < 2) errors.push('surface needs at least two columns');
  for (let u = 0; u < rows.length; u++) {
    if (!Array.isArray(rows[u]) || rows[u].length !== cols) {
      errors.push(`surface row ${u} is not rectangular`);
      break;
    }
    for (let v = 0; v < rows[u].length; v++) {
      const p = rows[u][v];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
        errors.push(`non-finite surface point at [${u},${v}]`);
        u = rows.length;
        break;
      }
    }
  }
  if (!Array.isArray(value.domain?.u) || !Array.isArray(value.domain?.v)) {
    errors.push('surface domain must contain u and v ranges');
  }
  return result(errors);
}

export function validateMesh(value) {
  const errors = [];
  const warnings = [];
  if (!value || value.kind !== GEOMETRY_KIND.MESH) return result(['wrong mesh kind']);
  const vertices = value.vertices;
  const faces = value.faces;
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
  if (value.normals && (!Array.isArray(value.normals) || value.normals.length !== vertices.length)) {
    errors.push('mesh normals must match the vertex count');
  }
  if (value.faceNormals && (!Array.isArray(value.faceNormals) || value.faceNormals.length !== faces.length)) {
    errors.push('mesh faceNormals must match the face count');
  }
  if (value.uvs && (!Array.isArray(value.uvs) || value.uvs.length !== vertices.length)) {
    errors.push('mesh uvs must match the vertex count');
  }

  const edges = new Map();
  let degenerateFaces = 0;
  let invalidFaces = 0;
  for (let fi = 0; fi < faces.length; fi++) {
    const face = faces[fi];
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
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const entry = edges.get(key) ?? { count: 0, forward: 0, backward: 0, a, b };
      entry.count++;
      if (a < b) entry.forward++;
      else entry.backward++;
      edges.set(key, entry);
    }
  }
  if (invalidFaces) errors.push(`${invalidFaces} invalid faces`);
  const boundaryEdges = [];
  const nonManifoldEdges = [];
  const inconsistentEdges = [];
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
  // Self-intersection validation is optional and intentionally reported as a
  // limitation until a robust triangle-intersection validator exists.
  warnings.push('self-intersection validation not implemented');

  return result(errors, warnings, {
    closed: boundaryEdges.length === 0,
    manifold: nonManifoldEdges.length === 0,
    oriented: inconsistentEdges.length === 0,
    degenerateFaces,
    selfIntersections: null,
    volume: volume === null ? null : Number(volume.toFixed(9)),
  });
}

export function validateSolid(value) {
  if (!value || value.kind !== GEOMETRY_KIND.SOLID) return result(['wrong solid kind']);
  const meshResult = validateMesh(value.boundary);
  const errors = [...meshResult.errors];
  const validation = meshResult.meta ?? {};
  if (value.closed !== true) errors.push('solid is not marked closed');

  if (!validation.closed) errors.push('solid boundary is not watertight');
  if (!validation.manifold) errors.push('solid boundary is not manifold');
  if (!validation.oriented) errors.push('solid boundary orientation is inconsistent');
  if (validation.volume === null || !Number.isFinite(validation.volume) || Math.abs(validation.volume) < EPS) {
    errors.push('solid volume is missing or invalid');
  }
  if (value.closed === true && errors.length) {
    errors.push('solid was marked closed without a passing validation');
  }
  const solidValidation = {
    ...validation,
    tolerance: Number(value.meta?.tolerance ?? 1e-6),
    volumeConsistent: validation.volume !== null && Number.isFinite(validation.volume),
  };
  return result(errors, meshResult.warnings, solidValidation);
}

function result(errors = [], warnings = [], meta = null) {
  return { ok: errors.length === 0, errors, warnings, meta };
}

function faceArea(vertices, face) {
  if (face.length === 3) {
    return triangleArea(vertices[face[0]], vertices[face[1]], vertices[face[2]]);
  }
  let area = 0;
  const a = vertices[face[0]];
  for (let i = 1; i < face.length - 1; i++) {
    area += triangleArea(a, vertices[face[i]], vertices[face[i + 1]]);
  }
  return area;
}

function triangleArea(a, b, c) {
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

function signedMeshVolume(vertices, faces) {
  let volume = 0;
  for (const face of faces) {
    if (!Array.isArray(face) || face.length < 3) continue;
    const a = vertices[face[0]];
    for (let i = 1; i < face.length - 1; i++) {
      const b = vertices[face[i]];
      const c = vertices[face[i + 1]];
      volume += (
        a.x * (b.y * c.z - b.z * c.y)
        - a.y * (b.x * c.z - b.z * c.x)
        + a.z * (b.x * c.y - b.y * c.x)
      ) / 6;
    }
  }
  return volume;
}
