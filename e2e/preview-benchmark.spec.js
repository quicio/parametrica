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

  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/product-preview-benchmark.json', JSON.stringify(results, null, 2));
  test.info().attach('product-preview-benchmark.json', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  for (const result of results) {
    console.log(`cell ${result.cellSize}mm · ${result.triangles} tris · ${result.calls} calls · avg ${result.avgMs.toFixed(1)}ms · p95 ${result.p95Ms.toFixed(1)}ms · shadow ${result.shadowMap} · dpr ${result.dpr}`);
  }
});
