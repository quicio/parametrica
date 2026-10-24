/**
 * App.js — v2 composition root.
 *
 * Holds the single GlyphDocument and routes every state change through
 * rebuild() → evaluateDocument → telemetry. Identity rule (the v1 bug):
 * `this.document` is never replaced as an object; its sub-objects are
 * swapped only by methods that also rebuild the affected UI sections.
 */

import { createDocument, sanitizeDocument, createLayer, attachLayerAliases } from './document.js';
import { Generators, Operators } from './registry.js';
import { evaluateDocument } from './engine.js';
import { schemaDefaults } from './schema.js';
import { History } from './history.js';
import { SessionStore } from './session.js';
import { Notebook } from '../lab/notebook.js';
import { computeDescriptor } from '../lab/descriptor.js';
import { computeSensitivity } from '../lab/sensitivity.js';
import { applySuggestionToDocument } from '../ai/offline.js';
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

    // UI-only reference state: never serialised with the document.
    this.imageUnderlay = null;
    this.imageInput = null;

    this.history = new History(50);
    this.lastSnapshot = this.snapshot();
    this.historyTimer = null;
    this.restoring = false;

    this.noticeEl = document.createElement('div');
    this.noticeEl.id = 'notice';
    this.noticeEl.setAttribute('role', 'status');
    this.noticeEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.noticeEl);

    this.notebook = new Notebook();
    if (this.notebook.lastError) {
      this.notify(`Notebook storage: ${this.notebook.lastError}`, 'error');
    }

    this.session = new SessionStore();
    this.pendingSession = this.session.load();
    this.sessionPaused = Boolean(this.pendingSession);
    this.sessionErrorShown = false;

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

    this.onKeyDown = (event) => this.handleKeyDown(event);
    window.addEventListener('keydown', this.onKeyDown);
    this.onVisibility = () => {
      if (document.visibilityState === 'hidden') this.flushSession();
    };
    this.onBeforeUnload = () => this.flushSession();
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('beforeunload', this.onBeforeUnload);
    this.mountSessionRecovery();
  }

  get evaluation() {
    return this._evaluation;
  }

  get activeLayer() {
    return this.document.layers?.[this.document.activeLayer] ?? null;
  }

  syncActiveStyle() {
    const layer = this.activeLayer;
    if (!layer) return;
    this.document.view.style = layer.style;
    this.document.view.strokeWeight = layer.style.stroke.width;
  }

  /** Evaluate pipeline + telemetry + error routing. Single funnel. */
  rebuild() {
    this.timelineRecorder?.(this.document.animation.time);
    this.scheduleHistory();
    this.evaluate();
    this.scheduleSessionSave();
  }

  evaluate() {
    this._evaluation = evaluateDocument(this.document, { time: this.document.animation.time });
    this.controls?.showErrors(this._evaluation.errors);
    this.updateTelemetry();
    this.controls?.labPanel?.scheduleAuto();
    // The advisor only re-runs after a stable, non-playing commit. Its own
    // debounce (700 ms) collapses slider drags and never fires per frame.
    if (!this.document.animation.playing) {
      this.controls?.advisorPanel?.scheduleAuto?.();
    }
  }

  /* ———————— lab observer ———————— */

  /**
   * Compute the deterministic descriptor and, optionally, the parameter
   * sensitivity report. This never mutates the document or the history.
   */
  analyzeFigure({ sensitivity = false } = {}) {
    if (!this._evaluation) return null;
    const descriptor = computeDescriptor(this.document, this._evaluation.curves, { layers: this._evaluation.layers });
    const report = sensitivity
      ? computeSensitivity(this.document, this._evaluation.curves, {
        time: this.document.animation.time,
      })
      : null;
    this.lastAnalysis = { descriptor, sensitivity: report };
    return this.lastAnalysis;
  }

  /* ———————— notebook ———————— */

  saveCheckpoint(name, {
    parentId = null,
    parents = [],
    generation = 0,
    document = null,
    descriptor = null,
    thumbnail = null,
  } = {}) {
    let source = this.document;
    let capturedDescriptor = descriptor;
    if (document) {
      source = sanitizeDocument(structuredClone(document));
      if (!source) throw new Error('Cannot save an invalid document');
      const evaluation = evaluateDocument(source, { time: source.animation.time });
      if (evaluation.errors.length || !evaluation.curves.length) {
        throw new Error('Cannot save an invalid or empty figure');
      }
      if (!capturedDescriptor) {
        capturedDescriptor = computeDescriptor(source, evaluation.curves, { layers: evaluation.layers });
      }
    } else {
      if (!this._evaluation || this._evaluation.errors.length || !this._evaluation.curves.length) {
        throw new Error('Cannot save an invalid or empty figure');
      }
      if (!capturedDescriptor) {
        capturedDescriptor = this.analyzeFigure({ sensitivity: false }).descriptor;
      }
      thumbnail = thumbnail ?? this.renderer?.thumbnailDataURL?.() ?? null;
    }
    const cp = this.notebook.add({
      name,
      document: source,
      descriptor: capturedDescriptor,
      thumbnail,
      parentId: parentId ?? this.notebook.latest()?.id ?? null,
      parents,
      generation,
    });
    this.controls?.evolutionPanel?.refresh?.();
    if (this.notebook.lastError) {
      this.notify(`Saved in memory; storage failed: ${this.notebook.lastError}`, 'error');
    } else {
      this.notify(`Checkpoint “${cp.name}” saved`);
    }
    return cp;
  }

  restoreCheckpoint(id) {
    const cp = this.notebook.get(id);
    if (!cp) throw new Error('Checkpoint not found');
    // Deep clone: editing the restored document must never mutate the
    // stored checkpoint.
    const doc = sanitizeDocument(structuredClone(cp.document));
    if (!doc) throw new Error('Checkpoint document is invalid');
    this.adoptDocument(doc);
    this.notify(`Restored “${cp.name}”`);
    return cp;
  }

  importNotebook(text) {
    const result = this.notebook.importJSON(text);
    if (this.notebook.lastError) {
      this.notify(`Notebook storage failed: ${this.notebook.lastError}`, 'error');
    } else {
      this.notify(`Imported ${result.added} checkpoint(s), skipped ${result.skipped}`);
    }
    return result;
  }

  /* ———————— exploration ———————— */

  adoptCandidate(document) {
    const candidate = sanitizeDocument(structuredClone(document));
    if (!candidate) throw new Error('Candidate document is invalid');

    // Exploration candidates only change parameters inside the existing
    // generator/operator structure. Mutate those objects in place instead
    // of rebuilding the whole panel: this preserves scroll, focus and the
    // generated candidate strip.
    if (this.sameStructure(candidate)) {
      const candidateLayer = candidate.layers?.[candidate.activeLayer ?? 0];
      if (this.activeLayer && candidateLayer) this.activeLayer.seed = candidateLayer.seed;
      mergeParams(this.document.generator, candidate.generator);
      candidate.operators.forEach((op, index) => {
        const current = this.document.operators[index];
        if (!current) return;
        current.enabled = op.enabled;
        mergeParams(current, op);
      });
      this.rebuild();
      this.controls?.refreshValues?.();
      this.notify('Variation adopted');
      return this.document;
    }

    this.adoptDocument(candidate);
    this.notify('Variation adopted');
    return candidate;
  }

  sameStructure(candidate) {
    if (candidate.generator.id !== this.document.generator.id) return false;
    const current = this.document.operators ?? [];
    const next = candidate.operators ?? [];
    if (current.length !== next.length) return false;
    return current.every((op, index) => op.id === next[index].id);
  }

  /* ———————— advisor ———————— */

  suggestCandidate(suggestion) {
    return applySuggestionToDocument(this.document, suggestion);
  }

  applySuggestion(suggestion) {
    const candidate = this.suggestCandidate(suggestion);
    if (!candidate) throw new Error('Suggestion could not be applied');
    this.adoptCandidate(candidate);
    this.notify(`Applied suggestion on ${suggestion.path}`);
    return candidate;
  }

  /* ———————— session recovery ———————— */

  scheduleSessionSave() {
    if (this.sessionPaused) return;
    this.session.schedule(this.document);
  }

  flushSession() {
    if (this.sessionPaused) return;
    const ok = this.session.flush(this.document);
    if (!ok && this.session.lastError && !this.sessionErrorShown) {
      this.sessionErrorShown = true;
      this.notify(`Session storage: ${this.session.lastError}`, 'error');
    }
  }

  mountSessionRecovery() {
    if (!this.pendingSession) return;
    const banner = document.createElement('div');
    banner.id = 'recovery';
    banner.className = 'recovery';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');

    const text = document.createElement('span');
    text.className = 'recovery-text';
    const when = new Date(this.pendingSession.savedAt).toLocaleString();
    text.textContent = `Previous session found · ${when}`;

    const restore = document.createElement('button');
    restore.className = 'lab-button recovery-restore';
    restore.textContent = 'Restore';
    restore.addEventListener('click', () => this.restoreSession(banner));

    const discard = document.createElement('button');
    discard.className = 'lab-button recovery-discard';
    discard.textContent = 'Dismiss';
    discard.addEventListener('click', () => this.discardSession(banner));

    banner.append(text, restore, discard);
    document.body.appendChild(banner);
  }

  restoreSession(banner) {
    const snapshot = this.pendingSession;
    if (!snapshot) return;
    this.pendingSession = null;
    this.sessionPaused = false;
    try {
      this.adoptDocument(snapshot.document);
      this.session.save(this.document);
      banner?.remove();
      this.notify('Previous session restored');
    } catch (error) {
      this.sessionPaused = true;
      this.pendingSession = snapshot;
      this.notify(`Could not restore session: ${error.message}`, 'error');
    }
  }

  discardSession(banner) {
    this.pendingSession = null;
    this.sessionPaused = false;
    this.session.clear();
    banner?.remove();
    this.notify('Previous session discarded');
  }

  /* ———————— history ———————— */

  snapshot() {
    return JSON.stringify(this.document);
  }

  /**
   * Coalesce rapid rebuilds (slider drags, camera drags) into one undo
   * entry. The snapshot stored is always the state *before* the gesture.
   */
  scheduleHistory() {
    if (this.restoring) return;
    const current = this.snapshot();
    if (current === this.lastSnapshot) return;
    if (!this.historyTimer) this.history.record(this.lastSnapshot);
    // Reset the debounce on every change: a continuous slider/camera
    // gesture becomes one entry, and the baseline advances only after
    // 350 ms of inactivity.
    if (this.historyTimer) clearTimeout(this.historyTimer);
    this.historyTimer = setTimeout(() => {
      this.lastSnapshot = this.snapshot();
      this.historyTimer = null;
    }, 350);
  }

  undo() {
    this.cancelHistoryTimer();
    const previous = this.history.undo(this.snapshot());
    if (!previous) {
      this.notify('Nothing to undo');
      return;
    }
    this.restoreSnapshot(previous);
    this.notify('Undo');
  }

  redo() {
    this.cancelHistoryTimer();
    const next = this.history.redo(this.snapshot());
    if (!next) {
      this.notify('Nothing to redo');
      return;
    }
    this.restoreSnapshot(next);
    this.notify('Redo');
  }

  cancelHistoryTimer() {
    if (this.historyTimer) clearTimeout(this.historyTimer);
    this.historyTimer = null;
  }

  restoreSnapshot(json) {
    const doc = sanitizeDocument(JSON.parse(json));
    if (!doc) return;
    this.restoring = true;
    try {
      this.adoptDocument(doc);
      this.lastSnapshot = this.snapshot();
    } finally {
      this.restoring = false;
    }
  }

  handleKeyDown(event) {
    const target = event.target;
    const tag = target?.tagName?.toLowerCase();
    if (target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const mod = event.metaKey || event.ctrlKey;
    if (!mod || event.altKey) return;
    const key = String(event.key || '').toLowerCase();
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.redo();
      else this.undo();
    } else if (key === 'y') {
      event.preventDefault();
      this.redo();
    }
  }

  /* ———————— notices ———————— */

  notify(message, kind = 'info') {
    if (!this.noticeEl) return;
    clearTimeout(this.noticeTimer);
    this.noticeEl.textContent = message;
    this.noticeEl.className = `visible ${kind}`;
    this.noticeTimer = setTimeout(() => {
      this.noticeEl.className = '';
    }, 4500);
  }

  /* ———————— seed ———————— */

  setSeed(seed) {
    const n = Number(seed);
    const clean = Number.isFinite(n) ? Math.min(1e9, Math.max(0, Math.round(n))) : 1;
    this.document.seed = clean;
    this.rebuild();
  }

  rerollSeed() {
    this.setSeed(Math.floor(Math.random() * 9999) + 1);
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
    if (this.activeLayer) this.activeLayer.name = this.document.name;
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

  /* ———————— layers ———————— */

  setActiveLayer(index) {
    if (!Array.isArray(this.document.layers) || !this.document.layers[index]) return;
    this.document.activeLayer = index;
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
  }

  addLayer(generatorId = 'parametric') {
    const layer = createLayer(generatorId, {
      name: `Layer ${this.document.layers.length + 1}`,
      seed: this.document.seed,
    });
    this.document.layers.push(layer);
    this.document.activeLayer = this.document.layers.length - 1;
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
  }

  duplicateLayer(index) {
    const source = this.document.layers?.[index];
    if (!source) return;
    const copy = structuredClone(source);
    copy.id = `layer-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`;
    copy.name = `${source.name} copy`;
    this.document.layers.splice(index + 1, 0, copy);
    this.document.activeLayer = index + 1;
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
  }

  removeLayer(index) {
    if (!Array.isArray(this.document.layers) || this.document.layers.length <= 1) return;
    this.document.layers.splice(index, 1);
    this.document.activeLayer = Math.max(0, Math.min(this.document.activeLayer, this.document.layers.length - 1));
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
  }

  moveLayer(index, dir) {
    const j = index + dir;
    if (!this.document.layers?.[index] || j < 0 || j >= this.document.layers.length) return;
    const layers = this.document.layers;
    [layers[index], layers[j]] = [layers[j], layers[index]];
    this.document.activeLayer = j;
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
  }

  setLayerVisible(index, visible) {
    const layer = this.document.layers?.[index];
    if (!layer) return;
    layer.visible = Boolean(visible);
    this.rebuild();
  }

  setLayerLocked(index, locked) {
    const layer = this.document.layers?.[index];
    if (!layer) return;
    layer.locked = Boolean(locked);
    this.controls.rebuildAll();
  }

  renameLayer(index, name) {
    const layer = this.document.layers?.[index];
    if (!layer) return;
    layer.name = String(name ?? '').trim().slice(0, 80) || layer.name;
    this.controls.rebuildAll();
  }

  /* ———————— animation ———————— */

  setTime(t) {
    let next = Number(t) || 0;
    const timeline = this.document.animation.timeline;
    if (timeline?.loop && timeline.duration > 0) {
      next = ((next % timeline.duration) + timeline.duration) % timeline.duration;
    }
    this.document.animation.time = next;
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
    // Keep document identity but adopt the v3 layer graph.
    this.document.name = doc.name;
    this.document.seed = doc.seed;
    this.document.layers = doc.layers;
    this.document.activeLayer = doc.activeLayer ?? 0;
    Object.assign(this.document.view, doc.view);
    Object.assign(this.document.animation, doc.animation);
    attachLayerAliases(this.document);
    this.syncActiveStyle();
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
        this.notify(`Imported "${name}"`);
      } catch (err) {
        console.warn('[parametrica] import failed:', err.message);
        this.notify(`Import failed: ${err.message}`, 'error');
      }
    };
    reader.onerror = () => this.notify('Import failed: could not read the file', 'error');
    reader.readAsText(file);
  }

  /* ———————— telemetry ———————— */

  updateTelemetry() {
    if (!this.telemetryEl) return;
    const e = this._evaluation;
    const gen = Generators.get(this.document.generator.id);
    const errors = e.errors.length;
    const lines = [
      `MODEL ${gen.name.toUpperCase()} · LAYERS ${this.document.layers?.length ?? 1} · OPS ${this.document.operators.filter((o) => o.enabled).length}`,
      `CURVES ${e.stats.curveCount} · PTS ${e.stats.pointCount} · PEAK ${e.stats.peakPoints ?? e.stats.pointCount} · LEN ${e.stats.arcLength} · EVAL ${e.stats.evalMs.toFixed(1)}MS`,
      `T ${this.document.animation.time.toFixed(2)} · SEED ${this.document.seed} · STATE ${errors ? `ERROR ×${errors}` : 'VALID'}`,
    ];
    if (errors) lines.push(`ERR ${e.errors[0].message}`);
    this.telemetryEl.textContent = lines.join('\n');
    this.telemetryEl.classList.toggle('fail', errors > 0);
    this.telemetryEl.classList.toggle('ok', errors === 0);
  }
}

function mergeParams(current, next) {
  if (!current || !next) return;
  Object.assign(current.params, next.params);
  for (const key of Object.keys(current.mods ?? {})) {
    if (!(key in (next.mods ?? {}))) delete current.mods[key];
  }
  Object.assign(current.mods, next.mods ?? {});
}
