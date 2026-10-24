import { test, expect } from '@playwright/test';

async function waitForApp(page) {
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
}

test('formula editor uses CodeMirror highlighting and p5 loads lazily', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  expect(await page.evaluate(() => Boolean(window.__parametricaReady))).toBe(true);
  expect(await page.evaluate(() => window.__parametrica.renderer.ready)).toBe(true);
  await expect(page.locator('#canvas-container canvas')).toBeVisible();

  const field = page.locator('.expr-field').first();
  await expect(field.locator('.cm-editor')).toBeVisible();
  await expect(field.locator('.cm-content')).toHaveAttribute('contenteditable', 'true');
  expect(await field.locator('.cm-content span').count()).toBeGreaterThan(0);
});

test('autosave recovers the last session after reload', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.generator.params.a = 7;
    app.rebuild();
  });
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => localStorage.getItem('parametrica.session.v1'))).toBeTruthy();

  await page.reload();
  await waitForApp(page);
  await expect(page.locator('.recovery')).toBeVisible();
  await expect(page.locator('.recovery-text')).toContainText('Previous session');
  expect(await page.evaluate(() => window.__parametrica.document.generator.id)).toBe('parametric');

  await page.locator('.recovery-restore').click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__parametrica.document.generator.id)).toBe('lissajous');
  expect(await page.evaluate(() => window.__parametrica.document.generator.params.a)).toBe(7);
  await expect(page.locator('.recovery')).toHaveCount(0);
});
