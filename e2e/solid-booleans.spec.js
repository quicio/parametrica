import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  await page.evaluate(() => window.__parametricaManifoldReady);
}

test('Fabricate applies explicit union, difference and empty intersection', async ({ page }) => {
  await boot(page);
  await page.evaluate(async () => {
    const app = window.__parametrica;
    app.applyPreset('Torus');
    app.document.generator.params.samplesU = 24;
    app.document.generator.params.samplesV = 12;
    app.document.view.units = {
      world: 'mm',
      mmPerWorldUnit: 1,
      artboard: 'unitless',
      mmPerArtboardUnit: null,
    };
    const { createInstanceLayer } = await import('/src/core/document.js');
    const source = app.document.layers[0];
    app.document.layers.push(createInstanceLayer(source.id, {
      name: 'Torus copy',
      operators: [{
        id: 'translate',
        enabled: true,
        mods: {},
        params: { dx: 0, dy: 0, dz: 5 },
      }],
    }));
    app.document.activeLayer = app.document.layers.length - 1;
    app.rebuild();
  });
  await page.waitForTimeout(700);

  const before = await page.evaluate(() => {
    const app = window.__parametrica;
    return { meshes: JSON.stringify(app.evaluation.layers.map((layer) => layer.meshes)) };
  });

  const fabricate = await openSection(page, 'Fabricate');
  const status = fabricate.locator('.fabricate-status');
  const scope = fabricate.locator('.fabricate-scope');
  const boolean = fabricate.locator('.fabricate-boolean');
  const booleanStatus = fabricate.locator('.fabricate-boolean-status');
  const bodies = fabricate.locator('.fabricate-bodies');
  const reason = fabricate.locator('.fabricate-reason');
  const checks = fabricate.locator('.fabricate-warnings');
  const exportButton = fabricate.locator('.fabricate-export');

  await expect(boolean).toBeDisabled();
  await scope.selectOption('composition');
  await page.waitForTimeout(500);
  await expect(boolean).toBeEnabled();
  await expect(boolean).toHaveValue('none');
  await expect(bodies).toHaveText('2');

  await boolean.selectOption('union');
  await page.waitForTimeout(900);
  await expect(status).toContainText('READY · union result');
  await expect(booleanStatus).toContainText('union · 2 operands');
  await expect(booleanStatus).toContainText('manifold');
  await expect(bodies).toHaveText('1');
  await expect(reason).toContainText('union of 2 bodies');
  await expect(exportButton).toBeEnabled();
  const unionVolume = await page.evaluate(() => {
    const result = window.__parametrica.exporter.buildSTLFromCurrent();
    return { triangles: result.triangles, volume: result.volume, bytes: result.data.length, unit: result.unit };
  });
  expect(unionVolume.unit).toBe('mm');
  expect(unionVolume.triangles).toBeGreaterThan(0);
  expect(unionVolume.bytes).toBe(84 + unionVolume.triangles * 50);

  await boolean.selectOption('difference');
  await page.waitForTimeout(900);
  await expect(status).toContainText('READY · difference result');
  await expect(booleanStatus).toContainText('difference · 2 operands');
  await expect(reason).toContainText('difference of 2 bodies');
  const differenceVolume = await page.evaluate(() => window.__parametrica.exporter.buildSTLFromCurrent().volume);
  expect(differenceVolume).toBeGreaterThan(0);
  expect(differenceVolume).toBeLessThan(unionVolume.volume);

  await boolean.selectOption('intersection');
  await page.waitForTimeout(900);
  await expect(status).toContainText('NOT FABRICABLE');
  await expect(booleanStatus).toHaveText('empty');
  await expect(reason).toContainText('Boolean result is empty');
  await expect(checks).toContainText('Boolean result is empty');
  await expect(exportButton).toBeDisabled();

  await boolean.selectOption('union');
  await page.waitForTimeout(900);
  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.stl$/);

  const after = await page.evaluate(() => {
    const app = window.__parametrica;
    return { meshes: JSON.stringify(app.evaluation.layers.map((layer) => layer.meshes)) };
  });
  expect(after.meshes).toBe(before.meshes);

  await scope.selectOption('single');
  await page.waitForTimeout(500);
  await expect(boolean).toBeDisabled();
  await expect(boolean).toHaveValue('none');
  expect(await page.evaluate(() => window.__parametrica.document.view.fabrication.boolean)).toBe('none');
});
