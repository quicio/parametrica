import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Fabricate repairs an open surface explicitly and reports actions', async ({ page }) => {
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
      mesh: JSON.stringify(app.evaluation.meshes[0]),
      repair: app.document.view.fabrication.repair,
      capStrategy: app.document.view.fabrication.capStrategy,
    };
  });
  expect(before.repair).toBe(false);
  expect(before.capStrategy).toBe('auto');

  const fabricate = await openSection(page, 'Fabricate');
  const status = fabricate.locator('.fabricate-status');
  const repair = fabricate.locator('.fabricate-repair');
  const capStrategy = fabricate.locator('.fabricate-cap-strategy');
  const repairStatus = fabricate.locator('.fabricate-repair-status');
  const weld = fabricate.locator('.fabricate-weld');
  const cap = fabricate.locator('.fabricate-cap');
  const exportButton = fabricate.locator('.fabricate-export');

  await expect(repair).not.toBeChecked();
  await expect(repairStatus).toHaveText('off');
  await expect(status).toContainText('NOT FABRICABLE');
  await expect(exportButton).toBeDisabled();
  await expect(capStrategy).toBeDisabled();

  await repair.check();
  await page.waitForTimeout(900);
  await expect(repair).toBeChecked();
  await expect(weld).toBeDisabled();
  await expect(cap).toBeDisabled();
  await expect(capStrategy).toBeEnabled();
  await expect(status).toContainText('READY · repaired closed body');
  await expect(repairStatus).toContainText('caps');
  await expect(fabricate.locator('.fabricate-reason')).toContainText('repaired');
  await expect(exportButton).toBeEnabled();
  expect(await page.evaluate(() => window.__parametrica.document.view.fabrication.repair)).toBe(true);

  await capStrategy.selectOption('planar');
  await page.waitForTimeout(900);
  await expect(repairStatus).toContainText('planar');
  const built = await page.evaluate(() => {
    const result = window.__parametrica.exporter.buildSTLFromCurrent();
    return { triangles: result.triangles, bytes: result.data.length, unit: result.unit };
  });
  expect(built.unit).toBe('mm');
  expect(built.triangles).toBeGreaterThan(0);
  expect(built.bytes).toBe(84 + built.triangles * 50);

  const after = await page.evaluate(() => {
    const app = window.__parametrica;
    return { mesh: JSON.stringify(app.evaluation.meshes[0]) };
  });
  expect(after.mesh).toBe(before.mesh);

  await repair.uncheck();
  await page.waitForTimeout(600);
  await expect(status).toContainText('NOT FABRICABLE');
  await expect(repairStatus).toHaveText('off');
  await expect(exportButton).toBeDisabled();
});

test('Fabricate exposes topology repair controls without changing a clean solid', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.applyPreset('Torus');
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
  const repair = fabricate.locator('.fabricate-repair');
  const topology = fabricate.locator('.fabricate-topology');
  const nonOrientable = fabricate.locator('.fabricate-nonorientable');
  const status = fabricate.locator('.fabricate-status');
  const repairStatus = fabricate.locator('.fabricate-repair-status');

  await expect(topology).toBeDisabled();
  await expect(nonOrientable).toBeDisabled();
  await expect(topology).toHaveValue('none');
  await repair.check();
  await page.waitForTimeout(700);
  await expect(topology).toBeEnabled();
  await expect(nonOrientable).toBeEnabled();
  await topology.selectOption('split');
  await nonOrientable.selectOption('cut');
  await page.waitForTimeout(700);
  await expect(status).toContainText('READY · repaired closed body');
  await expect(repairStatus).toHaveText('no changes');
  expect(await page.evaluate(() => ({
    topology: window.__parametrica.document.view.fabrication.topology,
    nonOrientable: window.__parametrica.document.view.fabrication.nonOrientable,
  }))).toEqual({ topology: 'split', nonOrientable: 'cut' });

  await repair.uncheck();
  await page.waitForTimeout(500);
  await expect(topology).toBeDisabled();
  await expect(nonOrientable).toBeDisabled();
});
