/**
 * advanced-repair.test.mjs — orientation, cleanup, caps and repair reports.
 */

import { createMesh } from '../../src/geometry/contracts.ts';
import { repairMesh, repairOrientation, capWithStrategy } from '../../src/geometry/repair.ts';
import { validateMesh } from '../../src/geometry/validate.ts';
import { buildFabricationReport } from '../../src/application/fabricationSource.ts';
import { sanitizeFabricationSettings } from '../../src/core/document.ts';
import { exportBinarySTL } from '../../src/export/stl.ts';

function cube(offset = 0, size = 2, id = `cube-${offset}`) {
  const h = size / 2;
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

function reversedFaces(mesh) {
  return mesh.faces.map((face) => [...face].reverse());
}

function meshFrom(vertices, faces, id = 'test') {
  return createMesh({ id, vertices, faces });
}

export function run(assert) {
  const clean = cube(0);
  const cleanBefore = JSON.stringify(clean);
  const noChange = repairMesh(clean);
  assert(noChange.mesh === clean, 'repair returns the input when nothing changes');
  assert(noChange.report.changed === false, 'clean mesh reports no change');
  assert(noChange.validation.ok, 'clean mesh stays valid');

  const inconsistent = meshFrom(clean.vertices, clean.faces.map((face, index) => (
    index % 2 ? [...face].reverse() : face
  )));
  const inconsistentBefore = JSON.stringify(inconsistent);
  const repairedInconsistent = repairMesh(inconsistent);
  assert(repairedInconsistent.validation.ok, 'orientation-inconsistent cube repairs to a valid mesh');
  assert(Math.abs(repairedInconsistent.validation.meta.volume - 8) < 1e-6, 'repaired cube volume is 8');
  assert(repairedInconsistent.report.flippedFaces > 0, 'repair counts flipped faces');
  assert(JSON.stringify(inconsistent) === inconsistentBefore, 'orientation repair never mutates the input');

  const inverted = meshFrom(clean.vertices, reversedFaces(clean));
  const repairedInverted = repairMesh(inverted);
  assert(repairedInverted.validation.ok && repairedInverted.validation.meta.volume > 0, 'inverted shell is flipped to positive volume');
  assert(repairedInverted.report.flippedShells === 1, 'shell flip is reported');

  const first = cube(0, 2, 'first');
  const second = cube(3, 2, 'second');
  const twoShells = meshFrom(
    [...first.vertices, ...second.vertices],
    [...first.faces, ...reversedFaces(second).map((face) => face.map((index) => index + first.vertices.length))],
    'two-shells',
  );
  const repairedTwo = repairMesh(twoShells);
  assert(repairedTwo.validation.ok, 'one inverted shell among two repairs cleanly');
  assert(Math.abs(repairedTwo.validation.meta.volume - 16) < 1e-6, 'two repaired shells keep total volume');
  assert(repairedTwo.report.flippedShells === 1, 'only the inverted shell is flipped');

  const openTop = meshFrom(clean.vertices, clean.faces.slice(2), 'open-top');
  assert(validateMesh(openTop).ok === false, 'open box starts invalid');
  const planar = repairMesh(openTop, { capStrategy: 'planar' });
  assert(planar.validation.ok && planar.validation.meta.closed, 'planar cap closes the box');
  assert(Math.abs(planar.validation.meta.volume - 8) < 1e-6, 'planar cap keeps cube volume');
  assert(planar.report.planarCaps === 1 && planar.report.fanCaps === 0, 'planar strategy uses ear clipping');
  assert(planar.mesh.vertices.length === clean.vertices.length, 'planar cap adds no centroid vertex');

  const auto = repairMesh(openTop, { capStrategy: 'auto' });
  assert(auto.validation.ok && auto.report.planarCaps === 1, 'auto uses planar for a planar loop');

  const fan = repairMesh(openTop, { capStrategy: 'fan' });
  assert(fan.validation.ok && fan.report.fanCaps === 1, 'fan strategy uses a centroid fan');
  assert(fan.mesh.vertices.length === clean.vertices.length + 1, 'fan cap adds one centroid vertex');

  const oversized = repairMesh(openTop, { capStrategy: 'planar', maxHoleEdges: 3 });
  assert(oversized.validation.ok === false, 'oversized loop cannot be capped');
  assert(oversized.report.skippedLoops === 1, 'oversized loop is reported');
  assert(oversized.report.errors.some((error) => error.includes('open boundary')), 'remaining open boundary is reported');

  const duplicate = meshFrom(clean.vertices, [...clean.faces, clean.faces[0]], 'duplicate');
  const repairedDuplicate = repairMesh(duplicate);
  assert(repairedDuplicate.report.removedDuplicateFaces >= 1, 'duplicate face is removed');
  assert(repairedDuplicate.validation.ok, 'duplicate cleanup leaves a valid cube');

  const opposite = meshFrom(clean.vertices, [...clean.faces, [...clean.faces[0]].reverse()], 'opposite');
  const repairedOpposite = repairMesh(opposite);
  assert(repairedOpposite.report.removedDuplicateFaces >= 2, 'opposite duplicate pair is cancelled');
  assert(repairedOpposite.validation.ok, 'opposite cleanup leaves a valid cube');

  const degenerate = meshFrom(clean.vertices, [...clean.faces, [0, 0, 1]], 'degenerate');
  const repairedDegenerate = repairMesh(degenerate);
  assert(repairedDegenerate.report.removedInvalidFaces >= 1, 'repeated-vertex face is removed');
  assert(repairedDegenerate.validation.ok, 'degenerate cleanup leaves a valid cube');

  const welded = meshFrom(
    [...clean.vertices, { ...clean.vertices[0] }],
    [...clean.faces, ...clean.faces.map((face) => face.map((index) => index === 0 ? 8 : index))],
    'welded',
  );
  const repairedWelded = repairMesh(welded);
  assert(repairedWelded.report.weldedVertices >= 1, 'coincident vertices are welded');
  assert(repairedWelded.validation.ok, 'welded mesh remains valid');
  assert(Math.abs(repairedWelded.validation.meta.volume - 8) < 1e-6, 'weld does not change volume');

  const repairedAgain = repairMesh(inconsistent);
  assert(JSON.stringify(repairedAgain.mesh) === JSON.stringify(repairedInconsistent.mesh), 'repair is deterministic');

  const openComments = repairOrientation(openTop);
  assert(openComments.report.orientationContradictions === 0, 'open but consistent mesh has no orientation contradiction');

  const nonPlanarVertices = [
    { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 2, y: 2, z: 0.5 },
    { x: 0, y: 2, z: 0.2 }, { x: 1, y: 1, z: -1 },
  ];
  const nonPlanar = meshFrom(nonPlanarVertices, [
    [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4],
  ], 'non-planar');
  const nonPlanarAuto = repairMesh(nonPlanar, { capStrategy: 'auto' });
  assert(nonPlanarAuto.report.cappedLoops === 1, 'auto caps a non-planar hole');
  assert(nonPlanarAuto.report.fanCaps === 1, 'auto uses fan for a non-planar hole');

  const planarOnNonPlanar = capWithStrategy(nonPlanar, { strategy: 'planar' });
  assert(planarOnNonPlanar.report.cappedLoops === 1, 'planar strategy still caps or falls back');
  assert(planarOnNonPlanar.report.fallbackCaps + planarOnNonPlanar.report.planarCaps === 1, 'planar or fallback is reported for a non-planar hole');

  assert(cleanBefore === JSON.stringify(clean), 'repair never mutates a clean input');

  const units = { world: 'mm', mmPerWorldUnit: 1, artboard: 'unitless', mmPerArtboardUnit: null };
  const openEvaluation = { layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, geometry: [], meshes: [openTop] }] };
  const withoutRepair = buildFabricationReport({
    evaluation: openEvaluation,
    layerIndex: 0,
    units,
    preparation: { repair: false, weld: false, cap: false },
  });
  assert(withoutRepair.exportable === false, 'open mesh remains blocked without repair');
  assert(withoutRepair.repair === null, 'repair report is absent when disabled');

  const withRepair = buildFabricationReport({
    evaluation: openEvaluation,
    layerIndex: 0,
    units,
    preparation: { repair: true, capStrategy: 'planar' },
  });
  assert(withRepair.exportable === true, 'repair closes an open box for fabrication');
  assert(withRepair.repair?.planarCaps === 1, 'fabrication repair reports the planar cap');
  assert(Math.abs(withRepair.volume - 8) < 1e-6, 'repaired fabrication volume is 8');
  const stl = exportBinarySTL(withRepair.source.geometry, { units });
  assert(stl.triangles > 0 && stl.data.length === 84 + stl.triangles * 50, 'repaired mesh exports valid STL');

  const inconsistentEvaluation = { layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, geometry: [], meshes: [inconsistent] }] };
  const orientationReport = buildFabricationReport({
    evaluation: inconsistentEvaluation,
    layerIndex: 0,
    units,
    preparation: { repair: true, capStrategy: 'auto' },
  });
  assert(orientationReport.exportable === true, 'orientation repair enables fabrication');
  assert(orientationReport.repair.flippedFaces > 0, 'fabrication reports flipped faces');
  assert(Math.abs(orientationReport.volume - 8) < 1e-6, 'orientation repair restores positive volume');

  assert(sanitizeFabricationSettings({}).repair === false, 'repair defaults to off');
  assert(sanitizeFabricationSettings({}).capStrategy === 'auto', 'cap strategy defaults to auto');
  assert(sanitizeFabricationSettings({ repair: true, capStrategy: 'planar' }).capStrategy === 'planar', 'cap strategy sanitizes');
  assert(sanitizeFabricationSettings({ capStrategy: 'nonsense' }).capStrategy === 'auto', 'unknown cap strategy falls back to auto');
}
