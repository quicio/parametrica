/**
 * ui.spec.js — regression gate for the reliability-hardening change.
 *
 * Covers the browser-only surfaces that the Node suite cannot reach:
 * Fourier harmonics wiring, array-safe render modes, inline equation
 * errors, undo after a structural edit, and the seed control.
 */

import { test, expect } from '@playwright/test';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

async function evalErrors(page) {
  return page.evaluate(() => window.__parametrica.evaluation.errors);
}

test.beforeEach(async ({ page }) => {
  await boot(page);
});

test('Fourier preset builds the harmonics editor and evaluates', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Fourier Capsule'));
  await page.waitForTimeout(250);

  const state = await page.evaluate(() => ({
    id: window.__parametrica.document.generator.id,
    curves: window.__parametrica.evaluation.curves.length,
    errors: window.__parametrica.evaluation.errors.length,
  }));
  expect(state.id).toBe('fourier');
  expect(state.curves).toBeGreaterThan(0);
  expect(state.errors).toBe(0);
  await expect(page.locator('.harmonics-editor')).toBeVisible();
  expect(await page.locator('.harmonics-editor input').count()).toBeGreaterThan(6);
});

test('editing a harmonic row updates the document', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Fourier Capsule'));
  await page.waitForTimeout(200);

  const firstTable = page.locator('.harmonics-editor .harm-table').first();
  const firstRow = firstTable.locator('.harm-row').nth(1);
  const amp = firstRow.locator('input').nth(1);
  await amp.fill('0.77');
  await amp.press('Enter');
  await page.waitForTimeout(250);

  const stored = await page.evaluate(
    () => window.__parametrica.document.generator.params.harmonicsX[0].amp,
  );
  expect(stored).toBeCloseTo(0.77, 5);
});

test('render modes stay an array when toggled', async ({ page }) => {
  const points = page.locator('.mode-toggle', { hasText: 'Points' }).locator('input');
  await points.check();
  await page.waitForTimeout(200);

  const modes = await page.evaluate(() => window.__parametrica.document.view.modes);
  expect(Array.isArray(modes)).toBe(true);
  expect(modes).toContain('points');

  await points.uncheck();
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => window.__parametrica.document.view.modes);
  expect(Array.isArray(after)).toBe(true);
  expect(after).not.toContain('points');
});

test('curvature pass lazily computes differential analysis', async ({ page }) => {
  const curvature = page.locator('.mode-toggle', { hasText: 'Curvature Heatmap' }).locator('input');
  await curvature.check();
  await page.waitForTimeout(250);

  const state = await page.evaluate(() => {
    const e = window.__parametrica.evaluation;
    return {
      modes: window.__parametrica.document.view.modes,
      perCurve: e.analysis.perCurve.length,
      curves: e.curves.length,
      analysisMs: e.stats.analysisMs,
    };
  });
  expect(state.modes).toContain('curvature');
  expect(state.perCurve).toBe(state.curves);
  expect(state.analysisMs).toBeGreaterThanOrEqual(0);
});

test('invalid equation produces an inline, keyed error', async ({ page }) => {
  const field = page.locator('.expr-field').first();
  const input = field.locator('textarea');
  await input.fill('sin(3*t');
  await page.waitForTimeout(400);

  await expect(field).toHaveClass(/has-error/);
  const errors = await evalErrors(page);
  expect(errors[0]?.key).toBe('exprX');
  await expect(page.locator('#telemetry')).toContainText('ERR');
});

test('undo restores a structural edit', async ({ page }) => {
  expect(await page.evaluate(() => window.__parametrica.document.operators.length)).toBe(0);
  await page.evaluate(() => window.__parametrica.addOperator('rotate'));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__parametrica.document.operators.length)).toBe(1);

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__parametrica.document.operators.length)).toBe(0);
});

test('seed control changes the document and telemetry', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.setSeed(4242));
  await page.waitForTimeout(200);
  const seed = await page.evaluate(() => window.__parametrica.document.seed);
  expect(seed).toBe(4242);
  await expect(page.locator('#telemetry')).toContainText('SEED 4242');
});

test('built-in preset names are rejected with a visible notice', async ({ page }) => {
  const name = page.locator('.controller', { hasText: 'Name' }).locator('input');
  await name.fill('Lissajous 3:5');
  await page.locator('.controller', { hasText: 'Save Preset' }).locator('button').click();
  await page.waitForTimeout(200);
  await expect(page.locator('#notice')).toHaveClass(/visible/);
  await expect(page.locator('#notice')).toContainText('built-in');
});

test('analysis panel shows metrics and parameter influence', async ({ page }) => {
  await expect(page.locator('.panel-h', { hasText: 'Analysis' })).toBeVisible();
  await page.waitForTimeout(700);

  const metrics = page.locator('.lab-metric');
  expect(await metrics.count()).toBeGreaterThanOrEqual(10);
  await expect(page.locator('.lab-status')).toContainText('Metrics updated');

  await page.locator('.lab-button', { hasText: 'Analyze influence' }).click();
  await page.waitForTimeout(900);
  await expect(page.locator('.lab-status')).toContainText('Analyzed');
  expect(await page.locator('.lab-influence-row').count()).toBeGreaterThan(0);
});

test('parameter documentation is exposed on controls', async ({ page }) => {
  const tMin = page.locator('.controller', { hasText: 't min' }).first();
  await expect(tMin).toHaveAttribute('title', /Start of the parameter domain/);

  const exprLabel = page.locator('.expr-label').first();
  await expect(exprLabel).toHaveAttribute('title', /x as a function of t/);
});

test('notebook saves, compares and survives reload', async ({ page }) => {
  await expect(page.locator('.panel-h', { hasText: 'Notebook' })).toBeVisible();
  const name = page.locator('.notebook-name');
  await name.fill('Slice A');
  await page.locator('.notebook-save').click();
  await page.waitForTimeout(500);
  expect(await page.locator('.notebook-item').count()).toBe(1);
  expect(await page.locator('.notebook-item .notebook-thumb img').count()).toBe(1);

  await page.evaluate(() => window.__parametrica.setSeed(4242));
  await page.waitForTimeout(500);
  await name.fill('Slice B');
  await page.locator('.notebook-save').click();
  await page.waitForTimeout(500);
  expect(await page.locator('.notebook-item').count()).toBe(2);

  await page.locator('.notebook-compare').click();
  await page.waitForTimeout(300);
  expect(await page.locator('.notebook-diff-row').count()).toBeGreaterThan(0);
  await expect(page.locator('.notebook-compare-view')).toContainText('seed');

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  await page.waitForTimeout(300);
  expect(await page.locator('.notebook-item').count()).toBe(2);
  expect(await page.locator('.notebook-item .notebook-thumb img').count()).toBe(2);
});

test('notebook restores a checkpoint through history', async ({ page }) => {
  await page.locator('.notebook-name').fill('Before');
  await page.locator('.notebook-save').click();
  await page.waitForTimeout(400);
  const beforeSeed = await page.evaluate(() => window.__parametrica.document.seed);

  await page.evaluate(() => window.__parametrica.setSeed(4242));
  await page.waitForTimeout(400);
  await page.locator('.notebook-action', { hasText: 'Restore' }).first().click();
  await page.waitForTimeout(500);

  const restoredSeed = await page.evaluate(() => window.__parametrica.document.seed);
  expect(restoredSeed).toBe(beforeSeed);
});

test('explore generates a 1D strip and adopts a candidate', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await expect(page.locator('.panel-h', { hasText: 'Explore' })).toBeVisible();
  await expect(page.locator('.explore-axis')).toHaveValue('generator.params.a');

  await page.locator('.explore-generate').click();
  await page.waitForTimeout(600);
  const candidates = page.locator('.explore-candidate');
  expect(await candidates.count()).toBeGreaterThan(4);
  expect(await page.locator('.explore-candidate img').count()).toBeGreaterThan(4);

  await candidates.first().click();
  await page.waitForTimeout(400);
  const adopted = await page.evaluate(() => window.__parametrica.document.generator.params.a);
  expect(adopted).toBeCloseTo(0.25, 5);
});

test('explore respects a locked parameter during randomize', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await page.locator('.explore-scope summary').click();
  const lockB = page.locator('.explore-scope-row[data-path="generator.params.b"] .explore-lock');
  await lockB.click();
  const beforeB = await page.evaluate(() => window.__parametrica.document.generator.params.b);

  await page.locator('.explore-randomize').click();
  await page.waitForTimeout(500);
  expect(await page.locator('.explore-candidate').count()).toBeGreaterThan(0);
  await page.locator('.explore-candidate').first().click();
  await page.waitForTimeout(400);

  const afterB = await page.evaluate(() => window.__parametrica.document.generator.params.b);
  expect(afterB).toBe(beforeB);
});

test('explore keeps the panel scroll and focus when randomizing/adopting', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const ui = document.querySelector('#ui');
    const panel = document.querySelector('.explore-panel');
    ui.scrollTop = Math.max(0, panel.offsetTop - 60);
  });
  const before = await page.evaluate(() => document.querySelector('#ui').scrollTop);
  expect(before).toBeGreaterThan(0);

  await page.locator('.explore-randomize').click();
  await page.waitForTimeout(700);
  const afterRandomize = await page.evaluate(() => document.querySelector('#ui').scrollTop);
  expect(Math.abs(afterRandomize - before)).toBeLessThan(8);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-focus-id'))).toBe('explore-randomize');

  await page.locator('.explore-candidate').first().scrollIntoViewIfNeeded();
  const beforeAdopt = await page.evaluate(() => document.querySelector('#ui').scrollTop);
  await page.locator('.explore-candidate').first().click();
  await page.waitForTimeout(700);
  const afterAdopt = await page.evaluate(() => document.querySelector('#ui').scrollTop);
  expect(Math.abs(afterAdopt - beforeAdopt)).toBeLessThan(24);
  expect(await page.locator('.explore-candidate').count()).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.activeElement?.classList.contains('explore-candidate'))).toBe(true);
});

test('artboard and style controls update the document and canvas', async ({ page }) => {
  await expect(page.locator('.panel-h', { hasText: 'Artboard' })).toBeVisible();

  const preset = page.locator('.artboard-row', { hasText: 'Preset' }).locator('select');
  await preset.selectOption('portrait');
  await page.waitForTimeout(250);
  const artboard = await page.evaluate(() => window.__parametrica.document.view.artboard);
  expect(artboard.width).toBe(1080);
  expect(artboard.height).toBe(1350);

  const rect = await page.evaluate(() => window.__parametrica.renderer.artboardRect());
  expect(rect.w / rect.h).toBeCloseTo(1080 / 1350, 2);

  const background = page.locator('.artboard-row', { hasText: 'Background' }).locator('input[type="color"]');
  await background.evaluate((el) => {
    el.value = '#111111';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__parametrica.document.view.artboard.background)).toBe('#111111');

  const palette = page.locator('.artboard-palette select');
  await palette.selectOption('paper');
  await page.waitForTimeout(250);
  const styled = await page.evaluate(() => ({
    background: window.__parametrica.document.view.artboard.background,
    stroke: window.__parametrica.document.view.style.stroke.color,
  }));
  expect(styled.background).toBe('#f2eee3');
  expect(styled.stroke).toBe('#121212');
});

test('explore generates a 2D grid and adopts a cell', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await page.locator('.explore-mode').selectOption('grid');
  await page.locator('.explore-generate-grid').click();
  await page.waitForTimeout(700);

  const cells = page.locator('.explore-grid-cell');
  expect(await cells.count()).toBeGreaterThan(10);
  expect(await page.locator('.explore-grid-cell img').count()).toBeGreaterThan(10);

  await cells.first().click();
  await page.waitForTimeout(400);
  const params = await page.evaluate(() => window.__parametrica.document.generator.params);
  expect(params.a).toBeCloseTo(0.25, 5);
  expect(params.b).toBeCloseTo(0.25, 5);
  expect(await page.locator('.explore-grid-cell').count()).toBeGreaterThan(10);
});

test('explore morphs between two captured parameter states', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await page.locator('.explore-mode').selectOption('morph');
  await page.locator('.explore-capture-a').click();
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.generator.params.a = 10;
    app.rebuild();
  });
  await page.waitForTimeout(300);
  await page.locator('.explore-capture-b').click();
  await page.locator('.explore-generate-morph').click();
  await page.waitForTimeout(700);

  const frames = page.locator('.explore-morph-frame');
  expect(await frames.count()).toBe(10);
  await frames.last().click();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__parametrica.document.generator.params.a)).toBeCloseTo(10, 5);
});

test('layers add, style, hide and reorder independently', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await expect(page.locator('.panel-h', { hasText: 'Layers' })).toBeVisible();
  expect(await page.locator('.layer-row').count()).toBe(1);

  await page.locator('.layer-add').click();
  await page.waitForTimeout(400);
  expect(await page.locator('.layer-row').count()).toBe(2);
  expect(await page.evaluate(() => window.__parametrica.document.layers.length)).toBe(2);

  await page.locator('.artboard-palette select').selectOption('signal');
  await page.waitForTimeout(250);
  let styles = await page.evaluate(() => window.__parametrica.document.layers.map((l) => l.style.stroke.color));
  expect(styles[0]).toBe('#ffffff');
  expect(styles[1]).toBe('#e30613');

  await page.locator('.layer-row').first().locator('.layer-name').click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__parametrica.document.activeLayer)).toBe(0);
  styles = await page.evaluate(() => window.__parametrica.document.layers.map((l) => l.style.stroke.color));
  expect(styles[0]).toBe('#ffffff');
  expect(styles[1]).toBe('#e30613');

  const secondRow = page.locator('.layer-row').nth(1);
  await secondRow.locator('.layer-icon').first().click();
  await page.waitForTimeout(300);
  const hiddenState = await page.evaluate(() => {
    const app = window.__parametrica;
    const hidden = app.document.layers[1];
    return {
      hidden: hidden.visible,
      curveLayers: [...new Set(app.evaluation.curves.map((c) => c.meta.layerId))],
      layerId: hidden.id,
    };
  });
  expect(hiddenState.hidden).toBe(false);
  expect(hiddenState.curveLayers).not.toContain(hiddenState.layerId);

  await page.locator('.layer-row').nth(1).locator('.layer-icon').first().click();
  await page.waitForTimeout(250);
  await page.locator('.layer-row').nth(1).locator('.layer-icon').nth(2).click();
  await page.waitForTimeout(400);
  const order = await page.evaluate(() => window.__parametrica.document.layers.map((l) => l.id));
  expect(order[0]).toBe(hiddenState.layerId);
});

test('timeline adds tracks/keyframes and exports a frame zip', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await expect(page.locator('.panel-h', { hasText: 'Timeline' })).toBeVisible();

  await page.locator('.timeline-track-select').selectOption('generator.params.a');
  await page.locator('.timeline-add-track').click();
  await page.waitForTimeout(300);
  expect(await page.locator('.timeline-track').count()).toBe(1);
  expect(await page.locator('.timeline-keyframe').count()).toBe(1);

  await page.evaluate(() => window.__parametrica.setTime(1));
  await page.waitForTimeout(200);
  await page.locator('.timeline-track .timeline-icon').first().click();
  await page.waitForTimeout(300);
  expect(await page.locator('.timeline-keyframe').count()).toBe(2);

  const duration = page.locator('.timeline-field', { hasText: 'Duration' }).locator('input');
  const fps = page.locator('.timeline-field', { hasText: 'FPS' }).locator('input');
  await duration.fill('0.5');
  await duration.press('Enter');
  await fps.fill('1');
  await fps.press('Enter');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('.timeline-export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  await expect(page.locator('.timeline-status')).toContainText('Exported');
});

test('timeline records a parameter change at the playhead', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await page.locator('.timeline-track-select').selectOption('generator.params.a');
  await page.locator('.timeline-add-track').click();
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__parametrica.setTime(1));
  await page.waitForTimeout(200);

  await page.locator('.timeline-record input').check();
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.generator.params.a = 5;
    app.rebuild();
  });
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => {
    const track = window.__parametrica.document.animation.timeline.tracks[0];
    return { frames: track.keyframes.length, values: track.keyframes.map((f) => f.value) };
  });
  expect(state.frames).toBe(2);
  expect(state.values).toContain(5);
});

test('offline advisor compares a checkpoint and applies a suggestion', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await page.locator('.notebook-name').fill('Advisor baseline');
  await page.locator('.notebook-save').click();
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.generator.params.a = 7;
    app.rebuild();
  });
  await page.waitForTimeout(300);

  await expect(page.locator('.panel-h', { hasText: 'Advisor' })).toBeVisible();
  await page.locator('.advisor-analyze').click();
  await page.waitForTimeout(500);
  await expect(page.locator('.advisor-summary')).not.toHaveText('');
  expect(await page.locator('.advisor-suggestion').count()).toBeGreaterThan(0);

  await page.locator('.advisor-suggestion .advisor-preview').first().click();
  await page.waitForTimeout(400);
  expect(await page.locator('.advisor-preview-view img').count()).toBe(2);

  const before = await page.evaluate(() => JSON.stringify(window.__parametrica.document.generator.params));
  await page.locator('.advisor-suggestion .advisor-apply').first().click();
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => JSON.stringify(window.__parametrica.document.generator.params));
  expect(after).not.toBe(before);
});

test('llm advisor uses a fake provider, cache and privacy copy', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await expect(page.locator('.advisor-privacy')).toContainText('No descriptor');

  await page.selectOption('.advisor-provider', 'fake');
  await page.locator('.advisor-analyze').click();
  await expect(page.locator('.advisor-status')).toContainText('Fake');
  expect(await page.locator('.advisor-suggestion').count()).toBeGreaterThan(0);

  await page.locator('.advisor-analyze').click();
  await expect(page.locator('.advisor-status')).toContainText('cached');
});

test('llm advisor debounces edits and never analyzes during playback', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await page.selectOption('.advisor-provider', 'fake');
  const readCount = () => page.evaluate(() => window.__parametrica.controls.advisorPanel.analyzeCount);

  const beforeEdit = await readCount();
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.generator.params.a += 1;
    app.rebuild();
  });
  await page.waitForTimeout(1000);
  const afterEdit = await readCount();
  expect(afterEdit).toBeGreaterThan(beforeEdit);

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.animation.playing = true;
    app.document.generator.params.a += 1;
    app.rebuild();
  });
  await page.waitForTimeout(300);
  const beforePlayback = await readCount();
  await page.waitForTimeout(1000);
  expect(await readCount()).toBe(beforePlayback);

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.animation.playing = false;
    app.document.generator.params.a += 1;
    app.rebuild();
  });
  await page.waitForTimeout(1000);
  expect(await readCount()).toBeGreaterThan(beforePlayback);
});

test('llm advisor discloses network payload and falls back offline', async ({ page }) => {
  await page.route('http://localhost:8000/**', (route) => route.abort());
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);

  await page.selectOption('.advisor-provider', 'openai-compatible');
  await expect(page.locator('.advisor-privacy')).toContainText('Sends the descriptor');
  await expect(page.locator('.advisor-privacy')).toContainText('No image is sent');
  await page.locator('.advisor-image').check();
  await expect(page.locator('.advisor-privacy')).toContainText('current thumbnail is included');

  await page.locator('.advisor-endpoint').fill('http://localhost:8000/v1/chat/completions');
  await page.locator('.advisor-analyze').click();
  await expect(page.locator('.advisor-status')).toContainText('Provider failed');
  expect(await page.locator('.advisor-suggestion').count()).toBeGreaterThan(0);
});

test('image input traces a local circle into a Fourier document', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.__parametrica.document.generator.id);
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 240, 240);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(120, 120, 70, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL('image/png');
  });
  const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
  await page.locator('.image-file').setInputFiles({ name: 'circle.png', mimeType: 'image/png', buffer });
  await expect(page.locator('.image-status')).toContainText('Image loaded');
  expect(await page.evaluate(() => Boolean(window.__parametrica.imageUnderlay))).toBe(true);
  expect(await page.evaluate(() => window.__parametrica.document.generator.id)).toBe(before);
  await expect(page.locator('.image-mask')).toBeVisible();

  await page.locator('.image-trace').click();
  await expect(page.locator('.image-status')).toContainText('harmonics');
  await expect(page.locator('.image-preview')).toBeVisible();
  await page.locator('.image-apply').click();
  await page.waitForTimeout(500);

  expect(await page.evaluate(() => window.__parametrica.document.generator.id)).toBe('fourier');
  const serialized = await page.evaluate(() => JSON.stringify(window.__parametrica.document));
  expect(serialized).not.toContain('image/png');
  expect(serialized).not.toContain('data:image');
  expect(serialized).not.toContain('imageData');
});

test('image input reports when no contour passes the threshold', async ({ page }) => {
  const before = await page.evaluate(() => JSON.stringify(window.__parametrica.document));
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 120, 120);
    return canvas.toDataURL('image/png');
  });
  const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
  await page.locator('.image-file').setInputFiles({ name: 'blank.png', mimeType: 'image/png', buffer });
  await expect(page.locator('.image-status')).toContainText('Image loaded');
  await page.locator('.image-trace').click();
  await expect(page.locator('.image-status')).toContainText('No pixels pass the threshold');
  await expect(page.locator('.image-apply')).toBeHidden();
  expect(await page.evaluate(() => JSON.stringify(window.__parametrica.document))).toBe(before);
});

test('evolution breeds checkpoints and keeps generation lineage', async ({ page }) => {
  await page.evaluate(() => window.__parametrica.applyPreset('Lissajous 3:5'));
  await page.waitForTimeout(300);
  await page.locator('.notebook-name').fill('Parent A');
  await page.locator('.notebook-save').click();
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.generator.params.a = 7;
    app.document.generator.params.b = 4;
    app.rebuild();
  });
  await page.waitForTimeout(300);
  await page.locator('.notebook-name').fill('Parent B');
  await page.locator('.notebook-save').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.notebook-item')).toHaveCount(2);

  await expect(page.locator('.evolution-parent-check')).toHaveCount(2);
  await expect(page.locator('.evolution-generate')).toBeEnabled();
  await page.locator('.evolution-generate').click();
  await expect(page.locator('.evolution-child').first()).toBeVisible();
  expect(await page.locator('.evolution-child').count()).toBeGreaterThanOrEqual(4);
  await expect(page.locator('.evolution-status')).toContainText('G1');

  await page.locator('.evolution-child .evolution-keep').first().click();
  await expect(page.locator('.evolution-status')).toContainText('Kept');
  await expect(page.locator('.notebook-item')).toHaveCount(3);
  await expect(page.locator('.notebook-item-meta').first()).toContainText('G1');
  await expect(page.locator('.notebook-item-meta').first()).toContainText('↳');

  const kept = await page.evaluate(() => {
    const cp = window.__parametrica.notebook.items.at(-1);
    return {
      generation: cp.generation,
      parents: cp.parents,
      parentId: cp.parentId,
      name: cp.name,
      hasThumb: Boolean(cp.thumbnail),
    };
  });
  expect(kept.generation).toBe(1);
  expect(kept.parents).toHaveLength(2);
  expect(kept.parentId).toBeTruthy();
  expect(kept.name).toContain('child');
  expect(kept.hasThumb).toBe(true);
});

test('saving presets does not duplicate the Presets section', async ({ page }) => {
  const headingCount = () => page.locator('.panel-h', { hasText: 'Presets' }).count();
  expect(await headingCount()).toBe(1);

  for (const presetName of ['UI Regression Preset A', 'UI Regression Preset B']) {
    const name = page.locator('.controller', { hasText: 'Name' }).locator('input');
    await name.fill(presetName);
    const save = page.locator('.controller', { hasText: 'Save Preset' }).locator('button');
    await save.click();
    await page.waitForTimeout(250);
  }

  expect(await headingCount()).toBe(1);
});
