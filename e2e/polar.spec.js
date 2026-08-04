/**
 * e2e/polar.spec.js — user-level QA of Polar Equation.
 *
 * Verifies the contract for the Turns parameter and the adaptive
 * sampling cap (the polar generator used to call sampleAdaptive
 * without the `samples` budget, so Turns could produce point counts
 * that ignored the Samples slider entirely).
 *
 * NOTE: app state must be mutated inside page.evaluate — the app
 * handle is not serializable across the Playwright bridge.
 */

import { test, expect } from '@playwright/test';
import { evalState, dragSlider, controller } from './helpers.js';

const setParams = (page, patch) =>
  page.evaluate((p) => {
    Object.assign(window.__parametrica.document.generator.params, p);
    window.__parametrica.rebuild();
  }, patch);

const getParam = (page, key) =>
  page.evaluate((k) => window.__parametrica.document.generator.params[k], key);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.__parametrica.applyPreset('Golden Rose'));
  await page.waitForTimeout(300);
});

test('polar evaluates the Golden Rose preset', async ({ page }) => {
  const state = await evalState(page);
  expect(state.errors).toBe(0);
  expect(state.pts).toBeGreaterThan(100);
});

test('Turns slider drag reaches the document', async ({ page }) => {
  const before = await getParam(page, 'turns');
  // Turns range 1..64. Drag to ~50% → ~32-33.
  await dragSlider(page, 'Turns', 0.5);
  await page.waitForTimeout(250);
  const after = await getParam(page, 'turns');
  expect(after).not.toBe(before);
  expect(after).toBeGreaterThan(before);
});

test('adaptive sampling respects the Samples cap across turns', async ({ page }) => {
  // Low samples cap + high turns: adaptive must never exceed the cap.
  await setParams(page, { samples: 500, turns: 32 });
  await page.waitForTimeout(250);
  const state = await evalState(page);
  expect(state.errors).toBe(0);
  expect(state.pts).toBeLessThanOrEqual(500);
});

test('turns enriches a non-closing rose (phi irrational)', async ({ page }) => {
  const countCrossings = () =>
    page.evaluate(() => {
      const pts = window.__parametrica.evaluation.curves[0].points;
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        if ((a.y >= 0 && b.y < 0) || (a.y < 0 && b.y >= 0)) {
          if (a.x > 50 || b.x > 50) acc++;
        }
      }
      return acc;
    });

  await setParams(page, { turns: 1 });
  await page.waitForTimeout(200);
  const c1 = await countCrossings();
  await setParams(page, { turns: 16 });
  await page.waitForTimeout(200);
  const c16 = await countCrossings();
  // More turns → more petals crossing the +X axis (the rose never closes).
  expect(c16).toBeGreaterThan(c1);
});
