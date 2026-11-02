import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('blend changes the rendered canvas', async ({ page }) => {
  await boot(page);
  const artboard = await openSection(page, 'Artboard');
  const canvas = page.locator('#canvas-container canvas');
  const before = await canvas.screenshot();
  await artboard.locator('.artboard-row', { hasText: 'Blend' }).locator('select').selectOption('multiply');
  await page.waitForTimeout(400);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
  await artboard.locator('.artboard-row', { hasText: 'Blend' }).locator('select').selectOption('normal');
});

test('content lock blocks edits while keeping visibility available', async ({ page }) => {
  await boot(page);
  const layers = await openSection(page, 'Layers');
  const active = layers.locator('.layer-row.active');
  await active.locator('button[title="Lock layer content"]').click();
  await expect(active.locator('button[title="Unlock layer content"]')).toBeVisible();
  await expect(page.locator('.panel-status-text')).toContainText('content locked');

  const generator = await openSection(page, 'Generator');
  await expect(generator.locator('select').first()).toBeDisabled();

  const artboard = await openSection(page, 'Artboard');
  await expect(artboard.locator('.artboard-row', { hasText: 'Stroke width' }).locator('input')).toBeDisabled();
  await expect(artboard.locator('.artboard-row', { hasText: 'Blend' }).locator('select')).toBeDisabled();

  const layersAgain = await openSection(page, 'Layers');
  const activeAgain = layersAgain.locator('.layer-row.active');
  const visible = activeAgain.locator('.layer-icon').first();
  await visible.click();
  await expect(activeAgain).toHaveClass(/hidden/);
  await visible.click();
  await expect(activeAgain).not.toHaveClass(/hidden/);

  await layersAgain.locator('.layer-row.active button[title="Unlock layer content"]').click();
  await openSection(page, 'Generator');
  await expect(page.locator('#panel-section-generator select').first()).not.toBeDisabled();
});

test('inapplicable render passes are disabled and applicable passes enable', async ({ page }) => {
  await boot(page);
  let view = await openSection(page, 'View');
  await expect(view.locator('.mode-toggle', { hasText: 'Surface Fill' }).locator('input')).toBeDisabled();
  await expect(view.locator('.mode-toggle', { hasText: 'Epicycles' }).locator('input')).toBeDisabled();

  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(400);
  view = await openSection(page, 'View');
  await expect(view.locator('.mode-toggle', { hasText: 'Surface Fill' }).locator('input')).not.toBeDisabled();
});

test('SVG export warns about omitted surface fill', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(400);
  const view = await openSection(page, 'View');
  await view.locator('.mode-toggle', { hasText: 'Surface Fill' }).locator('input').check();
  await page.waitForTimeout(300);

  const download = page.waitForEvent('download');
  await page.evaluate(() => window.__parametrica.exporter.exportSVG());
  await download;
  await expect(page.locator('#notice')).toContainText(/Surface Fill|PNG/);
});
