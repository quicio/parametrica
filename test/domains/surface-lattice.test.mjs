/**
 * surface-lattice.test.mjs — cellular network and its fabrication solid.
 */

import '../../src/generators/index.js';
import '../../src/operators/index.js';
import '../../src/render/passes/index.js';
import { buildRevolveLattice } from '../../src/geometry/latticeNetwork.js';
import { buildLatticeSolid } from '../../src/geometry/latticeSolid.js';
import { initManifold } from '../../src/geometry/manifoldEngine.js';
import { validateMesh } from '../../src/geometry/validate.js';
import { evaluateDocument } from '../../src/core/engine.js';
import { BUILT_IN_PRESETS } from '../../src/presets/builtins.js';
import { buildRenderScene } from '../../src/application/renderSceneBuilder.js';

const PROFILE = (v) => 45
  + 42.5 * Math.exp(-(((v - 0.42) / 0.22) ** 2))
  + 22.5 * Math.exp(-(((v - 1.0) / 0.12) ** 2))
  - 12 * Math.exp(-(((v - 0.75) / 0.14) ** 2));

export async function run(assert) {
  const options = { radiusAt: PROFILE, height: 200, floor: 3, cellSize: 20, seed: 7, samples: 4 };
  const a = buildRevolveLattice(options);
  assert(a.stats.cells > 100, `lattice has a useful cell count (${a.stats.cells})`);
  assert(a.stats.edges > a.stats.cells, 'lattice network has more edges than cells');
  assert(a.stats.minEdge >= 1.9, 'short sliver edges are filtered out');
  assert(a.stats.meanEdge > 8 && a.stats.meanEdge < 30, 'mean strut edge stays near the requested cell size');
  assert(a.stats.cellAreaCv < 0.35, 'cell areas stay within a reasonable spread');

  const b = buildRevolveLattice({ ...options });
  assert(JSON.stringify(a.curves) === JSON.stringify(b.curves), 'lattice network is deterministic for a seed');
  const changed = buildRevolveLattice({ ...options, seed: 8 });
  assert(JSON.stringify(a.curves) !== JSON.stringify(changed.curves), 'changing the seed changes the cell layout');

  let minZ = Infinity;
  let maxZ = -Infinity;
  const rows = new Map();
  for (const curve of a.curves) {
    for (const point of curve.points) {
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
      const key = point.z.toFixed(4);
      const radius = Math.hypot(point.x, point.y);
      const row = rows.get(key) ?? { min: Infinity, max: -Infinity };
      row.min = Math.min(row.min, radius);
      row.max = Math.max(row.max, radius);
      rows.set(key, row);
    }
  }
  assert(Math.abs(minZ - 3) < 1e-6 && Math.abs(maxZ - 200) < 1e-6, 'lattice spans floor to mouth');
  let worstRadius = 0;
  for (const curve of a.curves) {
    for (const point of curve.points) {
      const expected = PROFILE(point.z / 200);
      worstRadius = Math.max(worstRadius, Math.abs(Math.hypot(point.x, point.y) - expected));
    }
  }
  assert(worstRadius < 1e-6, 'lattice sits on a surface of revolution (front and side match)');

  await initManifold();
  const doc = BUILT_IN_PRESETS['Lattice Vase 200']();
  doc.generator.params = { ...doc.generator.params, cellSize: 40, height: 80 };
  const evaluation = evaluateDocument(doc, { time: 0 });
  assert(evaluation.errors.length === 0, 'lattice preset evaluates without errors');
  assert(evaluation.curves.length > 10, 'lattice preset emits a strut network');
  const solid = buildLatticeSolid(evaluation.layers[0].geometry, {
    strut: 3.5,
    floor: 3,
    rim: 4,
    height: 80,
  });
  assert(solid.ok, `lattice network becomes a closed solid (${solid.error?.message ?? 'ok'})`);
  if (solid.ok) {
    const validation = validateMesh(solid.geometry);
    assert(validation.ok && validation.meta?.closed, 'lattice solid is closed');
    assert(validation.meta?.manifold, 'lattice solid is manifold');
    assert((validation.meta?.volume ?? 0) > 0, 'lattice solid has positive volume');
    assert(solid.stats.struts > 10 && solid.stats.radius > 0, 'lattice solid reports its struts');
    assert(solid.stats.joints >= 0, 'lattice solid reports its rounded joints');

    const layerId = doc.layers[0].id;
    const networkScene = buildRenderScene({ evaluation, document: doc });
    const networkLayer = networkScene.layers.find((layer) => layer.id === layerId);
    assert(networkLayer && networkLayer.meshes.length === 0, 'network scene draws no prepared mesh');

    const solidScene = buildRenderScene({
      evaluation,
      document: doc,
      preview: { mesh: solid.geometry, layerId },
    });
    const solidLayer = solidScene.layers.find((layer) => layer.id === layerId);
    assert(solidLayer?.meshes.length === 1, 'solid preview injects the prepared mesh');
    assert(solidLayer.modes.includes('lattice-preview'), 'solid preview uses the batched lattice pass');
    assert(
      solidLayer.meshes[0].vertices.length === solid.geometry.vertices.length,
      'solid preview projects every prepared vertex',
    );
  }
}
