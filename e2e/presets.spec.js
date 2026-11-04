import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

test('preset library groups, searches and applies a surface', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));

  const presets = await openSection(page, 'Presets');
  await expect(presets.locator('.preset-chip', { hasText: 'Surfaces' })).toBeVisible();
  await expect(presets.locator('.preset-status')).toContainText('41 of 41 presets');

  await presets.locator('.preset-chip', { hasText: 'Surfaces' }).click();
  await expect(presets.locator('.preset-status')).toContainText('9 of 41 presets');
  await expect(presets.locator('.preset-item')).toHaveCount(9);
  await expect(presets.locator('.preset-item', { hasText: 'Catenoid' }))
    .toContainText(/minimal surface of revolution/i);

  const search = presets.locator('.preset-search');
  await search.fill('mobius');
  await expect(presets.locator('.preset-item')).toHaveCount(1);
  await expect(presets.locator('.preset-item', { hasText: 'Möbius Band' })).toBeVisible();
  await search.fill('');

  await presets.locator('.preset-apply', { hasText: 'Seashell' }).click();
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

test('preset previews render for built-ins and saved presets', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));

  const presets = await openSection(page, 'Presets');
  await presets.locator('.preset-chip', { hasText: 'Surfaces' }).click();
  await expect.poll(async () => presets.locator('.preset-thumb img').count()).toBeGreaterThan(0);
  const initial = await presets.locator('.preset-thumb img').count();
  const sources = await presets.locator('.preset-thumb img').evaluateAll((images) => (
    images.map((image) => image.getAttribute('src'))
  ));
  expect(sources.every((src) => src?.startsWith('data:image/png;base64,'))).toBe(true);

  await presets.locator('.preset-list').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect.poll(async () => presets.locator('.preset-thumb img').count()).toBeGreaterThan(initial);

  const name = presets.locator('.controller', { hasText: 'Name' }).locator('input');
  await name.fill('Preview User');
  await presets.locator('.controller', { hasText: 'Save Preset' }).locator('button').click();
  await page.waitForTimeout(500);

  const reopened = await openSection(page, 'Presets');
  await reopened.locator('.preset-chip', { hasText: 'My Presets' }).click();
  await expect(reopened.locator('.preset-item', { hasText: 'Preview User' })).toBeVisible();
  await expect.poll(async () => reopened.locator('.preset-thumb img').count()).toBeGreaterThan(0);
});

test('favorites persist and starring does not apply the preset', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  const before = await page.evaluate(() => window.__parametrica.document.generator.id);

  const presets = await openSection(page, 'Presets');
  const torus = presets.locator('[data-preset-row="Torus"]');
  await torus.locator('.preset-star').click();
  await expect(torus.locator('.preset-star')).toHaveAttribute('aria-pressed', 'true');
  const after = await page.evaluate(() => window.__parametrica.document.generator.id);
  expect(after).toBe(before);

  await presets.locator('.preset-chip', { hasText: 'Favorites' }).click();
  await expect(presets.locator('.preset-item')).toHaveCount(1);
  await expect(presets.locator('.preset-status')).toContainText('1 of 41 presets · Favorites');

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  const reopened = await openSection(page, 'Presets');
  await expect(reopened.locator('.preset-chip', { hasText: 'Favorites' })).toContainText('1');
  await reopened.locator('.preset-chip', { hasText: 'Favorites' }).click();
  await expect(reopened.locator('.preset-item', { hasText: 'Torus' })).toBeVisible();
});

test('recent presets are ordered by use and persist', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__parametrica.applyPreset('Seashell'));
  await page.waitForTimeout(200);

  let presets = await openSection(page, 'Presets');
  await expect(presets.locator('.preset-chip', { hasText: 'Recent' })).toContainText('2');
  await presets.locator('.preset-chip', { hasText: 'Recent' }).click();
  const names = await presets.locator('.preset-apply .preset-item-name').allTextContents();
  expect(names.slice(0, 2)).toEqual(['Seashell', 'Torus']);

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  presets = await openSection(page, 'Presets');
  await expect(presets.locator('.preset-chip', { hasText: 'Recent' })).toContainText('2');
  await presets.locator('.preset-chip', { hasText: 'Recent' }).click();
  const reloadedNames = await presets.locator('.preset-apply .preset-item-name').allTextContents();
  expect(reloadedNames.slice(0, 2)).toEqual(['Seashell', 'Torus']);
});

test('unfavoriting from the favorites view keeps focus in the filter', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  const presets = await openSection(page, 'Presets');
  const torus = presets.locator('[data-preset-row="Torus"]');
  await torus.locator('.preset-star').click();
  await presets.locator('.preset-chip', { hasText: 'Favorites' }).click();
  await expect(presets.locator('.preset-item')).toHaveCount(1);

  await presets.locator('[data-preset-row="Torus"]').locator('.preset-star').click();
  await expect(presets.locator('.preset-item')).toHaveCount(0);
  await expect(presets.locator('.preset-empty')).toContainText(/No favorites yet/i);
  await expect(presets.locator('.preset-chip', { hasText: 'Favorites' })).toBeFocused();
});

test('deleting a user preset cleans usage metadata and restores filter focus', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  let presets = await openSection(page, 'Presets');
  const name = presets.locator('.controller', { hasText: 'Name' }).locator('input');
  await name.fill('Disposable User');
  await presets.locator('.controller', { hasText: 'Save Preset' }).locator('button').click();
  await page.waitForTimeout(400);

  presets = await openSection(page, 'Presets');
  await presets.locator('.preset-chip', { hasText: 'My Presets' }).click();
  const row = presets.locator('[data-preset-row="Disposable User"]');
  await row.locator('.preset-star').click();
  await presets.locator('.preset-chip', { hasText: 'Favorites' }).click();
  await expect(presets.locator('[data-preset-row="Disposable User"]')).toBeVisible();

  await presets.locator('[data-preset-row="Disposable User"] .preset-apply').click();
  await page.waitForTimeout(500);
  presets = await openSection(page, 'Presets');
  await presets.locator('.controller', { hasText: 'Delete Preset' }).locator('button').click();
  await page.waitForTimeout(500);

  presets = await openSection(page, 'Presets');
  await expect(presets.locator('[data-preset-row="Disposable User"]')).toHaveCount(0);
  await expect(presets.locator('.preset-chip', { hasText: 'Favorites' })).toBeFocused();
});

test('Vortex Stack opens as a layered composition preset', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));

  const presets = await openSection(page, 'Presets');
  await expect(presets.locator('.preset-chip', { hasText: 'Compositions' })).toBeVisible();
  await presets.locator('.preset-chip', { hasText: 'Compositions' }).click();
  await expect(presets.locator('.preset-item', { hasText: 'Vortex Stack' })).toBeVisible();
  await expect.poll(async () => presets.locator('.preset-item', { hasText: 'Vortex Stack' }).locator('.preset-thumb img').count()).toBeGreaterThan(0);

  const search = presets.locator('.preset-search');
  await search.fill('vortex');
  await expect(presets.locator('.preset-item')).toHaveCount(1);
  await search.fill('');

  await presets.locator('.preset-apply', { hasText: 'Vortex Stack' }).click();
  await page.waitForTimeout(700);
  const state = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      layers: app.document.layers.length,
      activeType: app.document.layers[app.document.activeLayer]?.type,
      sourceVisible: app.document.layers[0]?.visible,
      instances: app.document.layers.filter((layer) => layer.type === 'instance').length,
      modes: app.document.view.modes,
      errors: app.evaluation.errors.length,
      instanceMeshes: app.evaluation.layers[1]?.meshes?.length,
    };
  });
  expect(state.layers).toBe(6);
  expect(state.activeType).toBe('instance');
  expect(state.sourceVisible).toBe(false);
  expect(state.instances).toBe(5);
  expect(state.modes).toEqual(['stroke']);
  expect(state.errors).toBe(0);
  expect(state.instanceMeshes).toBe(1);
});

