import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('physical units are explicit and never rescale geometry', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.worldBBox,
      rows: app.evaluation.geometry[0].grid.rows,
      cols: app.evaluation.geometry[0].grid.cols,
      units: app.document.view.units,
    };
  });
  expect(before.units).toEqual({
    world: 'unitless',
    mmPerWorldUnit: null,
    artboard: 'unitless',
    mmPerArtboardUnit: null,
  });

  let scale = await openSection(page, 'Scale');
  await scale.locator('.units-world-select').selectOption('mm');
  await page.waitForTimeout(300);
  scale = await openSection(page, 'Scale');
  const worldFactor = scale.locator('.units-world-factor');
  await expect(worldFactor).toBeEnabled();
  await worldFactor.fill('2');
  await worldFactor.press('Enter');
  await page.waitForTimeout(300);

  scale = await openSection(page, 'Scale');
  await scale.locator('.units-artboard-select').selectOption('cm');
  await page.waitForTimeout(300);
  scale = await openSection(page, 'Scale');
  const pageFactor = scale.locator('.units-artboard-factor');
  await expect(pageFactor).toBeEnabled();
  await pageFactor.fill('10');
  await pageFactor.press('Enter');
  await page.waitForTimeout(350);

  const after = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.worldBBox,
      rows: app.evaluation.geometry[0].grid.rows,
      cols: app.evaluation.geometry[0].grid.cols,
      units: app.document.view.units,
    };
  });
  expect(after.units).toEqual({
    world: 'mm',
    mmPerWorldUnit: 2,
    artboard: 'cm',
    mmPerArtboardUnit: 10,
  });
  expect(after.bbox).toEqual(before.bbox);
  expect(after.rows).toBe(before.rows);
  expect(after.cols).toBe(before.cols);

  scale = await openSection(page, 'Scale');
  await expect(scale.locator('.units-world-size')).toContainText('mm');
  await expect(scale.locator('.units-page-size')).toContainText('mm');
  await expect(scale.locator('.units-warning')).toHaveAttribute('data-valid', 'true');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.units.world = 'unitless';
    app.document.view.units.mmPerWorldUnit = null;
    app.rebuild();
  });
  await page.waitForTimeout(300);
  const unitless = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.worldBBox,
      world: app.document.view.units.world,
    };
  });
  expect(unitless.world).toBe('unitless');
  expect(unitless.bbox).toEqual(before.bbox);
});
