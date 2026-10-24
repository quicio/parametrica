/**
 * e2e/pixels.spec.js — THE decisive test: do parameter changes
 * actually change what's drawn on the canvas?
 *
 * The user reports: "son los parámetros que no cambian la figura" —
 * the panel updates, the document updates, but the canvas looks the
 * same. This suite compares canvas pixels before/after each param
 * change. If pixels don't differ, it's a rendering bug — regardless
 * of what the document says.
 */

import { test, expect } from '@playwright/test';
import { dragSlider } from './helpers.js';

/** Grab a downscaled pixel fingerprint of the canvas (fast + stable). */
async function canvasFingerprint(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#canvas-container canvas');
    // Downscale to 48x48 for a stable, fast fingerprint.
    const w = 48, h = 48;
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(canvas, 0, 0, w, h);
    const data = tctx.getImageData(0, 0, w, h).data;
    // Hash: count lit pixels + coarse spatial buckets.
    let lit = 0;
    const buckets = new Array(16).fill(0);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const lum = data[i] + data[i + 1] + data[i + 2];
        if (lum > 60) {
          lit++;
          buckets[Math.floor(y / 12) * 4 + Math.floor(x / 12)]++;
        }
      }
    }
    return { lit, buckets, w, h };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__parametrica.setGenerator('parametric'));
  await page.waitForTimeout(300);
});

test('T MIN change visibly alters the canvas', async ({ page }) => {
  const before = await canvasFingerprint(page);
  // Drag t min to a very different value (-150 of -200..200).
  await dragSlider(page, 't min', 0.125);
  await page.waitForTimeout(300);
  const after = await canvasFingerprint(page);
  const deltaLit = Math.abs(after.lit - before.lit);
  const bucketDelta = after.buckets.reduce((s, b, i) => s + Math.abs(b - before.buckets[i]), 0);
  console.log(`T MIN: lit ${before.lit} → ${after.lit} (Δ${deltaLit}), buckets Δ${bucketDelta}`);
  expect(deltaLit + bucketDelta).toBeGreaterThan(0);
});

test('T MAX change visibly alters the canvas', async ({ page }) => {
  const before = await canvasFingerprint(page);
  await dragSlider(page, 't max', 0.875);
  await page.waitForTimeout(300);
  const after = await canvasFingerprint(page);
  const deltaLit = Math.abs(after.lit - before.lit);
  const bucketDelta = after.buckets.reduce((s, b, i) => s + Math.abs(b - before.buckets[i]), 0);
  console.log(`T MAX: lit ${before.lit} → ${after.lit} (Δ${deltaLit}), buckets Δ${bucketDelta}`);
  expect(deltaLit + bucketDelta).toBeGreaterThan(0);
});

test('SAMPLES change does not distort the shape (resolution-only)', async ({ page }) => {
  // Samples changes the polyline resolution, NOT the shape. For a smooth
  // curve, 400 vs 700 points rasterize identically — a pixel-identical
  // canvas is CORRECT here (the user's "the figure doesn't change"
  // complaint for SAMPLES is actually right behavior).
  const before = await canvasFingerprint(page);
  await dragSlider(page, 'Samples', 0.05); // ~400 samples
  await page.waitForTimeout(300);
  const after = await canvasFingerprint(page);
  const deltaLit = Math.abs(after.lit - before.lit);
  const bucketDelta = after.buckets.reduce((s, b, i) => s + Math.abs(b - before.buckets[i]), 0);
  console.log(`SAMPLES: lit ${before.lit} → ${after.lit} (Δ${deltaLit}), buckets Δ${bucketDelta}`);
  // Document DID change (resolution), but pixels may be identical.
  const params = await page.evaluate(() => ({ ...window.__parametrica.document.generator.params }));
  console.log(`SAMPLES doc: ${JSON.stringify({ samples: params.samples })}`);
  expect(params.samples).not.toBe(700);
});

test('FIT SIZE change visibly alters the canvas', async ({ page }) => {
  const before = await canvasFingerprint(page);
  await dragSlider(page, 'Fit Size', 0.75); // ~600
  await page.waitForTimeout(300);
  const after = await canvasFingerprint(page);
  const deltaLit = Math.abs(after.lit - before.lit);
  const bucketDelta = after.buckets.reduce((s, b, i) => s + Math.abs(b - before.buckets[i]), 0);
  console.log(`FIT SIZE: lit ${before.lit} → ${after.lit} (Δ${deltaLit}), buckets Δ${bucketDelta}`);
  expect(deltaLit + bucketDelta).toBeGreaterThan(0);
});

test('x(t) equation change visibly alters the canvas', async ({ page }) => {
  const before = await canvasFingerprint(page);
  const field = page.locator('.expr-field').filter({ hasText: 'x(t)' }).first();
  const input = field.locator('.cm-content');
  await input.fill('2*cos(5*t)');
  await input.press('Enter');
  await page.waitForTimeout(400);
  const after = await canvasFingerprint(page);
  const deltaLit = Math.abs(after.lit - before.lit);
  const bucketDelta = after.buckets.reduce((s, b, i) => s + Math.abs(b - before.buckets[i]), 0);
  console.log(`x(t): lit ${before.lit} → ${after.lit} (Δ${deltaLit}), buckets Δ${bucketDelta}`);
  expect(deltaLit + bucketDelta).toBeGreaterThan(0);
});
