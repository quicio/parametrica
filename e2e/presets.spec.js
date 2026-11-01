import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

test('preset library groups, searches and applies a surface', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));

  const presets = await openSection(page, 'Presets');
  await expect(presets.locator('.preset-chip', { hasText: 'Surfaces' })).toBeVisible();
  await expect(presets.locator('.preset-status')).toContainText('40 of 40 presets');

  await presets.locator('.preset-chip', { hasText: 'Surfaces' }).click();
  await expect(presets.locator('.preset-status')).toContainText('9 of 40 presets');
  await expect(presets.locator('.preset-item')).toHaveCount(9);
  await expect(presets.locator('.preset-item', { hasText: 'Catenoid' }))
    .toContainText(/minimal surface of revolution/i);

  const search = presets.locator('.preset-search');
  await search.fill('mobius');
  await expect(presets.locator('.preset-item')).toHaveCount(1);
  await expect(presets.locator('.preset-item', { hasText: 'Möbius Band' })).toBeVisible();
  await search.fill('');

  await presets.locator('.preset-item', { hasText: 'Seashell' }).click();
  await page.waitForTimeout(600);
  const state = await page.evaluate(() => ({
    id: window.__parametrica.document.generator.id,
    kind: window.__parametrica.evaluation.geometry[0]?.kind,
    errors: window.__parametrica.evaluation.errors.length,
  }));
  expect(state).toEqual({ id: 'parametric-surface', kind: 'surface', errors: 0 });

  const reopened = await openSection(page, 'Presets');
  await expect(reopened.locator('.preset-item.active', { hasText: 'Seashell' })).toBeVisible();
});
