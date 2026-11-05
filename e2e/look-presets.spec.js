import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Looks applies named visual presets without touching geometry or style', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(500);

  const looks = await openSection(page, 'Looks');
  const surface = looks.locator('.look-preset[data-preset="surface"]');
  const technical = looks.locator('.look-preset[data-preset="technical"]');
  const line = looks.locator('.look-preset[data-preset="line"]');
  const reset = looks.locator('.look-preset-reset');

  await expect(surface).toBeEnabled();
  await expect(line).toBeEnabled();
  await expect(looks.locator('.look-preset')).toHaveCount(7);

  const before = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.worldBBox,
      style: JSON.stringify(app.activeLayer.style),
      units: JSON.stringify(app.document.view.units),
    };
  });

  await surface.click();
  await page.waitForTimeout(350);
  const applied = await page.evaluate(() => ({
    modes: window.__parametrica.document.view.modes,
    overlays: window.__parametrica.document.view.overlays,
    guides: window.__parametrica.document.view.guides,
    bbox: window.__parametrica.evaluation.worldBBox,
    style: JSON.stringify(window.__parametrica.activeLayer.style),
    units: JSON.stringify(window.__parametrica.document.view.units),
  }));
  expect(applied.modes).toEqual(['stroke', 'surface-wireframe', 'surface-fill']);
  expect(applied.guides).toBe(false);
  expect(applied.bbox).toEqual(before.bbox);
  expect(applied.style).toBe(before.style);
  expect(applied.units).toBe(before.units);
  expect(Object.values(applied.overlays).every((value) => value === false)).toBe(true);

  await technical.click();
  await page.waitForTimeout(300);
  const technicalView = await page.evaluate(() => window.__parametrica.document.view);
  expect(technicalView.modes).toEqual(expect.arrayContaining(['stroke', 'points', 'tangents', 'normals']));
  expect(technicalView.overlays.inflections).toBe(true);
  expect(technicalView.overlays.bbox).toBe(true);
  expect(technicalView.guides).toBe(true);
  await expect(technical).toHaveClass(/active/);

  await reset.click();
  await page.waitForTimeout(300);
  const resetView = await page.evaluate(() => window.__parametrica.document.view);
  expect(resetView.modes).toEqual(['stroke']);
  expect(Object.values(resetView.overlays).every((value) => value === false)).toBe(true);
  await expect(line).toHaveClass(/active/);
});

test('unavailable Look presets stay visible with a reason', async ({ page }) => {
  await boot(page);
  const looks = await openSection(page, 'Looks');
  const surface = looks.locator('.look-preset[data-preset="surface"]');
  const epicycles = looks.locator('.look-preset[data-preset="epicycles"]');
  await expect(surface).toBeDisabled();
  await expect(surface).toHaveAttribute('title', /surface or mesh/i);
  await expect(epicycles).toBeDisabled();
  await expect(epicycles).toHaveAttribute('title', /Fourier/i);
});

test('Render has one on/off control, labeled opacity and visible N/A reasons', async ({ page }) => {
  await boot(page);
  const render = await openSection(page, 'Render');

  const points = render.locator('.mode-toggle[data-pass="points"]');
  const pointsToggle = points.locator('input[type="checkbox"]');
  const pointsOpacity = points.locator('.pass-opacity');
  const pointsPercent = points.locator('.mode-toggle-mix-value');
  await expect(pointsToggle).not.toBeChecked();
  await expect(pointsOpacity).toBeDisabled();
  await expect(pointsPercent).toHaveText('100%');

  await pointsToggle.check();
  await page.waitForTimeout(200);
  await expect(pointsOpacity).toBeEnabled();
  await pointsOpacity.evaluate((element) => {
    element.value = '0.4';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(pointsPercent).toHaveText('40%');

  const surfaceFill = render.locator('.mode-toggle[data-pass="surface-fill"]');
  await expect(surfaceFill.locator('input[type="checkbox"]')).toBeDisabled();
  await expect(surfaceFill.locator('.mode-toggle-badge')).toBeVisible();
  await expect(surfaceFill.locator('.mode-toggle-badge')).toHaveText('N/A');
  await expect(surfaceFill.locator('.mode-toggle-reason')).toContainText('surface or mesh');

  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(400);
  await expect(surfaceFill.locator('input[type="checkbox"]')).toBeEnabled();
  await expect(surfaceFill.locator('.mode-toggle-badge')).toBeHidden();
  await expect(surfaceFill.locator('.mode-toggle-reason')).toHaveText('');
});

test('configured passes survive a generator change that makes them inapplicable', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(400);
  let render = await openSection(page, 'Render');
  const fill = render.locator('.mode-toggle[data-pass="surface-fill"]').locator('input[type="checkbox"]');
  await fill.check();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__parametrica.document.view.modes)).toContain('surface-fill');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.setGenerator('parametric');
    app.rebuild();
  });
  await page.waitForTimeout(400);
  render = await openSection(page, 'Render');
  const fillAfter = render.locator('.mode-toggle[data-pass="surface-fill"]');
  await expect(fillAfter.locator('input[type="checkbox"]')).toBeDisabled();
  await expect(fillAfter.locator('input[type="checkbox"]')).toBeChecked();
  expect(await page.evaluate(() => window.__parametrica.document.view.modes)).toContain('surface-fill');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.setGenerator('parametric-surface');
    app.rebuild();
  });
  await page.waitForTimeout(400);
  render = await openSection(page, 'Render');
  await expect(render.locator('.mode-toggle[data-pass="surface-fill"]').locator('input[type="checkbox"]')).toBeEnabled();
  await expect(render.locator('.mode-toggle[data-pass="surface-fill"]').locator('input[type="checkbox"]')).toBeChecked();
});

test('no-op Canvas and Coordinates controls are disabled with reasons', async ({ page }) => {
  await boot(page);
  const canvas = await openSection(page, 'Canvas');
  await expect(canvas.locator('.uv-domain-toggle-checkbox')).toBeDisabled();
  await expect(canvas.locator('.surface-inspector-toggle-checkbox')).toBeDisabled();
  await expect(canvas.locator('.seams-toggle-checkbox')).toBeDisabled();
  await expect(canvas.locator('.control-reason')).toContainText('surface or mesh');

  const coordinates = await openSection(page, 'Coordinates');
  await expect(coordinates.locator('.reference-toggle-checkbox')).toBeDisabled();
  await expect(coordinates.locator('.coordinates-toggle-checkbox')).toBeDisabled();
  await expect(coordinates.locator('.control-reason')).toContainText('spatial layer');

  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(400);
  const surfaceCanvas = await openSection(page, 'Canvas');
  await expect(surfaceCanvas.locator('.uv-domain-toggle-checkbox')).toBeEnabled();
  await expect(surfaceCanvas.locator('.surface-inspector-toggle-checkbox')).toBeEnabled();
  await expect(surfaceCanvas.locator('.seams-toggle-checkbox')).toBeEnabled();
  const surfaceCoordinates = await openSection(page, 'Coordinates');
  await expect(surfaceCoordinates.locator('.reference-toggle-checkbox')).toBeEnabled();
  await expect(surfaceCoordinates.locator('.coordinates-toggle-checkbox')).toBeEnabled();
});

test('user Looks save, apply and delete without touching geometry', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(400);
  const looks = await openSection(page, 'Looks');
  const technical = looks.locator('.look-preset[data-preset="technical"]');
  const name = looks.locator('.user-look-name');
  await technical.click();
  await page.waitForTimeout(250);
  const bbox = await page.evaluate(() => window.__parametrica.evaluation.worldBBox);

  await name.fill('My Technical');
  await looks.locator('.user-look-save').click();
  await page.waitForTimeout(250);
  const item = looks.locator('.user-look-item', { hasText: 'My Technical' });
  await expect(item).toBeVisible();

  await looks.locator('.look-preset[data-preset="line"]').click();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__parametrica.document.view.modes)).toEqual(['stroke']);

  await item.locator('.user-look-apply').click();
  await page.waitForTimeout(250);
  const applied = await page.evaluate(() => ({
    modes: window.__parametrica.document.view.modes,
    bbox: window.__parametrica.evaluation.worldBBox,
  }));
  expect(applied.modes).toEqual(expect.arrayContaining(['stroke', 'points', 'tangents', 'normals']));
  expect(applied.bbox).toEqual(bbox);

  await item.locator('.user-look-delete').click();
  await page.locator('.parametrica-dialog-confirm').click();
  await page.waitForTimeout(250);
  await expect(looks.locator('.user-look-item', { hasText: 'My Technical' })).toHaveCount(0);
});
