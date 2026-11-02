import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('LOOK exposes camera, canvas, style, render and overlays with a Work group', async ({ page }) => {
  await boot(page);
  const camera = await openSection(page, 'Camera');
  await expect(camera.locator('.panel-hint')).toContainText('Global viewport');
  const canvas = await openSection(page, 'Canvas');
  await expect(canvas.locator('.panel-hint')).toContainText('Global canvas');
  const style = await openSection(page, 'Style');
  await expect(style.locator('.panel-hint')).toContainText('Active layer');
  const render = await openSection(page, 'Render');
  await expect(render.locator('.panel-hint').first()).toContainText('Global render passes');
  await expect(render.locator('.render-group-h')).toHaveText(['Base', 'Surfaces', 'Color', 'Diagnostics']);
  await expect(render.locator('.mode-toggle', { hasText: 'Gradient Wireframe' }))
    .toHaveAttribute('title', /Color ramp/);
  await expect(page.locator('.panel-h', { hasText: 'View' })).toHaveCount(0);
  await expect(page.locator('.panel-h', { hasText: 'Artboard' })).toHaveCount(0);
  await expect(page.locator('.panel-group-label', { hasText: 'Work' })).toBeVisible();
  await expect(page.locator('.panel-h', { hasText: 'Image' })).toBeVisible();
  await expect(page.locator('.panel-h', { hasText: 'Animation' })).toBeVisible();
  await expect(page.locator('.panel-h', { hasText: 'Timeline' })).toBeVisible();
});

test('camera reset is undoable through the existing history', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Básica'));
  await page.waitForTimeout(350);
  await openSection(page, 'Camera');
  const changed = await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.camera.yaw += 0.7;
    app.rebuild();
    return app.document.view.camera.yaw;
  });
  await page.waitForTimeout(450);
  await page.locator('.camera-reset').click();
  await page.waitForTimeout(300);
  const reset = await page.evaluate(() => window.__parametrica.document.view.camera.yaw);
  expect(reset).toBeCloseTo(-Math.PI / 6, 4);
  await page.evaluate(() => window.__parametrica.undo());
  await page.waitForTimeout(300);
  const undone = await page.evaluate(() => window.__parametrica.document.view.camera.yaw);
  expect(undone).toBeCloseTo(changed, 4);
});

test('color ramp is editable and independent from palettes', async ({ page }) => {
  await boot(page);
  const render = await openSection(page, 'Render');
  await render.locator('.mode-toggle', { hasText: 'Gradient Wireframe' }).locator('input').check();
  await page.waitForTimeout(300);
  const canvas = page.locator('#canvas-container canvas');
  const before = await canvas.screenshot();
  const rampColor = render.locator('.ramp-color').first();
  await rampColor.evaluate((el) => {
    el.value = '#ff0000';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
  const ramp = await page.evaluate(() => window.__parametrica.document.view.colorRamp);
  expect(Array.isArray(ramp)).toBe(true);

  const style = await openSection(page, 'Style');
  await style.locator('.artboard-palette select').selectOption('paper');
  await page.waitForTimeout(250);
  const afterPalette = await page.evaluate(() => window.__parametrica.document.view.colorRamp);
  expect(afterPalette).toEqual(ramp);
});

test('old view and artboard UI state maps to the new LOOK sections', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('parametrica.ui.v1', JSON.stringify({
      mode: 'look',
      sections: { view: true, artboard: true },
      advancedParams: false,
    }));
  });
  await boot(page);
  await expect(page.locator('.panel-mode[data-mode="look"]')).toHaveClass(/active/);
  for (const title of ['Camera', 'Render', 'Overlays', 'Canvas', 'Style']) {
    const section = page.locator('.panel-section', {
      has: page.locator('.panel-h', { hasText: title }),
    }).first();
    await expect(section.locator('.panel-h')).toHaveAttribute('aria-expanded', 'true');
  }
});
