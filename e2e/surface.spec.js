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

test('surface inspector pins, invalidates and stays out of exports', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(500);
  await page.waitForFunction(() => Boolean(window.__parametrica.renderer.lastScene));
  const canvas = await openSection(page, 'Canvas');
  await canvas.locator('.surface-inspector-toggle-checkbox').check();
  const inspector = page.locator('#surface-inspector');
  await expect(inspector).toBeVisible();

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

  const surface = page.locator('#canvas-container canvas');
  const before = await surface.screenshot();
  const pngBefore = await page.evaluate(() => window.__parametrica.renderer.artboardDataURL());
  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(300);
  const after = await surface.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
  const pngAfter = await page.evaluate(() => window.__parametrica.renderer.artboardDataURL());
  expect(pngAfter).toBe(pngBefore);

  const xyz = await inspector.locator('.si-row', { hasText: 'xyz' }).locator('.si-value').textContent();
  await inspector.locator('.si-pin').click();
  await expect(inspector.locator('.si-pin')).toHaveText('RELEASE');
  await expect(inspector.locator('.si-row', { hasText: 'xyz' }).locator('.si-value')).toHaveText(xyz);

  const canvasBox = await page.locator('#canvas-container canvas').boundingBox();
  await page.mouse.move(canvasBox.x + 8, canvasBox.y + canvasBox.height - 8);
  await page.waitForTimeout(250);
  await expect(inspector.locator('.si-row', { hasText: 'xyz' }).locator('.si-value')).toHaveText(xyz);

  await inspector.locator('.si-pin').click();
  await expect(inspector.locator('.si-pin')).toHaveText('PIN');

  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(250);
  await inspector.locator('.si-pin').click();
  await expect(inspector.locator('.si-pin')).toHaveText('RELEASE');
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.camera.yaw += 0.2;
    app.rebuild();
  });
  await page.waitForTimeout(300);
  await expect(inspector.locator('.si-pin')).toHaveText('PIN');
  await expect(inspector.locator('.si-empty')).toContainText('Pinned result invalidated');
});

test('surface inspector pin follows projection, playback and layer lifecycle', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(500);
  await page.waitForFunction(() => Boolean(window.__parametrica.renderer.lastScene));
  const canvas = await openSection(page, 'Canvas');
  await canvas.locator('.surface-inspector-toggle-checkbox').check();
  const inspector = page.locator('#surface-inspector');
  await expect(inspector).toBeVisible();

  const pickAndPin = async () => {
    await page.waitForTimeout(300);
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
    await page.evaluate((p) => window.__parametrica.inspectAtCanvas(p.x, p.y), point);
    await inspector.locator('.si-pin').click();
    await expect(inspector.locator('.si-pin')).toHaveText('RELEASE');
  };

  await pickAndPin();
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.projection = 'xy';
    app.rebuild();
  });
  await page.waitForTimeout(300);
  await expect(inspector.locator('.si-pin')).toHaveText('PIN');
  await expect(inspector.locator('.si-empty')).toContainText('Pinned result invalidated');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.projection = '3d';
    app.document.view.camera.fov = 320;
    app.rebuild();
  });
  await pickAndPin();
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.camera.fov += 20;
    app.rebuild();
  });
  await page.waitForTimeout(300);
  await expect(inspector.locator('.si-pin')).toHaveText('PIN');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.camera.fov = 320;
    app.rebuild();
  });
  await pickAndPin();
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.animation.playing = true;
    app.evaluate();
  });
  await page.waitForTimeout(250);
  await expect(inspector.locator('.si-pin')).toHaveText('PIN');
  await expect(inspector.locator('.si-empty')).toContainText('Playback');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.animation.playing = false;
    app.rebuild();
  });
  await pickAndPin();
  await page.evaluate(() => window.__parametrica.addLayer('parametric-surface'));
  await page.waitForTimeout(350);
  await expect(inspector.locator('.si-pin')).toHaveText('PIN');
  await expect(inspector.locator('.si-empty')).toContainText('Pinned result invalidated');

  await pickAndPin();
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(350);
  await expect(inspector.locator('.si-pin')).toHaveText('RELEASE');
  await inspector.locator('.si-pin').click();
  await expect(inspector.locator('.si-pin')).toHaveText('PIN');
});

test('surface seams toggle overlays, legend and export isolation', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(500);
  await page.waitForFunction(() => Boolean(window.__parametrica.renderer.lastScene));
  const canvas = await openSection(page, 'Canvas');
  const toggle = canvas.locator('.seams-toggle-checkbox');
  const legend = page.locator('#seam-legend');
  const surface = page.locator('#canvas-container canvas');
  await expect(toggle).not.toBeChecked();
  await expect(legend).toBeHidden();

  const before = await surface.screenshot();
  const pngBefore = await page.evaluate(() => window.__parametrica.renderer.artboardDataURL());
  await toggle.check();
  await page.waitForTimeout(350);
  await expect(legend).toBeVisible();
  await expect(legend.locator('.seam-legend-status')).toHaveText('declared seams');
  const after = await surface.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
  const pngAfter = await page.evaluate(() => window.__parametrica.renderer.artboardDataURL());
  expect(pngAfter).toBe(pngBefore);

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.layout = 'quad';
    app.rebuild();
  });
  await page.waitForTimeout(350);
  await expect(legend).toBeHidden();
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.layout = 'single';
    app.rebuild();
  });
  await page.waitForTimeout(350);
  await expect(legend).toBeVisible();

  await page.evaluate(() => window.__parametrica.setGenerator('parametric'));
  await page.waitForTimeout(300);
  await expect(legend.locator('.seam-legend-status')).toHaveText('mapping unavailable');
  await toggle.uncheck();
  await expect(legend).toBeHidden();
});

test('surface overlays coexist and preserve exports', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(500);
  await page.waitForFunction(() => Boolean(window.__parametrica.renderer.lastScene));
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.reference.enabled = true;
    app.document.view.reference.ground = true;
    app.setUVDomainVisible(true);
    app.setSurfaceInspectorEnabled(true);
    app.setSeamsVisible(true);
    app.rebuild();
  });
  await page.waitForTimeout(400);
  const canvas = await openSection(page, 'Canvas');
  await expect(page.locator('#uv-domain')).toBeVisible();
  await expect(page.locator('#surface-inspector')).toBeVisible();
  await expect(page.locator('#seam-legend')).toBeVisible();

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
  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(250);
  await page.locator('#surface-inspector .si-pin').click();
  await expect(page.locator('#surface-inspector .si-pin')).toHaveText('RELEASE');
  const pngWith = await page.evaluate(() => window.__parametrica.renderer.artboardDataURL());

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.setSeamsVisible(false);
    app.setUVDomainVisible(false);
    app.setSurfaceInspectorEnabled(false);
    app.rebuild();
  });
  await page.waitForTimeout(300);
  const pngWithout = await page.evaluate(() => window.__parametrica.renderer.artboardDataURL());
  expect(pngWithout).toBe(pngWith);
  const svg = await page.evaluate(() => window.__parametrica.exporter.buildSVGFromCurrent().svg);
  expect(svg).not.toContain('seam-legend');
  expect(svg).not.toContain('surface-inspector');
  expect(svg).not.toContain('uv-domain');
  await expect(canvas.locator('.seams-toggle-checkbox')).not.toBeChecked();
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

test('surface operators run before tessellation and keep mappings aligned', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.setGenerator('parametric-surface');
    app.document.operators = [];
    app.document.generator.params.samplesU = 12;
    app.document.generator.params.samplesV = 8;
    app.rebuild();
  });
  await page.waitForTimeout(400);

  const operators = await openSection(page, 'Operators');
  const select = operators.locator('.op-add-row select');
  await select.selectOption('translate');
  await operators.locator('.op-add-row button', { hasText: '+ ADD' }).click();
  await page.waitForTimeout(250);

  const before = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.worldBBox,
      meshes: app.evaluation.meshes.length,
      errors: app.evaluation.errors.length,
    };
  });
  expect(before.errors).toBe(0);
  expect(before.meshes).toBe(1);

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.operators[0].params.dx = 40;
    app.document.operators[0].params.dz = 12;
    app.rebuild();
  });
  await page.waitForTimeout(400);

  const translated = await page.evaluate(() => {
    const app = window.__parametrica;
    const evaluation = app.evaluation;
    return {
      errors: evaluation.errors.length,
      bbox: evaluation.worldBBox,
      meshes: evaluation.meshes.length,
      mappings: evaluation.surfaceMappings.length,
      mappingAligned: evaluation.surfaceMappings.every((mapping, index) => (
        mapping.meshId === evaluation.meshes[index].id
        && mapping.faces.length === evaluation.meshes[index].faces.length
      )),
    };
  });
  expect(translated.errors).toBe(0);
  expect(translated.meshes).toBe(1);
  expect(translated.mappings).toBe(1);
  expect(translated.mappingAligned).toBe(true);
  expect(translated.bbox.minX).toBeGreaterThan(before.bbox.minX + 30);

  await select.selectOption('mirror');
  await operators.locator('.op-add-row button', { hasText: '+ ADD' }).click();
  await page.waitForTimeout(350);
  const mirrored = await page.evaluate(() => {
    const evaluation = window.__parametrica.evaluation;
    return {
      errors: evaluation.errors.length,
      surfaces: evaluation.geometry.length,
      mappings: evaluation.surfaceMappings.length,
      aligned: evaluation.surfaceMappings.every((mapping, index) => mapping.meshId === evaluation.meshes[index].id),
    };
  });
  expect(mirrored.errors).toBe(0);
  expect(mirrored.surfaces).toBe(2);
  expect(mirrored.mappings).toBe(2);
  expect(mirrored.aligned).toBe(true);

  await select.selectOption('linear-array');
  await operators.locator('.op-add-row button', { hasText: '+ ADD' }).click();
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const app = window.__parametrica;
    const last = app.document.operators[app.document.operators.length - 1];
    last.params.count = 2;
    app.rebuild();
  });
  await page.waitForTimeout(400);
  const arrayed = await page.evaluate(() => {
    const evaluation = window.__parametrica.evaluation;
    return {
      errors: evaluation.errors.length,
      surfaces: evaluation.geometry.length,
      mappings: evaluation.surfaceMappings.length,
      distinct: new Set(evaluation.geometry.map((item) => item.id)).size,
      finite: evaluation.geometry.every((item) => item.grid.points.every((row) => (
        row.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z))
      ))),
    };
  });
  expect(arrayed.errors).toBe(0);
  expect(arrayed.surfaces).toBe(4);
  expect(arrayed.mappings).toBe(4);
  expect(arrayed.distinct).toBe(4);
  expect(arrayed.finite).toBe(true);

  await expect(select.locator('option[value="twist"]')).toHaveCount(0);
  await expect(select.locator('option[value="translate"]')).toHaveCount(1);

  const worldBefore = await page.evaluate(() => {
    const evaluation = window.__parametrica.evaluation;
    return {
      bbox: evaluation.worldBBox,
      ids: evaluation.geometry.map((item) => item.id),
    };
  });
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.camera.yaw += 0.4;
    app.rebuild();
  });
  await page.waitForTimeout(300);
  const worldAfter = await page.evaluate(() => {
    const evaluation = window.__parametrica.evaluation;
    return {
      bbox: evaluation.worldBBox,
      ids: evaluation.geometry.map((item) => item.id),
    };
  });
  expect(worldAfter).toEqual(worldBefore);
});
