import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  await page.evaluate(() => window.__parametricaManifoldReady);
}

test('CSG auto uses Manifold for overlapping non-convex tori', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.evaluate(async () => {
    const app = window.__parametrica;
    app.applyPreset('Torus');
    app.document.view.units = {
      world: 'mm',
      mmPerWorldUnit: 1,
      artboard: 'unitless',
      mmPerArtboardUnit: null,
    };
    app.document.view.fabrication.remeshResolution = 32;
    const { createInstanceLayer } = await import('/src/core/document.js');
    const source = app.document.layers[0];
    app.document.layers.push(createInstanceLayer(source.id, {
      name: 'Torus overlap',
      operators: [{
        id: 'translate',
        enabled: true,
        mods: {},
        params: { dx: 0, dy: 0, dz: 0.5 },
      }],
    }));
    app.document.activeLayer = app.document.layers.length - 1;
    app.rebuild();
  });
  await page.waitForTimeout(700);

  const before = await page.evaluate(() => ({
    meshes: JSON.stringify(window.__parametrica.evaluation.layers.map((layer) => layer.meshes)),
  }));

  const fabricate = await openSection(page, 'Fabricate');
  const scope = fabricate.locator('.fabricate-scope');
  const boolean = fabricate.locator('.fabricate-boolean');
  const csg = fabricate.locator('.fabricate-csg-strategy');
  const status = fabricate.locator('.fabricate-status');
  const booleanStatus = fabricate.locator('.fabricate-boolean-status');
  const reason = fabricate.locator('.fabricate-reason');
  const exportButton = fabricate.locator('.fabricate-export');

  await scope.selectOption('composition');
  await page.waitForTimeout(500);
  await boolean.selectOption('union');
  await page.waitForTimeout(5000);
  await expect(status).toContainText('READY · union result');
  await expect(booleanStatus).toContainText('manifold');
  await expect(reason).toContainText('union of 2 bodies');
  await expect(exportButton).toBeEnabled();
  expect(await page.evaluate(() => window.__parametrica.document.view.fabrication.csgStrategy)).toBe('auto');

  const built = await page.evaluate(() => {
    const result = window.__parametrica.exporter.buildSTLFromCurrent();
    return { triangles: result.triangles, bytes: result.data.length, unit: result.unit, volume: result.volume };
  });
  expect(built.unit).toBe('mm');
  expect(built.triangles).toBeGreaterThan(0);
  expect(built.bytes).toBe(84 + built.triangles * 50);
  expect(built.volume).toBeGreaterThan(0);

  await csg.selectOption('bsp');
  await page.waitForTimeout(3500);
  await expect(status).toContainText('NOT FABRICABLE');
  await expect(reason).toContainText('Boolean union failed');
  await expect(exportButton).toBeDisabled();

  await csg.selectOption('manifold');
  await page.waitForTimeout(5000);
  await expect(status).toContainText('READY · union result');
  await expect(booleanStatus).toContainText('manifold');
  await expect(exportButton).toBeEnabled();

  await csg.selectOption('remesh');
  await page.waitForTimeout(5000);
  await expect(status).toContainText('READY · union result');
  await expect(booleanStatus).toContainText('remesh');
  await expect(exportButton).toBeEnabled();

  const after = await page.evaluate(() => ({
    meshes: JSON.stringify(window.__parametrica.evaluation.layers.map((layer) => layer.meshes)),
  }));
  expect(after.meshes).toBe(before.meshes);
});
