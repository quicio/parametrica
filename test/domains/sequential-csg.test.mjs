/**
 * sequential-csg.test.mjs — ordered recipe sanitization and pipeline.
 */

import '../../src/generators/index.ts';
import '../../src/operators/index.ts';
import '../../src/render/passes/index.ts';
import { BUILT_IN_PRESETS } from '../../src/presets/builtins.ts';
import { sanitizeFabricationSettings } from '../../src/core/document.ts';
import { evaluateDocument } from '../../src/core/engine.ts';
import { buildFabricationReport } from '../../src/application/fabricationSource.ts';
import { initManifold } from '../../src/geometry/manifoldEngine.ts';

export async function run(assert) {
  const settings = sanitizeFabricationSettings({
    recipe: [
      { op: 'union', layers: ['a', 'a', 'b'] },
      { op: 'none', layers: ['c'] },
      { op: 'difference', layers: [] },
      { op: 'intersection', layers: ['d'] },
    ],
  });
  const recipe = settings.recipe;
  assert(recipe.length === 2, 'recipe drops invalid steps');
  assert(recipe[0]?.op === 'union' && recipe[0]?.layers.length === 2, 'recipe deduplicates layers');
  assert(recipe[1]?.op === 'intersection', 'recipe preserves step order');

  await initManifold();
  const doc = BUILT_IN_PRESETS['Sequential CSG']();
  const report = buildFabricationReport({
    evaluation: evaluateDocument(doc, { time: 0 }),
    layerIndex: doc.activeLayer ?? 0,
    units: doc.view.units,
    preparation: doc.view.fabrication,
  });
  assert(report.exportable === true, 'sequential recipe is exportable');
  assert(report.bodies === 1, 'sequential recipe produces one body');
  assert(report.recipe?.length === 2, 'report exposes both recipe steps');
  assert(report.recipe?.[0]?.operation === 'union', 'first step unions its layers');
  assert(report.recipe?.[1]?.operation === 'difference', 'second step subtracts its layers');
  assert(report.boolean?.operation === 'recipe', 'boolean metadata names the recipe');
  assert(report.triangles > 0, 'sequential recipe has triangles');

  const again = buildFabricationReport({
    evaluation: evaluateDocument(doc, { time: 0 }),
    layerIndex: doc.activeLayer ?? 0,
    units: doc.view.units,
    preparation: doc.view.fabrication,
  });
  assert(again.triangles === report.triangles, 'sequential recipe is deterministic');

  const bad = BUILT_IN_PRESETS['Sequential CSG']();
  bad.view.fabrication = {
    ...bad.view.fabrication,
    recipe: [{ op: 'union', layers: ['missing-layer'] }],
  };
  const badReport = buildFabricationReport({
    evaluation: evaluateDocument(bad, { time: 0 }),
    layerIndex: 0,
    units: bad.view.units,
    preparation: bad.view.fabrication,
  });
  assert(badReport.exportable === false, 'missing recipe layers block export');
  assert(String(badReport.reason).includes('no validated body'), 'missing recipe layers explain the failure');
}
