/**
 * solid-preparation.test.mjs — weld, boundary, cap, merge and fabrication prep.
 */

import { createMesh } from '../../src/geometry/contracts.js';
import {
  boundaryLoops,
  capMesh,
  mergeMeshes,
  prepareMesh,
  weldMesh,
} from '../../src/geometry/solidPrep.js';
import { validateMesh } from '../../src/geometry/validate.js';
import { createDefaultView, sanitizeDocument, sanitizeFabricationSettings, createDocument } from '../../src/core/document.js';
import { buildFabricationReport } from '../../src/application/fabricationSource.js';

function openQuad() {
  return createMesh({
    id: 'open-quad',
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 1, z: 2 },
      { x: 0, y: 1, z: 1 },
    ],
    faces: [[0, 1, 2], [0, 2, 3]],
  });
}

export function run(assert) {
  const input = openQuad();
  const before = JSON.stringify(input);
  const openValidation = validateMesh(input);
  assert(openValidation.ok === false && openValidation.meta.closed === false, 'open quad starts invalid and open');

  const loops = boundaryLoops(input);
  assert(loops.incomplete === false && loops.loops.length === 1, 'boundary detection finds one complete loop');
  assert(loops.loops[0].length === 4, 'quad boundary has four edges');

  const welded = weldMesh(input, { tolerance: 1e-6 });
  assert(JSON.stringify(input) === before, 'weld does not mutate its input');
  assert(welded.stats.mergedVertices === 0, 'distinct vertices are not welded');
  assert(validateMesh(welded.mesh).errors.join(' ') === openValidation.errors.join(' '), 'weld preserves the open boundary');

  const duplicate = createMesh({
    id: 'duplicate',
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 1, z: 1 },
      { x: 0, y: 0, z: 0 },
    ],
    faces: [[0, 1, 2], [0, 2, 3], [4, 3, 2]],
  });
  const deduped = weldMesh(duplicate, { tolerance: 1e-6 });
  assert(deduped.stats.mergedVertices === 1 && deduped.mesh.vertices.length === 4, 'coincident vertices weld');
  assert(JSON.stringify(duplicate.vertices[4]) === JSON.stringify({ x: 0, y: 0, z: 0 }), 'weld keeps duplicate input intact');

  const capped = capMesh(input, { maxHoleEdges: 16 });
  const cappedValidation = validateMesh(capped.mesh);
  assert(capped.stats.cappedLoops === 1 && capped.stats.addedTriangles === 4, 'quad hole caps with four triangles');
  assert(cappedValidation.ok && cappedValidation.meta.closed && cappedValidation.meta.manifold, 'cap produces a closed manifold');
  assert(cappedValidation.meta.oriented && cappedValidation.meta.volume > 0, 'cap preserves orientation and positive volume');

  const skipped = capMesh(input, { maxHoleEdges: 3 });
  assert(skipped.stats.cappedLoops === 0 && skipped.warnings.some((warning) => warning.includes('skipped')), 'oversized loops are skipped with a warning');

  const prep = prepareMesh(input, { weld: true, cap: true });
  assert(prep.prepared && prep.validation.ok, 'prepare composes weld and cap into a valid body');
  assert(prep.stats.cappedLoops === 1 && prep.validation.meta.closed, 'prepare reports its cap changes');
  const prepAgain = prepareMesh(input, { weld: true, cap: true });
  assert(JSON.stringify(prep.mesh) === JSON.stringify(prepAgain.mesh), 'preparation is deterministic');
  assert(JSON.stringify(input) === before, 'preparation never mutates the source mesh');

  const disabled = prepareMesh(input, { weld: false, cap: false });
  assert(disabled.prepared === false && disabled.mesh === input, 'disabled preparation returns the source unchanged');

  const second = createMesh({
    id: 'second',
    vertices: [
      { x: 10, y: 0, z: 0 }, { x: 11, y: 0, z: 0 }, { x: 10, y: 1, z: 1 },
    ],
    faces: [[0, 1, 2]],
  });
  const merged = mergeMeshes([input, second], { weld: false });
  assert(merged.stats.shells === 2 && merged.mesh.faces.length === 3, 'merge concatenates faces');
  assert(merged.mesh.faces[2][0] === 4, 'merge offsets later face indices');
  assert(merged.mesh.vertices[4].x === 10, 'merge preserves later vertices');

  const view = createDefaultView();
  assert(view.fabrication.weld === false && view.fabrication.cap === false, 'preparation is off by default');
  const sanitized = sanitizeFabricationSettings({ weld: 1, cap: true, tolerance: -2, maxHoleEdges: 99999 });
  assert(sanitized.weld === false && sanitized.cap === true, 'preparation flags require explicit booleans');
  assert(sanitized.tolerance === 1e-4 && sanitized.maxHoleEdges === 4096, 'preparation numeric settings clamp safely');
  const legacy = createDocument('parametric-surface');
  delete legacy.view.fabrication;
  assert(sanitizeDocument(legacy).view.fabrication.weld === false, 'legacy documents sanitize preparation off');

  const evaluation = { layers: [{ id: 'layer-1', name: 'Layer 1', meshes: [input], geometry: [] }] };
  const units = { world: 'mm', mmPerWorldUnit: 1, artboard: 'unitless', mmPerArtboardUnit: null };
  const raw = buildFabricationReport({ evaluation, layerIndex: 0, units });
  assert(raw.exportable === false && raw.candidates.length === 1, 'open mesh is not exportable without preparation');
  const prepared = buildFabricationReport({
    evaluation,
    layerIndex: 0,
    units,
    preparation: { weld: true, cap: true, tolerance: 1e-6, maxHoleEdges: 16 },
  });
  assert(prepared.exportable === true && prepared.prepared === true, 'prepared open mesh becomes exportable');
  assert(prepared.preparation.cappedLoops === 1 && prepared.source.kind === 'mesh', 'report exposes preparation changes');
  assert(JSON.stringify(input) === before, 'fabrication report leaves the source mesh unchanged');
}
