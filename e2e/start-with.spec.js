import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

test.use({ storageState: { cookies: [], origins: [] } });

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  await expect(page.locator('.start-with-overlay')).toBeVisible();
}

test('fresh app offers Composition, Parametric and Parametric Surface', async ({ page }) => {
  await boot(page);
  const dialog = page.locator('.start-with-dialog');
  await expect(dialog).toHaveAttribute('role', 'dialog');
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('.start-with-card')).toHaveCount(3);
  await expect(page.locator('.start-with-card[data-choice="composition"]')).toHaveClass(/featured/);
  await expect(page.locator('.start-with-card[data-choice="classic"]')).toBeVisible();
  await expect(page.locator('.start-with-card[data-choice="surface"]')).toBeVisible();
  await expect(page.locator('.start-with-card[data-choice="composition"]')).toBeFocused();
  const widths = await page.locator('.start-with-card').evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().width)));
  expect(new Set(widths).size).toBe(1);
  await expect.poll(async () => page.locator('.start-with-card[data-choice="composition"] .start-with-thumb img:not([hidden])').count()).toBeGreaterThan(0);
});

test('choosing Composition loads the Vortex Stack example and saves the session', async ({ page }) => {
  await boot(page);
  await page.locator('.start-with-card[data-choice="composition"]').click();
  await expect(page.locator('.start-with-overlay')).toHaveCount(0);
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      layers: app.document.layers.length,
      activeType: app.document.layers[app.document.activeLayer]?.type,
      instances: app.document.layers.filter((layer) => layer.type === 'instance').length,
      sourceVisible: app.document.layers[0]?.visible,
      errors: app.evaluation.errors.length,
      session: Boolean(localStorage.getItem('parametrica.session.v1')),
    };
  });
  expect(state.layers).toBe(6);
  expect(state.activeType).toBe('instance');
  expect(state.instances).toBe(5);
  expect(state.sourceVisible).toBe(false);
  expect(state.errors).toBe(0);
  expect(state.session).toBe(true);
});

test('Escape on first run starts Parametric', async ({ page }) => {
  await boot(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.start-with-overlay')).toHaveCount(0);
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({
    generator: window.__parametrica.document.generator.id,
    session: Boolean(localStorage.getItem('parametrica.session.v1')),
  }));
  expect(state.generator).toBe('parametric');
  expect(state.session).toBe(true);
});

test('New document reopens the chooser and Cancel preserves the current figure', async ({ page }) => {
  await boot(page);
  await page.locator('.start-with-card[data-choice="classic"]').click();
  await page.waitForTimeout(300);

  const layers = await openSection(page, 'Layers');
  await expect(layers.locator('.layer-new-document')).toBeVisible();
  await layers.locator('.layer-new-document').click();
  await expect(page.locator('.start-with-overlay')).toBeVisible();
  await expect(page.locator('.start-with-eyebrow')).toHaveText('New document');
  await page.locator('.start-with-cancel').click();
  await expect(page.locator('.start-with-overlay')).toHaveCount(0);
  expect(await page.evaluate(() => window.__parametrica.document.generator.id)).toBe('parametric');

  await layers.locator('.layer-new-document').click();
  await page.locator('.start-with-card[data-choice="surface"]').click();
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => ({
    generator: window.__parametrica.document.generator.id,
    kind: window.__parametrica.evaluation.geometry[0]?.kind,
  }));
  expect(state).toEqual({ generator: 'parametric-surface', kind: 'surface' });
});
