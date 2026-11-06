import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Fabricate resolves self-intersections by explicit SDF repair', async ({ page }) => {
  test.setTimeout(90000);
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

  const before = await page.evaluate(() => ({
    mesh: JSON.stringify(window.__parametrica.evaluation.meshes[0]),
  }));

  const fabricate = await openSection(page, 'Fabricate');
  const repair = fabricate.locator('.fabricate-repair');
  const self = fabricate.locator('.fabricate-self-intersections');
  const resolution = fabricate.locator('.fabricate-remesh-resolution');
  const status = fabricate.locator('.fabricate-status');
  const repairStatus = fabricate.locator('.fabricate-repair-status');
  const exportButton = fabricate.locator('.fabricate-export');

  await expect(status).toContainText('NOT FABRICABLE');
  await expect(self).toBeDisabled();
  await repair.check();
  await page.waitForTimeout(500);
  await expect(self).toBeEnabled();
  await expect(self).toHaveValue('none');
  await expect(status).toContainText('NOT FABRICABLE');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.fabrication.remeshResolution = 32;
    app.controls.refreshFabricate();
  });
  await expect(resolution).toHaveValue('32');
  await self.selectOption('auto');
  await page.waitForTimeout(9000);
  await expect(status).toContainText('READY · repaired closed body');
  await expect(repairStatus).toContainText('self-intersecting pairs');
  await expect(repairStatus).toContainText('self-intersections sdf @32');
  await expect(exportButton).toBeEnabled();
  expect(await page.evaluate(() => ({
    strategy: window.__parametrica.document.view.fabrication.selfIntersections,
    resolution: window.__parametrica.document.view.fabrication.remeshResolution,
  }))).toEqual({ strategy: 'auto', resolution: 32 });

  const built = await page.evaluate(() => {
    const result = window.__parametrica.exporter.buildSTLFromCurrent();
    return { triangles: result.triangles, bytes: result.data.length, unit: result.unit };
  });
  expect(built.unit).toBe('mm');
  expect(built.triangles).toBeGreaterThan(0);
  expect(built.bytes).toBe(84 + built.triangles * 50);

  const after = await page.evaluate(() => ({
    mesh: JSON.stringify(window.__parametrica.evaluation.meshes[0]),
  }));
  expect(after.mesh).toBe(before.mesh);

  await self.selectOption('none');
  await page.waitForTimeout(600);
  await expect(status).toContainText('NOT FABRICABLE');
  await expect(exportButton).toBeDisabled();
});
