import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('per-pass color and width override only the selected pass', async ({ page }) => {
  await boot(page);
  const render = await openSection(page, 'Render');
  const stroke = render.locator('.mode-toggle[data-pass="stroke"]');
  await expect(stroke.locator('.pass-color')).toBeVisible();
  await expect(stroke.locator('.pass-width')).toBeVisible();

  await stroke.locator('.pass-color').evaluate((input) => {
    input.value = '#ff0000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const width = stroke.locator('.pass-width');
  await width.fill('3');
  await width.press('Enter');
  await page.waitForTimeout(350);

  const state = await page.evaluate(() => ({
    passStyle: window.__parametrica.document.view.passStyle,
    svg: window.__parametrica.exporter.buildSVGFromCurrent().svg,
  }));
  expect(state.passStyle.stroke).toEqual({ color: '#ff0000', width: 3 });
  expect(state.svg).toContain('stroke="#ff0000"');
  expect(state.svg).toContain('stroke-width="3"');

  const points = render.locator('.mode-toggle[data-pass="points"]');
  await expect(points.locator('.pass-color')).toBeVisible();
  await expect(points.locator('.pass-width')).toHaveCount(0);
  const fill = render.locator('.mode-toggle[data-pass="surface-fill"]');
  await expect(fill.locator('.pass-color')).toBeVisible();
  await expect(fill.locator('.pass-width')).toHaveCount(0);

  await stroke.locator('.pass-style-reset').click();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__parametrica.document.view.passStyle.stroke)).toBeUndefined();
});
