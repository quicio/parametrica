import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test.skip(process.env.BENCH_PREVIEW !== '1', 'set BENCH_PREVIEW=1 to run the product-preview benchmark');

test('product preview 15/20/25 mm benchmark', async ({ page }) => {
  test.setTimeout(300_000);
  await boot(page);
  const results = [];
  let fabricate = null;

  for (const cellSize of [15, 20, 25]) {
    await page.evaluate((size) => {
      const app = window.__parametrica;
      app.applyPreset('Lattice Vase 200');
      app.document.layers[0].generator.params.cellSize = size;
      app.rebuild();
    }, cellSize);
    await page.waitForTimeout(700);
    fabricate = fabricate ?? await openSection(page, 'Fabricate');
    await expect(fabricate.locator('.fabricate-status')).toContainText('READY', { timeout: 90_000 });
    const renderer = fabricate.locator('.fabricate-product-renderer');
    await renderer.selectOption('webgl');
    await page.waitForFunction(() => Boolean(window.__parametrica.productPreview?.ready), null, { timeout: 30_000 });
    await page.waitForTimeout(300);
    const metrics = await page.evaluate(async () => {
      const app = window.__parametrica;
      const benchmark = await app.productPreview.benchmark({ frames: 120 });
      const lattice = app.controls.fabricationReport?.lattice ?? {};
      return {
        ...benchmark,
        struts: lattice.struts ?? null,
        trianglesMesh: lattice.triangles ?? null,
        openingTarget: lattice.openingTargetWidth ?? null,
        openingMin: lattice.openingGauge?.minWidth ?? null,
        bbox: app.controls.fabricationReport?.bbox ?? null,
      };
    });
    results.push({ cellSize, ...metrics });
    await renderer.selectOption('p5');
    await page.waitForTimeout(200);
  }

  // SSAO at high detail on a mid-density mesh: the optional AO path is the
  // most expensive preview configuration, so measure it separately.
  if (process.env.BENCH_PREVIEW_AO !== '0') {
    await page.evaluate(() => {
      const app = window.__parametrica;
      app.applyPreset('Lattice Vase 200');
      app.document.layers[0].generator.params.cellSize = 20;
      app.rebuild();
    });
    await page.waitForTimeout(700);
    fabricate = fabricate ?? await openSection(page, 'Fabricate');
    await expect(fabricate.locator('.fabricate-status')).toContainText('READY', { timeout: 90_000 });
    const renderer = fabricate.locator('.fabricate-product-renderer');
    await renderer.selectOption('webgl');
    await page.waitForFunction(() => Boolean(window.__parametrica.productPreview?.ready), null, { timeout: 30_000 });
    await page.evaluate(() => {
      const preview = window.__parametrica.productPreview;
      preview.syncMaterial({ ...(preview.materialSpec ?? {}), quality: 'high', ao: true });
      preview.resize();
    });
    await page.waitForTimeout(300);
    const metrics = await page.evaluate(async () => {
      const app = window.__parametrica;
      const benchmark = await app.productPreview.benchmark({ frames: 60 });
      const lattice = app.controls.fabricationReport?.lattice ?? {};
      return {
        ...benchmark,
        struts: lattice.struts ?? null,
        trianglesMesh: lattice.triangles ?? null,
        openingTarget: lattice.openingTargetWidth ?? null,
        openingMin: lattice.openingGauge?.minWidth ?? null,
        bbox: app.controls.fabricationReport?.bbox ?? null,
      };
    });
    results.push({ cellSize: 20, ssaoHigh: true, ...metrics });
    await renderer.selectOption('p5');
    await page.waitForTimeout(200);
  }

  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/product-preview-benchmark.json', JSON.stringify(results, null, 2));
  test.info().attach('product-preview-benchmark.json', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  for (const result of results) {
    const ao = result.ssaoHigh ? ' · SSAO high' : '';
    console.log(`cell ${result.cellSize}mm${ao} · ${result.triangles} tris · ${result.calls} calls · avg ${result.avgMs.toFixed(1)}ms · p95 ${result.p95Ms.toFixed(1)}ms · shadow ${result.shadowMap} · dpr ${result.dpr} · ${result.gpuRenderer}`);
  }
});
