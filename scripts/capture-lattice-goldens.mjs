/**
 * capture-lattice-goldens.mjs — visual-review artifacts for the lattice.
 *
 * Run with: node scripts/capture-lattice-goldens.mjs
 * Requires the normal Playwright Chromium install.
 */

import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const server = await createServer({
  server: { host: '127.0.0.1', port: 5181 },
  logLevel: 'error',
});
await server.listen();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto('http://127.0.0.1:5181');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  await page.evaluate(() => document.querySelector('.start-with-cancel')?.click());
  await page.waitForTimeout(500);
  mkdirSync('docs/goldens', { recursive: true });

  await page.evaluate(() => window.__parametrica.applyPreset('Lattice Vase 200'));
  await page.waitForTimeout(600);
  await page.locator('.panel-mode[data-mode="fabricate"]').click();
  await page.waitForTimeout(400);
  const openFabricate = async () => {
    const header = page.locator('.panel-section[data-section-id="fabricate"] .panel-h');
    if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  };
  await openFabricate();
  await page.waitForFunction(() => {
    const text = document.querySelector('.fabricate-status')?.textContent ?? '';
    return text.includes('READY');
  }, null, { timeout: 90_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/goldens/lattice-solid.png' });
  await page.locator('.fabricate-lattice-preview').selectOption('network');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/goldens/lattice-network.png' });
  await page.locator('.fabricate-lattice-preview').selectOption('solid');

  await page.evaluate(() => window.__parametrica.applyPreset('Organic Lattice Vase 200'));
  await page.waitForTimeout(600);
  await page.locator('.panel-section[data-section-id="fabricate"] .panel-h').click();
  await page.waitForFunction(() => {
    const text = document.querySelector('.fabricate-status')?.textContent ?? '';
    return text.includes('READY');
  }, null, { timeout: 120_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/goldens/organic-solid.png' });
  console.log('Wrote docs/goldens/lattice-network.png, lattice-solid.png and organic-solid.png');
} finally {
  await browser.close();
  await server.close();
}
