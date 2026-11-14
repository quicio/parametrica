/**
 * multi-body.test.mjs — body scopes, merged validation and STL counts.
 */

import { createMesh } from '../../src/geometry/contracts.ts';
import { exportBinarySTL } from '../../src/export/stl.ts';
import { buildFabricationReport } from '../../src/application/fabricationSource.ts';
import { sanitizeFabricationSettings } from '../../src/core/document.ts';

const UNITS = { world: 'mm', mmPerWorldUnit: 1, artboard: 'unitless', mmPerArtboardUnit: null };

function cube(offset = 0, id = `cube-${offset}`) {
  const vertices = [
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
  return createMesh({ id, vertices, faces });
}

function layer(id, meshes, visible = true) {
  return { id, name: id, visible, meshes, geometry: [] };
}

export function run(assert) {
  assert(sanitizeFabricationSettings({}).scope === 'single', 'body scope defaults to single');
  assert(sanitizeFabricationSettings({ scope: 'composition' }).scope === 'composition', 'composition scope sanitizes');
  assert(sanitizeFabricationSettings({ scope: 'nonsense' }).scope === 'single', 'unknown scope falls back to single');

  const first = cube(0, 'first');
  const second = cube(3, 'second');
  const before = JSON.stringify([first, second]);
  const evaluation = { layers: [layer('layer-1', [first, second])] };

  const single = buildFabricationReport({
    evaluation,
    layerIndex: 0,
    units: UNITS,
    preparation: { scope: 'single' },
  });
  assert(single.exportable && single.bodies === 1 && single.multiBody === false, 'single scope exports one body');
  assert(single.source.id === 'first', 'single scope keeps the first valid body');

  const active = buildFabricationReport({
    evaluation,
    layerIndex: 0,
    units: UNITS,
    preparation: { scope: 'active-layer' },
  });
  assert(active.exportable && active.multiBody === true, 'active-layer scope exports multiple bodies');
  assert(active.bodies === 2 && active.source.id === 'multi-body', 'multi-body report identifies the merged shell mesh');
  assert(active.triangles === first.faces.length + second.faces.length, 'multi-body triangle count sums bodies');
  assert(active.vertices === first.vertices.length + second.vertices.length, 'multi-body vertex count sums bodies');
  assert(Math.abs(active.volume - 16) < 1e-6, 'multi-body volume sums disjoint shells');
  assert(active.warnings.length === 0, 'disjoint multi-body merge validates cleanly');
  assert(JSON.stringify([first, second]) === before, 'multi-body selection does not mutate source meshes');

  const stl = exportBinarySTL(active.source.geometry, { units: UNITS });
  assert(stl.triangles === active.triangles && stl.data.length === 84 + stl.triangles * 50, 'multi-body STL contains all shells');
  assert(Math.abs(stl.volume - 16) < 1e-6, 'multi-body STL reports merged volume');

  const hidden = layer('layer-2', [cube(6, 'hidden')], false);
  const composition = buildFabricationReport({
    evaluation: { layers: [layer('layer-1', [first]), hidden] },
    layerIndex: 0,
    units: UNITS,
    preparation: { scope: 'composition' },
  });
  assert(composition.exportable && composition.bodies === 1, 'composition scope ignores hidden layers');

  const overlapping = buildFabricationReport({
    evaluation: { layers: [layer('layer-1', [cube(0, 'a'), cube(0.5, 'b')])] },
    layerIndex: 0,
    units: UNITS,
    preparation: { scope: 'active-layer' },
  });
  assert(overlapping.exportable === false, 'overlapping bodies are rejected');
  assert(overlapping.reason.includes('Multi-body export failed'), 'overlap reason identifies merged validation');
  assert(overlapping.errors.some((error) => error.includes('self-intersecting')), 'overlap reports self-intersection');
}
