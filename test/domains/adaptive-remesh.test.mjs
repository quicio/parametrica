/**
 * adaptive-remesh.test.mjs — feature projection and deterministic remesh.
 */

import '../../src/generators/index.ts';
import '../../src/operators/index.ts';
import '../../src/render/passes/index.ts';
import { createMesh } from '../../src/geometry/contracts.ts';
import { evaluateDocument } from '../../src/core/engine.ts';
import { PresetManager } from '../../src/presets/PresetManager.ts';
import { remesh } from '../../src/geometry/remesh.ts';

function cube() {
  const h = 1;
  const vertices = [
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
  ].map(([x, y, z]) => ({ x, y, z }));
  const faces = [
    [4, 5, 6], [4, 6, 7], [1, 0, 3], [1, 3, 2], [1, 2, 6], [1, 6, 5],
    [0, 4, 7], [0, 7, 3], [3, 7, 6], [3, 6, 2], [0, 1, 5], [0, 5, 4],
  ];
  return createMesh({ id: 'cube', vertices, faces });
}

export function run(assert) {
  const source = cube();
  const raw = remesh([source], { operation: 'union', resolution: 32, project: false });
  const projected = remesh([source], { operation: 'union', resolution: 32, project: true });
  assert(raw.ok && projected.ok, 'raw and projected remesh both validate cubes');
  assert(raw.stats.projected === false && raw.stats.featureEdges === 0, 'projection can be disabled');
  assert(projected.stats.projected === true && projected.stats.featureEdges > 0, 'cube projection detects sharp feature edges');
  assert(Math.abs(projected.validation.meta.volume - 8) < 0.1, 'projected cube volume stays within 1.25%');
  assert(projected.validation.ok && projected.validation.meta.selfIntersections.count === 0, 'projected cube is valid and clean');

  const manager = new PresetManager(null);
  const torusEvaluation = evaluateDocument(manager.get('Torus'), { time: 0 });
  const torus = torusEvaluation.meshes[0];
  const rawTorus = remesh([torus], { operation: 'union', resolution: 32, project: false });
  const projectedTorus = remesh([torus], { operation: 'union', resolution: 32, project: true });
  const originalVolume = 39.162256509;
  assert(Math.abs(projectedTorus.stats.volume - originalVolume) <= Math.abs(rawTorus.stats.volume - originalVolume), 'projection improves torus volume fidelity');

  const again = remesh([source], { operation: 'union', resolution: 32, project: true });
  assert(JSON.stringify(again.mesh) === JSON.stringify(projected.mesh), 'projected remesh is deterministic');

  const smooth = remesh([source], { operation: 'union', resolution: 24, project: true, featureAngle: 179 });
  assert(smooth.ok && smooth.stats.featureEdges === 0, 'a high feature angle suppresses feature edges');
}
