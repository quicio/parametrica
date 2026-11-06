/**
 * App.js — v2 composition root.
 *
 * Holds the single GlyphDocument and routes every state change through
 * rebuild() → evaluateDocument → telemetry. Identity rule (the v1 bug):
 * `this.document` is never replaced as an object; its sub-objects are
 * swapped only by methods that also rebuild the affected UI sections.
 */

import { createDocument, sanitizeDocument, createLayer, createInstanceLayer, attachLayerAliases, nextLayerId } from '../core/document.js';
import {
  MAX_INSTANCE_LAYERS,
  MAX_LAYERS,
  canAddInstanceLayer,
  countInstanceLayers,
  dependentInstances,
  generatorForLayer,
  instanceSourceCandidates,
  isInstanceLayer,
  sourceLayerFor,
} from '../core/layers.js';
import { Generators, Operators, RenderPasses } from '../core/registry.js';
import { supportsSpatial } from '../core/capabilities.js';
import { evaluateDocument } from '../core/engine.js';
import { schemaDefaults } from '../core/schema.js';
import { History } from '../core/history.js';
import { SessionStore } from '../core/session.js';
import { Notebook } from '../lab/notebook.js';
import { NotebookWorkspace } from '../lab/workspace.js';
import { computeDescriptor } from '../lab/descriptor.js';
import { computeSensitivity } from '../lab/sensitivity.js';
import { applySuggestionToDocument } from '../ai/offline.js';
import { P5Adapter } from '../render/p5/P5Adapter.js';
import { Controls } from '../ui/Controls.js';
import { StartWithOverlay } from '../ui/StartWithOverlay.js';
import { Exporter } from '../export/Exporter.js';
import { MutationEngine } from '../mutation/MutationEngine.js';
import { PresetManager } from '../presets/PresetManager.js';
import { renderPresetPreview, START_WITH_PREVIEW_SIZE } from '../presets/preview.js';
import { DEFAULT_CAMERA } from '../view/camera.js';
import { MIN_CAMERA_FOV } from '../view/cameraController.js';
import { DialogService } from '../ui/dialogs.js';
import { ParametricOverlay } from '../ui/ParametricOverlay.js';
import { UVDomainInset } from '../ui/UVDomainInset.js';
import { SurfaceInspector } from '../ui/SurfaceInspector.js';
import { SeamLegend } from '../ui/SeamLegend.js';
import { buildRenderScene } from './renderSceneBuilder.js';
import { artboardPointFromCanvas } from '../interaction/ray.js';
import { pickSurface } from '../interaction/surfacePicker.js';
import { LOOK_PRESETS, getLookPreset, lookPresetAvailability, resolveLookPreset } from '../render/lookPresets.js';
import { LookPresetStore, applyUserLookToView } from '../render/lookPresetStore.js';
import { normalizeModes } from '../ui/widgets/modeToggles.js';

export class App {
  constructor({ canvasContainer, uiContainer, telemetryEl }) {
    this.telemetryEl = telemetryEl;
    this.presets = new PresetManager(globalThis.localStorage ?? null, {
      renderPreview: renderPresetPreview,
    });
    this.mutator = new MutationEngine();
    this.lookStore = new LookPresetStore(globalThis.localStorage ?? null, {
      reservedNames: LOOK_PRESETS.map((preset) => preset.name),
    });
    this.dialogs = new DialogService();
    this.document = createDocument('parametric');
    this.canvasContainer = canvasContainer;

    // Restore the last document before history, evaluation or UI creation so
    // the first paint already shows the generator/view the user left.
    this.session = new SessionStore();
    const lastSession = this.session.load();
    this.autoRestoredSession = Boolean(lastSession?.document);
    if (lastSession?.document) this.document = lastSession.document;
    this.sessionErrorShown = false;
    this.startWithOverlay = null;
    this.startWithPreviews = new Map();

    // UI-only reference state: never serialised with the document.
    this.imageUnderlay = null;
    this.imageInput = null;
    this.pointerDragging = false;
    // Fabricate can show the prepared solid instead of the authored network.
    this.fabricationPreview = null;
    this.productPreview = null;
    this.productPreviewLoading = null;
    this.productPreviewActive = false;

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
    this.notebookWorkspace = new NotebookWorkspace(this.notebook);
    if (this.notebook.lastError) {
      this.notify(`Notebook storage: ${this.notebook.lastError}`, 'error');
    }

    this.evaluate();
    this.parametricOverlay = new ParametricOverlay(canvasContainer, this);
    this.uvDomainInset = new UVDomainInset(canvasContainer, this);
    this.surfaceInspector = new SurfaceInspector(canvasContainer, this);
    this.seamLegend = new SeamLegend(canvasContainer, this);
    this.renderer = new P5Adapter(canvasContainer, this);
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
    if (this.autoRestoredSession) {
      this.notify('Restored last session');
    } else {
      this.showStartWith({ firstRun: true });
    }
  }

  get evaluation() {
    return this._evaluation;
  }

  get activeLayer() {
    return this.document.layers?.[this.document.activeLayer] ?? null;
  }

  get activeLayerLocked() {
    return Boolean(this.activeLayer?.locked);
  }

  activeLayerIsInstance() {
    return isInstanceLayer(this.activeLayer);
  }

  activeLayerSource() {
    return sourceLayerFor(this.document, this.activeLayer);
  }

  activeLayerGeometryKind() {
    const generator = generatorForLayer(this.document, this.activeLayer);
    const definition = generator?.id && Generators.has(generator.id) ? Generators.get(generator.id) : null;
    return definition?.capabilities?.geometryKind
      ?? (supportsSpatial(definition) ? 'curve3d' : 'curve2d');
  }

  sourceLayerForIndex(index) {
    return sourceLayerFor(this.document, this.document.layers?.[index]);
  }

  activeLayerDependents() {
    const layer = this.activeLayer;
    return layer ? dependentInstances(this.document, layer.id) : [];
  }

  syncActiveStyle() {
    const layer = this.activeLayer;
    if (!layer) return;
    this.document.view.style = layer.style;
    this.document.view.strokeWeight = layer.style.stroke.width;
  }

  /** Evaluate pipeline + telemetry + error routing. Single funnel. */
  rebuild() {
    // Self-heal documents/sessions saved before the near-plane camera fix.
    const camera = this.document.view?.camera;
    if (camera && Number.isFinite(camera.fov) && camera.fov < MIN_CAMERA_FOV) {
      camera.fov = MIN_CAMERA_FOV;
    }
    this.timelineRecorder?.(this.document.animation.time);
    this.scheduleHistory();
    this.evaluate();
    this.controls?.refreshStatus?.();
    this.scheduleSessionSave();
  }

  evaluate() {
    this._evaluation = evaluateDocument(this.document, { time: this.document.animation.time });
    this.renderer?.invalidateCoordinatePin?.();
    this.controls?.refreshRenderModes?.();
    this.controls?.refreshCoordinatePin?.();
    this.controls?.refreshFabricate?.();
    this.controls?.refreshLookPresets?.();
    this.controls?.showErrors(this._evaluation.errors);
    this.updateTelemetry();
    this.parametricOverlay?.refresh();
    this.uvDomainInset?.refresh();
    this.surfaceInspector?.onEvaluation();
    this.controls?.labPanel?.scheduleAuto();
    // The advisor only re-runs after a stable, non-playing commit. Its own
    // debounce (700 ms) collapses slider drags and never fires per frame.
    if (!this.document.animation.playing && !this.activeLayerIsInstance()) {
      this.controls?.advisorPanel?.scheduleAuto?.();
    }
    this.syncProductPreview();
  }

  /* ———————— lab observer ———————— */

  /**
   * Compute the deterministic descriptor and, optionally, the parameter
   * sensitivity report. This never mutates the document or the history.
   */
  analyzeFigure({ sensitivity = false } = {}) {
    if (!this._evaluation) return null;
    const descriptor = computeDescriptor(this.document, this._evaluation.curves, { layers: this._evaluation.layers, geometry: this._evaluation.geometry ?? null });
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
    projectId = null,
    seriesId = null,
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
        capturedDescriptor = computeDescriptor(source, evaluation.curves, { layers: evaluation.layers, geometry: evaluation.geometry ?? null });
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
    const target = this.notebookWorkspace.target;
    const targetProject = projectId ?? target.projectId;
    const targetSeries = seriesId ?? target.seriesId;
    const cp = this.notebook.add({
      name,
      document: source,
      descriptor: capturedDescriptor,
      thumbnail,
      parentId,
      parents,
      generation,
      projectId: targetProject,
      seriesId: targetSeries,
    });
    this.controls?.notebookPanel?.refresh?.();
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

  /* ———————— start with / new document ———————— */

  showStartWith({ firstRun = false } = {}) {
    if (this.startWithOverlay?.el) {
      this.startWithOverlay.focusFirst();
      return this.startWithOverlay;
    }
    const overlay = new StartWithOverlay(this, {
      firstRun,
      onClose: () => { this.startWithOverlay = null; },
    });
    this.startWithOverlay = overlay;
    overlay.open();
    return overlay;
  }

  newDocument() {
    return this.showStartWith({ firstRun: false });
  }

  startWithPreview(choiceId) {
    if (this.startWithPreviews.has(choiceId)) return this.startWithPreviews.get(choiceId);
    let dataUrl = null;
    try {
      if (choiceId === 'composition') {
        dataUrl = this.presets.ensureLargePreview('Vortex Stack', START_WITH_PREVIEW_SIZE);
      } else if (choiceId === 'surface') {
        dataUrl = renderPresetPreview(createDocument('parametric-surface'), { size: START_WITH_PREVIEW_SIZE });
      } else if (choiceId === 'classic') {
        dataUrl = renderPresetPreview(createDocument('parametric'), { size: START_WITH_PREVIEW_SIZE });
      }
    } catch {
      dataUrl = null;
    }
    if (dataUrl) this.startWithPreviews.set(choiceId, dataUrl);
    return dataUrl;
  }

  setStartWithChoice(choiceId) {
    let doc;
    if (choiceId === 'composition') {
      doc = this.presets.get('Vortex Stack');
    } else if (choiceId === 'surface') {
      doc = createDocument('parametric-surface');
    } else if (choiceId === 'classic') {
      doc = createDocument('parametric');
    }
    if (!doc) throw new Error('Starting figure is unavailable');
    this.adoptDocument(doc);
    this.flushSession();
    return true;
  }

  /* ———————— session continuity ———————— */

  scheduleSessionSave() {
    this.session.schedule(this.document);
  }

  flushSession() {
    const ok = this.session.flush(this.document);
    if (!ok && this.session.lastError && !this.sessionErrorShown) {
      this.sessionErrorShown = true;
      this.notify(`Session storage: ${this.session.lastError}`, 'error');
    }
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
    if (this.activeLayerLocked) {
      this.notify('Layer content is locked');
      return;
    }
    if (this.activeLayerIsInstance()) {
      this.notify('Select the source layer to change its generator');
      return;
    }
    if (!Generators.has(id)) return;
    if (!supportsSpatial(Generators.get(id)) && this.document.view.projection !== '3d') {
      this.document.view.projection = '3d';
    }
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
    if (this.activeLayerLocked) {
      this.notify('Layer content is locked');
      return;
    }
    if (!Operators.has(id)) return;
    if (this.activeLayerIsInstance() && !['translate', 'rotate', 'scale'].includes(id)) {
      this.notify('Instance layers only allow Translate, Rotate and Scale');
      return;
    }
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
    if (this.activeLayerLocked) {
      this.notify('Layer content is locked');
      return;
    }
    this.document.operators.splice(index, 1);
    this.controls.rebuildAll();
    this.rebuild();
  }

  moveOperator(index, dir) {
    if (this.activeLayerLocked) {
      this.notify('Layer content is locked');
      return;
    }
    const j = index + dir;
    if (j < 0 || j >= this.document.operators.length) return;
    const ops = this.document.operators;
    [ops[index], ops[j]] = [ops[j], ops[index]];
    this.controls.rebuildAll();
    this.rebuild();
  }

  setOperatorEnabled(index, enabled) {
    if (this.activeLayerLocked) {
      this.notify('Layer content is locked');
      return;
    }
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
    if (this.document.layers.length >= MAX_LAYERS) {
      this.notify(`Layer limit reached (${MAX_LAYERS})`);
      return;
    }
    const layer = createLayer(generatorId, {
      id: nextLayerId(this.document),
      name: `Layer ${this.document.layers.length + 1}`,
      seed: this.document.seed,
    });
    this.document.layers.push(layer);
    this.document.activeLayer = this.document.layers.length - 1;
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
  }

  addInstanceLayer(sourceLayerId = null) {
    if (!canAddInstanceLayer(this.document)) {
      if (countInstanceLayers(this.document) >= MAX_INSTANCE_LAYERS) {
        this.notify(`Instance limit reached (${MAX_INSTANCE_LAYERS})`);
      } else {
        this.notify(`Layer limit reached (${MAX_LAYERS})`);
      }
      return null;
    }
    const candidates = instanceSourceCandidates(this.document).filter(({ layer }) => (
      Generators.has(layer.generator?.id)
      && Generators.get(layer.generator.id).capabilities?.geometryKind === 'surface'
    ));
    const source = candidates.find(({ layer }) => layer.id === sourceLayerId)?.layer
      ?? candidates.find(({ layer }) => layer.id === this.activeLayer?.id)?.layer
      ?? candidates[0]?.layer
      ?? null;
    if (!source) {
      this.notify('Add a Surface generator layer before creating an instance');
      return null;
    }
    const count = countInstanceLayers(this.document) + 1;
    const layer = createInstanceLayer(source.id, {
      id: nextLayerId(this.document),
      name: `${source.name} / instance ${count}`,
      modes: source.modes,
      colorMetric: source.colorMetric,
      style: structuredClone(source.style),
    });
    this.document.layers.push(layer);
    this.document.activeLayer = this.document.layers.length - 1;
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
    this.notify(`Instance created from ${source.name}`);
    return layer;
  }

  setInstanceSource(index, sourceLayerId) {
    const layer = this.document.layers?.[index];
    if (!isInstanceLayer(layer)) return false;
    if (layer.locked) {
      this.notify('Layer content is locked');
      return false;
    }
    const source = this.document.layers.find((entry) => entry?.id === sourceLayerId && !isInstanceLayer(entry));
    if (!source || !Generators.has(source.generator?.id)
      || Generators.get(source.generator.id).capabilities?.geometryKind !== 'surface') {
      this.notify('Instance source must be a Surface generator layer');
      return false;
    }
    if (source.id === layer.id) return false;
    layer.source = { layerId: source.id };
    this.controls.rebuildAll();
    this.rebuild();
    return true;
  }

  duplicateLayer(index) {
    const source = this.document.layers?.[index];
    if (!source) return;
    if (this.document.layers.length >= MAX_LAYERS) {
      this.notify(`Layer limit reached (${MAX_LAYERS})`);
      return;
    }
    const copy = structuredClone(source);
    copy.id = nextLayerId(this.document);
    copy.name = `${source.name} copy`;
    this.document.layers.splice(index + 1, 0, copy);
    this.document.activeLayer = index + 1;
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
  }

  removeLayer(index) {
    const layer = this.document.layers?.[index];
    if (!Array.isArray(this.document.layers) || this.document.layers.length <= 1) return;
    if (layer && !isInstanceLayer(layer)) {
      const dependents = dependentInstances(this.document, layer.id);
      if (dependents.length) {
        this.notify(`Layer is used by ${dependents.length} instance${dependents.length === 1 ? '' : 's'}`);
        return;
      }
    }
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
    this.controls?.syncTimeRange?.(next);
    this.evaluate();
  }

  resetTime() {
    this.setTime(0);
  }

  setParametricsVisible(visible) {
    this.parametricOverlay?.setVisible(visible);
    this.controls?.syncParametricsToggle?.();
  }

  isParametricsVisible() {
    return Boolean(this.parametricOverlay?.visible);
  }

  setUVDomainVisible(visible) {
    this.uvDomainInset?.setVisible(visible);
    this.controls?.syncUVDomainToggle?.();
  }

  isUVDomainVisible() {
    return Boolean(this.uvDomainInset?.visible);
  }

  setSurfaceInspectorEnabled(enabled) {
    this.surfaceInspector?.setEnabled(enabled);
    this.controls?.syncSurfaceInspectorToggle?.();
  }

  isSurfaceInspectorEnabled() {
    return Boolean(this.surfaceInspector?.enabled);
  }

  /** Show or clear the prepared fabrication mesh in the canvas. */
  setFabricationPreview(preview) {
    const next = preview?.mesh && preview?.layerId ? preview : null;
    this.fabricationPreview = next;
    this.syncProductPreview();
  }

  /** Enable or disable the optional WebGL/PBR product preview. */
  async setProductPreviewEnabled(enabled, { notify = true } = {}) {
    const wants = enabled === true;
    const view = this.document.view;
    view.preview.backend = wants ? 'webgl' : 'p5';
    if (!wants) {
      this.productPreview?.setActive(false);
      this.renderer?.setProductPreviewActive?.(false);
      this.productPreviewActive = false;
      this.controls?.refreshFabricate?.();
      return false;
    }
    if ((view.projection ?? '3d') !== '3d') {
      view.preview.backend = 'p5';
      if (notify) this.notify('Product preview requires the 3D camera view.', 'error');
      this.controls?.refreshFabricate?.();
      return false;
    }
    if (!this.fabricationPreview?.mesh) {
      view.preview.backend = 'p5';
      if (notify) this.notify('Build the solid preview before switching to Product.', 'error');
      this.controls?.refreshFabricate?.();
      return false;
    }
    if (!this.productPreviewLoading) {
      this.productPreviewLoading = import('../render/webgl/ProductPreview.js')
        .then(({ ProductPreview }) => {
          if (!this.productPreview) this.productPreview = new ProductPreview(this, this.canvasContainer);
          this.productPreview.mount();
          return this.productPreview;
        })
        .catch((error) => {
          console.error('[parametrica] product preview failed:', error);
          this.productPreview = null;
          this.document.view.preview.backend = 'p5';
          if (notify) this.notify('Product preview is unavailable; using Technical preview.', 'error');
          this.renderer?.setProductPreviewActive?.(false);
          this.controls?.refreshFabricate?.();
          return null;
        })
        .finally(() => {
          this.productPreviewLoading = null;
        });
    }
    const preview = await this.productPreviewLoading;
    if (!preview) return false;
    this.productPreviewActive = true;
    this.renderer?.setProductPreviewActive?.(true);
    this.syncProductPreview();
    this.controls?.refreshFabricate?.();
    return true;
  }

  syncProductPreview() {
    const view = this.document.view;
    const wants = view?.preview?.backend === 'webgl';
    const visible = wants
      && this.controls?.mode === 'fabricate'
      && view?.projection === '3d'
      && Boolean(this.fabricationPreview?.mesh)
      && view?.fabrication?.latticePreview !== 'network';
    if (visible && !this.productPreview?.ready && !this.productPreviewLoading) {
      void this.setProductPreviewEnabled(true, { notify: false });
      return;
    }
    const renderable = visible && Boolean(this.productPreview?.ready);
    this.renderer?.setProductPreviewActive?.(renderable);
    this.productPreviewActive = renderable;
    if (!renderable) {
      this.productPreview?.setActive(false);
      return;
    }
    const scene = this.evaluation
      ? buildRenderScene({
        evaluation: this.evaluation,
        document: this.document,
        view,
        preview: this.fabricationPreview,
      })
      : null;
    this.productPreview.update(scene);
  }

  inspectAtCanvas(canvasX, canvasY) {
    if (!this.surfaceInspector?.enabled) return null;
    this.surfaceInspector.setPoint(canvasX, canvasY);
    if (this.pointerDragging) return null;
    if (!this.evaluation || !this.renderer) {
      this.surfaceInspector.setMessage('Surface not ready');
      return null;
    }
    const quadActive = this.renderer.quadActive === undefined
      ? this.document.view.layout === 'quad'
      : Boolean(this.renderer.quadActive);
    if (quadActive) {
      this.surfaceInspector.setMessage('Single view only');
      return null;
    }
    const rect = this.renderer.artboardRect();
    const artboardPoint = artboardPointFromCanvas({ x: canvasX, y: canvasY }, rect);
    if (!artboardPoint) {
      this.surfaceInspector.setMessage('No surface under cursor');
      return null;
    }
    const scene = buildRenderScene({
      evaluation: this.evaluation,
      document: this.document,
      view: this.document.view,
    });
    const result = pickSurface({
      evaluation: this.evaluation,
      scene,
      artboardPoint,
      activeLayerId: this.document.layers?.[this.document.activeLayer ?? 0]?.id ?? null,
    });
    this.surfaceInspector.setResult(result);
    return result;
  }

  clearSurfaceInspection() {
    this.surfaceInspector?.clear();
  }

  setSeamsVisible(visible) {
    this.seamLegend?.setEnabled(visible);
    this.controls?.syncSeamsToggle?.();
  }

  isSeamsVisible() {
    return Boolean(this.seamLegend?.enabled);
  }

  resetCamera() {
    const camera = this.document.view.camera;
    camera.yaw = DEFAULT_CAMERA.yaw;
    camera.pitch = DEFAULT_CAMERA.pitch;
    camera.fov = DEFAULT_CAMERA.fov;
    this.rebuild();
  }

  /* ———————— look presets ———————— */

  lookPresetContext() {
    const layerIndex = this.document.activeLayer ?? 0;
    const layer = this.evaluation?.layers?.[layerIndex] ?? this.evaluation ?? null;
    const meshes = layer?.meshes ?? [];
    const geometry = layer?.geometry ?? [];
    const hasSurface = meshes.length > 0 || geometry.some((item) => (
      item?.kind === 'surface' || item?.kind === 'mesh' || item?.kind === 'solid'
    ));
    const curves = layer?.curves ?? [];
    const docLayer = this.document.layers?.[layerIndex];
    const generator = generatorForLayer(this.document, docLayer);
    return {
      hasSurface,
      generatorId: generator?.id ?? null,
      hasClosedCurves: curves.some((curve) => curve.closed),
    };
  }

  lookPresetState(id) {
    const preset = getLookPreset(id);
    if (!preset) return { available: false, reason: 'Unknown preset' };
    return lookPresetAvailability(preset, this.lookPresetContext());
  }

  saveUserLook(name) {
    const result = this.lookStore.save(name, this.document.view);
    if (result.ok) {
      this.controls?.refreshUserLooks?.();
      this.notify(`Saved look · ${result.look.name}`);
    } else {
      this.notify(result.error, 'error');
    }
    return result;
  }

  applyUserLook(id) {
    const look = this.lookStore.get(id);
    if (!look) return false;
    applyUserLookToView(this.document.view, look);
    this.lastLookPreset = null;
    this.rebuild();
    this.controls?.refreshUserLooks?.();
    this.notify(`Look · ${look.name}`);
    return true;
  }

  deleteUserLook(id) {
    const removed = this.lookStore.remove(id);
    if (removed) this.controls?.refreshUserLooks?.();
    return removed;
  }

  applyLookPreset(id) {
    const preset = getLookPreset(id);
    if (!preset) return false;
    const availability = this.lookPresetState(id);
    if (!availability.available) {
      this.notify?.(availability.reason, 'info');
      return false;
    }
    const resolved = resolveLookPreset(preset);
    const view = this.document.view;
    view.modes = normalizeModes(resolved.modes, RenderPasses.ids());
    view.overlays = resolved.overlays;
    view.colorMetric = resolved.colorMetric;
    view.guides = resolved.guides;
    this.lastLookPreset = id;
    this.rebuild();
    this.notify?.(`Look · ${preset.name}`);
    return true;
  }

  /* ———————— mutation / presets ———————— */

  mutate() {
    if (this.activeLayerIsInstance()) {
      this.notify('Select the source layer to mutate its parameters');
      return;
    }
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
    const active = this.document.layers?.[this.document.activeLayer ?? 0];
    const generator = generatorForLayer(this.document, active);
    const projectable = Boolean(generator && supportsSpatial(Generators.get(generator.id)));
    if (!projectable && this.document.view.projection !== '3d') {
      this.document.view.projection = '3d';
    }
    Object.assign(this.document.animation, doc.animation);
    attachLayerAliases(this.document);
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
  }

  applyPreset(name) {
    const doc = this.presets.get(name);
    if (!doc) return;
    // Record before the rebuild so the Recent filter is current immediately.
    this.presets.markUsed(name);
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
    const errors = e.errors.length;
    const lines = [
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
