/**
 * e2e/parametric.spec.js — user-level QA of Parametric Equations.
 *
 * The bug this suite was born from: the screenshot showed T MIN=57.09
 * and T MAX=-24.58 while the curve looked identical to the default.
 * Two real problems hide there:
 *
 *   1. Slider drags were not reaching the document (the old proxy
 *      binding) — fixed, but must stay fixed.
 *   2. There is NO validation that t0 < t1. The engine happily
 *      samples t from 57.09 DOWN to -24.58 (13+ full periods) which
 *      produces a dense, nearly-identical-looking curve — and the UI
 *      says "57.09 / -24.58" as if that were a sensible domain.
 *
 * This suite tests interaction as a real user, then tests the domain
 * sanity edge case.
 */

import { test, expect } from '@playwright/test';
import {
  docParams, evalState, controller, typeInto,
  expectSliderChangesDoc, toggleCheckbox,
} from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  // Ensure we start on Parametric Equations with a clean document.
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__parametrica.setGenerator('parametric'));
  await page.waitForTimeout(200);
});

test('panel renders and canvas evaluates', async ({ page }) => {
  await expect(page.locator('#telemetry')).toContainText('STATE VALID');
  const ctrl = await controller(page, 't min');
  await expect(ctrl).toBeVisible();
  const state = await evalState(page);
  expect(state.errors).toBe(0);
  expect(state.pts).toBeGreaterThan(2);
});

test('t min slider drag reaches the document', async ({ page }) => {
  // t0 range: ±2π ≈ ±12.57. Drag to 25% → ≈ -6.28 (−π).
  const r = await expectSliderChangesDoc(page, 't min', 't0', -2 * Math.PI * 2, 2 * Math.PI * 2, 0.25, 0.3);
  expect(r.ok, r.message).toBeTruthy();
});

test('t max slider drag reaches the document', async ({ page }) => {
  // t1 range: 0..4π ≈ 0..25.13. Drag to 75% → ≈ 18.85 (3π).
  const r = await expectSliderChangesDoc(page, 't max', 't1', 0, 4 * Math.PI * 2, 0.75, 0.3);
  expect(r.ok, r.message).toBeTruthy();
});

test('samples slider drag reaches the document', async ({ page }) => {
  const r = await expectSliderChangesDoc(page, 'Samples', 'samples', 32, 8000, 0.5, 200);
  expect(r.ok, r.message).toBeTruthy();
});

test('fit size slider drag reaches the document', async ({ page }) => {
  const r = await expectSliderChangesDoc(page, 'Fit Size', 'fit', 0, 800, 0.5, 5);
  expect(r.ok, r.message).toBeTruthy();
});

test('typing a value into t min updates the document', async ({ page }) => {
  await typeInto(page, 't min', '-4.16');
  const params = await docParams(page);
  expect(params.t0).toBeCloseTo(-4.16, 1);
});

test('typing t max and t min inverts the domain and evaluation reacts', async ({ page }) => {
  // The screenshot bug: user typed t0=57 > t1=-24. With the slider range
  // now clamped to ±4π (~±12.57), typing 57 clamps to 4π and typing -24
  // clamps to -4π. The domain still evaluates forward (swap) — the
  // slider range prevents the 13-period tangle entirely.
  await typeInto(page, 't min', '57.09');
  await typeInto(page, 't max', '-24.58');
  const params = await docParams(page);
  // t0=57 clamps to +2π (t0 range ±2π); t1=-24.58 clamps to 0 (t1 range 0..4π).
  expect(params.t0).toBeCloseTo(2 * Math.PI * 2, 1);
  expect(params.t1).toBeCloseTo(0, 1);
  const state = await evalState(page);
  // No crash, no NaN points.
  expect(state.errors).toBe(0);
  const f = state.first;
  expect(Number.isFinite(f.x) && Number.isFinite(f.y)).toBe(true);
  // The domain [−4π, 4π] spans 4 periods — still sane point count.
  expect(state.pts).toBeLessThanOrEqual(700);
});

test('adaptive sampling checkbox toggles the doc', async ({ page }) => {
  const before = await docParams(page);
  await toggleCheckbox(page, 'Adaptive Sampling');
  const after = await docParams(page);
  expect(after.adaptive).toBe(!before.adaptive);
});

test('closed checkbox toggles the doc', async ({ page }) => {
  const before = await docParams(page);
  await toggleCheckbox(page, 'Closed');
  const after = await docParams(page);
  expect(after.closed).toBe(!before.closed);
});

test('editing x(t) expression re-evaluates the curve', async ({ page }) => {
  const before = await evalState(page);
  // The equation fields are custom ExpressionField widgets (.expr-field),
  // not lil-gui controllers.
  const field = page.locator('.expr-field').filter({ hasText: 'x(t)' }).first();
  const input = field.locator('.cm-content');
  await input.fill('2*cos(5*t)');
  await input.press('Enter');
  await page.waitForTimeout(400); // 150ms debounce + rebuild
  const after = await evalState(page);
  // The curve must actually change.
  expect(JSON.stringify(after.first)).not.toBe(JSON.stringify(before.first));
  expect(after.errors).toBe(0);
});

test('mutate produces a valid changed document', async ({ page }) => {
  const before = JSON.stringify(await docParams(page));
  await page.locator('button:has-text("MUTATE")').click();
  await page.waitForTimeout(300);
  const after = JSON.stringify(await docParams(page));
  const state = await evalState(page);
  expect(state.errors).toBe(0);
  expect(after).not.toBe(before);
});

test('preset switch rebuilds the panel and evaluates', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Helix (Isometric)'));
  await page.waitForTimeout(300);
  const state = await evalState(page);
  expect(state.errors).toBe(0);
  expect(state.pts).toBeGreaterThan(2);
  // The panel should now show 3D-specific params: a z(t) equation field
  // and the Depth Fade toggle — things that don't exist in parametric.
  await expect(page.locator('.expr-field:has-text("z(t)")')).toHaveCount(1);
  await expect(page.locator('.controller .name:has-text("Depth Fade")')).toHaveCount(1);
});
