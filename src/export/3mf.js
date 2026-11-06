/**
 * export/3mf.js — deterministic minimal 3MF package for validated bodies.
 *
 * One 3MF object is emitted per body. The package is an OPC ZIP with fixed
 * timestamps and stable XML ordering; no materials, colors or extensions.
 */

import { isMesh, isSolid } from '../geometry/contracts.js';
import { zipStore } from './zip.js';
import { FabricationExportError, resolveMillimetreScale } from './stl.js';
import { validateForFabrication } from './geometryExport.js';

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

/**
 * @param {Array<object>|object} bodies Mesh/Solid or array of Mesh/Solid
 * @param {{units?:object,mmPerWorldUnit?:number,name?:string,metadata?:object}} options
 */
export function export3MF(bodies, { units = null, mmPerWorldUnit = null, name = 'parametrica', metadata = {} } = {}) {
  const list = (Array.isArray(bodies) ? bodies : [bodies]).filter(Boolean);
  if (!list.length) {
    throw new FabricationExportError('empty-geometry', '3MF export rejected: no bodies supplied');
  }
  const scale = resolveMillimetreScale(units, mmPerWorldUnit);
  let triangles = 0;
  let vertices = 0;
  const prepared = list.map((geometry, index) => {
    const mesh = boundaryMesh(geometry);
    const validation = validateForFabrication(geometry);
    if (!validation.ok || !validation.meta?.closed) {
      throw new FabricationExportError(
        'invalid-geometry',
        `3MF export rejected: body ${index + 1}: ${validation.errors[0] ?? 'not a closed solid'}`,
        validation,
      );
    }
    triangles += countMeshTriangles(mesh, index);
    vertices += mesh.vertices.length;
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
export function build3MFModelXML(meshes, { scale = 1, name = 'parametrica', metadata = {} } = {}) {
  const title = metadata.title ?? name;
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">',
    `  <metadata name="Title">${escapeXml(String(title))}</metadata>`,
    '  <resources>',
  ];
  meshes.forEach((mesh, index) => {
    const objectId = index + 1;
    lines.push(`    <object id="${objectId}" type="model">`);
    lines.push('      <mesh>');
    lines.push('        <vertices>');
    for (const vertex of mesh.vertices) {
      lines.push(`          <vertex x="${fmt(vertex.x * scale)}" y="${fmt(vertex.y * scale)}" z="${fmt(vertex.z * scale)}"/>`);
    }
    lines.push('        </vertices>');
    lines.push('        <triangles>');
    for (let faceIndex = 0; faceIndex < mesh.faces.length; faceIndex++) {
      const triangles = triangulateFace(mesh.faces[faceIndex], mesh.vertices);
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

function boundaryMesh(geometry) {
  if (isSolid(geometry)) {
    if (!isMesh(geometry.boundary)) {
      throw new FabricationExportError('invalid-geometry', '3MF export rejected: solid boundary is not a Mesh');
    }
    return geometry.boundary;
  }
  if (isMesh(geometry)) return geometry;
  throw new FabricationExportError('invalid-geometry', '3MF export requires Mesh or Solid values');
}

function countMeshTriangles(mesh, index) {
  let count = 0;
  for (let faceIndex = 0; faceIndex < mesh.faces.length; faceIndex++) {
    const triangles = triangulateFace(mesh.faces[faceIndex], mesh.vertices);
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
export function triangulateFace(face, vertices) {
  if (!Array.isArray(face) || face.length < 3) return null;
  if (new Set(face).size !== face.length) return null;
  if (face.length === 3) return [[face[0], face[1], face[2]]];
  if (face.length === 4) {
    const a = vertices[face[0]];
    const b = vertices[face[1]];
    const c = vertices[face[2]];
    const d = vertices[face[3]];
    if (!a || !b || !c || !d) return null;
    const diagonal02 = distance(a, c);
    const diagonal13 = distance(b, d);
    return diagonal02 <= diagonal13
      ? [[face[0], face[1], face[2]], [face[0], face[2], face[3]]]
      : [[face[0], face[1], face[3]], [face[1], face[2], face[3]]];
  }
  return earClipFace(face, vertices);
}

function earClipFace(face, vertices) {
  const points = face.map((index) => vertices[index]);
  if (points.some((point) => !point)) return null;
  const normal = newellNormal(points);
  if (!normal) return null;
  const axis = Math.abs(normal.x) > Math.abs(normal.y)
    ? (Math.abs(normal.x) > Math.abs(normal.z) ? 'x' : 'z')
    : (Math.abs(normal.y) > Math.abs(normal.z) ? 'y' : 'z');
  const projected = points.map((point) => {
    if (axis === 'x') return [point.y, point.z];
    if (axis === 'y') return [point.z, point.x];
    return [point.x, point.y];
  });
  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const a = projected[i];
    const b = projected[(i + 1) % projected.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const orientation = Math.sign(area);
  if (!orientation) return null;
  const remaining = projected.map((_, index) => index);
  const triangles = [];
  let guard = projected.length * projected.length + 8;
  while (remaining.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let i = 0; i < remaining.length; i++) {
      const prev = remaining[(i + remaining.length - 1) % remaining.length];
      const current = remaining[i];
      const next = remaining[(i + 1) % remaining.length];
      if (cross2(projected[prev], projected[current], projected[next]) * orientation <= 1e-10) continue;
      let contains = false;
      for (const other of remaining) {
        if (other === prev || other === current || other === next) continue;
        if (pointInTriangle(projected[other], projected[prev], projected[current], projected[next], orientation)) {
          contains = true;
          break;
        }
      }
      if (contains) continue;
      triangles.push([face[prev], face[current], face[next]]);
      remaining.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) return null;
  }
  if (remaining.length === 3) {
    triangles.push([face[remaining[0]], face[remaining[1]], face[remaining[2]]]);
  }
  return triangles;
}

function newellNormal(points) {
  let x = 0; let y = 0; let z = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    x += (a.y - b.y) * (a.z + b.z);
    y += (a.z - b.z) * (a.x + b.x);
    z += (a.x - b.x) * (a.y + b.y);
  }
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length < 1e-12) return null;
  return { x: x / length, y: y / length, z: z / length };
}

function cross2(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function pointInTriangle(point, a, b, c, orientation) {
  return cross2(a, b, point) * orientation >= -1e-10
    && cross2(b, c, point) * orientation >= -1e-10
    && cross2(c, a, point) * orientation >= -1e-10;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function fmt(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new FabricationExportError('non-finite', '3MF export rejected: non-finite vertex');
  }
  const fixed = number.toFixed(6);
  return fixed.replace(/\.?0+$/, '') || '0';
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
