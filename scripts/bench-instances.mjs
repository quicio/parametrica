/**
 * Node benchmark for the current 24-instance limit.
 * Run: npm run bench:instances
 */
import '../src/generators/index.js';
import '../src/operators/index.js';
import '../src/render/passes/index.js';
import { createDocument, createInstanceLayer } from '../src/core/document.js';
import { evaluateDocument } from '../src/core/engine.js';

const INSTANCES = 24;
const doc = createDocument('parametric-surface', {
  generator: { params: { samplesU: 64, samplesV: 32 } },
});
const source = doc.layers[0];
for (let i = 0; i < INSTANCES; i++) {
  doc.layers.push(createInstanceLayer(source.id, {
    name: `bench-${i + 1}`,
    operators: [
      { id: 'translate', enabled: true, mods: {}, params: { dx: 0, dy: 0, dz: i * 0.2 } },
      { id: 'rotate', enabled: true, mods: {}, params: { angle: i * 7, angleExpr: '', cx: 0, cy: 0 } },
      { id: 'scale', enabled: true, mods: {}, params: { sx: 0.98, sy: 0.98, sz: 0.98, scaleExpr: '' } },
    ],
  }));
}
doc.activeLayer = 1;

const coldStart = performance.now();
const cold = evaluateDocument(doc, { time: 0, bypassCache: true });
const coldMs = performance.now() - coldStart;
const warmStart = performance.now();
const warm = evaluateDocument(doc, { time: 0 });
const warmMs = performance.now() - warmStart;
const cachedStart = performance.now();
const cached = evaluateDocument(doc, { time: 0 });
const cachedMs = performance.now() - cachedStart;

console.log(JSON.stringify({
  instances: INSTANCES,
  layers: cold.layers.length,
  errors: cold.errors.length,
  curves: cold.stats.curveCount,
  points: cold.stats.pointCount,
  coldMs: Number(coldMs.toFixed(1)),
  warmMs: Number(warmMs.toFixed(1)),
  cachedMs: Number(cachedMs.toFixed(1)),
  cachedGeometryReused: warm.layers[1].geometry[0] === cached.layers[1].geometry[0],
}, null, 2));
