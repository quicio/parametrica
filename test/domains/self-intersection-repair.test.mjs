/**
 * self-intersection-repair.test.mjs — remesh repair, reporting and fabrication.
 */

import { createMesh } from '../../src/geometry/contracts.js';
import { detectSelfIntersections } from '../../src/geometry/selfIntersection.js';
import { repairSelfIntersections } from '../../src/geometry/selfIntersectionRepair.js';
import { validateMesh } from '../../src/geometry/validate.js';
import { buildFabricationReport } from '../../src/application/fabricationSource.js';

const UNITS = { world: 'mm', mmPerWorldUnit: 1, artboard: 'unitless', mmPerArtboardUnit: null };

function cube(offset = 0, id = `cube-${offset}`) {
  const h = 1;
  const vertices = [
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
  ].map(([x, y, z]) => ({ x: x + offset, y, z }));
  const faces = [
    [4, 5, 6], [4, 6, 7], [1, 0, 3], [1, 3, 2], [1, 2, 6], [1, 6, 5],
    [0, 4, 7], [0, 7, 3], [3, 7, 6], [3, 6, 2], [0, 1, 5], [0, 5, 4],
  ];
  return createMesh({ id, vertices, faces });
}

function overlappingCubes() {
  const first = cube(0, 'first');
  const second = cube(1, 'second');
  return createMesh({
    id: 'overlapping',
    vertices: [...first.vertices, ...second.vertices],
    faces: [...first.faces, ...second.faces.map((face) => face.map((index) => index + first.vertices.length))],
  });
}

export function run(assert) {
  const mesh = overlappingCubes();
  const before = JSON.stringify(mesh);
  assert(detectSelfIntersections(mesh).count > 0, 'fixture starts self-intersecting');

  const skipped = repairSelfIntersections(mesh, { strategy: 'none', capStrategy: 'none' });
  assert(skipped.mesh === mesh && skipped.report.selfIntersectionStrategy === 'none', 'none strategy preserves the source');
  assert(skipped.report.selfIntersectionPairs > 0, 'none strategy still reports pairs');

  const repaired = repairSelfIntersections(mesh, { strategy: 'remesh', remeshResolution: 32 });
  assert(repaired.mesh && repaired.validation.ok, 'remesh resolves self-intersections into a valid body');
  assert(repaired.report.selfIntersectionPairs > 0, 'repair reports the detected pairs');
  assert(repaired.report.selfIntersectionStrategy === 'remesh', 'repair reports the actual strategy');
  assert(repaired.report.remeshResolution === 32, 'repair reports the remesh resolution');
  assert(repaired.report.triangleDelta !== null, 'repair reports the triangle delta');
  assert(detectSelfIntersections(repaired.mesh).count === 0, 'repaired body has no self-intersections');
  assert(JSON.stringify(mesh) === before, 'self-intersection repair does not mutate its input');

  const sdf = repairSelfIntersections(mesh, { strategy: 'sdf', remeshResolution: 32 });
  assert(sdf.mesh && sdf.validation.ok, 'Manifold SDF resolves self-intersections');
  assert(sdf.report.selfIntersectionStrategy === 'sdf', 'SDF repair reports the SDF strategy');
  assert(sdf.report.selfIntersectionPairs > 0, 'SDF repair reports detected pairs');
  assert(Number.isFinite(sdf.report.edgeLength), 'SDF repair reports its edge length');
  assert(Math.abs(sdf.validation.meta.volume - 12) < 0.2, 'SDF volume approximates the merged solid');
  assert(detectSelfIntersections(sdf.mesh).count === 0, 'SDF output has no detected self-intersections');

  const auto = repairSelfIntersections(mesh, { strategy: 'auto', remeshResolution: 32 });
  assert(auto.report.selfIntersectionStrategy === 'sdf' && auto.validation.ok, 'auto prefers Manifold SDF when ready');

  const again = repairSelfIntersections(mesh, { strategy: 'remesh', remeshResolution: 32 });
  assert(JSON.stringify(again.mesh) === JSON.stringify(repaired.mesh), 'remesh self-intersection repair is deterministic');

  const clean = cube(0, 'clean');
  const unchanged = repairSelfIntersections(clean, { strategy: 'auto', capStrategy: 'none' });
  assert(unchanged.report.selfIntersectionPairs === 0, 'clean mesh reports zero pairs');
  assert(unchanged.mesh === clean || unchanged.validation.ok, 'clean mesh remains valid without remesh');

  const evaluation = { layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, geometry: [], meshes: [mesh] }] };
  const off = buildFabricationReport({
    evaluation,
    layerIndex: 0,
    units: UNITS,
    preparation: { repair: true, selfIntersections: 'none' },
  });
  assert(off.exportable === false, 'self-intersecting mesh is not exportable without resolution');
  const on = buildFabricationReport({
    evaluation,
    layerIndex: 0,
    units: UNITS,
    preparation: {
      repair: true,
      selfIntersections: 'auto',
      remeshResolution: 32,
      capStrategy: 'auto',
    },
  });
  assert(on.exportable === true, 'self-intersection repair enables fabrication');
  assert(on.repair.selfIntersectionStrategy === 'sdf', 'fabrication report includes the SDF strategy');
  assert(on.repair.selfIntersectionPairs > 0, 'fabrication report includes the pair count');

  const sdfReport = buildFabricationReport({
    evaluation,
    layerIndex: 0,
    units: UNITS,
    preparation: {
      repair: true,
      selfIntersections: 'sdf',
      remeshResolution: 32,
      capStrategy: 'auto',
    },
  });
  assert(sdfReport.exportable === true, 'SDF self-intersection repair enables fabrication');
  assert(sdfReport.repair.selfIntersectionStrategy === 'sdf', 'fabrication report includes the SDF strategy');

  const invalid = repairSelfIntersections(mesh, { strategy: 'remesh', remeshResolution: 16 });
  assert(invalid.validation.ok === true, 'low remesh resolution still validates');
  assert(validateMesh(repaired.mesh).ok, 'repaired output passes the standard mesh gate');
}
