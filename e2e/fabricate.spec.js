import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Fabricate is read-only, unit-gated and exports a validated closed body', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.worldBBox,
      mesh: JSON.stringify(app.evaluation.meshes[0]),
    };
  });

  const fabricate = await openSection(page, 'Fabricate');
  const status = fabricate.locator('.fabricate-status');
  const exportButton = fabricate.locator('.fabricate-export');
  await expect(status).toContainText('UNITS REQUIRED');
  await expect(exportButton).toBeDisabled();

  const unitSelect = fabricate.locator('.fabricate-world-units');
  const scaleInput = fabricate.locator('.fabricate-world-scale');
  await expect(unitSelect).toHaveValue('unitless');
  await expect(scaleInput).toBeDisabled();
  await unitSelect.selectOption('mm');
  await page.waitForTimeout(250);
  await expect(scaleInput).toBeEnabled();
  await scaleInput.fill('2');
  await scaleInput.press('Enter');
  await page.waitForTimeout(350);

  await expect(status).toContainText('READY');
  await expect(status).toHaveAttribute('data-state', 'ready');
  await expect(fabricate.locator('.fabricate-triangles')).not.toHaveText('—');
  await expect(fabricate.locator('.fabricate-vertices')).not.toHaveText('—');
  await expect(fabricate.locator('.fabricate-volume')).toContainText('mm³');
  await expect(fabricate.locator('.fabricate-physical-size')).toContainText('mm');
  await expect(fabricate.locator('.fabricate-warnings')).toContainText('self-intersection');
  await expect(exportButton).toBeEnabled();

  await expect(page.locator('.panel-section[data-mode="form"]').first()).toBeHidden();
  await expect(page.locator('.panel-section[data-mode="look"]').first()).toBeHidden();

  const built = await page.evaluate(() => {
    const result = window.__parametrica.exporter.buildSTLFromCurrent();
    return {
      bytes: result.data.length,
      triangles: result.triangles,
      unit: result.unit,
      scale: result.scale,
    };
  });
  expect(built.unit).toBe('mm');
  expect(built.scale).toBe(2);
  expect(built.bytes).toBe(84 + built.triangles * 50);

  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.stl$/);

  const after = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.worldBBox,
      mesh: JSON.stringify(app.evaluation.meshes[0]),
    };
  });
  expect(after.bbox).toEqual(before.bbox);
  expect(after.mesh).toBe(before.mesh);

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.units.world = 'unitless';
    app.document.view.units.mmPerWorldUnit = null;
    app.rebuild();
  });
  await page.waitForTimeout(300);
  await expect(status).toContainText('UNITS REQUIRED');
  await expect(exportButton).toBeDisabled();
  await expect(fabricate.locator('.fabricate-reason')).toContainText('world scale');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.units.world = 'mm';
    app.document.view.units.mmPerWorldUnit = 1;
    app.document.generator.params.closedU = false;
    app.document.generator.params.closedV = false;
    app.rebuild();
  });
  await page.waitForTimeout(350);
  await expect(status).toContainText('NOT FABRICABLE');
  await expect(exportButton).toBeDisabled();
  await expect(fabricate.locator('.fabricate-reason')).toContainText('No validated closed Mesh/Solid');
  expect(await page.evaluate(() => window.__parametrica.evaluation.errors.length)).toBe(0);

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  const restored = page.locator('.panel-mode[data-mode="fabricate"]');
  await expect(restored).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.panel-section[data-mode="fabricate"]').first()).toBeVisible();
});
