import { test, expect } from '@playwright/test';
import { openSection, openMode, typeInto } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
}

async function lissajous(page) {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(250);
}

test('workspace modes and accordion state persist', async ({ page }) => {
  await boot(page);
  await expect(page.locator('.panel-mode[data-mode="form"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.panel-section[data-section-id="generator"]')).toBeVisible();
  await expect(page.locator('.panel-section[data-section-id="notebook"]')).toBeHidden();

  const layers = await openSection(page, 'Layers');
  await expect(layers.locator('.panel-body')).toBeVisible();

  await openMode(page, 'keep');
  await expect(page.locator('.panel-section[data-section-id="notebook"]')).toBeVisible();
  await expect(page.locator('.panel-section[data-section-id="generator"]')).toBeHidden();

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await expect(page.locator('.panel-mode[data-mode="keep"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.panel-section[data-section-id="notebook"]')).toBeVisible();
  await expect(page.locator('.panel-section[data-section-id="generator"]')).toBeHidden();

  const notebook = await openSection(page, 'Notebook');
  await expect(notebook.locator('.panel-body')).toBeVisible();
});

test('advanced parameters are progressive and persist across rebuilds', async ({ page }) => {
  await boot(page);
  await lissajous(page);
  let parameters = await openSection(page, 'Parameters');
  const toggle = parameters.locator('.advanced-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(parameters.locator('.controller.number.hasSlider', { hasText: 'Samples' })).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(parameters.locator('.controller.number.hasSlider', { hasText: 'Samples' })).toBeVisible();

  await lissajous(page);
  parameters = await openSection(page, 'Parameters');
  await expect(parameters.locator('.advanced-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(parameters.locator('.controller.number.hasSlider', { hasText: 'Samples' })).toBeVisible();
});

test('hidden active layer raises a status warning and Show restores it', async ({ page }) => {
  await boot(page);
  await lissajous(page);
  await page.evaluate(() => window.__parametrica.setLayerVisible(0, false));
  await page.waitForTimeout(250);
  await expect(page.locator('.panel-status')).toContainText('hidden');
  await expect(page.locator('.panel-status-show')).toBeVisible();

  await page.locator('.panel-status-show').click();
  await page.waitForTimeout(250);
  await expect(page.locator('.panel-status')).not.toContainText('hidden');
  expect(await page.evaluate(() => window.__parametrica.document.layers[0].visible)).toBe(true);
});

test('operator selector starts on a neutral placeholder', async ({ page }) => {
  await boot(page);
  await lissajous(page);
  const operators = await openSection(page, 'Operators');
  const select = operators.locator('.op-add-row select');
  await expect(select).toHaveValue('');
  await expect(select.locator('option').first()).toHaveText('SELECT OPERATOR');
  await expect(operators.locator('.op-add-row button', { hasText: '+ ADD' })).toBeDisabled();
  await select.selectOption('rotate');
  await expect(operators.locator('.op-add-row button', { hasText: '+ ADD' })).toBeEnabled();
});

test('all-advanced generators keep the advanced toggle and controls visible', async ({ page }) => {
  await boot(page);
  const parameters = await openSection(page, 'Parameters');
  const toggle = parameters.locator('.advanced-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(parameters.locator('.controller.number.hasSlider', { hasText: 'T max' })).toBeVisible();
  await expect(parameters.locator('.lil-gui .title', { hasText: 'Modulate (time)' })).toHaveCount(1);
});

test('harmonic duration accepts exact typed values', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.setGenerator('harmonic-oscillator'));
  await page.waitForTimeout(300);
  const parameters = await openSection(page, 'Parameters');
  const advanced = parameters.locator('.advanced-toggle');
  if (await advanced.isVisible() && (await advanced.getAttribute('aria-expanded')) !== 'true') {
    await advanced.click();
  }
  await typeInto(page, 'Duration (T)', '19.37');
  expect(await page.evaluate(() => window.__parametrica.document.generator.params.duration)).toBe(19.37);
});

test('harmonic modulation folder exposes every numeric parameter', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.setGenerator('harmonic-oscillator'));
  await page.waitForTimeout(300);
  const parameters = await openSection(page, 'Parameters');
  const titles = parameters.locator('.lil-gui .title', { hasText: 'Modulate (time)' });
  await expect(titles).toHaveCount(1);
  const folder = titles.first().locator('..');
  await titles.first().click();
  for (const label of ['Amplitude X', 'Frequency Y', 'Coupling', 'Duration (T)']) {
    await expect(folder.locator('.controller:visible .name', { hasText: label }).first()).toBeVisible();
  }
});

test('animation time accepts typed values beyond the scrub range', async ({ page }) => {
  await boot(page);
  await openSection(page, 'Animation');
  await typeInto(page, 'Time', '100');
  expect(await page.evaluate(() => window.__parametrica.document.animation.time)).toBe(100);
  await expect(page.locator('#telemetry')).toContainText('T 100.00');
  const range = await page.evaluate(() => {
    const c = window.__parametrica.controls.timeController;
    return { max: c?._max, fill: c?.domElement?.querySelector('.fill')?.style.width };
  });
  expect(range.max).toBeGreaterThan(100);
  expect(parseFloat(range.fill)).toBeLessThan(100);
});

test('warp operator exposes visual controls and editable expressions', async ({ page }) => {
  await boot(page);
  await lissajous(page);
  const operators = await openSection(page, 'Operators');
  await operators.locator('.op-add-row select').selectOption('warp');
  await operators.locator('.op-add-row button', { hasText: '+ ADD' }).click();
  await page.waitForTimeout(350);

  const item = page.locator('.op-item').first();
  await expect(item.locator('.op-name')).toContainText('Warp');
  await expect(item.locator('.expr-field')).toHaveCount(2);
  await expect(item.locator('.lil-gui select')).toHaveValue('auto');
  const first = item.locator('.expr-field').first();
  await expect(first.locator('.cm-content')).toContainText('40*sin(y/60)');

  const amplitude = item.locator('.controller:visible', { hasText: 'Amplitude X' }).first();
  await amplitude.locator('input').fill('96');
  await amplitude.locator('input').press('Enter');
  await page.waitForTimeout(350);
  const params = await page.evaluate(() => window.__parametrica.document.operators[0].params);
  expect(params.mode).toBe('auto');
  expect(params.ampX).toBe(96);
  await expect(first.locator('.cm-content')).toContainText('96*sin(y/60)');

  await first.locator('.cm-content').fill('x + sin(y/20)');
  await page.waitForTimeout(450);
  expect(await page.evaluate(() => window.__parametrica.document.operators[0].params.mode)).toBe('manual');

  await item.locator('.lil-gui select').selectOption('auto');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__parametrica.document.operators[0].params.mode)).toBe('auto');
  await expect(first.locator('.cm-content')).toContainText(`sin(y/60)`);
});


test('operators with optional expression parameters expose their editors', async ({ page }) => {
  await boot(page);
  await lissajous(page);
  await page.evaluate(() => window.__parametrica.addOperator('rotate'));
  await page.evaluate(() => window.__parametrica.addOperator('expression-displace'));
  await page.evaluate(() => window.__parametrica.addOperator('expression-clip'));
  await page.waitForTimeout(500);

  const operators = await openSection(page, 'Operators');
  const items = operators.locator('.op-item');
  await expect(items.nth(0).locator('.expr-field')).toHaveCount(1);
  await expect(items.nth(1).locator('.expr-field')).toHaveCount(2);
  await expect(items.nth(2).locator('.expr-field')).toHaveCount(1);
  const state = await page.evaluate(() => ({
    errors: window.__parametrica.evaluation.errors.length,
    curves: window.__parametrica.evaluation.curves.length,
  }));
  expect(state.errors).toBe(0);
  expect(state.curves).toBeGreaterThan(0);
});

test('orthographic views are gated to 3D documents', async ({ page }) => {
  await boot(page);
  await lissajous(page);
  const camera = await openSection(page, 'Camera');
  await expect(page.locator('.view-projection')).toBeDisabled();
  await expect(camera.locator('.panel-hint')).toContainText('spatial active layer');

  await page.evaluate(() => window.__parametrica.applyPreset('Básica'));
  await page.waitForTimeout(250);
  await openSection(page, 'Camera');
  await expect(page.locator('.view-projection')).toBeEnabled();
  await page.locator('.view-projection').selectOption({ label: 'XZ · Alzado' });
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__parametrica.document.view.projection)).toBe('xz');

  await lissajous(page);
  expect(await page.evaluate(() => window.__parametrica.document.view.projection)).toBe('3d');
  await openSection(page, 'Camera');
  await expect(page.locator('.view-projection')).toBeDisabled();
});

test('camera clipping avoids radial spark artifacts near the camera', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Enneper Surface'));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__parametrica.document.view.camera.fov = 1.5;
    window.__parametrica.rebuild();
  });
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => {
    const evaluation = window.__parametrica.evaluation;
    const mesh = evaluation.renderMeshes[0];
    const visible = mesh.vertices.filter(Boolean);
    return {
      hidden: mesh.vertices.length - visible.length,
      finite: visible.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
      max: Math.max(...visible.map((point) => Math.max(Math.abs(point.x), Math.abs(point.y)))),
      curvesFinite: evaluation.curves.every((curve) =>
        curve.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))),
    };
  });
  expect(state.hidden).toBeGreaterThan(0);
  expect(state.finite).toBe(true);
  expect(state.curvesFinite).toBe(true);
  expect(state.max).toBeLessThan(1000);

  // A checkpoint saved with the old extreme fov must recover to the safe
  // wide-angle minimum when restored.
  const restoredFov = await page.evaluate(() => {
    const app = window.__parametrica;
    const checkpoint = app.saveCheckpoint('near-plane-check');
    app.restoreCheckpoint(checkpoint.id);
    return app.document.view.camera.fov;
  });
  expect(restoredFov).toBe(10);
});
