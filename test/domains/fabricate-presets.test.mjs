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
import { exportBinarySTL } from '../../src/export/stl.js';
import { buildRenderScene } from '../../src/application/renderSceneBuilder.js';

const PRESETS = [
  'Solid Torus',
  'Twin Tori',
  'Boolean Union',
  'Boolean Difference',
  'Cap Catenoid',
  'Solid Vase 200',
  'Pencil Cup 100',
  'Planter 120',
  'Bud Vase 160',
  'Napkin Ring 50',
  'Coaster 90',
  'Twisted Totem 220',
  'Lampshade 180',
  'Candle Holder 80',
  'Soap Dish 120',
  'Desk Tray 160',
  'Napkin Holder 140',
  'Wall Planter 120',
  'Wall Hook 70',
  'Lampshade Ring Set',
  'Stackable Tray 160',
  'Lattice Vase 200',
  'Organic Lattice Vase 200',
  'Perforated Vase 200',
];

export async function run(assert) {
  await initManifold();
  const reports = new Map();
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
    reports.set(name, report);
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

  const expectations = {
    'Pencil Cup 100': { depth: 100, width: 65 },
    'Planter 120': { depth: 120, width: 110 },
    'Bud Vase 160': { depth: 160, width: 64 },
    'Napkin Ring 50': { depth: 30, width: 48 },
    'Coaster 90': { depth: 6, width: 90 },
    'Twisted Totem 220': { depth: 220, width: 64 },
    'Lampshade 180': { depth: 180, width: 170 },
    'Candle Holder 80': { depth: 80, width: 60 },
    'Soap Dish 120': { depth: 18, width: 120 },
    'Desk Tray 160': { depth: 25, width: 160 },
    'Napkin Holder 140': { depth: 60, width: 140 },
    'Wall Planter 120': { depth: 120, width: 140 },
    'Wall Hook 70': { depth: 70, width: 44 },
    'Lampshade Ring Set': { depth: 180, width: 170 },
    'Stackable Tray 160': { depth: 30, width: 168 },
  };
  for (const [name, expected] of Object.entries(expectations)) {
    const report = reports.get(name);
    assert(Math.abs(report.bbox.depth - expected.depth) < 1, `${name} is ${expected.depth} mm tall`);
    assert(Math.abs(report.bbox.width - expected.width) < 2, `${name} is about ${expected.width} mm wide`);
    assert(report.volume > 1000, `${name} has a meaningful solid volume`);
    assert(report.printability?.status === 'ok', `${name} passes the printability probe`);
    assert(report.printability?.bedContactAreaMm2 > 0, `${name} has bed contact`);
    assert((report.printability?.overhangRatio ?? 1) < 0.2, `${name} stays under the overhang warning threshold`);
  }
  assert(BUILT_IN_PRESETS['Pencil Cup 100']().layers.length === 2, 'Pencil Cup 100 is a hollow shell');
  assert(BUILT_IN_PRESETS['Planter 120']().layers.length === 2, 'Planter 120 is a hollow shell');
  assert(BUILT_IN_PRESETS['Bud Vase 160']().layers.length === 2, 'Bud Vase 160 is a hollow shell');
  assert(BUILT_IN_PRESETS['Napkin Ring 50']().layers.length === 2, 'Napkin Ring 50 is a hollow shell');
  assert(BUILT_IN_PRESETS['Coaster 90']().layers.length === 1, 'Coaster 90 is one solid body');
  assert(BUILT_IN_PRESETS['Twisted Totem 220']().layers.length === 1, 'Twisted Totem 220 is one solid body');

  const cutterExpectations = {
    'Lampshade 180': 0,
    'Candle Holder 80': 2,
    'Soap Dish 120': 3,
    'Desk Tray 160': 1,
    'Napkin Holder 140': 2,
    'Wall Planter 120': 3,
    'Wall Hook 70': 2,
    'Lampshade Ring Set': 0,
    'Stackable Tray 160': 0,
  };
  for (const [name, cutters] of Object.entries(cutterExpectations)) {
    const doc = BUILT_IN_PRESETS[name]();
    assert(doc.layers.filter((layer) => layer.fabricationRole === 'cutter').length === cutters,
      `${name} keeps ${cutters} cutter layer(s)`);
    const evaluation = evaluateDocument(doc, { time: 0 });
    const scene = buildRenderScene({ evaluation, document: doc, view: doc.view });
    assert(scene.layers.length === doc.layers.length - cutters,
      `${name} hides cutter layers from the technical render scene`);
    assert(scene.layers.every((layer) => layer.fabricationRole !== 'cutter'),
      `${name} never renders a cutter as authored geometry`);
  }
  const ringSet = reports.get('Lampshade Ring Set');
  assert(ringSet.bodies === 3 && ringSet.multiBody === true, 'Lampshade Ring Set exports three bodies');
  assert(ringSet.groups?.length === 3, 'Lampshade Ring Set keeps three boolean groups');
  assert(ringSet.groups.every((group) => group.operation === 'difference'), 'each lampshade group is a difference');
  assert(BUILT_IN_PRESETS['Lampshade Ring Set']().layers.length === 6, 'Lampshade Ring Set keeps six shell layers');
  assert(BUILT_IN_PRESETS['Stackable Tray 160']().layers.length === 2, 'Stackable Tray 160 is one hollow shell');
  const badGroupDoc = BUILT_IN_PRESETS['Pencil Cup 100']();
  badGroupDoc.view.fabrication = {
    ...badGroupDoc.view.fabrication,
    scope: 'composition',
    boolean: 'none',
    groups: [{ op: 'difference', layers: ['missing-layer'] }],
  };
  const badGroupReport = buildFabricationReport({
    evaluation: evaluateDocument(badGroupDoc, { time: 0 }),
    layerIndex: 0,
    units: badGroupDoc.view.units,
    preparation: badGroupDoc.view.fabrication,
  });
  assert(badGroupReport.exportable === false, 'a missing group layer blocks export');
  assert(/Boolean group/i.test(badGroupReport.reason ?? ''), 'a failed group explains which group failed');

  const reusedGroupDoc = BUILT_IN_PRESETS['Pencil Cup 100']();
  const [firstLayer, secondLayer] = reusedGroupDoc.layers;
  reusedGroupDoc.view.fabrication = {
    ...reusedGroupDoc.view.fabrication,
    scope: 'composition',
    boolean: 'none',
    groups: [
      { op: 'difference', layers: [firstLayer.id, secondLayer.id] },
      { op: 'difference', layers: [firstLayer.id, secondLayer.id] },
    ],
  };
  const reusedReport = buildFabricationReport({
    evaluation: evaluateDocument(reusedGroupDoc, { time: 0 }),
    layerIndex: 0,
    units: reusedGroupDoc.view.units,
    preparation: reusedGroupDoc.view.fabrication,
  });
  assert(reusedReport.exportable === false, 'a layer reused across groups blocks export');
  assert(/reused/i.test(reusedReport.reason ?? ''), 'reused group layers are reported');
  assert(!BUILT_IN_PRESETS['SDF Enneper'], 'SDF Enneper is removed from the fabricable library');
  assert(!BUILT_IN_PRESETS['Möbius Challenge'], 'Möbius Challenge is removed from the fabricable library');

  const latticeDoc = BUILT_IN_PRESETS['Lattice Vase 200']();
  const latticeEvaluation = evaluateDocument(latticeDoc, { time: 0 });
  const latticeReport = buildFabricationReport({
    evaluation: latticeEvaluation,
    layerIndex: 0,
    units: latticeDoc.view.units,
    preparation: latticeDoc.view.fabrication,
  });
  assert(latticeReport.exportable === true, 'Lattice Vase 200 is exportable');
  assert(latticeReport.lattice?.struts > 100, 'Lattice Vase 200 builds a strut network');
  assert((latticeReport.lattice?.radius ?? 0) > 1, 'Lattice Vase 200 reports its strut radius');
  assert(latticeReport.lattice?.joints > 100, 'Lattice Vase 200 rounds its junctions');
  assert(Math.abs(latticeReport.bbox.depth - 200) < 1, 'Lattice Vase 200 is 200 mm tall');
  assert(latticeReport.bbox.width > 170 && latticeReport.bbox.width < 180, 'Lattice Vase 200 is about 175 mm wide');
  assert(latticeReport.triangles > 1000 && latticeReport.volume > 0, 'Lattice Vase 200 has a positive solid body');
  const stl = exportBinarySTL(latticeReport.source.geometry, {
    units: latticeDoc.view.units,
    name: 'Lattice Vase 200',
  });
  assert(stl.triangles === latticeReport.triangles && stl.data.length > 84, 'Lattice Vase 200 exports binary STL');

  assert(latticeReport.printability?.minFeatureMm > 3, 'Lattice Vase 200 reports its printable strut size');
  assert(latticeReport.manufacturing?.profile?.process === 'fdm', 'Lattice Vase 200 carries a manufacturing profile');
  assert(latticeReport.manufacturing?.checks?.length >= 5, 'Lattice Vase 200 reports manufacturing checks');
  assert(latticeReport.manufacturing?.exportAllowed === true, 'warn-mode manufacturing checks allow export');

  const organic = reports.get('Organic Lattice Vase 200');
  assert(organic?.lattice?.curveStyle === 'organic', 'Organic Lattice Vase 200 uses surface curves');
  assert(organic?.lattice?.finishQuality === 'standard', 'Organic Lattice Vase 200 uses the standard finish');
  assert(organic?.lattice?.envelope === 'outer', 'Organic Lattice Vase 200 keeps the outer envelope');
  assert(organic?.lattice?.openingGauge?.count > 0, 'Organic Lattice Vase 200 measures openings');
  assert(Math.abs(organic.bbox.depth - 200) < 1, 'Organic Lattice Vase 200 is 200 mm tall');
  assert(organic.bbox.width > 170 && organic.bbox.width < 180, 'Organic Lattice Vase 200 is about 175 mm wide');
  assert(organic.printability?.lattice?.finishQuality === 'standard', 'Organic Lattice Vase 200 reports finish in print checks');

  const perforatedDoc = BUILT_IN_PRESETS['Perforated Vase 200']();
  const perforatedEvaluation = evaluateDocument(perforatedDoc, { time: 0 });
  const perforatedReport = buildFabricationReport({
    evaluation: perforatedEvaluation,
    layerIndex: 0,
    units: perforatedDoc.view.units,
    preparation: perforatedDoc.view.fabrication,
  });
  assert(perforatedReport.exportable === true, 'Perforated Vase 200 is exportable');
  assert(perforatedReport.lattice?.mode === 'cutouts', 'Perforated Vase 200 uses cutouts');
  assert(perforatedReport.lattice?.holes > 50, 'Perforated Vase 200 cuts a useful hole pattern');
  assert(Math.abs(perforatedReport.bbox.depth - 200) < 1, 'Perforated Vase 200 is 200 mm tall');
  assert(perforatedReport.bbox.width > 170 && perforatedReport.bbox.width < 180, 'Perforated Vase 200 is about 175 mm wide');
  assert(perforatedReport.triangles > 1000 && perforatedReport.volume > 0, 'Perforated Vase 200 has a positive body');
  assert(perforatedReport.printability?.minFeatureMm > 3, 'Perforated Vase 200 reports its strut size');
  const perforatedStl = exportBinarySTL(perforatedReport.source.geometry, {
    units: perforatedDoc.view.units,
    name: 'Perforated Vase 200',
  });
  assert(perforatedStl.triangles === perforatedReport.triangles, 'Perforated Vase 200 exports binary STL');

}
