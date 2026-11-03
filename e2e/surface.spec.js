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

test('surface inspector reads UV and XYZ from a hovered triangle', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(500);
  await page.waitForFunction(() => Boolean(window.__parametrica.renderer.lastScene));

  const canvas = await openSection(page, 'Canvas');
  const toggle = canvas.locator('.surface-inspector-toggle-checkbox');
  const inspector = page.locator('#surface-inspector');
  await expect(toggle).not.toBeChecked();
  await expect(inspector).toBeHidden();

  const point = await page.evaluate(() => {
    const app = window.__parametrica;
    const scene = app.renderer.lastScene;
    const layer = scene.layers[0];
    const mesh = app.evaluation.meshes[0];
    const face = mesh.faces[Math.floor(mesh.faces.length / 3)];
    const centre = face.reduce((sum, index) => ({
      x: sum.x + mesh.vertices[index].x / 3,
      y: sum.y + mesh.vertices[index].y / 3,
      z: sum.z + mesh.vertices[index].z / 3,
    }), { x: 0, y: 0, z: 0 });
    const art = layer.transform.toArtboard(centre);
    const rect = app.renderer.artboardRect();
    return {
      x: rect.x + rect.w / 2 + art.x * rect.scale,
      y: rect.y + rect.h / 2 + art.y * rect.scale,
    };
  });

  await toggle.check();
  await expect(inspector).toBeVisible();
  await expect(inspector.locator('.si-empty')).toContainText('Hover a surface');
  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(250);

  await expect(inspector.locator('.si-status')).toContainText('mapping ok');
  const uvRow = inspector.locator('.si-row', { hasText: 'uv' });
  await expect(uvRow.locator('.si-value')).not.toHaveText('—');
  const xyzRow = inspector.locator('.si-row', { hasText: 'xyz' });
  await expect(xyzRow.locator('.si-value')).toContainText('x ');
  const cellRow = inspector.locator('.si-row', { hasText: 'cell' });
  await expect(cellRow.locator('.si-value')).toContainText('u ');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.layout = 'quad';
    app.rebuild();
  });
  await page.waitForTimeout(400);
  await expect(inspector.locator('.si-empty')).toContainText('Single view only');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.layout = 'single';
    app.rebuild();
  });
  await page.waitForTimeout(400);
  await expect(inspector.locator('.si-status')).toContainText('mapping ok');

  const canvasBox = await page.locator('#canvas-container canvas').boundingBox();
  await page.mouse.move(canvasBox.x + 8, canvasBox.y + canvasBox.height - 8);
  await page.waitForTimeout(200);
  await expect(inspector.locator('.si-empty')).toContainText('No surface under cursor');

  await toggle.uncheck();
  await expect(inspector).toBeHidden();
});

test('surface inspector preference persists across reload', async ({ page }) => {
  await boot(page);
  let canvas = await openSection(page, 'Canvas');
  const toggle = canvas.locator('.surface-inspector-toggle-checkbox');
  await toggle.check();
  await expect(page.locator('#surface-inspector')).toBeVisible();

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForTimeout(200);
  canvas = await openSection(page, 'Canvas');
  await expect(canvas.locator('.surface-inspector-toggle-checkbox')).toBeChecked();
  await expect(page.locator('#surface-inspector')).toBeVisible();
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
