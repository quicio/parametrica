/**
 * print-checks.test.mjs — heuristic overhang, bed contact and feature checks.
 */

import { createMesh } from '../../src/geometry/contracts.js';
import { analyzePrintability } from '../../src/geometry/printChecks.js';

const MM = { world: 'mm', mmPerWorldUnit: 1 };

export async function run(assert) {
  const vertices = [];
  for (const x of [0, 10]) {
    for (const y of [0, 10]) {
      for (const z of [0, 10]) vertices.push({ x, y, z });
    }
  }
  const cube = createMesh({
    id: 'cube',
    vertices,
    faces: [
      [0, 1, 3, 2], [4, 6, 7, 5],
      [0, 2, 6, 4], [1, 5, 7, 3],
      [0, 4, 5, 1], [2, 3, 7, 6],
    ],
  });
  const cubeCheck = analyzePrintability(cube, { units: MM });
  assert(cubeCheck.status === 'ok', 'a cube on the bed has no print warnings');
  assert(cubeCheck.overhangRatio === 0, 'the cube bed face is not counted as an overhang');
  assert(Math.abs(cubeCheck.bedContactAreaMm2 - 100) < 1e-6, 'cube bed contact is 100 mm²');
  assert(Math.abs(cubeCheck.totalAreaMm2 - 600) < 1e-6, 'cube total surface is 600 mm²');

  const overhang = createMesh({
    id: 'overhang',
    vertices: [
      { x: 0, y: 0, z: 10 },
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 10, z: 10 },
      { x: 0, y: 0, z: 0 },
    ],
    faces: [[0, 2, 1]],
  });
  const overhangCheck = analyzePrintability(overhang, { units: MM });
  assert(overhangCheck.overhangRatio === 1, 'a down-facing face away from the bed is an overhang');
  assert(overhangCheck.status === 'warning', 'overhang warnings are surfaced');

  const thin = analyzePrintability(cube, { units: MM, minFeature: 1 });
  assert(thin.minFeatureMm === 1, 'minimum feature is reported in millimetres');
  assert(thin.warnings.some((warning) => warning.includes('below 2 mm')), 'thin features warn');
}
