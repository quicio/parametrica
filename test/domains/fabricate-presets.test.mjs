/**
 * fabricate-presets.test.mjs — built-in Fabricate examples stay usable.
 */

import '../../src/generators/index.js';
import '../../src/operators/index.js';
import '../../src/render/passes/index.js';
import { BUILT_IN_PRESETS } from '../../src/presets/builtins.js';
import { evaluateDocument } from '../../src/core/engine.js';
import { buildFabricationReport } from '../../src/application/fabricationSource.js';
import { initManifold } from '../../src/geometry/manifoldEngine.js';
import { project3D } from '../../src/view/camera.js';

const PRESETS = [
  'Solid Torus',
  'Twin Tori',
  'Boolean Union',
  'Boolean Difference',
  'Cap Catenoid',
  'SDF Enneper',
  'Solid Vase 200',
];

export async function run(assert) {
  await initManifold();
  for (const name of PRESETS) {
    assert(typeof BUILT_IN_PRESETS[name] === 'function', `${name} preset exists`);
    const doc = BUILT_IN_PRESETS[name]();
    assert(doc.view.units.world === 'mm' && doc.view.units.mmPerWorldUnit > 0, `${name} has a physical scale`);
    assert(doc.view.fabrication && typeof doc.view.fabrication === 'object', `${name} carries fabrication settings`);
    const evaluation = evaluateDocument(doc, { time: 0 });
    assert(evaluation.errors.length === 0, `${name} evaluates without errors`);
    const report = buildFabricationReport({
      evaluation,
      layerIndex: doc.activeLayer ?? 0,
      units: doc.view.units,
      preparation: doc.view.fabrication,
    });
    assert(report.exportable === true, `${name} is exportable from Fabricate`);
    assert(report.triangles > 0, `${name} has exportable triangles`);
  }

  const torus = buildFabricationReport({
    evaluation: evaluateDocument(BUILT_IN_PRESETS['Solid Torus'](), { time: 0 }),
    layerIndex: 0,
    units: BUILT_IN_PRESETS['Solid Torus']().view.units,
    preparation: BUILT_IN_PRESETS['Solid Torus']().view.fabrication,
  });
  assert(torus.source?.kind === 'mesh', 'Solid Torus resolves a mesh source');

  const twin = buildFabricationReport({
    evaluation: evaluateDocument(BUILT_IN_PRESETS['Twin Tori'](), { time: 0 }),
    layerIndex: 1,
    units: BUILT_IN_PRESETS['Twin Tori']().view.units,
    preparation: BUILT_IN_PRESETS['Twin Tori']().view.fabrication,
  });
  assert(twin.bodies === 2, 'Twin Tori exposes two bodies');

  const union = buildFabricationReport({
    evaluation: evaluateDocument(BUILT_IN_PRESETS['Boolean Union'](), { time: 0 }),
    layerIndex: 1,
    units: BUILT_IN_PRESETS['Boolean Union']().view.units,
    preparation: BUILT_IN_PRESETS['Boolean Union']().view.fabrication,
  });
  assert(union.boolean?.stats?.strategy === 'manifold', 'Boolean Union uses Manifold');
  assert(union.bodies === 1, 'Boolean Union produces one body');

  const sdf = buildFabricationReport({
    evaluation: evaluateDocument(BUILT_IN_PRESETS['SDF Enneper'](), { time: 0 }),
    layerIndex: 0,
    units: BUILT_IN_PRESETS['SDF Enneper']().view.units,
    preparation: BUILT_IN_PRESETS['SDF Enneper']().view.fabrication,
  });
  assert(sdf.repair?.selfIntersectionStrategy === 'sdf', 'SDF Enneper reports the SDF strategy');

  const vaseDoc = BUILT_IN_PRESETS['Solid Vase 200']();
  const vaseEvaluation = evaluateDocument(vaseDoc, { time: 0 });
  const vaseReport = buildFabricationReport({
    evaluation: vaseEvaluation,
    layerIndex: 0,
    units: vaseDoc.view.units,
    preparation: vaseDoc.view.fabrication,
  });
  assert(vaseReport.exportable === true, 'Solid Vase 200 is exportable');
  assert(Math.abs(vaseReport.bbox.depth - 200) < 1, 'Solid Vase 200 is 200 mm tall');
  assert(vaseReport.bbox.width > 170 && vaseReport.bbox.width < 180, 'Solid Vase 200 is about 175 mm wide');
  assert(vaseReport.triangles > 0 && vaseReport.volume > 0, 'Solid Vase 200 has positive fabrication geometry');
  const base = project3D(0, 0, 0, vaseDoc.view.camera);
  const mouth = project3D(0, 0, 200, vaseDoc.view.camera);
  assert(base && mouth && mouth.y < base.y, 'Solid Vase 200 opens upward in the 3D view');

  // Circular cross-sections around Z make the front and side silhouettes equal.
  const outerMesh = vaseEvaluation.layers[0].meshes[0];
  const rows = new Map();
  for (const point of outerMesh.vertices) {
    const key = point.z.toFixed(6);
    const radius = Math.hypot(point.x, point.y);
    const row = rows.get(key) ?? { min: Infinity, max: -Infinity, count: 0 };
    row.min = Math.min(row.min, radius);
    row.max = Math.max(row.max, radius);
    row.count += 1;
    rows.set(key, row);
  }
  let worstSpread = 0;
  for (const row of rows.values()) worstSpread = Math.max(worstSpread, row.max - row.min);
  assert(rows.size > 2 && worstSpread < 1e-6, 'Solid Vase 200 has circular cross-sections (front and side match)');
  const mouthRow = [...rows.entries()].sort((a, b) => Number(b[0]) - Number(a[0]))[0][1];
  const mouthDiameter = mouthRow.max + mouthRow.min;
  assert(Math.abs(mouthDiameter - 135) < 3, `Solid Vase 200 mouth is about 135 mm (got ${mouthDiameter.toFixed(1)})`);

  const challenge = BUILT_IN_PRESETS['Möbius Challenge']();
  const challengeReport = buildFabricationReport({
    evaluation: evaluateDocument(challenge, { time: 0 }),
    layerIndex: 0,
    units: challenge.view.units,
    preparation: challenge.view.fabrication,
  });
  assert(challengeReport.exportable === false, 'Möbius Challenge remains an explicit repair challenge');
  assert(Boolean(challengeReport.reason), 'Möbius Challenge explains why it is not fabricable');
}
