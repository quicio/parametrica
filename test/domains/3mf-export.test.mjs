/**
 * 3mf-export.test.mjs — package structure, scaling, determinism and rejection.
 */

import { createMesh } from '../../src/geometry/contracts.js';
import { build3MFModelXML, export3MF } from '../../src/export/3mf.js';

const UNITS = { world: 'mm', mmPerWorldUnit: 1, artboard: 'unitless', mmPerArtboardUnit: null };

function cube(offset = 0, id = `cube-${offset}`) {
  const h = 1;
  const vertices = [
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
  ].map(([x, y, z]) => ({ x: x + offset, y, z }));
  const faces = [
    [4, 5, 6], [4, 6, 7],
    [1, 0, 3], [1, 3, 2],
    [1, 2, 6], [1, 6, 5],
    [0, 4, 7], [0, 7, 3],
    [3, 7, 6], [3, 6, 2],
    [0, 1, 5], [0, 5, 4],
  ];
  return createMesh({ id, vertices, faces });
}

function readZipStore(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    entries.set(name, bytes.slice(start, start + size));
    offset = start + size;
  }
  return entries;
}

export function run(assert) {
  const first = cube(0, 'first');
  const second = cube(3, 'second');
  const xml = build3MFModelXML([first, second], { scale: 2, name: 'Two cubes' });
  assert(xml.includes('unit="millimeter"'), 'model declares millimetres');
  assert(xml.includes('<metadata name="Title">Two cubes</metadata>'), 'model includes title metadata');
  assert((xml.match(/<object id=/g) ?? []).length === 2, 'one object per body');
  assert((xml.match(/<item objectid=/g) ?? []).length === 2, 'one build item per body');
  assert(xml.includes('x="-2" y="-2" z="-2"'), 'vertices are scaled in the XML');
  assert(xml.includes('<triangle v1="4" v2="5" v3="6"/>'), 'triangles preserve indices');
  assert(!xml.includes('material'), 'no materials are written');

  const exported = export3MF([first, second], { units: UNITS, name: 'Two cubes' });
  assert(exported.unit === 'millimeter' && exported.objects === 2, 'export reports millimetres and two objects');
  assert(exported.triangles === first.faces.length + second.faces.length, 'export counts all triangles');
  assert(exported.vertices === first.vertices.length + second.vertices.length, 'export counts all vertices');
  const entries = readZipStore(exported.data);
  assert(entries.size === 3, '3MF package has three entries');
  assert(entries.has('[Content_Types].xml') && entries.has('_rels/.rels') && entries.has('3D/3dmodel.model'), 'package contains the required parts');
  const model = new TextDecoder().decode(entries.get('3D/3dmodel.model'));
  assert(model.includes('unit="millimeter"') && model.includes('<build>'), 'package model is usable 3MF');

  const again = export3MF([first, second], { units: UNITS, name: 'Two cubes' });
  assert(Buffer.compare(Buffer.from(exported.data), Buffer.from(again.data)) === 0, '3MF bytes are deterministic');

  const scaled = export3MF([first], { units: { ...UNITS, mmPerWorldUnit: 2 }, name: 'Scaled' });
  assert(scaled.scale === 2, 'explicit world scale is used');
  const scaledXml = new TextDecoder().decode(readZipStore(scaled.data).get('3D/3dmodel.model'));
  assert(scaledXml.includes('x="-2" y="-2" z="-2"'), 'world scale changes exported vertices');

  const open = createMesh({
    id: 'open',
    vertices: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
    faces: [[0, 1, 2]],
  });
  let rejected = false;
  try {
    export3MF([first, open], { units: UNITS });
  } catch (error) {
    rejected = error.code === 'invalid-geometry';
  }
  assert(rejected, 'invalid body rejects the whole package');

  let unitless = false;
  try {
    export3MF([first], { units: { world: 'unitless', mmPerWorldUnit: null } });
  } catch (error) {
    unitless = error.code === 'units-required';
  }
  assert(unitless, 'unitless documents are rejected');

  let empty = false;
  try {
    export3MF([], { units: UNITS });
  } catch (error) {
    empty = error.code === 'empty-geometry';
  }
  assert(empty, 'empty body lists are rejected');
}
