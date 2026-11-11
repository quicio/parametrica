/**
 * App.js — v2 composition root.
 *
 * Holds the single GlyphDocument and routes every state change through
 * rebuild() → evaluateDocument → telemetry. Identity rule (the v1 bug):
 * `this.document` is never replaced as an object; its sub-objects are
 * swapped only by methods that also rebuild the affected UI sections.
 */

import { createDocument, sanitizeDocument, createLayer, createInstanceLayer, attachLayerAliases, nextLayerId } from '../core/document.ts';
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
} from '../core/layers.ts';
import { Generators, Operators, RenderPasses } from '../core/registry.ts';
import { supportsSpatial } from '../core/capabilities.ts';
import { evaluateDocument } from '../core/engine.ts';
import { schemaDefaults } from '../core/schema.ts';
import { History } from '../core/history.js';
import { computeDescriptor } from '../lab/descriptor.ts';
import { computeSensitivity } from '../lab/sensitivity.ts';
import { applySuggestionToDocument } from '../ai/offline.ts';
import { DEFAULT_CAMERA } from '../view/camera.ts';
import { MIN_CAMERA_FOV } from '../view/cameraController.ts';
import { buildRenderScene } from './renderSceneBuilder.ts';
import { artboardPointFromCanvas } from '../domain/interaction/ray.ts';
import { pickSurface } from '../domain/interaction/surfacePicker.ts';
import { getLookPreset, lookPresetAvailability, resolveLookPreset } from '../domain/lookPresets.ts';
import { applyUserLookToView } from '../domain/lookPresets.ts';
import { normalizeModes } from '../domain/modeToggles.ts';
import type {
  AppAdapters,
  AppDocument,
  AppOptions,
  AppServices,
  AppView,
  CameraLike,
  CheckpointLike,
  ControlsLike,
  EvaluationLike,
  FabricationPreviewLike,
  ImageInputLike,
  ImageUnderlayLike,
  LayerGeneratorLike,
  LayerOperatorLike,
  ProductPreviewLike,
  RectLike,
  RendererLike,
  SaveCheckpointOptions,
  SeamLegendLike,
  StartWithOverlayLike,
  SurfaceInspectorLike,
  OverlayLike,
} from './appPorts.ts';
import type { LayerShape } from '../core/documentTypes.ts';

const DEFAULT_NOTIFY_KIND = 'info';

export class App {
  telemetryEl: HTMLElement | null;
  persistence: AppServices['persistence'];
  storageMigration: AppServices['storageMigration'];
  presets: AppServices['presets'];
  mutator: AppServices['mutator'];
  lookStore: AppServices['lookStore'];
  dialogs: unknown;
  renderPresetPreview: AppServices['renderPresetPreview'];
  startWithPreviewSize: number;
  loadProductPreview: AppServices['loadProductPreview'];
  adapters: AppAdapters;
  document!: AppDocument;
  canvasContainer: HTMLElement;
  session!: AppServices['session'];
  autoRestoredSession!: boolean;
  sessionErrorShown!: boolean;
  startWithOverlay: StartWithOverlayLike | null;
  startWithPreviews: Map<string, string>;
  imageUnderlay: ImageUnderlayLike | null;
  imageInput: ImageInputLike | null;
  pointerDragging: boolean;
  fabricationPreview: FabricationPreviewLike | null;
  productPreview: ProductPreviewLike | null;
  productPreviewLoading: Promise<ProductPreviewLike | null> | null;
  productPreviewActive: boolean;
  history!: History<string>;
  lastSnapshot!: string;
  historyTimer: ReturnType<typeof setTimeout> | null;
  restoring: boolean;
  noticeEl: HTMLElement;
  noticeTimer: ReturnType<typeof setTimeout> | null = null;
  notebook!: AppServices['notebook'];
  notebookWorkspace!: AppServices['notebookWorkspace'];
  parametricOverlay!: OverlayLike;
  uvDomainInset!: OverlayLike;
  surfaceInspector!: SurfaceInspectorLike;
  seamLegend!: SeamLegendLike;
  renderer!: RendererLike;
  exporter!: unknown;
  controls!: ControlsLike;
  fileInput: HTMLInputElement;
  onKeyDown: (event: KeyboardEvent) => void;
  onVisibility: () => void;
  onBeforeUnload: () => void;
  _evaluation: EvaluationLike | null = null;
  timelineRecorder: ((time: number) => void) | null = null;
  lastAnalysis: { descriptor: unknown; sensitivity: unknown } | null = null;
  lastLookPreset: string | null = null;
  exploreSeed: number = 1;

  constructor({ canvasContainer, telemetryEl, services, adapters }: AppOptions) {
    if (!services || !adapters) throw new Error('App requires composition services and adapters');
    this.telemetryEl = telemetryEl;
    this.persistence = services.persistence;
    this.storageMigration = services.storageMigration;
    this.presets = services.presets;
    this.mutator = services.mutator;
    this.lookStore = services.lookStore;
    this.dialogs = services.dialogs;
    this.renderPresetPreview = services.renderPresetPreview;
    this.startWithPreviewSize = services.startWithPreviewSize;
    this.loadProductPreview = services.loadProductPreview;
    this.adapters = adapters;
    this.document = createDocument('parametric');
    this.canvasContainer = canvasContainer;

    // Restore the last document before history, evaluation or UI creation so
    // the first paint already shows the generator/view the user left.
    this.session = services.session;
    const lastSession = this.session.load();
    this.autoRestoredSession = Boolean(lastSession?.document);
    if (lastSession?.document) this.document = lastSession.document as unknown as AppDocument;
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

    if (this.storageMigration?.errors?.length) {
      this.notify(`Storage migration: ${this.storageMigration.errors[0]}`, 'error');
    }

    this.notebook = services.notebook;
    this.notebookWorkspace = services.notebookWorkspace;
    if (this.notebook.lastError) {
      this.notify(`Notebook storage: ${this.notebook.lastError}`, 'error');
    }

    this.evaluate();
    this.parametricOverlay = adapters.createParametricOverlay(this);
    this.uvDomainInset = adapters.createUVDomainInset(this);
    this.surfaceInspector = adapters.createSurfaceInspector(this);
    this.seamLegend = adapters.createSeamLegend(this);
    this.renderer = adapters.createRenderer(this);
    this.exporter = adapters.createExporter(this);
    this.controls = adapters.createControls(this);

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

  sourceLayerForIndex(index: number) {
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
    const width = layer.style.stroke?.width;
    if (width !== undefined) this.document.view.strokeWeight = width;
  }

  /** Evaluate pipeline + telemetry + error routing. Single funnel. */
  rebuild() {
    // Self-heal documents/sessions saved before the near-plane camera fix.
    const camera = this.document.view?.camera;
    const fov = Number(camera?.fov);
    if (camera && Number.isFinite(fov) && fov < MIN_CAMERA_FOV) {
      camera.fov = MIN_CAMERA_FOV;
    }
    this.timelineRecorder?.(this.document.animation.time);
    this.scheduleHistory();
    this.evaluate();
    this.controls?.refreshStatus?.();
    this.scheduleSessionSave();
  }

  evaluate() {
    this._evaluation = evaluateDocument(this.document, { time: this.document.animation.time }) as unknown as EvaluationLike;
    this.renderer?.invalidateCoordinatePin?.();
    this.controls?.refreshRenderModes?.();
    this.controls?.refreshCoordinatePin?.();
    this.controls?.refreshFabricate?.();
    this.controls?.refreshLookPresets?.();
    this.controls?.showErrors(this._evaluation?.errors ?? []);
    this.updateTelemetry();
    this.parametricOverlay?.refresh?.();
    this.uvDomainInset?.refresh?.();
    this.surfaceInspector?.onEvaluation();
    this.controls?.labPanel?.scheduleAuto?.();
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
  analyzeFigure({ sensitivity = false }: { sensitivity?: boolean } = {}) {
    if (!this._evaluation) return null;
    const descriptor = computeDescriptor(this.document, this._evaluation.curves, {
      layers: (this._evaluation.layers ?? null) as never,
      geometry: this._evaluation.geometry ?? null,
    });
    const report = sensitivity
      ? computeSensitivity(this.document, this._evaluation.curves as never, {
        time: this.document.animation.time,
      })
      : null;
    this.lastAnalysis = { descriptor, sensitivity: report };
    return this.lastAnalysis;
  }

  /* ———————— notebook ———————— */

  saveCheckpoint(name: string, {
    parentId = null,
    parents = [],
    generation = 0,
    document = null,
    descriptor = null,
    thumbnail = null,
    projectId = null,
    seriesId = null,
  }: SaveCheckpointOptions = {}): CheckpointLike {
    let source = this.document;
    let capturedDescriptor = descriptor;
    if (document) {
      const sanitized = sanitizeDocument(structuredClone(document));
      if (!sanitized) throw new Error('Cannot save an invalid document');
      source = sanitized;
      const evaluation = evaluateDocument(source, { time: source.animation.time }) as unknown as EvaluationLike;
      if (evaluation.errors.length || !evaluation.curves.length) {
        throw new Error('Cannot save an invalid or empty figure');
      }
      if (!capturedDescriptor) {
        capturedDescriptor = computeDescriptor(source, evaluation.curves, { layers: (evaluation.layers ?? null) as never, geometry: evaluation.geometry ?? null });
      }
    } else {
      if (!this._evaluation || this._evaluation.errors.length || !this._evaluation.curves.length) {
        throw new Error('Cannot save an invalid or empty figure');
      }
      if (!capturedDescriptor) {
        capturedDescriptor = this.analyzeFigure({ sensitivity: false })?.descriptor ?? null;
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

  restoreCheckpoint(id: string): CheckpointLike {
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

  importNotebook(text: string): { added: number; skipped: number } {
    const result = this.notebook.importJSON(text);
    if (this.notebook.lastError) {
      this.notify(`Notebook storage failed: ${this.notebook.lastError}`, 'error');
    } else {
      this.notify(`Imported ${result.added} checkpoint(s), skipped ${result.skipped}`);
    }
    return result;
  }

  /* ———————— exploration ———————— */

  adoptCandidate(document: unknown): AppDocument {
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
      const operators = candidate.operators ?? [];
      operators.forEach((op: LayerOperatorLike, index: number) => {
        const current = this.document.operators?.[index];
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

  sameStructure(candidate: AppDocument): boolean {
    if (candidate.generator?.id !== this.document.generator?.id) return false;
    const current = this.document.operators ?? [];
    const next = candidate.operators ?? [];
    if (current.length !== next.length) return false;
    return current.every((op: LayerOperatorLike, index: number) => op.id === next[index]?.id);
  }

  /* ———————— advisor ———————— */

  suggestCandidate(suggestion: unknown): AppDocument | null {
    return applySuggestionToDocument(this.document, suggestion as never);
  }

  applySuggestion(suggestion: { path: string; [key: string]: unknown }): AppDocument {
    const candidate = this.suggestCandidate(suggestion);
    if (!candidate) throw new Error('Suggestion could not be applied');
    this.adoptCandidate(candidate);
    this.notify(`Applied suggestion on ${suggestion.path}`);
    return candidate;
  }

  /* ———————— start with / new document ———————— */

  showStartWith({ firstRun = false }: { firstRun?: boolean } = {}): StartWithOverlayLike {
    if (this.startWithOverlay?.el) {
      this.startWithOverlay.focusFirst();
      return this.startWithOverlay;
    }
    const overlay = this.adapters.createStartWithOverlay(this, {
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

  startWithPreview(choiceId: string): string | null {
    if (this.startWithPreviews.has(choiceId)) return this.startWithPreviews.get(choiceId) ?? null;
    let dataUrl = null;
    try {
      if (choiceId === 'composition') {
        dataUrl = this.presets.ensureLargePreview('Vortex Stack', this.startWithPreviewSize);
      } else if (choiceId === 'surface') {
        dataUrl = this.renderPresetPreview(createDocument('parametric-surface'), { size: this.startWithPreviewSize });
      } else if (choiceId === 'classic') {
        dataUrl = this.renderPresetPreview(createDocument('parametric'), { size: this.startWithPreviewSize });
      }
    } catch {
      dataUrl = null;
    }
    if (dataUrl) this.startWithPreviews.set(choiceId, dataUrl);
    return dataUrl;
  }

  setStartWithChoice(choiceId: string): boolean {
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

  restoreSnapshot(json: string): void {
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

  handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
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

  notify(message: string, kind = DEFAULT_NOTIFY_KIND): void {
    if (!this.noticeEl) return;
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeEl.textContent = message;
    this.noticeEl.className = `visible ${kind}`;
    this.noticeTimer = setTimeout(() => {
      this.noticeEl.className = '';
    }, 4500);
  }

  /* ———————— seed ———————— */

  setSeed(seed: unknown): void {
    const n = Number(seed);
    const clean = Number.isFinite(n) ? Math.min(1e9, Math.max(0, Math.round(n))) : 1;
    this.document.seed = clean;
    this.rebuild();
  }

  rerollSeed() {
    this.setSeed(Math.floor(Math.random() * 9999) + 1);
  }

  /* ———————— generator ———————— */

  setGenerator(id: string): void {
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

  addOperator(id: string): void {
    if (this.activeLayerLocked) {
      this.notify('Layer content is locked');
      return;
    }
    if (!Operators.has(id)) return;
    if (this.activeLayerIsInstance() && !['translate', 'rotate', 'scale'].includes(id)) {
      this.notify('Instance layers only allow Translate, Rotate and Scale');
      return;
    }
    this.document.operators?.push({
      id,
      enabled: true,
      params: schemaDefaults(Operators.get(id).params),
      mods: {},
    });
    this.controls.rebuildAll();
    this.rebuild();
  }

  removeOperator(index: number): void {
    if (this.activeLayerLocked) {
      this.notify('Layer content is locked');
      return;
    }
    this.document.operators?.splice(index, 1);
    this.controls.rebuildAll();
    this.rebuild();
  }

  moveOperator(index: number, dir: number): void {
    if (this.activeLayerLocked) {
      this.notify('Layer content is locked');
      return;
    }
    const j = index + dir;
    const ops = this.document.operators ?? [];
    if (j < 0 || j >= ops.length) return;
    const left = ops[index];
    const right = ops[j];
    if (!left || !right) return;
    ops[index] = right;
    ops[j] = left;
    this.controls.rebuildAll();
    this.rebuild();
  }

  setOperatorEnabled(index: number, enabled: boolean): void {
    if (this.activeLayerLocked) {
      this.notify('Layer content is locked');
      return;
    }
    const operator = this.document.operators?.[index];
    if (!operator) return;
    operator.enabled = enabled;
    this.rebuild();
  }

  /* ———————— layers ———————— */

  setActiveLayer(index: number): void {
    if (!Array.isArray(this.document.layers) || !this.document.layers[index]) return;
    this.document.activeLayer = index;
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
  }

  addLayer(generatorId = 'parametric'): void {
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

  addInstanceLayer(sourceLayerId: string | null = null): LayerShape | null {
    if (!canAddInstanceLayer(this.document)) {
      if (countInstanceLayers(this.document) >= MAX_INSTANCE_LAYERS) {
        this.notify(`Instance limit reached (${MAX_INSTANCE_LAYERS})`);
      } else {
        this.notify(`Layer limit reached (${MAX_LAYERS})`);
      }
      return null;
    }
    const candidates = instanceSourceCandidates(this.document).filter(({ layer }) => {
      const generatorId = layer.generator?.id;
      return Boolean(generatorId)
        && Generators.has(generatorId as string)
        && Generators.get(generatorId as string).capabilities?.geometryKind === 'surface';
    }) as unknown as Array<{ layer: LayerShape }>;
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

  setInstanceSource(index: number, sourceLayerId: string): boolean {
    const layer = this.document.layers?.[index];
    if (!layer || !isInstanceLayer(layer)) return false;
    if (layer.locked) {
      this.notify('Layer content is locked');
      return false;
    }
    const source = this.document.layers.find((entry) => entry?.id === sourceLayerId && !isInstanceLayer(entry));
    const sourceGeneratorId = source?.generator?.id;
    if (!source || !sourceGeneratorId || !Generators.has(sourceGeneratorId)
      || Generators.get(sourceGeneratorId).capabilities?.geometryKind !== 'surface') {
      this.notify('Instance source must be a Surface generator layer');
      return false;
    }
    if (source.id === layer.id) return false;
    layer.source = { layerId: source.id };
    this.controls.rebuildAll();
    this.rebuild();
    return true;
  }

  duplicateLayer(index: number): void {
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

  removeLayer(index: number): void {
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

  moveLayer(index: number, dir: number): void {
    const j = index + dir;
    if (!this.document.layers?.[index] || j < 0 || j >= this.document.layers.length) return;
    const layers = this.document.layers;
    const left = layers[index];
    const right = layers[j];
    if (!left || !right) return;
    layers[index] = right;
    layers[j] = left;
    this.document.activeLayer = j;
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
  }

  setLayerVisible(index: number, visible: boolean): void {
    const layer = this.document.layers?.[index];
    if (!layer) return;
    layer.visible = Boolean(visible);
    this.rebuild();
  }

  setLayerLocked(index: number, locked: boolean): void {
    const layer = this.document.layers?.[index];
    if (!layer) return;
    layer.locked = Boolean(locked);
    this.controls.rebuildAll();
  }

  renameLayer(index: number, name: string): void {
    const layer = this.document.layers?.[index];
    if (!layer) return;
    layer.name = String(name ?? '').trim().slice(0, 80) || layer.name;
    this.controls.rebuildAll();
  }

  /* ———————— animation ———————— */

  setTime(t: number): void {
    let next = Number(t) || 0;
    const timeline = this.document.animation.timeline;
    const duration = timeline?.duration ?? 0;
    if (timeline?.loop && duration > 0) {
      next = ((next % duration) + duration) % duration;
    }
    this.document.animation.time = next;
    this.controls?.syncTimeRange?.(next);
    this.evaluate();
  }

  resetTime() {
    this.setTime(0);
  }

  setParametricsVisible(visible: boolean): void {
    this.parametricOverlay?.setVisible(visible);
    this.controls?.syncParametricsToggle?.();
  }

  isParametricsVisible() {
    return Boolean(this.parametricOverlay?.visible);
  }

  setUVDomainVisible(visible: boolean): void {
    this.uvDomainInset?.setVisible(visible);
    this.controls?.syncUVDomainToggle?.();
  }

  isUVDomainVisible() {
    return Boolean(this.uvDomainInset?.visible);
  }

  setSurfaceInspectorEnabled(enabled: boolean): void {
    this.surfaceInspector?.setEnabled(enabled);
    this.controls?.syncSurfaceInspectorToggle?.();
  }

  isSurfaceInspectorEnabled() {
    return Boolean(this.surfaceInspector?.enabled);
  }

  /** Show or clear the prepared fabrication mesh in the canvas. */
  setFabricationPreview(preview: FabricationPreviewLike | null): void {
    const next = preview?.mesh && preview?.layerId ? preview : null;
    this.fabricationPreview = next;
    this.syncProductPreview();
  }

  /** Enable or disable the optional WebGL/PBR product preview. */
  async setProductPreviewEnabled(enabled: boolean, { notify = true }: { notify?: boolean } = {}): Promise<boolean> {
    const wants = enabled === true;
    const view = this.document.view;
    const viewPreview = (view.preview ??= {});
    viewPreview.backend = wants ? 'webgl' : 'p5';
    if (!wants) {
      this.productPreview?.setActive(false);
      this.renderer?.setProductPreviewActive?.(false);
      this.productPreviewActive = false;
      this.controls?.refreshFabricate?.();
      return false;
    }
    if ((view.projection ?? '3d') !== '3d') {
      viewPreview.backend = 'p5';
      if (notify) this.notify('Product preview requires the 3D camera view.', 'error');
      this.controls?.refreshFabricate?.();
      return false;
    }
    if (!this.fabricationPreview?.mesh) {
      viewPreview.backend = 'p5';
      if (notify) this.notify('Build the solid preview before switching to Product.', 'error');
      this.controls?.refreshFabricate?.();
      return false;
    }
    if (!this.productPreviewLoading) {
      this.productPreviewLoading = this.loadProductPreview(this)
        .then((preview) => {
          if (!this.productPreview) this.productPreview = preview;
          this.productPreview.mount();
          return this.productPreview;
        })
        .catch((error) => {
          console.error('[parametrica] product preview failed:', error);
          this.productPreview = null;
          (this.document.view.preview ??= {}).backend = 'p5';
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
      } as unknown as Parameters<typeof buildRenderScene>[0])
      : null;
    this.productPreview?.update(scene);
  }

  inspectAtCanvas(canvasX: number, canvasY: number): unknown {
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
    const artboardPoint = artboardPointFromCanvas(
      { x: canvasX, y: canvasY },
      rect as unknown as Parameters<typeof artboardPointFromCanvas>[1],
    );
    if (!artboardPoint) {
      this.surfaceInspector.setMessage('No surface under cursor');
      return null;
    }
    const scene = buildRenderScene({
      evaluation: this.evaluation,
      document: this.document,
      view: this.document.view,
    } as unknown as Parameters<typeof buildRenderScene>[0]);
    const result = pickSurface({
      evaluation: this.evaluation,
      scene,
      artboardPoint,
      activeLayerId: this.document.layers?.[this.document.activeLayer ?? 0]?.id ?? null,
    } as unknown as Parameters<typeof pickSurface>[0]);
    this.surfaceInspector.setResult(result);
    return result;
  }

  clearSurfaceInspection() {
    this.surfaceInspector?.clear();
  }

  setSeamsVisible(visible: boolean): void {
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

  lookPresetState(id: string) {
    const preset = getLookPreset(id);
    if (!preset) return { available: false, reason: 'Unknown preset' };
    return lookPresetAvailability(preset, this.lookPresetContext());
  }

  saveUserLook(name: string) {
    const result = this.lookStore.save(name, this.document.view);
    if (result.ok) {
      this.controls?.refreshUserLooks?.();
      this.notify(`Saved look · ${result.look.name}`);
    } else {
      this.notify(result.error, 'error');
    }
    return result;
  }

  applyUserLook(id: string): boolean {
    const look = this.lookStore.get(id);
    if (!look) return false;
    applyUserLookToView(this.document.view as never, look);
    this.lastLookPreset = null;
    this.rebuild();
    this.controls?.refreshUserLooks?.();
    this.notify(`Look · ${look.name}`);
    return true;
  }

  deleteUserLook(id: string): boolean {
    const removed = this.lookStore.remove(id);
    if (removed) this.controls?.refreshUserLooks?.();
    return removed;
  }

  applyLookPreset(id: string): boolean {
    const preset = getLookPreset(id);
    if (!preset) return false;
    const availability = this.lookPresetState(id);
    if (!availability.available) {
      this.notify(availability.reason ?? 'Preset unavailable', 'info');
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

  adoptDocument(doc: AppDocument): void {
    // Keep document identity but adopt the v3 layer graph.
    this.document.name = doc.name;
    this.document.seed = doc.seed;
    this.document.layers = doc.layers;
    this.document.activeLayer = doc.activeLayer ?? 0;
    Object.assign(this.document.view, doc.view);
    const active = this.document.layers?.[this.document.activeLayer ?? 0];
    const generator = generatorForLayer(this.document, active);
    const projectable = Boolean(generator?.id && supportsSpatial(Generators.get(generator.id)));
    if (!projectable && this.document.view.projection !== '3d') {
      this.document.view.projection = '3d';
    }
    Object.assign(this.document.animation, doc.animation);
    attachLayerAliases(this.document);
    this.syncActiveStyle();
    this.controls.rebuildAll();
    this.rebuild();
  }

  applyPreset(name: string): void {
    const doc = this.presets.get(name);
    if (!doc) return;
    // Record before the rebuild so the Recent filter is current immediately.
    this.presets.markUsed(name);
    this.adoptDocument(doc);
  }

  openImportDialog() {
    this.fileInput.click();
  }

  handleImportFile(): void {
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
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[parametrica] import failed:', message);
        this.notify(`Import failed: ${message}`, 'error');
      }
    };
    reader.onerror = () => this.notify('Import failed: could not read the file', 'error');
    reader.readAsText(file);
  }

  /* ———————— telemetry ———————— */

  updateTelemetry(): void {
    if (!this.telemetryEl) return;
    const e = this._evaluation;
    if (!e) return;
    const errors = e.errors.length;
    const lines = [
      `CURVES ${e.stats.curveCount} · PTS ${e.stats.pointCount} · PEAK ${e.stats.peakPoints ?? e.stats.pointCount} · LEN ${e.stats.arcLength} · EVAL ${e.stats.evalMs.toFixed(1)}MS`,
      `T ${this.document.animation.time.toFixed(2)} · SEED ${this.document.seed} · STATE ${errors ? `ERROR ×${errors}` : 'VALID'}`,
    ];
    if (errors) lines.push(`ERR ${e.errors[0]?.message ?? 'unknown error'}`);
    this.telemetryEl.textContent = lines.join('\n');
    this.telemetryEl.classList.toggle('fail', errors > 0);
    this.telemetryEl.classList.toggle('ok', errors === 0);
  }
}

function mergeParams(current: LayerGeneratorLike | null | undefined, next: LayerGeneratorLike | null | undefined): void {
  if (!current || !next) return;
  Object.assign(current.params, next.params);
  for (const key of Object.keys(current.mods ?? {})) {
    if (!(key in (next.mods ?? {}))) delete current.mods[key];
  }
  Object.assign(current.mods, next.mods ?? {});
}
