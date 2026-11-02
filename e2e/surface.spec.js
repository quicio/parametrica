import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('parametric surface evaluates, tessellates and renders fill', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.setGenerator('parametric-surface'));
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const evaluation = window.__parametrica.evaluation;
    return {
      errors: evaluation.errors.length,
      kind: evaluation.geometry[0]?.kind,
      meshes: evaluation.meshes.length,
      faces: evaluation.meshes[0]?.faces.length,
      normals: evaluation.meshes[0]?.normals.length,
    };
  });
  expect(state.errors).toBe(0);
  expect(state.kind).toBe('surface');
  expect(state.meshes).toBe(1);
  expect(state.faces).toBeGreaterThan(100);
  expect(state.normals).toBeGreaterThan(100);

  const view = await openSection(page, 'Render');
  const fill = view.locator('.mode-toggle', { hasText: 'Surface Fill' }).locator('input[type="checkbox"]');
  await expect(fill).toBeVisible();
  const canvas = page.locator('#canvas-container canvas');
  const before = await canvas.screenshot();
  await fill.check();
  await page.waitForTimeout(400);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
});
