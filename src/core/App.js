/**
 * App.js — v2 composition root.
 *
 * Holds the single GlyphDocument and routes every state change through
 * rebuild() → evaluateDocument → telemetry. Identity rule (the v1 bug):
 * `this.document` is never replaced as an object; its sub-objects are
 * swapped only by methods that also rebuild the affected UI sections.
 */

import { createDocument, sanitizeDocument } from './document.js';
import { Generators, Operators } from './registry.js';
import { evaluateDocument } from './engine.js';
import { schemaDefaults } from './schema.js';
import { P5Renderer } from '../render/P5Renderer.js';
import { Controls } from '../ui/Controls.js';
import { Exporter } from '../export/Exporter.js';
import { MutationEngine } from '../mutation/MutationEngine.js';
import { PresetManager } from '../presets/PresetManager.js';

export class App {
  constructor({ canvasContainer, uiContainer, telemetryEl }) {
    this.telemetryEl = telemetryEl;
    this.presets = new PresetManager();
    this.mutator = new MutationEngine();
    this.document = createDocument('parametric');

    this.evaluate();
    this.renderer = new P5Renderer(canvasContainer, this);
    this.exporter = new Exporter(this);
    this.controls = new Controls(this, uiContainer);

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'application/json,.json';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', () => this.handleImportFile());
    document.body.appendChild(this.fileInput);
  }

  get evaluation() {
    return this._evaluation;
  }

  /** Evaluate pipeline + telemetry + error routing. Single funnel. */
  rebuild() {
    this.evaluate();
  }

  evaluate() {
    this._evaluation = evaluateDocument(this.document, { time: this.document.animation.time });
    this.controls?.showErrors(this._evaluation.errors);
    this.updateTelemetry();
  }

  /* ———————— generator ———————— */

  setGenerator(id) {
    if (!Generators.has(id)) return;
    this.document.generator = {
      id,
      params: schemaDefaults(Generators.get(id).params),
      mods: {},
    };
    this.document.name = Generators.get(id).name;
    this.controls.rebuildAll();
    this.rebuild();
  }

  /* ———————— operators ———————— */

  addOperator(id) {
    if (!Operators.has(id)) return;
    this.document.operators.push({
      id,
      enabled: true,
      params: schemaDefaults(Operators.get(id).params),
      mods: {},
    });
    this.controls.rebuildAll();
    this.rebuild();
  }

  removeOperator(index) {
    this.document.operators.splice(index, 1);
    this.controls.rebuildAll();
    this.rebuild();
  }

  moveOperator(index, dir) {
    const j = index + dir;
    if (j < 0 || j >= this.document.operators.length) return;
    const ops = this.document.operators;
    [ops[index], ops[j]] = [ops[j], ops[index]];
    this.controls.rebuildAll();
    this.rebuild();
  }

  setOperatorEnabled(index, enabled) {
    this.document.operators[index].enabled = enabled;
    this.rebuild();
  }

  /* ———————— animation ———————— */

  setTime(t) {
    this.document.animation.time = t;
    this.evaluate();
  }

  resetTime() {
    this.setTime(0);
  }

  /* ———————— mutation / presets ———————— */

  mutate() {
    const next = this.mutator.mutate(this.document);
    this.adoptDocument(next);
  }

  adoptDocument(doc) {
    // swap sub-objects, keep document identity, rebuild UI bindings
    this.document.name = doc.name;
    this.document.seed = doc.seed;
    this.document.generator = doc.generator;
    this.document.operators = doc.operators;
    Object.assign(this.document.view, doc.view);
    Object.assign(this.document.animation, doc.animation);
    this.controls.rebuildAll();
    this.rebuild();
  }

  applyPreset(name) {
    const doc = this.presets.get(name);
    if (!doc) return;
    this.adoptDocument(doc);
  }

  openImportDialog() {
    this.fileInput.click();
  }

  handleImportFile() {
    const file = this.fileInput.files?.[0];
    this.fileInput.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { name, document } = this.presets.parse(String(reader.result));
        this.adoptDocument({ ...document, name });
        this.controls.sync();
      } catch (err) {
        console.warn('[parametrica] import failed:', err.message);
      }
    };
    reader.readAsText(file);
  }

  /* ———————— telemetry ———————— */

  updateTelemetry() {
    if (!this.telemetryEl) return;
    const e = this._evaluation;
    const gen = Generators.get(this.document.generator.id);
    const errors = e.errors.length;
    const lines = [
      `MODEL ${gen.name.toUpperCase()} · OPS ${this.document.operators.filter((o) => o.enabled).length}`,
      `CURVES ${e.stats.curveCount} · PTS ${e.stats.pointCount} · LEN ${e.stats.arcLength} · EVAL ${e.stats.evalMs.toFixed(1)}MS`,
      `T ${this.document.animation.time.toFixed(2)} · SEED ${this.document.seed} · STATE ${errors ? `ERROR ×${errors}` : 'VALID'}`,
    ];
    this.telemetryEl.textContent = lines.join('\n');
    this.telemetryEl.classList.toggle('fail', errors > 0);
    this.telemetryEl.classList.toggle('ok', errors === 0);
  }
}
