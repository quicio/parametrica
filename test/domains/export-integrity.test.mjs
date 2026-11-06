/**
 * export-integrity.test.mjs — 3MF triangulation and trust-flag lifecycle.
 */

import { createMesh } from '../../src/geometry/contracts.js';
import { repairMesh } from '../../src/geometry/repair.js';
import { prepareMesh } from '../../src/geometry/solidPrep.js';
import { triangulateFace } from '../../src/export/3mf.js';

function triangleCube(meta = {}) {
  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ].map(([x, y, z]) => ({ x, y, z }));
  const faces = [
    [4, 5, 6], [4, 6, 7], [1, 0, 3], [1, 3, 2],
    [1, 2, 6], [1, 6, 5], [0, 4, 7], [0, 7, 3],
    [3, 7, 6], [3, 6, 2], [0, 1, 5], [0, 5, 4],
  ];
  return createMesh({ id: 'trust-cube', vertices, faces, meta });
}

export async function run(assert) {
  const vertices = [
    { x: 0, y: 0, z: 0 },
    { x: 2, y: 0, z: 0 },
    { x: 2, y: 2, z: 0 },
    { x: 0, y: 2, z: 0 },
  ];
  const quad = triangulateFace([0, 1, 2, 3], vertices);
  assert(quad?.length === 2, 'a quad triangulates into two faces');
  assert(quad[0][0] === 0 && quad[1][0] === 0, 'quad triangulation is deterministic');
  const degenerate = triangulateFace([0, 0, 0, 0], vertices);
  assert(degenerate === null, 'degenerate faces are rejected');

  const trusted = triangleCube({ manifoldGuaranteed: true });
  trusted.faces.push([...trusted.faces[0]]);
  const repaired = repairMesh(trusted);
  assert(repaired.mesh?.meta?.manifoldGuaranteed !== true, 'repair clears inherited manifold trust');

  const prepared = prepareMesh(triangleCube({ manifoldGuaranteed: true }), { weld: true, cap: false });
  assert(prepared.mesh?.meta?.manifoldGuaranteed !== true, 'weld preparation clears inherited manifold trust');
}
