import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('stroke width has a single authoritative value', async ({ page }) => {
  await boot(page);
  const artboard = await openSection(page, 'Artboard');
  const width = artboard.locator('.artboard-row', { hasText: 'Stroke width' }).locator('input');
  await width.fill('3.5');
  await width.press('Enter');
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({
    style: window.__parametrica.document.view.style.stroke.width,
    legacy: window.__parametrica.document.view.strokeWeight,
  }));
  expect(state).toEqual({ style: 3.5, legacy: 3.5 });
});

test('layer rename works and remains available under content lock', async ({ page }) => {
  await boot(page);
  let layers = await openSection(page, 'Layers');
  await layers.locator('.layer-row.active button[title="Lock layer content"]').click();
  layers = await openSection(page, 'Layers');
  await layers.locator('.layer-row.active button[title="Rename layer"]').click();
  const input = page.locator('.parametrica-dialog-input');
  await input.fill('Renamed Layer');
  await page.locator('.parametrica-dialog-confirm').click();
  await page.waitForTimeout(300);
  layers = await openSection(page, 'Layers');
  await expect(layers.locator('.layer-row.active .layer-name')).toHaveText('Renamed Layer');
  await expect(page.locator('.panel-status-text')).toContainText('Renamed Layer');
  const name = await page.evaluate(() => window.__parametrica.document.layers[0].name);
  expect(name).toBe('Renamed Layer');
});

test('notebook metadata is editable and persists', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.saveCheckpoint('Metadata checkpoint'));
  let notebook = await openSection(page, 'Notebook');
  await notebook.locator('.notebook-action', { hasText: 'Edit' }).click();
  await notebook.locator('.notebook-notes').fill('A note for the checkpoint');
  await notebook.locator('.notebook-tags').fill('alpha, beta');
  await notebook.locator('.notebook-meta-save').click();
  await page.waitForTimeout(300);
  await expect(notebook.locator('.notebook-item-meta')).toContainText('#alpha #beta');
  let item = await page.evaluate(() => {
    const cp = window.__parametrica.notebook.items[0];
    return { notes: cp.notes, tags: cp.tags };
  });
  expect(item).toEqual({ notes: 'A note for the checkpoint', tags: ['alpha', 'beta'] });

  await page.reload();
  await boot(page);
  item = await page.evaluate(() => {
    const cp = window.__parametrica.notebook.items[0];
    return { notes: cp.notes, tags: cp.tags };
  });
  expect(item).toEqual({ notes: 'A note for the checkpoint', tags: ['alpha', 'beta'] });
});

test('explore seed is visible and reproducible', async ({ page }) => {
  await boot(page);
  const explore = await openSection(page, 'Explore');
  const seed = explore.locator('.explore-seed');
  await expect(seed).toHaveValue('1');
  await explore.locator('.explore-randomize').click();
  await page.waitForTimeout(400);
  const first = await explore.locator('.explore-candidate span').allTextContents();
  await explore.locator('.explore-randomize').click();
  await page.waitForTimeout(400);
  const second = await explore.locator('.explore-candidate span').allTextContents();
  expect(second).toEqual(first);
  expect(first.length).toBeGreaterThan(0);

  await explore.locator('.explore-new-seed').click();
  await expect(seed).not.toHaveValue('1');
  const nextSeed = await seed.inputValue();
  expect(Number(nextSeed)).toBeGreaterThan(0);
});

test('status and telemetry have distinct readouts', async ({ page }) => {
  await boot(page);
  const status = (await page.locator('.panel-status-text').textContent()) ?? '';
  const telemetry = (await page.locator('#telemetry').textContent()) ?? '';
  expect(status).toContain('Layer 1/1');
  expect(status).toContain('Parametric');
  expect(status).toContain('ops');
  expect(telemetry).toContain('CURVES');
  expect(telemetry).toContain('SEED');
  expect(telemetry).toContain('STATE');
  expect(telemetry).not.toContain('MODEL');
  expect(telemetry).not.toContain('LAYERS');
  expect(telemetry).not.toContain('OPS');
});
