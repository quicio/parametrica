import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Fabricate groups controls and explains the next action', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(500);

  const fabricate = await openSection(page, 'Fabricate');
  const groupTitles = fabricate.locator('.fabricate-group-title');
  await expect(groupTitles).toHaveText(['Source', 'Finish', 'Repair', 'Combine', 'Output', 'Checks']);

  const plan = fabricate.locator('.fabricate-plan');
  const suggestion = fabricate.locator('.fabricate-suggestion');
  const nextAction = fabricate.locator('.fabricate-next-action');
  await expect(plan).toContainText('Plan');
  await expect(plan).toContainText('single body');
  await expect(plan).toContainText('STL');
  await expect(plan).toContainText('unitless');
  await expect(suggestion).toContainText('Suggested resolution');
  await expect(nextAction).toContainText('world scale');

  const repair = fabricate.locator('.fabricate-repair');
  const quality = fabricate.locator('.fabricate-quality');
  const resolution = fabricate.locator('.fabricate-remesh-resolution');
  await expect(quality).toBeDisabled();
  await repair.check();
  await page.waitForTimeout(500);
  await expect(quality).toBeEnabled();
  await quality.selectOption('high');
  await page.waitForTimeout(500);
  await expect(resolution).toHaveValue('128');
  expect(await page.evaluate(() => window.__parametrica.document.view.fabrication.quality)).toBe('high');

  await resolution.fill('48');
  await resolution.press('Enter');
  await page.waitForTimeout(500);
  await expect(quality).toHaveValue('custom');
  expect(await page.evaluate(() => window.__parametrica.document.view.fabrication.remeshResolution)).toBe(48);

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.units = {
      world: 'mm',
      mmPerWorldUnit: 1,
      artboard: 'unitless',
      mmPerArtboardUnit: null,
    };
    app.rebuild();
  });
  await page.waitForTimeout(1000);
  await expect(nextAction).toContainText('Ready to export');
});

test('Fabricate suggests repair when the source is open', async ({ page }) => {
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
  const fabricate = await openSection(page, 'Fabricate');
  await expect(fabricate.locator('.fabricate-next-action')).toContainText('Repair or Cap');
});
