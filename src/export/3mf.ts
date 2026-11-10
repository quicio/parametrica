/** Deterministic minimal 3MF package for validated bodies. */

import { isMesh, isSolid } from '../geometry/contracts.js';
import { zipStore } from './zip.ts';
import { FabricationExportError, resolveMillimetreScale } from './stl.ts';
import { validateForFabrication } from './geometryExport.ts';

export const THREE_MF_MIME_TYPE = 'model/3mf';
export const THREE_MF_EXTENSION = '3mf';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

const RELATIONSHIPS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

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
  meta?: { closed?: boolean; volume?: number | null; [key: string]: unknown } | null;
}
interface ExportOptions {
  units?: unknown;
  mmPerWorldUnit?: number | null;
  name?: string;
  metadata?: Record<string, unknown>;
}

type Vertex = { x: number; y: number; z: number };
type Triangle = number[];

export interface ThreeMfResult {
  data: Uint8Array;
  unit: 'millimeter';
  scale: number;
  objects: number;
  triangles: number;
  vertices: number;
  mimeType: string;
}

export function export3MF(
  bodies: GeometryLike | GeometryLike[],
  { units = null, mmPerWorldUnit = null, name = 'parametrica', metadata = {} }: ExportOptions = {},
): ThreeMfResult {
  const list = (Array.isArray(bodies) ? bodies : [bodies]).filter(Boolean);
  if (!list.length) {
    throw new FabricationExportError('empty-geometry', '3MF export rejected: no bodies supplied');
  }
  const scale = resolveMillimetreScale(units, mmPerWorldUnit);
  let triangles = 0;
  let vertices = 0;
  const prepared: MeshLike[] = list.map((geometry, index) => {
    const mesh = boundaryMesh(geometry);
    const validation = validateForFabrication(geometry) as ValidationLike;
    if (!validation.ok || !validation.meta?.closed) {
      throw new FabricationExportError(
        'invalid-geometry',
        `3MF export rejected: body ${index + 1}: ${validation.errors[0] ?? 'not a closed solid'}`,
        validation,
      );
    }
    triangles += countMeshTriangles(mesh, index);
    vertices += (mesh.vertices ?? []).length;
    return mesh;
  });

  const model = build3MFModelXML(prepared, { scale, name, metadata });
  const encoder = new TextEncoder();
  const data = zipStore([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: encoder.encode(RELATIONSHIPS) },
    { name: '3D/3dmodel.model', data: encoder.encode(model) },
  ]);
  return {
    data,
    unit: 'millimeter',
    scale,
    objects: prepared.length,
    triangles,
    vertices,
    mimeType: THREE_MF_MIME_TYPE,
  };
}

/** Pure XML builder, exported for deterministic tests. */
export function build3MFModelXML(
  meshes: ReadonlyArray<MeshLike>,
  { scale = 1, name = 'parametrica', metadata = {} }: { scale?: number; name?: string; metadata?: Record<string, unknown> } = {},
): string {
  const title = metadata.title ?? name;
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">',
    `  <metadata name="Title">${escapeXml(String(title))}</metadata>`,
    '  <resources>',
  ];
  meshes.forEach((mesh, index) => {
    const objectId = index + 1;
    const vertices = mesh.vertices ?? [];
    const faces = mesh.faces ?? [];
    lines.push(`    <object id="${objectId}" type="model">`);
    lines.push('      <mesh>');
    lines.push('        <vertices>');
    for (const vertex of vertices) {
      lines.push(`          <vertex x="${fmt(Number(vertex.x) * scale)}" y="${fmt(Number(vertex.y) * scale)}" z="${fmt(Number(vertex.z) * scale)}"/>`);
    }
    lines.push('        </vertices>');
    lines.push('        <triangles>');
    for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
      const triangles = triangulateFace(faces[faceIndex], vertices);
      if (!triangles) {
        throw new FabricationExportError(
          'invalid-face',
          `3MF export rejected: body ${index + 1} face ${faceIndex} cannot be triangulated`,
        );
      }
      for (const triangle of triangles) {
        lines.push(`          <triangle v1="${triangle[0]}" v2="${triangle[1]}" v3="${triangle[2]}"/>`);
      }
    }
    lines.push('        </triangles>');
    lines.push('      </mesh>');
    lines.push('    </object>');
  });
  lines.push('  </resources>');
  lines.push('  <build>');
  meshes.forEach((_, index) => {
    lines.push(`    <item objectid="${index + 1}"/>`);
  });
  lines.push('  </build>');
  lines.push('</model>');
  return `${lines.join('\n')}\n`;
}

function boundaryMesh(geometry: GeometryLike): MeshLike {
  if (isSolid(geometry)) {
    if (!isMesh(geometry.boundary)) {
      throw new FabricationExportError('invalid-geometry', '3MF export rejected: solid boundary is not a Mesh');
    }
    return geometry.boundary as MeshLike;
  }
  if (isMesh(geometry)) return geometry as MeshLike;
  throw new FabricationExportError('invalid-geometry', '3MF export requires Mesh or Solid values');
}

function countMeshTriangles(mesh: MeshLike, index: number): number {
  let count = 0;
  const faces = mesh.faces ?? [];
  const vertices = mesh.vertices ?? [];
  for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
    const triangles = triangulateFace(faces[faceIndex], vertices);
    if (!triangles) {
      throw new FabricationExportError(
        'invalid-face',
        `3MF export rejected: body ${index + 1} face ${faceIndex} cannot be triangulated`,
      );
    }
    count += triangles.length;
  }
  return count;
}

/**
 * Deterministic face triangulation for 3MF. Triangles pass through, quads use
 * the shorter diagonal (stable tie-break), and larger simple polygons use ear
 * clipping in their best-fit plane.
 */
export function triangulateFace(face: unknown, vertices: ReadonlyArray<VectorLike>): Triangle[] | null {
  if (!Array.isArray(face) || face.length < 3) return null;
  if (new Set(face).size !== face.length) return null;
  if (face.length === 3) return [[face[0], face[1], face[2]] as number[]];
  if (face.length === 4) {
    const a = vertices[face[0]];
    const b = vertices[face[1]];
    const c = vertices[face[2]];
    const d = vertices[face[3]];
    if (!a || !b || !c || !d) return null;
    const diagonal02 = distance(a, c);
    const diagonal13 = distance(b, d);
    return diagonal02 <= diagonal13
      ? [[face[0], face[1], face[2]] as number[], [face[0], face[2], face[3]] as number[]]
      : [[face[0], face[1], face[3]] as number[], [face[1], face[2], face[3]] as number[]];
  }
  return earClipFace(face, vertices);
}

function earClipFace(face: unknown[], vertices: ReadonlyArray<VectorLike>): Triangle[] | null {
  const points: Array<Vertex | undefined> = face.map((index) => {
    const vertex = vertices[index as number];
    if (!vertex) return undefined;
    return { x: Number(vertex.x), y: Number(vertex.y), z: Number(vertex.z) };
  });
  if (points.some((point) => !point)) return null;
  const normal = newellNormal(points as Vertex[]);
  if (!normal) return null;
  const axis = Math.abs(normal.x) > Math.abs(normal.y)
    ? (Math.abs(normal.x) > Math.abs(normal.z) ? 'x' : 'z')
    : (Math.abs(normal.y) > Math.abs(normal.z) ? 'y' : 'z');
  const projected = (points as Vertex[]).map((point) => {
    if (axis === 'x') return [point.y, point.z];
    if (axis === 'y') return [point.z, point.x];
    return [point.x, point.y];
  });
  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const a = projected[i] as [number, number];
    const b = projected[(i + 1) % projected.length] as [number, number];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const orientation = Math.sign(area);
  if (!orientation) return null;
  const remaining = projected.map((_, index) => index);
  const triangles: Triangle[] = [];
  let guard = projected.length * projected.length + 8;
  while (remaining.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let i = 0; i < remaining.length; i++) {
      const prev = remaining[(i + remaining.length - 1) % remaining.length] as number;
      const current = remaining[i] as number;
      const next = remaining[(i + 1) % remaining.length] as number;
      const prevPoint = projected[prev] as [number, number];
      const currentPoint = projected[current] as [number, number];
      const nextPoint = projected[next] as [number, number];
      if (cross2(prevPoint, currentPoint, nextPoint) * orientation <= 1e-10) continue;
      let contains = false;
      for (const other of remaining) {
        if (other === prev || other === current || other === next) continue;
        if (pointInTriangle(projected[other] as [number, number], prevPoint, currentPoint, nextPoint, orientation)) {
          contains = true;
          break;
        }
      }
      if (contains) continue;
      triangles.push([face[prev], face[current], face[next]] as number[]);
      remaining.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) return null;
  }
  if (remaining.length === 3) {
    triangles.push([face[remaining[0] as number], face[remaining[1] as number], face[remaining[2] as number]] as number[]);
  }
  return triangles;
}

function newellNormal(points: ReadonlyArray<Vertex>): Vertex | null {
  let x = 0; let y = 0; let z = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i] as Vertex;
    const b = points[(i + 1) % points.length] as Vertex;
    x += (a.y - b.y) * (a.z + b.z);
    y += (a.z - b.z) * (a.x + b.x);
    z += (a.x - b.x) * (a.y + b.y);
  }
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length < 1e-12) return null;
  return { x: x / length, y: y / length, z: z / length };
}

function cross2(a: ReadonlyArray<number>, b: ReadonlyArray<number>, c: ReadonlyArray<number>): number {
  return ((b[0] ?? 0) - (a[0] ?? 0)) * ((c[1] ?? 0) - (a[1] ?? 0))
    - ((b[1] ?? 0) - (a[1] ?? 0)) * ((c[0] ?? 0) - (a[0] ?? 0));
}

function pointInTriangle(
  point: ReadonlyArray<number>,
  a: ReadonlyArray<number>,
  b: ReadonlyArray<number>,
  c: ReadonlyArray<number>,
  orientation: number,
): boolean {
  return cross2(a, b, point) * orientation >= -1e-10
    && cross2(b, c, point) * orientation >= -1e-10
    && cross2(c, a, point) * orientation >= -1e-10;
}

function distance(a: VectorLike, b: VectorLike): number {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y), Number(a.z) - Number(b.z));
}

function fmt(value: number): string {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new FabricationExportError('non-finite', '3MF export rejected: non-finite vertex');
  }
  const fixed = number.toFixed(6);
  return fixed.replace(/\.?0+$/, '') || '0';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
