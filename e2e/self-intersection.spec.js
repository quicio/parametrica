import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Fabricate rejects a mesh with self-intersecting triangles', async ({ page }) => {
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

  const detection = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      faces: app.evaluation.meshes[0].faces.length,
      checked: app.evaluation.layers[0].meshes.length > 0,
    };
  });
  expect(detection.checked).toBe(true);
  expect(detection.faces).toBeGreaterThan(0);

  const fabricate = await openSection(page, 'Fabricate');
  const status = fabricate.locator('.fabricate-status');
  const exportButton = fabricate.locator('.fabricate-export');
  const checks = fabricate.locator('.fabricate-warnings');
  const reason = fabricate.locator('.fabricate-reason');

  await expect(status).toContainText('NOT FABRICABLE');
  await expect(exportButton).toBeDisabled();
  await expect(checks).toContainText('self-intersecting triangle pairs');
  await expect(reason).toContainText('self-intersecting');

  const report = await page.evaluate(async () => {
    const app = window.__parametrica;
    const { buildFabricationReport } = await import('/src/application/fabricationSource.ts');
    const result = buildFabricationReport({
      evaluation: app.evaluation,
      layerIndex: app.document.activeLayer ?? 0,
      units: app.document.view.units,
    });
    const candidate = result.candidates[0];
    return {
      exportable: result.exportable,
      errors: result.errors,
      count: candidate?.validation?.meta?.selfIntersections?.count ?? null,
      checked: candidate?.validation?.meta?.selfIntersections?.checked ?? false,
      pairs: candidate?.validation?.meta?.selfIntersections?.pairs ?? [],
    };
  });
  expect(report.exportable).toBe(false);
  expect(report.checked).toBe(true);
  expect(report.count).toBeGreaterThan(0);
  expect(report.errors.some((error) => error.includes('self-intersecting'))).toBe(true);
  expect(report.pairs.length).toBeGreaterThan(0);
  expect(report.pairs[0]).toHaveProperty('a');
  expect(report.pairs[0]).toHaveProperty('b');
});
