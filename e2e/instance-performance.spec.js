import { test, expect } from '@playwright/test';

test('24 instances render without errors and within the benchmark envelope', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));

  const result = await page.evaluate(async () => {
    const app = window.__parametrica;
    const { createInstanceLayer } = await import('/src/core/document.js');
    app.applyPreset('Torus');
    const source = app.document.layers[0];
    for (let i = 0; i < 24; i++) {
      app.document.layers.push(createInstanceLayer(source.id, {
        name: `perf-${i + 1}`,
        operators: [{
          id: 'translate',
          enabled: true,
          mods: {},
          params: { dx: 0, dy: 0, dz: i * 0.2 },
        }],
      }));
    }
    app.document.activeLayer = 1;
    app.document.view.modes = ['stroke'];
    app.controls.rebuildAll();

    const coldStart = performance.now();
    app.rebuild();
    const coldMs = performance.now() - coldStart;
    const cachedStart = performance.now();
    app.rebuild();
    const cachedMs = performance.now() - cachedStart;
    return {
      layers: app.document.layers.length,
      errors: app.evaluation.errors.length,
      curves: app.evaluation.stats.curveCount,
      points: app.evaluation.stats.pointCount,
      coldMs,
      cachedMs,
    };
  });

  await page.waitForTimeout(800);
  expect(result.layers).toBe(25);
  expect(result.errors).toBe(0);
  expect(result.curves).toBeGreaterThan(0);
  expect(result.points).toBeGreaterThan(0);
  expect(result.coldMs).toBeLessThan(1500);
  expect(result.cachedMs).toBeLessThan(500);
  await expect(page.locator('#canvas-container canvas')).toBeVisible();
});
