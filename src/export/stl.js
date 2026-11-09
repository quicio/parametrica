/**
 * export/stl.js — deterministic binary STL for validated world geometry.
 *
 * STL carries no unit field. Callers must declare the physical scale; this
 * module applies it only to the exported vertices and never mutates the source
 * Mesh/Solid. Facet order follows mesh face order and normals follow winding.
 */

import { isMesh, isSolid } from '../geometry/contracts.js';
import { millimetresPerUnit } from '../domain/units.js';
import { validateForFabrication } from './geometryExport.js';

const HEADER_BYTES = 80;
const TRIANGLE_BYTES = 50;
export const STL_MIME_TYPE = 'model/stl';
export const STL_EXTENSION = 'stl';

export class FabricationExportError extends Error {
  constructor(code, message, validation = null) {
    super(message);
    this.name = 'FabricationExportError';
    this.code = code;
    this.validation = validation;
  }
}

/**
 * Export one validated Mesh/Solid as binary STL.
 *
 * @param {object} geometry
 * @param {{units?: object, mmPerWorldUnit?: number, name?: string}} options
 * @returns {{data: Uint8Array, unit: 'mm', scale: number, triangles: number, geometryId: string|null, kind: string, volume: number|null}}
 */
export function exportBinarySTL(geometry, { units = null, mmPerWorldUnit = null, name = 'parametrica' } = {}) {
  const mesh = boundaryMesh(geometry);
  const validation = validateForFabrication(geometry);
  if (!validation.ok) {
    throw new FabricationExportError(
      'invalid-geometry',
      `STL export rejected: ${validation.errors.join('; ')}`,
      validation,
    );
  }

  const scale = resolveMillimetreScale(units, mmPerWorldUnit);
  const triangles = trianglesOf(mesh);
  if (!triangles.length) {
    throw new FabricationExportError('empty-geometry', 'STL export rejected: mesh has no triangles', validation);
  }

  const data = new Uint8Array(HEADER_BYTES + 4 + triangles.length * TRIANGLE_BYTES);
  writeHeader(data, name);
  const view = new DataView(data.buffer);
  view.setUint32(HEADER_BYTES, triangles.length, true);

  let offset = HEADER_BYTES + 4;
  for (const face of triangles) {
    const points = face.map((index) => scalePoint(mesh.vertices[index], scale, index));
    const normal = faceNormal(points[0], points[1], points[2]);
    writeVector(view, offset, normal);
    offset += 12;
    for (const point of points) {
      writeVector(view, offset, point);
      offset += 12;
    }
    view.setUint16(offset, 0, true);
    offset += 2;
  }

  return {
    data,
    unit: 'mm',
    scale,
    triangles: triangles.length,
    geometryId: geometry?.id ?? null,
    kind: geometry?.kind ?? null,
    volume: validation.meta?.volume ?? null,
  };
}

/** GeometryExporter-compatible facade that returns the raw bytes. */
export class BinaryStlExporter {
  constructor() {
    this.id = 'binary-stl';
    this.extension = STL_EXTENSION;
    this.mimeType = STL_MIME_TYPE;
  }

  export(geometry, options = {}) {
    return exportBinarySTL(geometry, options).data;
  }
}

export function resolveMillimetreScale(units, explicit = null) {
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const factor = millimetresPerUnit(units, 'world');
  if (factor === null) {
    throw new FabricationExportError(
      'units-required',
      'STL export requires an explicit physical world scale (mmPerWorldUnit)',
    );
  }
  return factor;
}

function boundaryMesh(geometry) {
  if (isSolid(geometry)) {
    if (!isMesh(geometry.boundary)) {
      throw new FabricationExportError('invalid-geometry', 'STL export rejected: solid boundary is not a Mesh');
    }
    return geometry.boundary;
  }
  if (isMesh(geometry)) return geometry;
  throw new FabricationExportError('invalid-geometry', 'STL export requires a Mesh or Solid');
}

function trianglesOf(mesh) {
  const out = [];
  for (const face of mesh.faces) {
    if (!Array.isArray(face) || face.length < 3) continue;
    for (let i = 1; i < face.length - 1; i++) {
      out.push([face[0], face[i], face[i + 1]]);
    }
  }
  return out;
}

function scalePoint(point, scale, index) {
  const x = Number(point?.x) * scale;
  const y = Number(point?.y) * scale;
  const z = Number(point?.z) * scale;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    throw new FabricationExportError('non-finite', `STL export rejected: non-finite vertex at index ${index}`);
  }
  return { x, y, z };
}

function faceNormal(a, b, c) {
  const abx = b.x - a.x; const aby = b.y - a.y; const abz = b.z - a.z;
  const acx = c.x - a.x; const acy = c.y - a.y; const acz = c.z - a.z;
  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;
  const length = Math.hypot(nx, ny, nz);
  if (!Number.isFinite(length) || length === 0) {
    throw new FabricationExportError('degenerate-triangle', 'STL export rejected: zero-area triangle');
  }
  return { x: nx / length, y: ny / length, z: nz / length };
}

function writeHeader(data, name) {
  const text = `Parametrica binary STL | ${String(name ?? 'parametrica').slice(0, 30)} | millimetres`;
  const bytes = new TextEncoder().encode(text);
  data.set(bytes.slice(0, HEADER_BYTES), 0);
}

function writeVector(view, offset, point) {
  view.setFloat32(offset, point.x, true);
  view.setFloat32(offset + 4, point.y, true);
  view.setFloat32(offset + 8, point.z, true);
}
