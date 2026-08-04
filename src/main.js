/**
 * main.js — Glyph Lab entry point.
 *
 * Glyph Lab is not a logo editor. It is a parametric geometry engine
 * for discovering mathematically inevitable monoline glyphs:
 * one continuous master spline, mirrored, never drawn by hand.
 */

import { App } from './core/App.js';

const app = new App({
  canvasContainer: document.getElementById('canvas-container'),
  uiContainer: document.getElementById('ui'),
  telemetryEl: document.getElementById('telemetry'),
});

// Console access for inspection / scripting (CAD tool courtesy).
window.__glyphlab = app;
