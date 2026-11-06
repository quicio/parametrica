/**
 * manifold-engine.test.mjs — Manifold WASM adapter and CSG strategy.
 */

import '../../src/generators/index.js';
import '../../src/operators/index.js';
import '../../src/render/passes/index.js';
import { evaluateDocument } from '../../src/core/engine.js';
import { PresetManager } from '../../src/presets/PresetManager.js';
import { createInstanceLayer } from '../../src/core/document.js';
import { createMesh } from '../../src/geometry/contracts.js';
import { booleanSolids } from '../../src/geometry/csg.js';
import { initManifold, isManifoldReady, manifoldBoolean } from '../../src/geometry/manifoldEngine.js';
import { validateMesh } from '../../src/geometry/validate.js';

await initManifold();

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
  assert(isManifoldReady(), 'Manifold initializes');
  const a = cube(0);
  const b = cube(1);
  const union = manifoldBoolean('union', [a, b]);
  const difference = manifoldBoolean('difference', [a, b]);
  const intersection = manifoldBoolean('intersection', [a, b]);
  assert(union.ok && Math.abs(union.validation.meta.volume - 12) < 1e-4, 'Manifold union volume is 12');
  assert(difference.ok && Math.abs(difference.validation.meta.volume - 4) < 1e-4, 'Manifold difference volume is 4');
  assert(intersection.ok && Math.abs(intersection.validation.meta.volume - 4) < 1e-4, 'Manifold intersection volume is 4');
  assert(union.validation.meta.closed && union.validation.meta.selfIntersections.count === 0, 'Manifold output is closed and clean');

  const explicit = booleanSolids('union', [a, b], { strategy: 'manifold' });
  assert(explicit.ok && explicit.stats.strategy === 'manifold', 'booleanSolids exposes the manifold strategy');
  assert(Math.abs(explicit.validation.meta.volume - 12) < 1e-4, 'explicit manifold strategy preserves volume');

  const auto = booleanSolids('union', [a, b], { strategy: 'auto' });
  assert(auto.ok && auto.stats.strategy === 'manifold', 'auto prefers Manifold when ready');

  const repeat = manifoldBoolean('union', [a, b]);
  assert(JSON.stringify(repeat.geometry) === JSON.stringify(union.geometry), 'Manifold output is deterministic');

  const { a: torusA, b: torusB } = overlappingTori();
  const torusUnion = booleanSolids('union', [torusA, torusB], { strategy: 'manifold' });
  const torusDifference = booleanSolids('difference', [torusA, torusB], { strategy: 'manifold' });
  const torusIntersection = booleanSolids('intersection', [torusA, torusB], { strategy: 'manifold' });
  assert(torusUnion.ok && torusUnion.stats.strategy === 'manifold', 'Manifold unions overlapping tori');
  assert(torusDifference.ok && torusIntersection.ok, 'Manifold subtracts and intersects overlapping tori');
  assert(torusUnion.validation.meta.closed && torusUnion.validation.meta.selfIntersections.count === 0, 'tori union is watertight');
  assert(torusDifference.validation.meta.volume > 0 && torusIntersection.validation.meta.volume > 0, 'tori difference/intersection have positive volume');
  const consistency = torusUnion.validation.meta.volume + torusIntersection.validation.meta.volume;
  const bodies = (torusDifference.validation.meta.volume + torusIntersection.validation.meta.volume) * 2;
  assert(Math.abs(consistency - bodies) < bodies * 0.02, 'tori union/intersection volume consistency is within 2%');

  const open = createMesh({
    id: 'open',
    vertices: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
    faces: [[0, 1, 2]],
  });
  const invalid = manifoldBoolean('union', [open, a]);
  assert(!invalid.ok && invalid.error.code === 'invalid-operand', 'open operands are rejected by Manifold');

  const empty = manifoldBoolean('intersection', [cube(0), cube(5)]);
  assert(empty.ok && empty.empty, 'disjoint intersection is an explicit empty result');
  assert(!validateMesh(union.geometry).errors.length, 'Manifold result passes the standard mesh gate');
}
