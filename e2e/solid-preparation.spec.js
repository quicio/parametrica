import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Fabricate caps an open surface explicitly without changing render geometry', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.applyPreset('Catenoid');
    app.document.view.units = {
      world: 'mm',
      mmPerWorldUnit: 1,
      artboard: 'unitless',
      mmPerArtboardUnit: null,
    };
    app.rebuild();
  });
  await page.waitForTimeout(600);

  const before = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.worldBBox,
      mesh: JSON.stringify(app.evaluation.meshes[0]),
      fabrication: { ...app.document.view.fabrication },
    };
  });
  expect(before.fabrication.weld).toBe(false);
  expect(before.fabrication.cap).toBe(false);

  const fabricate = await openSection(page, 'Fabricate');
  const status = fabricate.locator('.fabricate-status');
  const exportButton = fabricate.locator('.fabricate-export');
  const preparation = fabricate.locator('.fabricate-preparation');
  const weld = fabricate.locator('.fabricate-weld');
  const cap = fabricate.locator('.fabricate-cap');

  await expect(weld).not.toBeChecked();
  await expect(cap).not.toBeChecked();
  await expect(status).toContainText('NOT FABRICABLE');
  await expect(exportButton).toBeDisabled();
  await expect(preparation).toHaveText('off');

  await cap.check();
  await page.waitForTimeout(600);
  await expect(status).toContainText('READY');
  await expect(status).toHaveAttribute('data-state', 'ready');
  await expect(exportButton).toBeEnabled();
  await expect(preparation).toContainText('2 loops capped');
  await expect(fabricate.locator('.fabricate-reason')).toContainText('prepared');
  expect(await page.evaluate(() => window.__parametrica.document.view.fabrication.cap)).toBe(true);

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
  expect(built.triangles).toBeGreaterThan(0);
  expect(built.bytes).toBe(84 + built.triangles * 50);
  expect(built.volume).toBeGreaterThan(0);

  const after = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.worldBBox,
      mesh: JSON.stringify(app.evaluation.meshes[0]),
    };
  });
  expect(after.bbox).toEqual(before.bbox);
  expect(after.mesh).toBe(before.mesh);

  await cap.uncheck();
  await page.waitForTimeout(500);
  await expect(status).toContainText('NOT FABRICABLE');
  await expect(exportButton).toBeDisabled();
  await expect(preparation).toHaveText('off');
});
