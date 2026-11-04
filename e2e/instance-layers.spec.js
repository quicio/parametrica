import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('creates and inspects an instance layer from a generator source', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(500);

  const layers = await openSection(page, 'Layers');
  const instanceButton = layers.locator('.layer-add-instance');
  await expect(instanceButton).toBeEnabled();
  await expect(layers.locator('.instance-source-picker')).toBeVisible();
  await instanceButton.click();
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const app = window.__parametrica;
    const layer = app.document.layers[app.document.activeLayer];
    return {
      type: layer.type,
      source: layer.source,
      sourceId: layer.source?.layerId,
      layers: app.document.layers.length,
      evaluationLayers: app.evaluation.layers.length,
      instanceMeshes: app.evaluation.layers[app.document.activeLayer].meshes.length,
      mappingIds: app.evaluation.layers[app.document.activeLayer].surfaceMappings.map((mapping) => [mapping.surfaceId, mapping.meshId]),
      instanceIds: app.evaluation.layers[app.document.activeLayer].geometry.map((surface) => surface.id),
    };
  });
  expect(state.type).toBe('instance');
  expect(state.layers).toBe(2);
  expect(state.evaluationLayers).toBe(2);
  expect(state.instanceMeshes).toBe(1);
  expect(state.instanceIds[0]).toContain(':surface:0');
  expect(state.mappingIds[0][0]).toBe(state.instanceIds[0]);
  expect(state.mappingIds[0][1]).toContain(':mesh:0');

  const instance = await openSection(page, 'Instance');
  await expect(instance.locator('.instance-source-select')).toHaveValue(state.sourceId);
  await expect(instance.locator('.instance-source-params')).toBeVisible();
  await expect(page.locator('#panel-section-generator')).toHaveCount(0);
  await expect(page.locator('#panel-section-parameters')).toHaveCount(0);

  const operators = await openSection(page, 'Operators');
  await expect(operators.locator('.op-add-row select option[value="mirror"]')).toHaveCount(0);
  await expect(operators.locator('.op-add-row select option[value="linear-array"]')).toHaveCount(0);
  await expect(operators.locator('.op-add-row select option[value="translate"]')).toHaveCount(1);
  await operators.locator('.op-add-row select').selectOption('translate');
  await operators.locator('.op-add-row button', { hasText: '+ ADD' }).click();
  await page.waitForTimeout(400);

  const transformed = await page.evaluate(() => {
    const app = window.__parametrica;
    const layer = app.evaluation.layers[app.document.activeLayer];
    return {
      errors: app.evaluation.errors.length,
      operators: app.document.layers[app.document.activeLayer].operators.map((op) => op.id),
      worldWidth: layer.worldBBox.width,
      mappingValid: layer.surfaceMappings.every((mapping) => (
        mapping.meshId === layer.meshes[0].id
        && mapping.surfaceId === layer.geometry[0].id
      )),
    };
  });
  expect(transformed.errors).toBe(0);
  expect(transformed.operators).toEqual(['translate']);
  expect(transformed.mappingValid).toBe(true);
});

test('source parameters propagate and source changes reevaluate the instance', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.applyPreset('Torus');
    app.addInstanceLayer(app.document.layers[0].id);
  });
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      rows: app.evaluation.layers[1].geometry[0].grid.rows,
      sourceId: app.document.layers[1].source.layerId,
    };
  });

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.layers[0].generator.params.samplesU = 12;
    app.rebuild();
  });
  await page.waitForTimeout(400);
  const propagated = await page.evaluate(() => window.__parametrica.evaluation.layers[1].geometry[0].grid.rows);
  expect(propagated).not.toBe(before.rows);
  expect(propagated).toBe(13);

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.addLayer('parametric-surface');
    const newSourceId = app.document.layers[app.document.layers.length - 1].id;
    app.setInstanceSource(1, newSourceId);
  });
  await page.waitForTimeout(500);
  const changed = await page.evaluate(() => {
    const app = window.__parametrica;
    const layer = app.document.layers[1];
    return {
      sourceId: layer.source.layerId,
      sourceMesh: app.evaluation.layers[1].meshes[0]?.meta?.sourceLayerId,
      errors: app.evaluation.errors.length,
    };
  });
  expect(changed.sourceId).not.toBe(before.sourceId);
  expect(changed.sourceMesh).toBe(changed.sourceId);
  expect(changed.errors).toBe(0);
});

test('instance UI blocks source deletion and disables generator tools', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.applyPreset('Torus');
    app.addInstanceLayer(app.document.layers[0].id);
  });
  await page.waitForTimeout(500);

  const blocked = await page.evaluate(() => {
    const app = window.__parametrica;
    const before = app.document.layers.length;
    app.removeLayer(0);
    return { before, after: app.document.layers.length };
  });
  expect(blocked.after).toBe(blocked.before);
  await expect(page.locator('#notice')).toContainText('used by 1 instance');

  const mutation = await openSection(page, 'Mutation');
  await expect(mutation.locator('.panel-hint')).toContainText('Select a generator layer');
  const explore = await openSection(page, 'Explore');
  await expect(explore.locator('.panel-hint')).toContainText('Select a generator layer');
  const evolution = await openSection(page, 'Evolution');
  await expect(evolution.locator('.panel-hint')).toContainText('Select a generator layer');

  const layers = await openSection(page, 'Layers');
  await expect(layers.locator('.layer-row.instance .layer-kind-badge')).toHaveText('INSTANCE');
  await expect(layers.locator('.layer-row.instance .layer-source-label')).toContainText('Torus');
});

test('hidden source still feeds visible instances and Fabricate warns single-body', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.applyPreset('Torus');
    app.addInstanceLayer(app.document.layers[0].id);
    app.setLayerVisible(0, false);
  });
  await page.waitForTimeout(500);

  const hidden = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      sourceVisible: app.evaluation.layers[0].visible,
      instanceMeshes: app.evaluation.layers[1].meshes.length,
      errors: app.evaluation.errors.length,
    };
  });
  expect(hidden.sourceVisible).toBe(false);
  expect(hidden.instanceMeshes).toBe(1);
  expect(hidden.errors).toBe(0);

  const fabricate = await openSection(page, 'Fabricate');
  await expect(fabricate.locator('.fabricate-composition-note')).toContainText('one body');
});

test('instance composition persists across reload', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.applyPreset('Torus');
    app.addInstanceLayer(app.document.layers[0].id);
  });
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  await page.waitForTimeout(400);
  const restored = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      layers: app.document.layers.length,
      instance: app.document.layers[1]?.type,
      source: app.document.layers[1]?.source?.layerId,
    };
  });
  expect(restored.layers).toBe(2);
  expect(restored.instance).toBe('instance');
  expect(restored.source).toBe(await page.evaluate(() => window.__parametrica.document.layers[0].id));
});
