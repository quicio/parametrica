/**
 * bench-joint-blend.mjs — timeboxed local SDF joint spike.
 *
 * This is a local benchmark, not a full-lattice adoption. The production
 * default remains `rounded` until a full preset benchmark passes every gate.
 */

import '../src/generators/index.ts';
import '../src/operators/index.ts';
import '../src/render/passes/index.ts';
import { initManifold } from '../src/geometry/manifoldEngine.ts';
import { benchmarkLocalJoint } from '../src/geometry/latticeJointBlend.ts';
import { mkdirSync, writeFileSync } from 'node:fs';

await initManifold();
const branches = [
  { a: { x: 0, y: 0, z: 0 }, b: { x: 3, y: 0, z: 0.4 }, radius: 1.75 },
  { a: { x: 0, y: 0, z: 0 }, b: { x: -3, y: 0, z: 0.4 }, radius: 1.75 },
  { a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 3, z: 0.4 }, radius: 1.75 },
  { a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: -3, z: 0.4 }, radius: 1.75 },
];
const results = [];
for (const edgeLength of [0.7, 0.5, 0.35]) {
  const result = benchmarkLocalJoint({
    branches,
    blendRadius: 0.9,
    edgeLength,
  });
  results.push({ edgeLength, ...result });
  console.log(`edge ${edgeLength} mm · ${result.ok ? 'ok' : 'FAILED'} · ${result.stats?.triangles ?? 0} tris · ${result.stats?.buildMs ?? '—'} ms · manifold ${result.validation?.manifold ?? '—'}`);
}
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/joint-blend-benchmark.json', JSON.stringify(results, null, 2));
