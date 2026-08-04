/**
 * App.js — composition root.
 *
 * Wires the pure-geometry core to the renderer, the controls, the
 * exporter and the two engines. Holds the single mutable state object
 * (`this.params`); every mutation path funnels through
 * `onParamsChanged()` so the geometry and telemetry stay coherent.
 */

import { defaultParams } from './params.js';
import { GlyphGeometry } from '../geometry/GlyphGeometry.js';
import { P5Renderer } from '../render/P5Renderer.js';
import { Controls } from '../ui/Controls.js';
import { Exporter } from '../export/Exporter.js';
import { MutationEngine } from '../engine/MutationEngine.js';
import { PresetManager } from '../engine/PresetManager.js';

export class App {
  /**
   * @param {{canvasContainer: HTMLElement, uiContainer: HTMLElement, telemetryEl: HTMLElement}} refs
   */
  constructor({ canvasContainer, uiContainer, telemetryEl }) {
    this.params = defaultParams();
    this.telemetryEl = telemetryEl;

    this.presets = new PresetManager();
    this.mutator = new MutationEngine();
    this.geometry = new GlyphGeometry(this.params);
    this.renderer = new P5Renderer(canvasContainer, this);
    this.exporter = new Exporter(this);
    this.controls = new Controls(this, uiContainer);

    this.onParamsChanged();
  }

  /** Single entry point for "parameters changed → regenerate now". */
  onParamsChanged() {
    this.geometry.rebuild(this.params);
    this.updateTelemetry();
  }

  /**
   * IMPORTANT: `this.params` must never be REPLACED, only updated in
   * place. The lil-gui controllers are bound to this exact object
   * reference; swapping it would leave every slider writing to a dead
   * object (the "controls stop responding after Mutate" bug).
   */
  #setParams(next) {
    Object.assign(this.params, next);
    this.controls.sync();
    this.onParamsChanged();
  }

  mutate() {
    this.#setParams(this.mutator.mutate(this.params));
  }

  applyPreset(name) {
    const preset = this.presets.get(name);
    if (!preset) return;
    this.#setParams(preset);
  }

  /** @returns {boolean} success */
  importJSON(json) {
    try {
      const { params } = this.presets.parse(json);
      this.#setParams(params);
      return true;
    } catch (err) {
      console.warn('[glyph-lab] import failed:', err.message);
      return false;
    }
  }

  updateTelemetry() {
    if (!this.telemetryEl) return;
    const m = this.geometry.metrics;
    const v = this.geometry.validation;
    const status = v.ok ? 'VALID' : `INVALID — ${v.reason}`;
    const crossA = m.crossings[0] ? Math.round(m.crossings[0].y) : '—';
    const crossB = m.crossings[1] ? Math.round(m.crossings[1].y) : '—';
    const lines = [
      `W ${Math.round(m.width)}  H ${Math.round(m.height)}  WAIST ${(m.waistX * 2).toFixed(1)}`,
      `CROSS ${crossA} / ${crossB}  SEG ${this.geometry.master.segments.length} ×2`,
      `STATE ${status}`,
    ];
    this.telemetryEl.textContent = lines.join('\n');
    this.telemetryEl.classList.toggle('fail', !v.ok);
    this.telemetryEl.classList.toggle('ok', v.ok);
  }
}
