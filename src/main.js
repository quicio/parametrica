/**
 * main.js — Parametrica entry point.
 *
 * A parametric geometry workbench: forms are discovered by exploring
 * mathematical equations, never drawn by hand.
 *
 * Side-effect imports register every generator, operator and render
 * pass with the engine registries before the app boots.
 */

import './generators/index.js';
import './operators/index.js';
import './render/passes/index.js';

import { App } from './application/App.js';
import { initManifold } from './geometry/manifoldEngine.js';

const versionEl = document.getElementById('app-version');
if (versionEl) versionEl.textContent = `v${__APP_VERSION__}`;

const app = new App({
  canvasContainer: document.getElementById('canvas-container'),
  uiContainer: document.getElementById('ui'),
  telemetryEl: document.getElementById('telemetry'),
});

window.__parametrica = app;
window.__parametricaReady = app.renderer.readyPromise;
window.__parametricaManifoldReady = initManifold().catch((error) => {
  console.warn('[parametrica] Manifold failed to load:', error.message);
  return null;
});
