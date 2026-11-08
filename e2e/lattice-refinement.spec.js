import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  await page.evaluate(() => document.querySelector('.start-with-cancel')?.click());
  await page.waitForTimeout(300);
}

test('organic preset resolves draft and high refinement profiles', async ({ page }) => {
  test.setTimeout(240_000);
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Organic Lattice Vase 200'));
  await page.waitForTimeout(700);
  const fabricate = await openSection(page, 'Fabricate');
  const status = fabricate.locator('.fabricate-status');
  const finish = fabricate.locator('.fabricate-finish-quality');

  await finish.selectOption('draft');
  await expect(status).toContainText('READY', { timeout: 120_000 });
  await expect.poll(async () => page.evaluate(() => window.__parametrica.controls.fabricationReport?.lattice?.finishQuality), { timeout: 120_000 }).toBe('draft');
  const draftTriangles = await page.evaluate(() => window.__parametrica.controls.fabricationReport?.triangles ?? 0);

  await finish.selectOption('high');
  await expect(status).toContainText('READY', { timeout: 120_000 });
  await expect.poll(async () => page.evaluate(() => window.__parametrica.controls.fabricationReport?.lattice?.finishQuality), { timeout: 120_000 }).toBe('high');
  const highTriangles = await page.evaluate(() => window.__parametrica.controls.fabricationReport?.triangles ?? 0);
  expect(highTriangles).toBeGreaterThan(draftTriangles);

  const state = await page.evaluate(() => ({
    errors: window.__parametrica.controls.fabricationReport?.errors ?? [],
    curved: window.__parametrica.controls.fabricationReport?.lattice?.curveStyle,
    refinement: window.__parametrica.controls.fabricationReport?.lattice?.refinement,
  }));
  expect(state.errors).toEqual([]);
  expect(state.curved).toBe('organic');
  expect(state.refinement?.budgetPoints).toBeGreaterThan(0);
});
