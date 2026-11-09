import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  await page.evaluate(() => document.querySelector('.start-with-cancel')?.click());
}

test('workspace modes expose a labelled tablist and one tabpanel', async ({ page }) => {
  await boot(page);
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(7);
  await expect(page.getByRole('tablist', { name: 'Panel workspace' })).toBeVisible();
  const tabpanel = page.getByRole('tabpanel');
  await expect(tabpanel).toHaveCount(1);

  const selected = page.locator('.panel-mode[aria-selected="true"]');
  await expect(selected).toHaveCount(1);
  const selectedId = await selected.getAttribute('id');
  await expect(tabpanel).toHaveAttribute('aria-labelledby', selectedId);
});

test('mode tabs support roving focus with arrows, Home and End', async ({ page }) => {
  await boot(page);
  const active = page.locator('.panel-mode[aria-selected="true"]');
  await active.focus();
  await page.keyboard.press('ArrowRight');
  const next = page.locator('.panel-mode[aria-selected="true"]');
  await expect(next).not.toHaveAttribute('data-mode', 'form');
  await expect(next).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.panel-mode[aria-selected="true"]')).toHaveCount(1);

  await page.keyboard.press('End');
  await expect(page.locator('.panel-mode[aria-selected="true"]')).toHaveAttribute('data-mode', 'fabricate');
  await page.keyboard.press('Home');
  await expect(page.locator('.panel-mode[aria-selected="true"]')).toHaveAttribute('data-mode', 'form');
});

test('layer rows select with the keyboard and actions have accessible names', async ({ page }) => {
  await boot(page);
  const layers = await openSection(page, 'Layers');
  await layers.locator('.layer-add-generator').click();
  await page.waitForTimeout(350);

  const rows = page.getByRole('button', { name: /^Select layer/ });
  await expect(rows).toHaveCount(2);
  const second = rows.nth(1);
  await second.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__parametrica.document.activeLayer)).toBe(1);
  await expect(page.getByRole('button', { name: /^Select layer/ }).nth(1))
    .toHaveAttribute('aria-current', 'true');

  for (const name of ['Rename layer', 'Move layer up', 'Move layer down', 'Duplicate layer', 'Remove layer']) {
    await expect(page.getByRole('button', { name }).first()).toBeVisible();
  }
});

test('keyboard focus is visible and distinct from the red active state', async ({ page }) => {
  await boot(page);
  const active = page.locator('.panel-mode[aria-selected="true"]');
  await active.focus();
  await page.keyboard.press('ArrowRight');
  const focus = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      outlineOffset: style.outlineOffset,
    };
  });
  expect(focus.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(focus.outlineWidth)).toBeGreaterThan(0);
  expect(focus.outlineColor).not.toBe('rgb(227, 6, 19)');
});

test('reduced motion removes non-essential transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await boot(page);
  const durations = await page.evaluate(() => {
    const style = getComputedStyle(document.querySelector('.panel-mode'));
    return {
      transition: style.transitionDuration,
      animation: style.animationDuration,
    };
  });
  for (const value of Object.values(durations)) {
    for (const part of value.split(',')) {
      expect(Number.parseFloat(part)).toBeLessThanOrEqual(0.001);
    }
  }
});
