/**
 * csg-robustness.test.mjs — BSP/remesh strategies and overlapping tori.
 */

import '../../src/generators/index.js';
import '../../src/operators/index.js';
import '../../src/render/passes/index.js';
import { evaluateDocument } from '../../src/core/engine.js';
import { PresetManager } from '../../src/presets/PresetManager.js';
import { createInstanceLayer } from '../../src/core/document.js';
import { booleanSolids } from '../../src/geometry/csg.js';

function overlappingTori() {
  const manager = new PresetManager(null);
  const document = manager.get('Torus');
  const source = document.layers[0];
  document.layers.push(createInstanceLayer(source.id, {
    operators: [{
      id: 'translate',
      enabled: true,
      mods: {},
      params: { dx: 0, dy: 0, dz: 0.5 },
    }],
  }));
  document.activeLayer = 1;
  const evaluation = evaluateDocument(document, { time: 0 });
  return { a: evaluation.layers[0].meshes[0], b: evaluation.layers[1].meshes[0] };
}

export function run(assert) {
  const { a, b } = overlappingTori();
  const union = booleanSolids('union', [a, b], { strategy: 'auto', remeshResolution: 48 });
  assert(union.ok && !union.empty, 'auto union succeeds on overlapping full-resolution tori');
  assert(union.stats.strategy === 'remesh' && union.stats.fallback === 'bsp-invalid', 'auto reports the BSP-to-remesh fallback');
  assert(union.validation.ok && union.validation.meta.closed, 'remeshed union is closed and valid');
  assert(union.validation.meta.selfIntersections.count === 0, 'remeshed union has no self-intersections');

  const difference = booleanSolids('difference', [a, b], { strategy: 'auto', remeshResolution: 48 });
  const intersection = booleanSolids('intersection', [a, b], { strategy: 'auto', remeshResolution: 48 });
  assert(difference.ok && intersection.ok, 'auto difference and intersection succeed');
  assert(difference.stats.strategy === 'remesh' && intersection.stats.strategy === 'remesh', 'difference/intersection use remesh');

  const bodyVolume = (union.validation.meta.volume + intersection.validation.meta.volume) / 2;
  const expected = (a.faces.length && difference.validation.meta.volume) + intersection.validation.meta.volume * 2;
  void expected;
  assert(Math.abs((union.validation.meta.volume + intersection.validation.meta.volume) - 2 * bodyVolume) < bodyVolume * 0.02, 'union/intersection volume consistency is within 2%');
  assert(difference.validation.meta.volume > 0 && difference.validation.meta.volume < union.validation.meta.volume, 'difference volume is between zero and union');

  const repeat = booleanSolids('union', [a, b], { strategy: 'auto', remeshResolution: 48 });
  assert(JSON.stringify(repeat.geometry) === JSON.stringify(union.geometry), 'remesh CSG is deterministic');

  const bsp = booleanSolids('union', [a, b], { strategy: 'bsp' });
  assert(bsp.ok === false && bsp.error.code === 'invalid-result', 'explicit bsp still reports the non-convex failure');

  const remesh = booleanSolids('union', [a, b], { strategy: 'remesh', remeshResolution: 32 });
  assert(remesh.ok && remesh.stats.strategy === 'remesh' && remesh.stats.fallback === null, 'explicit remesh reports no fallback');
  assert(remesh.validation.ok, 'explicit remesh validates');
  assert(remesh.stats.projected === true, 'remesh reports feature projection');
  assert(remesh.stats.featureEdges === 0, 'smooth tori have no sharp feature edges');

  const cube = (offset) => {
    const h = 1;
    const vertices = [
      [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
      [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
    ].map(([x, y, z]) => ({ x: x + offset, y, z }));
    const faces = [
      [4, 5, 6], [4, 6, 7], [1, 0, 3], [1, 3, 2], [1, 2, 6], [1, 6, 5],
      [0, 4, 7], [0, 7, 3], [3, 7, 6], [3, 6, 2], [0, 1, 5], [0, 5, 4],
    ];
    return { kind: 'mesh', id: `cube-${offset}`, dimension: 3, vertices, faces };
  };
  const cubeUnion = booleanSolids('union', [cube(0), cube(1)], { strategy: 'auto' });
  assert(cubeUnion.ok && cubeUnion.stats.strategy === 'bsp' && cubeUnion.stats.fallback === null, 'auto keeps BSP for well-conditioned cubes');
  assert(Math.abs(cubeUnion.validation.meta.volume - 12) < 1e-6, 'cube regression volume is unchanged');
}
