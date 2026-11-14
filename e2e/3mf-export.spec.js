import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Fabricate exports multi-body 3MF with stable object identity', async ({ page }) => {
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
    const { createInstanceLayer } = await import('/src/core/document.ts');
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
  const format = fabricate.locator('.fabricate-format');
  const scope = fabricate.locator('.fabricate-scope');
  const objects = fabricate.locator('.fabricate-objects');
  const exportButton = fabricate.locator('.fabricate-export');

  await expect(format).toHaveValue('stl');
  await expect(exportButton).toHaveText('EXPORT STL');
  await expect(objects).toHaveText('1');
  await scope.selectOption('composition');
  await page.waitForTimeout(500);
  await expect(objects).toHaveText('2');

  await format.selectOption('3mf');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__parametrica.document.view.fabrication.format)).toBe('3mf');
  await expect(exportButton).toHaveText('EXPORT 3MF');
  await expect(objects).toHaveText('2');

  const built = await page.evaluate(() => {
    const result = window.__parametrica.exporter.build3MFFromCurrent();
    return {
      objects: result.objects,
      triangles: result.triangles,
      unit: result.unit,
      bytes: result.data.length,
    };
  });
  expect(built.objects).toBe(2);
  expect(built.triangles).toBeGreaterThan(0);
  expect(built.unit).toBe('millimeter');
  expect(built.bytes).toBeGreaterThan(0);

  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.3mf$/);

  const after = await page.evaluate(() => {
    const app = window.__parametrica;
    return { meshes: JSON.stringify(app.evaluation.layers.map((layer) => layer.meshes)) };
  });
  expect(after.meshes).toBe(before.meshes);

  await format.selectOption('stl');
  await page.waitForTimeout(400);
  await expect(exportButton).toHaveText('EXPORT STL');
  expect(await page.evaluate(() => window.__parametrica.document.view.fabrication.format)).toBe('stl');
});
