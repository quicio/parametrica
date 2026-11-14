/**
 * main.js — Parametrica entry point.
 *
 * A parametric geometry workbench: forms are discovered by exploring
 * mathematical equations, never drawn by hand.
 *
 * Side-effect imports register every generator, operator and render
 * pass with the engine registries before the app boots.
 */

import './generators/index.ts';
import './operators/index.ts';
import './render/passes/index.ts';

import { createApp } from './composition/createApp.ts';
import { initManifold } from './geometry/manifoldEngine.ts';

const versionEl = document.getElementById('app-version');
if (versionEl) versionEl.textContent = `v${__APP_VERSION__}`;

const app = createApp({
  canvasContainer: document.getElementById('canvas-container') as HTMLElement,
  uiContainer: document.getElementById('ui') as HTMLElement,
  telemetryEl: document.getElementById('telemetry'),
});

(window as unknown as Record<string, unknown>).__parametrica = app;
(window as unknown as Record<string, unknown>).__parametricaReady = (app.renderer as unknown as { readyPromise?: unknown }).readyPromise;
(window as unknown as Record<string, unknown>).__parametricaManifoldReady = initManifold().catch((error: unknown) => {
  console.warn('[parametrica] Manifold failed to load:', error instanceof Error ? error.message : String(error));
  return null;
});
