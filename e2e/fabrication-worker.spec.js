import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Fabricate runs heavy repair in a worker with progress and cancellation', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.applyPreset('Enneper Surface');
    app.document.view.units = {
      world: 'mm',
      mmPerWorldUnit: 1,
      artboard: 'unitless',
      mmPerArtboardUnit: null,
    };
    app.rebuild();
  });
  await page.waitForTimeout(700);

  const fabricate = await openSection(page, 'Fabricate');
  const repair = fabricate.locator('.fabricate-repair');
  const self = fabricate.locator('.fabricate-self-intersections');
  const status = fabricate.locator('.fabricate-status');
  const cancel = fabricate.locator('.fabricate-cancel');
  const progress = fabricate.locator('.fabricate-progress');
  const exportButton = fabricate.locator('.fabricate-export');

  await repair.check();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.fabrication.remeshResolution = 128;
    app.controls.refreshFabricate();
  });
  await self.selectOption('sdf');
  await expect(status).toContainText('WORKING', { timeout: 5000 });
  await expect(cancel).toBeVisible();
  await expect(progress).toBeVisible();
  await expect(exportButton).toBeDisabled();

  await cancel.click();
  await page.waitForTimeout(300);
  await expect(status).toContainText('CANCELLED');
  await expect(exportButton).toBeDisabled();

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.fabrication.remeshResolution = 32;
    app.controls.refreshFabricate();
  });
  await self.selectOption('auto');
  await expect(status).toContainText('READY · repaired closed body', { timeout: 60_000 });
  await expect(exportButton).toBeEnabled();

  const built = await page.evaluate(() => {
    const result = window.__parametrica.exporter.buildSTLFromCurrent();
    return { triangles: result.triangles, bytes: result.data.length };
  });
  expect(built.triangles).toBeGreaterThan(0);
  expect(built.bytes).toBe(84 + built.triangles * 50);
});
