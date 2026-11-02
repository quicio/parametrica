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
  await expect(view.locator('.mode-toggle', { hasText: 'Surface Fill' }).locator('input[type="checkbox"]')).toBeDisabled();
  await expect(view.locator('.mode-toggle', { hasText: 'Epicycles' }).locator('input[type="checkbox"]')).toBeDisabled();

  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(400);
  view = await openSection(page, 'Render');
  await expect(view.locator('.mode-toggle', { hasText: 'Surface Fill' }).locator('input[type="checkbox"]')).not.toBeDisabled();
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


test('fill gradients update the document, canvas and SVG', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Golden Rose'));
  await page.waitForTimeout(300);
  const style = await openSection(page, 'Style');
  const canvas = page.locator('#canvas-container canvas');
  const before = await canvas.screenshot();

  const fillType = style.locator('.artboard-row', { hasText: 'Fill type' }).locator('select');
  await fillType.selectOption('linear');
  await page.waitForTimeout(350);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
  let fill = await page.evaluate(() => window.__parametrica.document.view.style.fill);
  expect(fill.enabled).toBe(true);
  expect(fill.gradient.enabled).toBe(true);
  expect(fill.gradient.type).toBe('linear');

  const angle = style.locator('.artboard-row', { hasText: 'Gradient angle' }).locator('input');
  await angle.fill('90');
  await angle.press('Enter');
  await page.waitForTimeout(300);
  fill = await page.evaluate(() => window.__parametrica.document.view.style.fill);
  expect(fill.gradient.angle).toBe(90);

  await fillType.selectOption('radial');
  await page.waitForTimeout(300);
  fill = await page.evaluate(() => window.__parametrica.document.view.style.fill);
  expect(fill.gradient.type).toBe('radial');
  await style.locator('.fill-gradient-add').click();
  await page.waitForTimeout(200);
  expect(await style.locator('.fill-gradient-color').count()).toBe(3);

  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => window.__parametrica.exporter.exportSVG());
  const download = await downloadPromise;
  const svg = readFileSync(await download.path(), 'utf8');
  expect(svg).toContain('<radialGradient');
  expect(svg).toContain('fill="url(#');
});


test('plotter export is stroke-only and independent of active passes', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.applyPreset('Golden Rose');
    app.document.view.modes = ['gradient-wireframe', 'tangents'];
    app.document.view.overlays = { inflections: true, samplePoints: true, ruler: true, bbox: true };
    app.document.view.style.fill.enabled = true;
    app.document.view.style.fill.gradient.enabled = true;
    app.document.view.style.blend = 'multiply';
    app.activeLayer.style = app.document.view.style;
    app.rebuild();
  });
  await page.waitForTimeout(300);
  const exportSection = await openSection(page, 'Export');
  const downloadPromise = page.waitForEvent('download');
  await exportSection.locator('.controller', { hasText: 'Export Plotter SVG' }).locator('button').click();
  const download = await downloadPromise;
  const svg = readFileSync(await download.path(), 'utf8');
  expect(svg).toContain('data-plotter="true"');
  expect(svg).toContain('class="plotter-layer"');
  expect(svg).toContain('fill="none"');
  expect(svg).toContain('<path');
  expect(svg).not.toContain('<rect');
  expect(svg).not.toContain('<linearGradient');
  expect(svg).not.toContain('mix-blend-mode');
  expect(svg).not.toContain('svg-pass');
  expect(svg).not.toContain('svg-overlays');
  expect(svg).toContain('parametrica document');
});


test('per-layer render passes override the global modes', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  const style = await openSection(page, 'Style');
  const override = style.locator('.layer-mode-override');
  await override.selectOption('custom');
  await page.waitForTimeout(200);
  const stroke = style.locator('.layer-mode-toggle', { hasText: 'Stroke' }).locator('input');
  const points = style.locator('.layer-mode-toggle', { hasText: 'Points' }).locator('input');
  await points.check();
  await stroke.uncheck();
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({
    layerModes: window.__parametrica.document.layers[0].modes,
    globalModes: window.__parametrica.document.view.modes,
  }));
  expect(state.layerModes).toContain('points');
  expect(state.layerModes).not.toContain('stroke');
  expect(state.globalModes).toContain('stroke');
});


test('per-pass opacity changes the pass and persists on the view', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  const render = await openSection(page, 'Render');
  const points = render.locator('.mode-toggle', { hasText: 'Points' });
  await points.locator('input[type="checkbox"]').check();
  await page.waitForTimeout(300);
  const canvas = page.locator('#canvas-container canvas');
  const before = await canvas.screenshot();
  const opacity = points.locator('.pass-opacity');
  await opacity.evaluate((el) => {
    el.value = '0';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
  expect(await page.evaluate(() => window.__parametrica.document.view.passOpacity.points)).toBe(0);
});
