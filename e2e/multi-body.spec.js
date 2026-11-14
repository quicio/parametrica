import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Fabricate exports multiple disjoint bodies only when scoped', async ({ page }) => {
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
    return {
      meshes: JSON.stringify(app.evaluation.layers.map((layer) => layer.meshes)),
      layers: app.document.layers.length,
    };
  });
  expect(before.layers).toBe(2);

  const fabricate = await openSection(page, 'Fabricate');
  const status = fabricate.locator('.fabricate-status');
  const scope = fabricate.locator('.fabricate-scope');
  const bodies = fabricate.locator('.fabricate-bodies');
  const reason = fabricate.locator('.fabricate-reason');
  const source = fabricate.locator('.fabricate-source');
  const compositionNote = fabricate.locator('.fabricate-composition-note');
  const exportButton = fabricate.locator('.fabricate-export');

  await expect(scope).toHaveValue('single');
  await expect(bodies).toHaveText('1');
  await expect(status).toContainText('READY');
  const singleTriangles = Number(await fabricate.locator('.fabricate-triangles').textContent());

  await scope.selectOption('composition');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__parametrica.document.view.fabrication.scope)).toBe('composition');
  await expect(bodies).toHaveText('2');
  await expect(status).toContainText('READY · 2 bodies');
  await expect(reason).toContainText('2 disjoint bodies');
  await expect(compositionNote).toContainText('not a union');
  await expect(source).toContainText('multi-body mesh · 2 shells');
  await expect(exportButton).toBeEnabled();

  const multiTriangles = Number(await fabricate.locator('.fabricate-triangles').textContent());
  expect(multiTriangles).toBe(singleTriangles * 2);

  const built = await page.evaluate(() => {
    const result = window.__parametrica.exporter.buildSTLFromCurrent();
    return {
      bytes: result.data.length,
      triangles: result.triangles,
      unit: result.unit,
      volume: result.volume,
    };
  });
  expect(built.unit).toBe('mm');
  expect(built.triangles).toBe(multiTriangles);
  expect(built.bytes).toBe(84 + built.triangles * 50);
  expect(built.volume).toBeGreaterThan(0);

  await scope.selectOption('active-layer');
  await page.waitForTimeout(500);
  await expect(bodies).toHaveText('1');
  await expect(status).toContainText('READY · validated closed body');

  const after = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      meshes: JSON.stringify(app.evaluation.layers.map((layer) => layer.meshes)),
    };
  });
  expect(after.meshes).toBe(before.meshes);
});
