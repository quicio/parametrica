import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Coordinates section shows orthographic ticks, cursor values and stays out of exports', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.applyPreset('Torus');
    app.document.view.projection = 'xz';
    app.document.view.layout = 'single';
    app.rebuild();
  });
  await page.waitForTimeout(400);

  const canvas = await openSection(page, 'Canvas');
  await expect(canvas.locator('.reference-toggle-checkbox')).toHaveCount(0);
  await expect(canvas.locator('.coordinates-toggle-checkbox')).toHaveCount(0);

  const coordinates = await openSection(page, 'Coordinates');
  const values = coordinates.locator('.coordinates-toggle-checkbox');
  const grid = coordinates.locator('.coordinates-grid-checkbox');
  const cursor = coordinates.locator('.coordinates-cursor-checkbox');
  const step = coordinates.locator('.coordinates-step');
  const units = coordinates.locator('.coordinates-units-select');
  const reference = coordinates.locator('.reference-toggle-checkbox');
  const ground = coordinates.locator('.reference-ground-checkbox');

  await expect(values).not.toBeChecked();
  await expect(cursor).not.toBeChecked();
  await expect(grid).toBeDisabled();
  await expect(step).toBeDisabled();
  await expect(reference).not.toBeChecked();
  await expect(ground).toBeDisabled();

  const surface = page.locator('#canvas-container canvas');
  const before = await surface.screenshot();
  await values.check();
  await expect(grid).toBeEnabled();
  await expect(step).toBeEnabled();
  await cursor.check();
  await step.fill('1');
  await step.press('Enter');
  await page.waitForTimeout(350);
  const after = await surface.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);

  const configured = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      coordinates: app.document.view.coordinates,
      bbox: app.evaluation.worldBBox,
    };
  });
  expect(configured.coordinates.enabled).toBe(true);
  expect(configured.coordinates.cursor).toBe(true);
  expect(configured.coordinates.step).toBe(1);

  const box = await surface.boundingBox();
  const point = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 };
  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(250);

  const readout = await page.evaluate(({ x, y }) => {
    const app = window.__parametrica;
    const canvas = app.renderer.p.canvas;
    const rect = canvas.getBoundingClientRect();
    return app.renderer.coordinateReadoutAtCanvas(x - rect.left, y - rect.top);
  }, point);
  expect(readout).not.toBeNull();
  expect(readout.projection).toBe('xz');
  expect(Number.isFinite(readout.world.x)).toBe(true);
  expect(Number.isFinite(readout.world.z)).toBe(true);
  expect(readout.world.y).toBeNull();
  expect(readout.text).toContain('y —');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.units = {
      world: 'mm',
      mmPerWorldUnit: 2,
      artboard: 'unitless',
      mmPerArtboardUnit: null,
    };
    app.rebuild();
  });
  await page.waitForTimeout(250);
  await units.selectOption('physical');
  await page.waitForTimeout(250);
  const physical = await page.evaluate(() => {
    const app = window.__parametrica;
    const rect = app.renderer.artboardRect();
    return app.renderer.coordinateReadoutAtCanvas(rect.x + rect.w / 2, rect.y + rect.h / 2);
  });
  expect(physical.text).toContain('mm');
  expect(physical.world.x).toBeCloseTo(0, 6);

  const pngWith = await page.evaluate(() => window.__parametrica.renderer.artboardDataURL());
  const svg = await page.evaluate(() => window.__parametrica.exporter.buildSVGFromCurrent().svg);
  expect(svg).not.toContain('data-coordinate');
  expect(svg).not.toContain('class="coordinates');
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.coordinates.enabled = false;
    app.document.view.coordinates.cursor = false;
    app.rebuild();
  });
  await page.waitForTimeout(250);
  const pngWithout = await page.evaluate(() => window.__parametrica.renderer.artboardDataURL());
  expect(pngWith).toBe(pngWithout);

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.layout = 'quad';
    app.document.view.coordinates.enabled = true;
    app.document.view.coordinates.cursor = true;
    app.rebuild();
  });
  await page.waitForTimeout(450);
  const quad = await page.evaluate(() => {
    const app = window.__parametrica;
    const rect = app.renderer.artboardRect();
    const yz = app.renderer.coordinateReadoutAtCanvas(
      rect.x + rect.w * 0.75,
      rect.y + rect.h * 0.75,
    );
    const threeD = app.renderer.coordinateReadoutAtCanvas(
      rect.x + rect.w * 0.25,
      rect.y + rect.h * 0.25,
    );
    return { yz, threeD };
  });
  expect(quad.yz.projection).toBe('yz');
  expect(quad.yz.world.x).toBeNull();
  expect(Number.isFinite(quad.yz.world.y)).toBe(true);
  expect(Number.isFinite(quad.yz.world.z)).toBe(true);
  expect(quad.threeD).toBeNull();

  await reference.check();
  await expect(ground).toBeEnabled();
  await ground.check();
  await page.waitForTimeout(250);
  const referenceState = await page.evaluate(() => window.__parametrica.document.view.reference);
  expect(referenceState).toEqual({ enabled: true, ground: true });
  expect(await page.evaluate(() => window.__parametrica.evaluation.worldBBox)).toEqual(configured.bbox);
});
