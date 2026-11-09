import { test, expect } from '@playwright/test';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
}

test('legacy presets migrate once and remain readable', async ({ page }) => {
  await boot(page);
  const legacy = await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.generator.params.samples = 321;
    return app.presets.serialize('Legacy preset', app.document);
  });

  await page.evaluate((json) => {
    localStorage.removeItem('parametrica.storage.migrated.v1');
    localStorage.removeItem('parametrica.presets.v0');
    localStorage.setItem('glyph-lab.presets.v2', JSON.stringify({
      'Legacy preset': JSON.parse(json),
    }));
  }, legacy);

  await page.reload();
  await boot(page);

  const state = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      preset: Boolean(app.presets.get('Legacy preset')),
      samples: app.presets.get('Legacy preset')?.generator.params.samples,
      backup: localStorage.getItem('parametrica.presets.v0.backup.v1') !== null,
      legacy: localStorage.getItem('glyph-lab.presets.v2') !== null,
      marker: localStorage.getItem('parametrica.storage.migrated.v1') !== null,
      errors: app.storageMigration?.errors ?? [],
    };
  });
  expect(state.preset).toBe(true);
  expect(state.samples).toBe(321);
  expect(state.backup).toBe(true);
  expect(state.legacy).toBe(true);
  expect(state.marker).toBe(true);
  expect(state.errors).toEqual([]);

  // A second boot must not migrate again or duplicate data.
  await page.reload();
  await boot(page);
  const after = await page.evaluate(() => ({
    migrated: window.__parametrica.storageMigration?.migrated,
    legacy: localStorage.getItem('glyph-lab.presets.v2') !== null,
    preset: Boolean(window.__parametrica.presets.get('Legacy preset')),
  }));
  expect(after).toEqual({ migrated: false, legacy: true, preset: true });
});

test('session, notebook and presets restore independently', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const app = window.__parametrica;
    app.document.generator.params.samples = 321;
    app.session.flush(app.document);
    app.saveCheckpoint('Reload checkpoint');
    app.presets.save('Reload preset', app.document);
  });

  await page.reload();
  await boot(page);

  const state = await page.evaluate(() => {
    const app = window.__parametrica;
    return {
      sessionSamples: app.document.generator.params.samples,
      notebook: app.notebook.items.map((item) => item.name),
      presetSamples: app.presets.get('Reload preset')?.generator.params.samples,
    };
  });
  expect(state.sessionSamples).toBe(321);
  expect(state.notebook).toContain('Reload checkpoint');
  expect(state.presetSamples).toBe(321);

  // Mutating the session must not mutate the checkpoint or the preset.
  await page.evaluate(() => {
    window.__parametrica.document.generator.params.samples = 200;
    window.__parametrica.session.flush(window.__parametrica.document);
  });
  const isolated = await page.evaluate(() => {
    const app = window.__parametrica;
    const checkpoint = app.notebook.items.find((item) => item.name === 'Reload checkpoint');
    return {
      checkpointSamples: checkpoint?.document.generator.params.samples,
      presetSamples: app.presets.get('Reload preset')?.generator.params.samples,
    };
  });
  expect(isolated.checkpointSamples).toBe(321);
  expect(isolated.presetSamples).toBe(321);
});
