/**
 * solid-booleans.test.mjs — CSG cube/sphere matrix, determinism and failures.
 */

import { createMesh } from '../../src/geometry/contracts.ts';
import { booleanSolids } from '../../src/geometry/csg.ts';
import { validateMesh } from '../../src/geometry/validate.ts';
import { exportBinarySTL } from '../../src/export/stl.ts';
import { buildFabricationReport } from '../../src/application/fabricationSource.ts';
import { sanitizeFabricationSettings } from '../../src/core/document.ts';

const UNITS = { world: 'mm', mmPerWorldUnit: 1, artboard: 'unitless', mmPerArtboardUnit: null };

function cube(offset = 0, size = 2, id = `cube-${offset}-${size}`) {
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

function sphere(radius = 1, segments = 32, rings = 16) {
  const vertices = [{ x: 0, y: 0, z: radius }, { x: 0, y: 0, z: -radius }];
  const ringStart = 2;
  for (let i = 1; i < rings; i++) {
    const theta = (Math.PI * i) / rings;
    const r = radius * Math.sin(theta);
    const z = radius * Math.cos(theta);
    for (let j = 0; j < segments; j++) {
      const phi = (2 * Math.PI * j) / segments;
      vertices.push({ x: r * Math.cos(phi), y: r * Math.sin(phi), z });
    }
  }
  const ring = (i, j) => ringStart + (i - 1) * segments + ((j % segments) + segments) % segments;
  const faces = [];
  for (let j = 0; j < segments; j++) {
    faces.push([0, ring(1, j), ring(1, j + 1)]);
  }
  for (let i = 1; i < rings - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = ring(i, j);
      const b = ring(i + 1, j);
      const c = ring(i + 1, j + 1);
      const d = ring(i, j + 1);
      faces.push([a, b, c], [a, c, d]);
    }
  }
  for (let j = 0; j < segments; j++) {
    faces.push([1, ring(rings - 1, j + 1), ring(rings - 1, j)]);
  }
  let mesh = createMesh({ id: `sphere-${segments}-${rings}`, vertices, faces });
  let validation = validateMesh(mesh);
  if (validation.meta?.volume !== null && validation.meta.volume < 0) {
    mesh = createMesh({
      id: mesh.id,
      vertices,
      faces: faces.map((face) => [...face].reverse()),
    });
    validation = validateMesh(mesh);
  }
  return { mesh, validation };
}

export function run(assert) {
  const a = cube(0);
  const b = cube(1);
  const union = booleanSolids('union', [a, b]);
  const difference = booleanSolids('difference', [a, b]);
  const intersection = booleanSolids('intersection', [a, b]);
  assert(union.ok && !union.empty, 'overlapping cube union succeeds');
  assert(Math.abs(union.validation.meta.volume - 12) < 1e-6, 'overlapping cube union volume is 12');
  assert(difference.ok && Math.abs(difference.validation.meta.volume - 4) < 1e-6, 'overlapping cube difference volume is 4');
  assert(intersection.ok && Math.abs(intersection.validation.meta.volume - 4) < 1e-6, 'overlapping cube intersection volume is 4');
  assert(union.validation.meta.closed && union.validation.meta.manifold, 'cube union is closed and manifold');
  assert(union.validation.meta.selfIntersections.count === 0, 'cube union has no self-intersections');
  assert(union.validation.meta.volume > 0 && difference.validation.meta.volume > 0, 'non-empty results have positive volume');

  const shared = booleanSolids('union', [cube(0), cube(2)]);
  assert(shared.ok && Math.abs(shared.validation.meta.volume - 16) < 1e-6, 'shared-face union volume is 16');
  assert(shared.validation.meta.closed && shared.validation.meta.manifold, 'shared-face union is one closed shell');
  const sharedDifference = booleanSolids('difference', [cube(0), cube(2)]);
  assert(sharedDifference.ok && Math.abs(sharedDifference.validation.meta.volume - 8) < 1e-6, 'shared-face difference keeps one cube');
  const sharedIntersection = booleanSolids('intersection', [cube(0), cube(2)]);
  assert(sharedIntersection.ok && sharedIntersection.empty, 'face-touching intersection is empty');

  const disjointUnion = booleanSolids('union', [cube(0), cube(5)]);
  assert(disjointUnion.ok && Math.abs(disjointUnion.validation.meta.volume - 16) < 1e-6, 'disjoint union volume sums shells');
  assert(disjointUnion.validation.meta.closed && disjointUnion.validation.meta.manifold, 'disjoint union remains valid multi-shell mesh');
  const disjointIntersection = booleanSolids('intersection', [cube(0), cube(5)]);
  assert(disjointIntersection.ok && disjointIntersection.empty, 'disjoint intersection is empty');

  const big = cube(0, 4);
  const small = cube(0, 2);
  const containedDifference = booleanSolids('difference', [big, small]);
  assert(containedDifference.ok && Math.abs(containedDifference.validation.meta.volume - 56) < 1e-4, 'contained subtraction volume is 56');
  const containedIntersection = booleanSolids('intersection', [big, small]);
  assert(containedIntersection.ok && Math.abs(containedIntersection.validation.meta.volume - 8) < 1e-6, 'contained intersection volume is 8');

  const selfSubtract = booleanSolids('difference', [a, a]);
  assert(selfSubtract.ok && selfSubtract.empty && selfSubtract.geometry === null, 'A minus A is explicitly empty');

  const repeated = booleanSolids('union', [cube(0), cube(1)]);
  assert(JSON.stringify(repeated.geometry) === JSON.stringify(union.geometry), 'boolean geometry is deterministic');
  const stl1 = exportBinarySTL(union.geometry, { units: UNITS });
  const stl2 = exportBinarySTL(repeated.geometry, { units: UNITS });
  assert(Buffer.compare(Buffer.from(stl1.data), Buffer.from(stl2.data)) === 0, 'boolean STL bytes are deterministic');

  const ball = sphere(1, 32, 16);
  assert(ball.validation.ok && ball.validation.meta.closed, 'sphere fixture is closed');
  const sphereUnion = booleanSolids('union', [ball.mesh, ball.mesh]);
  assert(sphereUnion.ok && Math.abs(sphereUnion.validation.meta.volume - ball.validation.meta.volume) < ball.validation.meta.volume * 0.02, 'sphere self-union preserves volume within 2%');
  const sphereIntersection = booleanSolids('intersection', [ball.mesh, ball.mesh]);
  assert(sphereIntersection.ok && Math.abs(sphereIntersection.validation.meta.volume - ball.validation.meta.volume) < ball.validation.meta.volume * 0.02, 'sphere self-intersection preserves volume within 2%');
  const sphereDifference = booleanSolids('difference', [ball.mesh, ball.mesh]);
  assert(sphereDifference.ok && sphereDifference.empty, 'sphere minus itself is empty');
  const sphereCube = booleanSolids('union', [ball.mesh, cube(0)]);
  assert(sphereCube.ok && sphereCube.validation.meta.closed, 'sphere and cube union validates');
  assert(sphereCube.validation.meta.volume >= ball.validation.meta.volume - 1e-6, 'sphere/cube union contains the sphere');

  const open = createMesh({
    id: 'open',
    vertices: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
    faces: [[0, 1, 2]],
  });
  const invalid = booleanSolids('union', [open, cube(0)]);
  assert(!invalid.ok && invalid.error.code === 'invalid-operand' && invalid.geometry === null, 'open operands are rejected');
  const unknown = booleanSolids('xor', [a, b]);
  assert(!unknown.ok && unknown.error.code === 'invalid-operation', 'unknown operations are rejected');
  const tooFew = booleanSolids('union', [a]);
  assert(!tooFew.ok && tooFew.error.code === 'invalid-operand', 'fewer than two operands are rejected');
  const tooLarge = booleanSolids('union', [a, b], { maxInputTriangles: 1 });
  assert(!tooLarge.ok && tooLarge.error.code === 'complexity', 'input triangle limit returns complexity');
  const tooDeep = booleanSolids('union', [a, b], { strategy: 'bsp', maxDepth: 1 });
  assert(!tooDeep.ok && tooDeep.error.code === 'complexity', 'BSP depth limit returns complexity');
  const tooMany = booleanSolids('union', [a, b], { strategy: 'bsp', maxPolygons: 1 });
  assert(!tooMany.ok && tooMany.error.code === 'complexity', 'polygon budget returns complexity');

  const evaluation = { layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, geometry: [], meshes: [a, b] }] };
  const base = { scope: 'active-layer', tolerance: 1e-5 };
  const unionReport = buildFabricationReport({
    evaluation,
    layerIndex: 0,
    units: UNITS,
    preparation: { ...base, boolean: 'union' },
  });
  assert(unionReport.exportable && unionReport.boolean?.operation === 'union', 'fabrication union report succeeds');
  assert(unionReport.bodies === 1 && unionReport.multiBody === false, 'boolean result is one derived body');
  assert(Math.abs(unionReport.volume - 12) < 1e-6, 'fabrication union uses the CSG volume');
  const differenceReport = buildFabricationReport({
    evaluation,
    layerIndex: 0,
    units: UNITS,
    preparation: { ...base, boolean: 'difference' },
  });
  assert(differenceReport.exportable && Math.abs(differenceReport.volume - 4) < 1e-6, 'fabrication difference uses the CSG volume');
  const intersectionReport = buildFabricationReport({
    evaluation,
    layerIndex: 0,
    units: UNITS,
    preparation: { ...base, boolean: 'intersection' },
  });
  assert(intersectionReport.exportable && Math.abs(intersectionReport.volume - 4) < 1e-6, 'fabrication intersection uses the CSG volume');

  const emptyBoolean = buildFabricationReport({
    evaluation: { layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, geometry: [], meshes: [cube(0), cube(5)] }] },
    layerIndex: 0,
    units: UNITS,
    preparation: { ...base, boolean: 'intersection' },
  });
  assert(emptyBoolean.exportable === false, 'empty boolean result is not exportable');
  assert(emptyBoolean.booleanEmpty === true, 'empty boolean result is explicit');
  assert(emptyBoolean.reason.includes('empty'), 'empty boolean reason is explicit');

  const notEnough = buildFabricationReport({
    evaluation: { layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, geometry: [], meshes: [cube(0)] }] },
    layerIndex: 0,
    units: UNITS,
    preparation: { ...base, scope: 'composition', boolean: 'union' },
  });
  assert(notEnough.exportable === false && notEnough.reason.includes('at least two'), 'boolean requires two valid bodies');

  assert(sanitizeFabricationSettings({}).boolean === 'none', 'boolean defaults to none');
  assert(sanitizeFabricationSettings({ scope: 'composition', boolean: 'union' }).boolean === 'union', 'boolean sanitizes in multi-body scopes');
  assert(sanitizeFabricationSettings({ scope: 'single', boolean: 'union' }).boolean === 'none', 'single scope forces boolean none');
  assert(sanitizeFabricationSettings({ scope: 'composition', boolean: 'xor' }).boolean === 'none', 'unknown boolean falls back to none');
}
