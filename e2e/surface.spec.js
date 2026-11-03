import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('UV domain inset follows the active surface without changing the scene', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.setGenerator('parametric-surface');
    const params = app.document.generator.params;
    params.u0 = -1.5;
    params.u1 = 2.5;
    params.v0 = 10;
    params.v1 = -2;
    params.samplesU = 8;
    params.samplesV = 8;
    app.rebuild();
  });
  await page.waitForTimeout(400);

  const canvas = await openSection(page, 'Canvas');
  const toggle = canvas.locator('.uv-domain-toggle-checkbox');
  const inset = page.locator('#uv-domain');
  await expect(toggle).not.toBeChecked();
  await expect(inset).toBeHidden();

  const before = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.bbox,
      rect: app.renderer.artboardRect(),
    };
  });

  await toggle.check();
  await page.waitForTimeout(300);
  await expect(inset).toBeVisible();
  await expect(inset).toHaveAttribute('data-u-start', '-1.5');
  await expect(inset).toHaveAttribute('data-u-end', '2.5');
  await expect(inset).toHaveAttribute('data-v-start', '10');
  await expect(inset).toHaveAttribute('data-v-end', '-2');
  await expect(inset).toHaveAttribute('data-rows', '9');
  await expect(inset).toHaveAttribute('data-u-min', '-1.5');
  await expect(inset).toHaveAttribute('data-u-max', '2.5');
  await expect(inset).toHaveAttribute('data-v-min', '-2');
  await expect(inset).toHaveAttribute('data-v-max', '10');
  await expect(inset.locator('.uv-domain-range')).toContainText('u [-1.5 → 2.5]');
  await expect(inset.locator('.uv-domain-range')).toContainText('v [10 → -2]');
  await expect(inset.locator('.uv-domain-chart')).toBeVisible();
  expect(await inset.locator('.uv-domain-chart line').count()).toBeGreaterThan(0);

  const after = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.bbox,
      rect: app.renderer.artboardRect(),
      svg: app.exporter.buildSVGFromCurrent().svg,
    };
  });
  expect(after.bbox).toEqual(before.bbox);
  expect(after.rect).toEqual(before.rect);
  expect(after.svg).not.toContain('uv-domain');

  await page.evaluate(() => window.__parametrica.setGenerator('parametric'));
  await page.waitForTimeout(350);
  await expect(toggle).toBeChecked();
  await expect(inset).toBeHidden();
});

test('parametric surface evaluates, tessellates and renders fill', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.setGenerator('parametric-surface'));
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const evaluation = window.__parametrica.evaluation;
    return {
      errors: evaluation.errors.length,
      kind: evaluation.geometry[0]?.kind,
      meshes: evaluation.meshes.length,
      faces: evaluation.meshes[0]?.faces.length,
      normals: evaluation.meshes[0]?.normals.length,
    };
  });
  expect(state.errors).toBe(0);
  expect(state.kind).toBe('surface');
  expect(state.meshes).toBe(1);
  expect(state.faces).toBeGreaterThan(100);
  expect(state.normals).toBeGreaterThan(100);

  const view = await openSection(page, 'Render');
  const fill = view.locator('.mode-toggle', { hasText: 'Surface Fill' }).locator('input[type="checkbox"]');
  await expect(fill).toBeVisible();
  const canvas = page.locator('#canvas-container canvas');
  const before = await canvas.screenshot();
  await fill.check();
  await page.waitForTimeout(400);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
});
