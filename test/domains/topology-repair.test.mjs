/**
 * topology-repair.test.mjs — non-manifold splitting and non-orientable handling.
 */

import { createMesh } from '../../src/geometry/contracts.ts';
import { repairTopology } from '../../src/geometry/topologyRepair.ts';
import { repairMesh } from '../../src/geometry/repair.ts';
import { validateMesh } from '../../src/geometry/validate.ts';

function tetraFaces(a, b, c, d) {
  return [[a, c, b], [a, b, d], [b, c, d], [a, d, c]];
}

function sharedEdgeTetrahedra() {
  const vertices = [
    { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 2 },
    { x: 1, y: 0, z: 1 }, { x: 0, y: 1, z: 1 },
    { x: -1, y: 0, z: 1 }, { x: 0, y: -1, z: 1 },
  ];
  return createMesh({
    id: 'shared-edge',
    vertices,
    faces: [...tetraFaces(0, 1, 2, 3), ...tetraFaces(0, 1, 4, 5)],
  });
}

function mobiusStrip(segments = 12, radius = 2, width = 0.4) {
  const vertices = [];
  for (let i = 0; i < segments; i++) {
    const u = (2 * Math.PI * i) / segments;
    for (const v of [-1, 1]) {
      const r = radius + v * width * Math.cos(u / 2);
      vertices.push({
        x: r * Math.cos(u),
        y: r * Math.sin(u),
        z: v * width * Math.sin(u / 2),
      });
    }
  }
  const faces = [];
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const a0 = i * 2;
    const a1 = i * 2 + 1;
    let b0 = next * 2;
    let b1 = next * 2 + 1;
    if (i === segments - 1) {
      b0 = 1;
      b1 = 0;
    }
    faces.push([a0, a1, b0], [a0, b0, b1]);
  }
  return createMesh({ id: 'mobius', vertices, faces });
}

function cube() {
  const vertices = [
    { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 },
  ];
  const faces = [
    [4, 5, 6], [4, 6, 7], [1, 0, 3], [1, 3, 2], [1, 2, 6], [1, 6, 5],
    [0, 4, 7], [0, 7, 3], [3, 7, 6], [3, 6, 2], [0, 1, 5], [0, 5, 4],
  ];
  return createMesh({ id: 'cube', vertices, faces });
}

export function run(assert) {
  const shared = sharedEdgeTetrahedra();
  const before = JSON.stringify(shared);
  const split = repairTopology(shared, { nonManifold: 'split', nonOrientable: 'cut' });
  assert(split.mesh && split.report.nonManifoldEdges > 0, 'shared-edge mesh reports non-manifold edges');
  assert(split.report.splitEdges > 0 && split.report.duplicatedVertices > 0, 'non-manifold edges are split');
  assert(JSON.stringify(shared) === before, 'topology repair does not mutate its input');
  const edgeCounts = new Map();
  for (const face of split.mesh.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }
  assert([...edgeCounts.values()].every((count) => count <= 2), 'split result has no edge with more than two uses');

  const repaired = repairMesh(shared, { topology: 'split', nonOrientable: 'cut' });
  assert(repaired.validation.ok, 'split topology plus orientation yields a valid mesh');
  assert(repaired.validation.meta.closed && repaired.validation.meta.manifold, 'split topology is closed and manifold');
  assert(repaired.report.topologySplitEdges > 0, 'repair report includes topology splits');

  const removed = repairTopology(shared, { nonManifold: 'remove', nonOrientable: 'cut' });
  assert(removed.report.removedFaces > 0, 'remove strategy removes extra fan faces');
  assert(removed.mesh.faces.length < shared.faces.length, 'remove strategy reduces the face count');

  const mesh = mobiusStrip();
  const rejected = repairTopology(mesh, { nonManifold: 'none', nonOrientable: 'reject' });
  assert(rejected.mesh === null && rejected.report.nonOrientable, 'non-orientable topology is rejected explicitly');
  const cut = repairTopology(mesh, { nonManifold: 'none', nonOrientable: 'cut' });
  assert(cut.mesh && cut.report.nonOrientable, 'non-orientable topology is detected and cut');
  assert(cut.report.cuts > 0 && cut.report.duplicatedVertices > 0, 'seam cut duplicates vertices');

  const clean = cube();
  const unchanged = repairTopology(clean, { nonManifold: 'split', nonOrientable: 'cut' });
  assert(unchanged.mesh === clean, 'clean topology is returned unchanged');
  assert(unchanged.report.nonManifoldEdges === 0 && unchanged.report.cuts === 0, 'clean topology reports no actions');

  const again = repairTopology(shared, { nonManifold: 'split', nonOrientable: 'cut' });
  assert(JSON.stringify(again.mesh) === JSON.stringify(split.mesh), 'topology repair is deterministic');

  const limited = repairTopology(shared, { nonManifold: 'split', nonOrientable: 'cut', maxEdges: 0 });
  assert(limited.mesh === null && limited.report.errors.some((error) => error.includes('exceeds')), 'edge budget returns a structured failure');

  assert(!validateMesh(shared).meta.manifold, 'shared-edge input is non-manifold before repair');
}
