/**
 * self-intersection.test.mjs — triangle diagnostics and fabrication rejection.
 */

import { createMesh } from '../../src/geometry/contracts.ts';
import { detectSelfIntersections } from '../../src/geometry/selfIntersection.ts';
import { validateMesh } from '../../src/geometry/validate.ts';

function mesh(id, vertices, faces) {
  return createMesh({ id, vertices, faces });
}

function cube(offset = 0) {
  const v = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ].map(([x, y, z]) => ({ x: x + offset, y: y + offset, z: z + offset }));
  const faces = [
    [4, 5, 6], [4, 6, 7],
    [1, 0, 3], [1, 3, 2],
    [1, 2, 6], [1, 6, 5],
    [0, 4, 7], [0, 7, 3],
    [3, 7, 6], [3, 6, 2],
    [0, 1, 5], [0, 5, 4],
  ];
  return { v, faces };
}

export function run(assert) {
  const crossing = mesh('crossing', [
    { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 2, z: 0 },
    { x: 1, y: 1, z: -1 }, { x: 1, y: 1, z: 1 }, { x: 2, y: 1, z: 0 },
  ], [[0, 1, 2], [3, 4, 5]]);
  const crossed = detectSelfIntersections(crossing);
  assert(crossed.checked === true && crossed.count === 1, 'crossing triangles are detected');
  assert(crossed.pairs[0].a === 0 && crossed.pairs[0].b === 1, 'crossing pair preserves face indices');
  assert(JSON.stringify(detectSelfIntersections(crossing)) === JSON.stringify(crossed), 'detection is deterministic');

  const adjacent = mesh('adjacent', [
    { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 2, z: 0 }, { x: 3, y: 2, z: 0 },
  ], [[0, 1, 2], [1, 3, 2]]);
  assert(detectSelfIntersections(adjacent).count === 0, 'triangles sharing an edge are not self-intersections');

  const spatialSeam = mesh('seam', [
    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 1 },
    { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 1 }, { x: 2, y: 0, z: 0 },
  ], [[0, 1, 2], [3, 4, 5]]);
  assert(detectSelfIntersections(spatialSeam).count === 0, 'spatially duplicated seam vertices count as adjacency');

  const coplanar = mesh('coplanar', [
    { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 2, z: 0 },
    { x: 1, y: 1, z: 0 }, { x: 3, y: 1, z: 0 }, { x: 2, y: 3, z: 0 },
  ], [[0, 1, 2], [3, 4, 5]]);
  assert(detectSelfIntersections(coplanar).count === 1, 'coplanar overlaps are detected');

  const disjoint = mesh('disjoint', [
    { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 2, z: 0 },
    { x: 10, y: 0, z: 0 }, { x: 12, y: 0, z: 0 }, { x: 11, y: 2, z: 0 },
  ], [[0, 1, 2], [3, 4, 5]]);
  assert(detectSelfIntersections(disjoint).count === 0, 'disjoint triangles are clean');

  const fanBase = [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 0 }];
  const fanVertices = [...fanBase];
  const fanFaces = [[0, 1, 2]];
  for (let i = 0; i < 4; i++) {
    const x = 2 + i * 2;
    const base = fanVertices.length;
    fanVertices.push(
      { x, y: 2, z: -1 }, { x, y: 2, z: 1 }, { x, y: 4, z: 0 },
    );
    fanFaces.push([base, base + 1, base + 2]);
  }
  const fan = mesh('fan', fanVertices, fanFaces);
  const bounded = detectSelfIntersections(fan, { maxPairs: 2 });
  assert(bounded.count === 2 && bounded.truncated === true, 'pair reporting is bounded and marked truncated');

  const first = cube(0);
  const second = cube(0.5);
  const overlapping = mesh('overlapping-cubes', [
    ...first.v, ...second.v.map((point) => ({ ...point })),
  ], [
    ...first.faces,
    ...second.faces.map((face) => face.map((index) => index + first.v.length)),
  ]);
  const validation = validateMesh(overlapping);
  assert(validation.meta.closed && validation.meta.manifold && validation.meta.oriented, 'overlapping cubes are topologically closed');
  assert(validation.meta.selfIntersections.count > 0, 'overlapping closed bodies report self-intersections');
  assert(validation.ok === false, 'self-intersections reject mesh validation');
  assert(validation.errors.some((error) => error.includes('self-intersecting')), 'self-intersection error is explicit');

  const clean = mesh('clean-cube', cube(0).v, cube(0).faces);
  const cleanValidation = validateMesh(clean);
  assert(cleanValidation.ok && cleanValidation.meta.selfIntersections.count === 0, 'clean closed mesh passes with zero intersections');
  assert(!cleanValidation.warnings.includes('self-intersection validation not implemented'), 'the old limitation warning is gone');
}
