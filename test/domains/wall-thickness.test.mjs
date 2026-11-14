/**
 * wall-thickness.test.mjs — deterministic sample-based wall estimation.
 */

import { measureWallThickness } from '../../src/geometry/wallThickness.ts';
import { buildManufacturingReport } from '../../src/geometry/manufacturingProfile.ts';

function box(minX, minY, minZ, maxX, maxY, maxZ, invert = false) {
  const vertices = [
    { x: minX, y: minY, z: minZ },
    { x: maxX, y: minY, z: minZ },
    { x: maxX, y: maxY, z: minZ },
    { x: minX, y: maxY, z: minZ },
    { x: minX, y: minY, z: maxZ },
    { x: maxX, y: minY, z: maxZ },
    { x: maxX, y: maxY, z: maxZ },
    { x: minX, y: maxY, z: maxZ },
  ];
  let faces = [
    [0, 3, 2], [0, 2, 1],
    [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4],
    [2, 3, 7], [2, 7, 6],
    [0, 4, 7], [0, 7, 3],
    [1, 2, 6], [1, 6, 5],
  ];
  if (invert) faces = faces.map((face) => [...face].reverse());
  return { vertices, faces };
}

function quadBox(minX, minY, minZ, maxX, maxY, maxZ) {
  return {
    vertices: [
      { x: minX, y: minY, z: minZ },
      { x: maxX, y: minY, z: minZ },
      { x: maxX, y: maxY, z: minZ },
      { x: minX, y: maxY, z: minZ },
      { x: minX, y: minY, z: maxZ },
      { x: maxX, y: minY, z: maxZ },
      { x: maxX, y: maxY, z: maxZ },
      { x: minX, y: maxY, z: maxZ },
    ],
    faces: [
      [0, 3, 2, 1],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [2, 3, 7, 6],
      [0, 4, 7, 3],
      [1, 2, 6, 5],
    ],
  };
}

function merge(...meshes) {
  const vertices = [];
  const faces = [];
  for (const mesh of meshes) {
    const offset = vertices.length;
    vertices.push(...mesh.vertices);
    for (const face of mesh.faces) faces.push(face.map((index) => index + offset));
  }
  return { vertices, faces };
}

function closeTo(value, expected, tolerance = 0.05) {
  return typeof value === 'number' && Math.abs(value - expected) <= tolerance;
}

export async function run(assert) {
  const solid = box(0, 0, 0, 10, 10, 10);
  const solidReport = measureWallThickness(solid);
  assert(solidReport?.available === true, 'solid cube has a wall estimate');
  assert(closeTo(solidReport.minMm, 10), 'solid cube reports its material depth');
  assert(closeTo(solidReport.p05Mm, 10), 'solid cube p05 is stable');
  assert(closeTo(solidReport.medianMm, 10), 'solid cube median is stable');
  assert(solidReport.hits === solidReport.samples, 'every solid sample finds a pair');

  const shell = merge(
    box(0, 0, 0, 20, 20, 20),
    box(1, 1, 1, 19, 19, 19, true),
  );
  const shellReport = measureWallThickness(shell);
  assert(shellReport?.available === true, 'hollow shell has a wall estimate');
  assert(closeTo(shellReport.minMm, 1), 'hollow shell reports the one-unit wall');
  assert(closeTo(shellReport.p05Mm, 1), 'hollow shell p05 stays at the wall');
  assert(closeTo(shellReport.medianMm, 1), 'hollow shell median stays at the wall');
  assert(shellReport.triangles === 24, 'shell counts both surfaces');

  const scaled = measureWallThickness(shell, { scale: 2 });
  assert(closeTo(scaled.minMm, 2), 'scale converts world units to millimetres');
  assert(scaled.scale === 2, 'report records the scale');

  const inverted = measureWallThickness({
    vertices: solid.vertices,
    faces: solid.faces.map((face) => [...face].reverse()),
  });
  assert(closeTo(inverted.minMm, 10), 'global winding is corrected before sampling');

  const quads = measureWallThickness(quadBox(0, 0, 0, 10, 10, 10));
  assert(quads?.available === true && closeTo(quads.minMm, 10), 'polygonal faces are triangulated');

  const open = box(0, 0, 0, 10, 10, 10);
  open.faces = open.faces.slice(0, 10);
  const openReport = measureWallThickness(open);
  assert(openReport?.available === false, 'open meshes do not invent a wall');
  assert(String(openReport?.reason).includes('not closed'), 'open meshes explain the gap');

  assert(measureWallThickness(null) === null, 'missing mesh returns null');
  assert(measureWallThickness({ vertices: [], faces: [] }) === null, 'empty mesh returns null');

  const capped = measureWallThickness(solid, { maxTriangles: 4 });
  assert(capped?.available === false, 'oversized meshes report unavailable');
  assert(String(capped?.reason).includes('capped'), 'oversized meshes explain the cap');

  const first = JSON.stringify(measureWallThickness(shell));
  const second = JSON.stringify(measureWallThickness(shell));
  assert(first === second, 'estimation is deterministic');

  const report = buildManufacturingReport({
    profile: { process: 'fdm', minWall: 1.2 },
    wall: shellReport,
  });
  const wall = report.checks.find((check) => check.id === 'wall');
  assert(wall?.source === 'estimated', 'wall evidence is labelled estimated');
  assert(wall?.severity === 'fail', 'wall below the profile minimum fails');
  assert(String(wall?.detail).includes('samples'), 'wall detail states the sample count');

  const passing = buildManufacturingReport({
    profile: { process: 'fdm', minWall: 0.8 },
    wall: solidReport,
  });
  assert(passing.checks.find((check) => check.id === 'wall')?.severity === 'ok', 'wall above the minimum passes');
}
