import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('blend changes the rendered canvas', async ({ page }) => {
  await boot(page);
  const artboard = await openSection(page, 'Style');
  const canvas = page.locator('#canvas-container canvas');
  const before = await canvas.screenshot();
  await artboard.locator('.artboard-row', { hasText: 'Blend' }).locator('select').selectOption('multiply');
  await page.waitForTimeout(400);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
  await artboard.locator('.artboard-row', { hasText: 'Blend' }).locator('select').selectOption('normal');
});

test('content lock blocks edits while keeping visibility available', async ({ page }) => {
  await boot(page);
  const layers = await openSection(page, 'Layers');
  const active = layers.locator('.layer-row.active');
  await active.locator('button[title="Lock layer content"]').click();
  await expect(active.locator('button[title="Unlock layer content"]')).toBeVisible();
  await expect(page.locator('.panel-status-text')).toContainText('content locked');

  const generator = await openSection(page, 'Generator');
  await expect(generator.locator('select').first()).toBeDisabled();

  const artboard = await openSection(page, 'Style');
  await expect(artboard.locator('.artboard-row', { hasText: 'Stroke width' }).locator('input')).toBeDisabled();
  await expect(artboard.locator('.artboard-row', { hasText: 'Blend' }).locator('select')).toBeDisabled();

  const layersAgain = await openSection(page, 'Layers');
  const activeAgain = layersAgain.locator('.layer-row.active');
  const visible = activeAgain.locator('.layer-icon').first();
  await visible.click();
  await expect(activeAgain).toHaveClass(/hidden/);
  await visible.click();
  await expect(activeAgain).not.toHaveClass(/hidden/);

  await layersAgain.locator('.layer-row.active button[title="Unlock layer content"]').click();
  await openSection(page, 'Generator');
  await expect(page.locator('#panel-section-generator select').first()).not.toBeDisabled();
});

test('inapplicable render passes are disabled and applicable passes enable', async ({ page }) => {
  await boot(page);
  let view = await openSection(page, 'Render');
  await expect(view.locator('.mode-toggle', { hasText: 'Surface Fill' }).locator('input')).toBeDisabled();
  await expect(view.locator('.mode-toggle', { hasText: 'Epicycles' }).locator('input')).toBeDisabled();

  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(400);
  view = await openSection(page, 'Render');
  await expect(view.locator('.mode-toggle', { hasText: 'Surface Fill' }).locator('input')).not.toBeDisabled();
});

test('SVG export includes surfaces, diagnostics, overlays and blend', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.modes = ['stroke', 'gradient-wireframe', 'surface-fill', 'tangents', 'topology'];
    app.document.view.overlays = { inflections: true, samplePoints: true, ruler: true, bbox: true };
    app.document.view.style.blend = 'multiply';
    app.activeLayer.style.blend = 'multiply';
    app.rebuild();
  });
  await page.waitForTimeout(300);

  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => window.__parametrica.exporter.exportSVG());
  const download = await downloadPromise;
  const svg = readFileSync(await download.path(), 'utf8');
  for (const pass of ['stroke', 'gradient-wireframe', 'surface-fill', 'tangents', 'topology']) {
    expect(svg).toContain(`data-pass="${pass}"`);
  }
  expect(svg).toContain('data-overlays="true"');
  expect(svg).toContain('mix-blend-mode:multiply');
  expect(svg).toContain('<path');
  expect(svg).toContain('<line');
  expect(svg).toContain('<circle');
  await expect(page.locator('#notice')).not.toContainText('SVG omits');
});


test('SVG export visually matches the artboard for vector strokes', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.applyPreset('Lissajous 3:5');
    app.document.view.modes = ['stroke'];
    app.document.view.overlays = { inflections: false, samplePoints: false, ruler: false, bbox: false };
    app.rebuild();
  });
  await page.waitForTimeout(300);

  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => window.__parametrica.exporter.exportSVG());
  const download = await downloadPromise;
  const svg = readFileSync(await download.path(), 'utf8');

  const counts = await page.evaluate(async (markup) => {
    const app = window.__parametrica;
    const png = app.renderer.artboardDataURL();
    const load = (src) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
    const [pngImage, svgImage] = await Promise.all([load(png), load(dataUrl)]);
    const count = (image) => {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 900;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 900, 900);
      ctx.drawImage(image, 0, 0, 900, 900);
      const data = ctx.getImageData(0, 0, 900, 900).data;
      let lit = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 12 || data[i + 1] > 12 || data[i + 2] > 12) lit++;
      }
      return lit;
    };
    return { png: count(pngImage), svg: count(svgImage) };
  }, svg);

  expect(counts.png).toBeGreaterThan(1000);
  expect(counts.svg).toBeGreaterThan(1000);
  expect(Math.abs(counts.svg - counts.png) / counts.png).toBeLessThan(0.3);
});
