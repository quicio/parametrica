import { test, expect } from '@playwright/test';
import { openSection } from './helpers.js';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('Fabricate is read-only, unit-gated and exports a validated closed body', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Torus'));
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.worldBBox,
      mesh: JSON.stringify(app.evaluation.meshes[0]),
    };
  });

  const fabricate = await openSection(page, 'Fabricate');
  const status = fabricate.locator('.fabricate-status');
  const exportButton = fabricate.locator('.fabricate-export');
  await expect(status).toContainText('UNITS REQUIRED');
  await expect(exportButton).toBeDisabled();

  const unitSelect = fabricate.locator('.fabricate-world-units');
  const scaleInput = fabricate.locator('.fabricate-world-scale');
  await expect(unitSelect).toHaveValue('unitless');
  await expect(scaleInput).toBeDisabled();
  await unitSelect.selectOption('mm');
  await page.waitForTimeout(250);
  await expect(scaleInput).toBeEnabled();
  await scaleInput.fill('2');
  await scaleInput.press('Enter');
  await page.waitForTimeout(350);

  await expect(status).toContainText('READY');
  await expect(status).toHaveAttribute('data-state', 'ready');
  await expect(fabricate.locator('.fabricate-triangles')).not.toHaveText('—');
  await expect(fabricate.locator('.fabricate-vertices')).not.toHaveText('—');
  await expect(fabricate.locator('.fabricate-volume')).toContainText('mm³');
  await expect(fabricate.locator('.fabricate-physical-size')).toContainText('mm');
  await expect(fabricate.locator('.fabricate-warnings')).toHaveText('validated');
  await expect(exportButton).toBeEnabled();

  await expect(page.locator('.panel-section[data-mode="form"]').first()).toBeHidden();
  await expect(page.locator('.panel-section[data-mode="look"]').first()).toBeHidden();

  const built = await page.evaluate(() => {
    const result = window.__parametrica.exporter.buildSTLFromCurrent();
    return {
      bytes: result.data.length,
      triangles: result.triangles,
      unit: result.unit,
      scale: result.scale,
    };
  });
  expect(built.unit).toBe('mm');
  expect(built.scale).toBe(2);
  expect(built.bytes).toBe(84 + built.triangles * 50);

  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.stl$/);

  const after = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      bbox: app.evaluation.worldBBox,
      mesh: JSON.stringify(app.evaluation.meshes[0]),
    };
  });
  expect(after.bbox).toEqual(before.bbox);
  expect(after.mesh).toBe(before.mesh);

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.units.world = 'unitless';
    app.document.view.units.mmPerWorldUnit = null;
    app.rebuild();
  });
  await page.waitForTimeout(300);
  await expect(status).toContainText('UNITS REQUIRED');
  await expect(exportButton).toBeDisabled();
  await expect(fabricate.locator('.fabricate-reason')).toContainText('world scale');

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.view.units.world = 'mm';
    app.document.view.units.mmPerWorldUnit = 1;
    app.document.generator.params.closedU = false;
    app.document.generator.params.closedV = false;
    app.rebuild();
  });
  await page.waitForTimeout(350);
  await expect(status).toContainText('NOT FABRICABLE');
  await expect(exportButton).toBeDisabled();
  await expect(fabricate.locator('.fabricate-reason')).toContainText('No validated closed Mesh/Solid');
  expect(await page.evaluate(() => window.__parametrica.evaluation.errors.length)).toBe(0);

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__parametrica?.renderer?.p));
  const restored = page.locator('.panel-mode[data-mode="fabricate"]');
  await expect(restored).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.panel-section[data-mode="fabricate"]').first()).toBeVisible();
});

test('lattice preset builds a strut body in the worker and reports it', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Lattice Vase 200'));
  await page.waitForTimeout(500);

  const fabricate = await openSection(page, 'Fabricate');
  const status = fabricate.locator('.fabricate-status');
  const exportButton = fabricate.locator('.fabricate-export');
  await expect(status).toContainText('READY', { timeout: 30_000 });
  await expect(status).toHaveAttribute('data-state', 'ready');
  await expect(fabricate.locator('.fabricate-lattice')).toContainText('struts');
  await expect(fabricate.locator('.fabricate-reason')).toContainText('struts');
  await expect(fabricate.locator('.fabricate-volume')).toContainText('mm³');
  await expect(fabricate.locator('.fabricate-warnings')).toHaveText('validated');
  await expect(exportButton).toBeEnabled();

  await page.evaluate(() => {
    const app = window.__parametrica;
    window.__fabricationReportBeforeOrbit = app.controls.fabricationReport;
    app.document.view.camera.yaw += 0.35;
    app.document.view.camera.pitch = Math.min(1.2, app.document.view.camera.pitch + 0.1);
    app.rebuild();
  });
  await page.waitForTimeout(500);
  const orbitState = await page.evaluate(() => ({
    sameReport: window.__parametrica.controls.fabricationReport === window.__fabricationReportBeforeOrbit,
    running: window.__parametrica.fabricationJobs?.running === true,
    status: document.querySelector('.fabricate-status')?.textContent ?? '',
    progressHidden: document.querySelector('.fabricate-progress')?.hidden !== false,
  }));
  expect(orbitState.sameReport).toBe(true);
  expect(orbitState.running).toBe(false);
  expect(orbitState.status).toContain('READY');
  expect(orbitState.progressHidden).toBe(true);

  const preview = fabricate.locator('.fabricate-lattice-preview');
  await expect(preview).toHaveValue('solid');
  await page.waitForTimeout(600);
  const solidScene = await page.evaluate(() => {
    const app = window.__parametrica;
    const layer = app.renderer.lastScene?.layers?.find((entry) => entry.id === app.document.layers[0].id);
    return {
      preview: Boolean(app.fabricationPreview),
      modes: layer?.modes ?? null,
      meshes: layer?.meshes?.length ?? 0,
    };
  });
  expect(solidScene.preview).toBe(true);
  expect(solidScene.meshes).toBe(1);
  expect(solidScene.modes).toContain('lattice-preview');

  await preview.selectOption('network');
  await page.waitForTimeout(500);
  const networkScene = await page.evaluate(() => {
    const app = window.__parametrica;
    const layer = app.renderer.lastScene?.layers?.find((entry) => entry.id === app.document.layers[0].id);
    return {
      preview: Boolean(app.fabricationPreview),
      meshes: layer?.meshes?.length ?? 0,
    };
  });
  expect(networkScene.preview).toBe(false);
  expect(networkScene.meshes).toBe(0);

  await preview.selectOption('solid');
  await page.waitForTimeout(500);
  await expect(exportButton).toBeEnabled();

  const built = await page.evaluate(() => {
    const result = window.__parametrica.exporter.buildSTLFromCurrent();
    return { bytes: result.data.length, triangles: result.triangles };
  });
  expect(built.triangles).toBeGreaterThan(1000);
  expect(built.bytes).toBeGreaterThan(84);
});

test('perforated preset subtracts seeded holes and reuses the solid preview', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Perforated Vase 200'));
  await page.waitForTimeout(500);

  const fabricate = await openSection(page, 'Fabricate');
  const status = fabricate.locator('.fabricate-status');
  await expect(status).toContainText('READY', { timeout: 30_000 });
  await expect(fabricate.locator('.fabricate-lattice')).toContainText('holes');
  await expect(fabricate.locator('.fabricate-printability')).toContainText('overhang');
  await expect(fabricate.locator('.fabricate-lattice-preview')).toHaveValue('solid');
  const authored = await fabricate.locator('.fabricate-lattice-preview option').first().textContent();
  expect(authored).toBe('Authored');

  await page.waitForTimeout(500);
  const scene = await page.evaluate(() => {
    const app = window.__parametrica;
    const layer = app.renderer.lastScene?.layers?.find((entry) => entry.id === app.document.layers[0].id);
    return {
      preview: Boolean(app.fabricationPreview),
      meshes: layer?.meshes?.length ?? 0,
      modes: layer?.modes ?? null,
    };
  });
  expect(scene.preview).toBe(true);
  expect(scene.meshes).toBe(1);
  expect(scene.modes).toContain('lattice-preview');

  await fabricate.locator('.fabricate-lattice-preview').selectOption('network');
  await page.waitForTimeout(400);
  await expect(fabricate.locator('.fabricate-export')).toBeEnabled();
  await fabricate.locator('.fabricate-lattice-preview').selectOption('solid');
  await page.waitForTimeout(400);

  const built = await page.evaluate(() => {
    const result = window.__parametrica.exporter.buildSTLFromCurrent();
    return { bytes: result.data.length, triangles: result.triangles };
  });
  expect(built.triangles).toBeGreaterThan(1000);
  expect(built.bytes).toBeGreaterThan(84);
});

test('product preview renders a prepared solid object preset', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Pencil Cup 100'));
  await page.waitForTimeout(500);

  const fabricate = await openSection(page, 'Fabricate');
  await expect(fabricate.locator('.fabricate-status')).toContainText('READY', { timeout: 30_000 });
  const renderer = fabricate.locator('.fabricate-product-renderer');
  await expect(renderer).toBeEnabled();
  await renderer.selectOption('webgl');
  await page.waitForFunction(() => Boolean(window.__parametrica.productPreview?.ready), null, { timeout: 15_000 });
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      backend: app.document.view.preview.backend,
      ready: Boolean(app.productPreview?.ready),
      active: Boolean(app.productPreviewActive),
      productMesh: Boolean(app.fabricationPreview?.mesh),
      p5Hidden: app.renderer?.p?.canvas?.style?.visibility === 'hidden',
    };
  });
  expect(state).toEqual({ backend: 'webgl', ready: true, active: true, productMesh: true, p5Hidden: true });

  await renderer.selectOption('p5');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__parametrica.productPreviewActive)).toBe(false);
});

test('product preview uses the cut body for a cutter-based object', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Candle Holder 80'));
  await page.waitForTimeout(500);

  const fabricate = await openSection(page, 'Fabricate');
  await expect(fabricate.locator('.fabricate-status')).toContainText('READY', { timeout: 30_000 });
  const renderer = fabricate.locator('.fabricate-product-renderer');
  await expect(renderer).toBeEnabled();
  await renderer.selectOption('webgl');
  await page.waitForFunction(() => Boolean(window.__parametrica.productPreview?.ready), null, { timeout: 15_000 });
  await page.waitForTimeout(300);

  const state = await page.evaluate(() => {
    const app = window.__parametrica;
    const doc = app.document;
    const scene = app.renderer.lastScene;
    return {
      backend: doc.view.preview.backend,
      active: Boolean(app.productPreviewActive),
      cutters: doc.layers.filter((layer) => layer.fabricationRole === 'cutter').length,
      sceneLayers: scene?.layers?.length ?? null,
      docLayers: doc.layers.length,
      previewMesh: Boolean(app.fabricationPreview?.mesh),
    };
  });
  expect(state.backend).toBe('webgl');
  expect(state.active).toBe(true);
  expect(state.cutters).toBe(2);
  expect(state.docLayers).toBe(3);
  expect(state.sceneLayers).toBe(1);
  expect(state.previewMesh).toBe(true);

  await renderer.selectOption('p5');
  await page.waitForTimeout(300);
});

test('product preview renders the prepared lattice with a finish and returns to technical', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page);
  await page.evaluate(() => window.__parametrica.applyPreset('Lattice Vase 200'));
  await page.waitForTimeout(500);

  const fabricate = await openSection(page, 'Fabricate');
  await expect(fabricate.locator('.fabricate-status')).toContainText('READY', { timeout: 30_000 });
  const renderer = fabricate.locator('.fabricate-product-renderer');
  await expect(renderer).toBeEnabled();
  await renderer.selectOption('webgl');
  await page.waitForFunction(() => Boolean(window.__parametrica.productPreview?.ready), null, { timeout: 15_000 });
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      backend: app.document.view.preview.backend,
      ready: Boolean(app.productPreview?.ready),
      active: Boolean(app.productPreviewActive),
      p5Hidden: app.renderer?.p?.canvas?.style?.visibility === 'hidden',
      material: app.document.view.preview.material,
    };
  });
  expect(state.backend).toBe('webgl');
  expect(state.ready).toBe(true);
  expect(state.active).toBe(true);
  expect(state.p5Hidden).toBe(true);
  const visual = await page.evaluate(async () => {
    const data = window.__parametrica.productPreview?.capture();
    if (!data) return null;
    const image = new Image();
    image.src = data;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, 96, 96);
    const pixels = context.getImageData(0, 0, 96, 96).data;
    const colors = new Set();
    let sum = 0;
    let sumSq = 0;
    let min = 255;
    let max = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const luma = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
      colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
      sum += luma;
      sumSq += luma * luma;
      min = Math.min(min, luma);
      max = Math.max(max, luma);
    }
    const count = pixels.length / 4;
    const mean = sum / count;
    return { colors: colors.size, min, max, variance: sumSq / count - mean * mean, length: data.length };
  });
  expect(visual?.length).toBeGreaterThan(1000);
  expect(visual?.colors).toBeGreaterThan(20);
  expect(visual?.variance).toBeGreaterThan(100);

  const material = fabricate.locator('.fabricate-product-material');
  await material.selectOption('clay');
  expect(await page.evaluate(() => window.__parametrica.document.view.preview.material)).toBe('clay');
  const ao = fabricate.locator('.fabricate-product-ao');
  await ao.check();
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.__parametrica.productPreview?.useAo)).toBe(true);
  const aoCapture = await page.evaluate(() => window.__parametrica.productPreview?.capture());
  expect(aoCapture?.startsWith('data:image/png')).toBe(true);
  const productExport = fabricate.locator('.fabricate-product-export');
  await expect(productExport).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await productExport.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/-product-.*\.png$/);

  await renderer.selectOption('p5');
  await page.waitForTimeout(400);
  const back = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      backend: app.document.view.preview.backend,
      active: Boolean(app.productPreviewActive),
      p5Hidden: app.renderer?.p?.canvas?.style?.visibility === 'hidden',
    };
  });
  expect(back.backend).toBe('p5');
  expect(back.active).toBe(false);
  expect(back.p5Hidden).toBe(false);
  await expect(fabricate.locator('.fabricate-export')).toBeEnabled();

  await renderer.selectOption('webgl');
  await page.waitForFunction(() => Boolean(window.__parametrica.productPreview?.ready), null, { timeout: 15_000 });
  await page.waitForTimeout(400);
  const lost = await page.evaluate(() => {
    const gl = window.__parametrica.productPreview?.renderer?.getContext?.();
    const extension = gl?.getExtension('WEBGL_lose_context');
    extension?.loseContext();
    return Boolean(extension);
  });
  if (lost) {
    await page.waitForTimeout(500);
    const fallback = await page.evaluate(() => ({
      backend: window.__parametrica.document.view.preview.backend,
      active: Boolean(window.__parametrica.productPreviewActive),
      notice: document.getElementById('notice')?.textContent ?? '',
    }));
    expect(fallback.backend).toBe('p5');
    expect(fallback.active).toBe(false);
    expect(fallback.notice).toContain('WebGL context');
  }
});
