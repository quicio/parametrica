/**
 * Node benchmark for the Manifold CSG strategy.
 * Run: npm run bench:manifold
 */
import '../src/generators/index.js';
import '../src/operators/index.js';
import '../src/render/passes/index.js';
import { evaluateDocument } from '../src/core/engine.js';
import { PresetManager } from '../src/presets/PresetManager.js';
import { createInstanceLayer } from '../src/core/document.js';
import { booleanSolids } from '../src/geometry/csg.js';
import { initManifold, isManifoldReady } from '../src/geometry/manifoldEngine.js';

const startInit = performance.now();
await initManifold();
const initMs = performance.now() - startInit;

function cube(offset = 0, size = 2) {
  const h = size / 2;
  const vertices = [
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
  ].map(([x, y, z]) => ({ x: x + offset, y, z }));
  const faces = [
    [4, 5, 6], [4, 6, 7], [1, 0, 3], [1, 3, 2], [1, 2, 6], [1, 6, 5],
    [0, 4, 7], [0, 7, 3], [3, 7, 6], [3, 6, 2], [0, 1, 5], [0, 5, 4],
  ];
  return { kind: 'mesh', id: `cube-${offset}`, dimension: 3, vertices, faces };
}

const manager = new PresetManager(null);
const torusDoc = manager.get('Torus');
const source = torusDoc.layers[0];
torusDoc.layers.push(createInstanceLayer(source.id, {
  operators: [{
    id: 'translate',
    enabled: true,
    mods: {},
    params: { dx: 0, dy: 0, dz: 0.5 },
  }],
}));
torusDoc.activeLayer = 1;
const evaluation = evaluateDocument(torusDoc, { time: 0 });
const a = evaluation.layers[0].meshes[0];
const b = evaluation.layers[1].meshes[0];

const results = [];
for (const [label, operands] of [['cubes', [cube(0), cube(1)]], ['tori', [a, b]]]) {
  for (const operation of ['union', 'difference', 'intersection']) {
    const start = performance.now();
    const result = booleanSolids(operation, operands, { strategy: 'manifold' });
    results.push({
      label,
      operation,
      ok: result.ok,
      empty: result.empty,
      ms: Number((performance.now() - start).toFixed(1)),
      triangles: result.stats?.outputTriangles ?? 0,
      volume: result.validation?.meta?.volume ?? null,
    });
  }
}

console.log(JSON.stringify({ ready: isManifoldReady(), initMs: Number(initInitMs()), results }, null, 2));

function initInitMs() {
  return initMs.toFixed(1);
}
