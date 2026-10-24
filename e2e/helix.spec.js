import { test, expect } from '@playwright/test';
import { dragSlider } from './helpers.js';

const HELIX_PRESETS = [
  'Básica',
  'Radio Variable',
  'Paso Variable',
  'Ondulada',
  'Doble Hélice',
  'Cónica',
];

async function loadPreset(page, name) {
  await page.evaluate((preset) => window.__parametrica.applyPreset(preset), name);
  await page.waitForTimeout(250);
}

async function canvasFingerprint(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#canvas-container canvas');
    const ctx = canvas.getContext('2d');
    const w = 48;
    const h = 48;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(canvas, 0, 0, w, h);
    const data = tctx.getImageData(0, 0, w, h).data;
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
    return { lit, buckets };
  });
}

async function coloredPixelCount(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#canvas-container canvas');
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    for (let i = 0; i < data.length; i += 4) {
      const max = Math.max(data[i], data[i + 1], data[i + 2]);
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      if (max > 50 && max - min > 25) colored++;
    }
    return colored;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('all six helix variations load, evaluate and are distinct', async ({ page }) => {
  const signatures = new Set();
  for (const name of HELIX_PRESETS) {
    await loadPreset(page, name);
    const state = await page.evaluate(() => {
      const app = window.__parametrica;
      const evaluation = app.evaluation;
      return {
        generator: app.document.generator.id,
        errors: evaluation.errors.length,
        curves: evaluation.curves.length,
        points: evaluation.stats.pointCount,
        signature: evaluation.curves
          .map((curve) => curve.points
            .filter((_, index) => index % 19 === 0)
            .map((point) => `${(point.x3 ?? point.x).toFixed(1)},${(point.h3 ?? 0).toFixed(1)}`)
            .join('|'))
          .join(';'),
      };
    });
    expect(state.generator, name).toBe('helix');
    expect(state.errors, name).toBe(0);
    expect(state.curves, name).toBeGreaterThan(0);
    expect(state.points, name).toBeGreaterThan(24);
    signatures.add(state.signature);
  }
  expect(signatures.size).toBe(HELIX_PRESETS.length);
});

test('projection changes the rendered view without re-evaluating geometry', async ({ page }) => {
  await loadPreset(page, 'Básica');
  await page.evaluate(() => { window.__helixEvaluation = window.__parametrica.evaluation; });
  const before = await canvasFingerprint(page);

  await page.locator('.view-projection').selectOption({ label: 'XZ · Alzado' });
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.__parametrica.document.view.projection)).toBe('xz');
  expect(await page.evaluate(() => window.__parametrica.evaluation === window.__helixEvaluation)).toBe(true);

  const after = await canvasFingerprint(page);
  const delta = Math.abs(after.lit - before.lit) +
    after.buckets.reduce((sum, bucket, index) => sum + Math.abs(bucket - before.buckets[index]), 0);
  expect(delta).toBeGreaterThan(0);
});

test('camera drag works in 3D and is inert in orthographic projections', async ({ page }) => {
  await loadPreset(page, 'Básica');
  const canvas = page.locator('#canvas-container canvas');
  const box = await canvas.boundingBox();

  await page.locator('.view-projection').selectOption({ label: 'XZ · Alzado' });
  await page.waitForTimeout(250);
  const beforeProjection = await page.evaluate(() => ({ ...window.__parametrica.document.view.camera }));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const afterProjection = await page.evaluate(() => ({ ...window.__parametrica.document.view.camera }));
  expect(afterProjection.yaw).toBeCloseTo(beforeProjection.yaw, 6);
  expect(afterProjection.pitch).toBeCloseTo(beforeProjection.pitch, 6);

  await page.locator('.view-projection').selectOption({ label: '3D camera' });
  await page.waitForTimeout(250);
  const before3D = await page.evaluate(() => ({ ...window.__parametrica.document.view.camera }));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after3D = await page.evaluate(() => ({ ...window.__parametrica.document.view.camera }));
  expect(Math.abs(after3D.yaw - before3D.yaw)).toBeGreaterThan(0.01);
});

test('radial modulation slider changes the helix and the canvas', async ({ page }) => {
  await loadPreset(page, 'Básica');
  const before = await canvasFingerprint(page);
  const beforeA = await page.evaluate(() => window.__parametrica.document.generator.params.a);
  await dragSlider(page, 'Radial Mod', 0.8);
  await page.waitForTimeout(350);
  const afterA = await page.evaluate(() => window.__parametrica.document.generator.params.a);
  expect(afterA).not.toBe(beforeA);
  const after = await canvasFingerprint(page);
  const delta = Math.abs(after.lit - before.lit) +
    after.buckets.reduce((sum, bucket, index) => sum + Math.abs(bucket - before.buckets[index]), 0);
  expect(delta).toBeGreaterThan(0);
});

test('gradient wireframe renders colored geometry', async ({ page }) => {
  await loadPreset(page, 'Básica');
  expect(await coloredPixelCount(page)).toBe(0);
  const gradient = page.locator('.mode-toggle', { hasText: 'Gradient Wireframe' }).locator('input');
  await gradient.check();
  await page.waitForTimeout(400);
  expect(await coloredPixelCount(page)).toBeGreaterThan(100);
});
