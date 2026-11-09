/**
 * bench-surface-performance.mjs — dense surface UI benchmark.
 *
 * Run with: node scripts/bench-surface-performance.mjs
 * Results are provisional and machine-specific.
 */

import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';

const server = await createServer({
  server: { host: '127.0.0.1', port: 5182 },
  logLevel: 'error',
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto('http://127.0.0.1:5182');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  await page.evaluate(() => document.querySelector('.start-with-cancel')?.click());
  await page.waitForTimeout(300);

  const result = await page.evaluate(async () => {
    const app = window.__parametrica;
    app.applyPreset('Enneper Surface');
    app.document.generator.params.samplesU = 160;
    app.document.generator.params.samplesV = 120;
    app.document.view.layout = 'single';
    app.rebuild();
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const times = [];
    const measure = (fn) => {
      const start = performance.now();
      fn();
      times.push(performance.now() - start);
      return times[times.length - 1];
    };
    const evaluateMs = measure(() => app.evaluate());
    const sceneMs = measure(() => app.renderer.renderNow());
    app.setSurfaceInspectorEnabled(true);
    const rect = app.renderer.artboardRect();
    const pickTimes = [];
    for (let i = 0; i < 24; i++) {
      const x = rect.x + rect.w * (0.25 + (i % 4) * 0.16);
      const y = rect.y + rect.h * (0.25 + Math.floor(i / 4) * 0.16);
      const start = performance.now();
      app.inspectAtCanvas(x, y);
      pickTimes.push(performance.now() - start);
    }
    app.setSeamsVisible(true);
    const seamsMs = measure(() => {
      app.rebuild();
      app.renderer.renderNow();
    });
    app.setSeamsVisible(false);
    const playbackTimes = [];
    for (let i = 0; i < 24; i++) {
      const start = performance.now();
      app.setTime(i / 24);
      app.renderer.renderNow();
      playbackTimes.push(performance.now() - start);
    }
    app.setTime(0);
    const stats = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      return {
        avg: values.reduce((sum, value) => sum + value, 0) / values.length,
        p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
        max: sorted[sorted.length - 1],
      };
    };
    return {
      points: app.evaluation.stats?.pointCount ?? null,
      curves: app.evaluation.stats?.curveCount ?? null,
      evaluate: stats([evaluateMs]),
      render: stats([sceneMs]),
      pick: stats(pickTimes),
      seams: stats([seamsMs]),
      playback: stats(playbackTimes),
    };
  });

  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/surface-performance-benchmark.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
  await server.close();
}
