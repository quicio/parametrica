/** Deterministic binary STL for validated world geometry. */

import { isMesh, isSolid } from '../geometry/contracts.ts';
import { millimetresPerUnit } from '../domain/units.ts';
import { validateForFabrication } from './geometryExport.ts';

const HEADER_BYTES = 80;
const TRIANGLE_BYTES = 50;
export const STL_MIME_TYPE = 'model/stl';
export const STL_EXTENSION = 'stl';

interface VectorLike { x?: unknown; y?: unknown; z?: unknown; [key: string]: unknown }
interface MeshLike {
  kind?: string;
  id?: unknown;
  vertices?: VectorLike[];
  faces?: unknown[];
  [key: string]: unknown;
}
interface SolidLike {
  kind?: string;
  id?: unknown;
  boundary?: unknown;
  [key: string]: unknown;
}
type GeometryLike = MeshLike | SolidLike;
interface ValidationLike {
  ok: boolean;
  errors: string[];
  warnings: string[];
  meta?: { volume?: number | null; [key: string]: unknown } | null;
}
interface ScaleOptions {
  units?: unknown;
  mmPerWorldUnit?: number | null;
  name?: string;
}
interface Normal {
  x: number;
  y: number;
  z: number;
}

type Triangle = [unknown, unknown, unknown];

export class FabricationExportError extends Error {
  code: string;
  validation: ValidationLike | null;

  constructor(code: string, message: string, validation: ValidationLike | null = null) {
    super(message);
    this.name = 'FabricationExportError';
    this.code = code;
    this.validation = validation;
  }
}

export interface BinaryStlResult {
  data: Uint8Array;
  unit: 'mm';
  scale: number;
  triangles: number;
  geometryId: string | null;
  kind: string | null;
  volume: number | null;
}

export function exportBinarySTL(
  geometry: GeometryLike,
  { units = null, mmPerWorldUnit = null, name = 'parametrica' }: ScaleOptions = {},
): BinaryStlResult {
  const mesh = boundaryMesh(geometry);
  const validation = validateForFabrication(geometry) as ValidationLike;
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

  const vertices = mesh.vertices ?? [];
  let offset = HEADER_BYTES + 4;
  for (const face of triangles) {
    const points = face.map((index) => scalePoint(vertices[Number(index)], scale, Number(index)));
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
    geometryId: typeof geometry.id === 'string' ? geometry.id : null,
    kind: typeof geometry.kind === 'string' ? geometry.kind : null,
    volume: validation.meta?.volume ?? null,
  };
}

/** GeometryExporter-compatible facade that returns the raw bytes. */
export class BinaryStlExporter {
  id: string;
  extension: string;
  mimeType: string;

  constructor() {
    this.id = 'binary-stl';
    this.extension = STL_EXTENSION;
    this.mimeType = STL_MIME_TYPE;
  }

  export(geometry: GeometryLike, options: ScaleOptions = {}): Uint8Array {
    return exportBinarySTL(geometry, options).data;
  }
}

export function resolveMillimetreScale(units: unknown, explicit: number | null = null): number {
  if (Number.isFinite(explicit) && (explicit as number) > 0) return explicit as number;
  const factor = millimetresPerUnit(units, 'world');
  if (factor === null) {
    throw new FabricationExportError(
      'units-required',
      'STL export requires an explicit physical world scale (mmPerWorldUnit)',
    );
  }
  return factor;
}

function boundaryMesh(geometry: GeometryLike): MeshLike {
  if (isSolid(geometry)) {
    if (!isMesh(geometry.boundary)) {
      throw new FabricationExportError('invalid-geometry', 'STL export rejected: solid boundary is not a Mesh');
    }
    return geometry.boundary as MeshLike;
  }
  if (isMesh(geometry)) return geometry as MeshLike;
  throw new FabricationExportError('invalid-geometry', 'STL export requires a Mesh or Solid');
}

function trianglesOf(mesh: MeshLike): Triangle[] {
  const out: Triangle[] = [];
  for (const face of mesh.faces ?? []) {
    if (!Array.isArray(face) || face.length < 3) continue;
    for (let i = 1; i < face.length - 1; i++) {
      out.push([face[0], face[i], face[i + 1]]);
    }
  }
  return out;
}

function scalePoint(point: VectorLike | undefined, scale: number, index: number): Normal {
  const x = Number(point?.x) * scale;
  const y = Number(point?.y) * scale;
  const z = Number(point?.z) * scale;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    throw new FabricationExportError('non-finite', `STL export rejected: non-finite vertex at index ${index}`);
  }
  return { x, y, z };
}

function faceNormal(a: Normal | undefined, b: Normal | undefined, c: Normal | undefined): Normal {
  if (!a || !b || !c) {
    throw new FabricationExportError('degenerate-triangle', 'STL export rejected: zero-area triangle');
  }
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

function writeHeader(data: Uint8Array, name: string): void {
  const text = `Parametrica binary STL | ${String(name ?? 'parametrica').slice(0, 30)} | millimetres`;
  const bytes = new TextEncoder().encode(text);
  data.set(bytes.slice(0, HEADER_BYTES), 0);
}

function writeVector(view: DataView, offset: number, point: Normal): void {
  view.setFloat32(offset, point.x, true);
  view.setFloat32(offset + 4, point.y, true);
  view.setFloat32(offset + 8, point.z, true);
}
