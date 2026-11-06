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
    triangles += mesh.faces.length;
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
    for (const face of mesh.faces) {
      lines.push(`          <triangle v1="${face[0]}" v2="${face[1]}" v3="${face[2]}"/>`);
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
