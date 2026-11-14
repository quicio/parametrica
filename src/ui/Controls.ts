/**
 * Controls.js — v2 instrument panel.
 *
 * Modes: FORM · LOOK · EXPLORE · PERFORM · INGEST · KEEP.
 * Sections are built once and shown by the active mode.
 * Plain params bind through lil-gui; formulas, harmonic tables and the
 * operator stack are custom Swiss-styled components.
 */

import GUI from 'lil-gui';
import { Generators, RenderPasses } from '../core/registry.ts';
import { supportsSpatial } from '../core/capabilities.ts';
import { normalizeModes } from '../domain/modeToggles.ts';
import { PaletteStore } from '../render/palettes.ts';
import { DEFAULT_COLOR_RAMP, sanitizeColorRamp } from '../core/document.ts';
import { lookPresetMatchesView } from '../domain/lookPresets.ts';
import {
  isInstanceLayer,
  sourceGeneratorFor,
  sourceLayerFor,
} from '../core/layers.ts';
import {
  PHYSICAL_UNIT_SYSTEMS,
  formatPhysicalLength,
  millimetresPerUnit,
} from '../domain/units.ts';
import { buildFabricationReport } from '../application/fabricationSource.ts';
import { FabricationJobs, isHeavyFabrication } from '../application/fabricationJobs.ts';
import { manifoldSimplify } from '../geometry/manifoldEngine.js';
import { buildLayersSection, buildInstanceSection, buildGeneratorSection, buildParamsSection, buildEquationsSection, buildHarmonicsSection, buildOperatorsSection } from './sections/formSections.ts';
import { buildLooksSection, buildCameraSection, buildCanvasSection, buildCoordinatesSection, buildUnitsSection } from './sections/lookSections.ts';
import { buildFabricateSection } from './sections/fabricateSections.ts';
import { buildStyleSection, buildRenderSection, buildOverlaysSection, buildImageSection, buildAnimationSection, buildTimelineSection, buildMutationSection, buildAnalysisSection, buildNotebookSection, buildAdvisorSection, buildExploreSection, buildEvolutionSection, buildPresetsSection, buildExportSection } from './sections/keepSections.ts';

const UI_STATE_KEY = 'parametrica.ui.v1';
const DEFAULT_OPEN = new Set(['generator', 'parameters', 'looks', 'explore', 'timeline', 'image', 'presets', 'fabricate']);
const SECTION_ALIASES: Record<string, string> = {
  camera: 'view',
  render: 'view',
  overlays: 'view',
  canvas: 'artboard',
  style: 'artboard',
};
const MODE_ALIASES: Record<string, string> = {
  work: 'perform',
};
const MODES = [
  { id: 'form', label: 'Form' },
  { id: 'look', label: 'Look' },
  { id: 'explore', label: 'Explore' },
  { id: 'perform', label: 'Perform' },
  { id: 'ingest', label: 'Ingest' },
  { id: 'keep', label: 'Keep' },
  { id: 'fabricate', label: 'Make' },
];
const MODE_INTENTS: Record<string, string> = {
  form: 'Geometry and parameters',
  look: 'Appearance only · geometry untouched',
  explore: 'Variations, sensitivity and analysis',
  perform: 'Time, keyframes and motion',
  ingest: 'Image underlay and contour tracing',
  keep: 'Notebook, presets and 2D export',
  fabricate: 'Readiness, checks and manufacturing',
};
const MODE_PRIMARY: Record<string, string> = {
  form: 'generator',
  look: 'looks',
  explore: 'explore',
  perform: 'timeline',
  ingest: 'image',
  keep: 'presets',
  fabricate: 'fabricate',
};

import type { App } from '../application/App.ts';
import type { RendererLike } from '../application/appPorts.ts';
import type { FabricationReport } from '../application/fabricationSource.ts';
import type { DocumentShape, LayerShape } from '../core/documentTypes.ts';
import type { LookPreset } from '../domain/lookPresets.ts';
import type { RenderPassDefinition } from '../core/registry.ts';
import type { Controller } from 'lil-gui';
import type { FormControls } from './sections/formSections.ts';
import type { LookControls } from './sections/lookSections.ts';
import type { KeepControls } from './sections/keepSections.ts';
import type { FabricateControls } from './sections/fabricateSections.ts';
import type { ExpressionField } from './widgets/ExpressionField.ts';
import type { HarmonicsEditor } from './widgets/HarmonicsEditor.ts';
import type { OperatorStack } from './widgets/OperatorStack.ts';
import type { LabPanel } from './widgets/LabPanel.ts';
import type { NotebookPanel } from './widgets/NotebookPanel.ts';
import type { AdvisorPanel } from './widgets/AdvisorPanel.ts';
import type { ExplorePanel } from './widgets/ExplorePanel.ts';
import type { EvolutionPanel } from './widgets/EvolutionPanel.ts';
import type { PresetPanel } from './widgets/PresetPanel.ts';
import type { ImagePanel } from './widgets/ImagePanel.ts';
import type { TimelinePanel } from './widgets/TimelinePanel.ts';

type Rec = Record<string, unknown>;
interface UiState { mode: string; sections: Record<string, boolean>; advancedParams: boolean }
interface SectionMeta { id: string; el: HTMLElement; body: HTMLElement; header: HTMLButtonElement; mode: string }
interface UnitsInputLike { world?: string; mmPerWorldUnit?: number | null; artboard?: string; mmPerArtboardUnit?: number | null }
interface PreparationLike {
  lattice?: boolean;
  latticeMode?: string;
  latticePreview?: string;
  finishQuality?: string;
  curveStyle?: string;
  jointStyle?: string;
  envelope?: string;
  radiusProfile?: string;
  taper?: number;
  weld?: boolean;
  cap?: boolean;
  repair?: boolean;
  capStrategy?: string;
  topology?: string;
  nonOrientable?: string;
  selfIntersections?: string;
  remeshResolution?: number;
  quality?: string;
  boolean?: string;
  format?: string;
  scope?: string;
  csgStrategy?: string;
  manufacturing?: Rec;
}
interface FabricationInputLike {
  evaluation?: unknown;
  layerIndex?: number;
  units?: UnitsInputLike | null;
  preparation?: PreparationLike | null;
  docKey?: string;
  prepKey?: string;
  unitsKey?: string;
  [key: string]: unknown;
}
interface ModeToggleEntry { id: string; input: HTMLInputElement; row: HTMLElement; def: RenderPassDefinition; opacity: HTMLInputElement; percent: HTMLElement; badge: HTMLElement; reasonEl: HTMLElement; colorInput: HTMLInputElement | null; widthInput: HTMLInputElement | null; appearance: HTMLElement | null; syncState(): void }
interface LatticeReport { mode?: string; holes?: number; holeDiameter?: number; struts?: number; radius?: number; joints?: number; microCaps?: number; finishQuality?: string; curveStyle?: string; jointMethod?: string }
interface PrintReport { overhangRatio?: number; bedContactAreaMm2?: number; minFeatureMm?: number; warnings?: string[]; status?: string; lattice?: { openingWidthMm?: number | null } | null }
interface BooleanReport { operation?: string; operands?: number; stats?: { strategy?: string; fallback?: string | null } | null }
interface RepairReportLite { removedInvalidFaces?: number; removedDegenerateFaces?: number; removedDuplicateFaces?: number; weldedVertices?: number; flippedFaces?: number; flippedShells?: number; cappedLoops?: number; planarCaps?: number; fanCaps?: number; fallbackCaps?: number; skippedLoops?: number; orientationContradictions?: number; topologySplitEdges?: number; topologyDuplicatedVertices?: number; topologyCuts?: number; topologyRemovedFaces?: number; topologyNonOrientable?: boolean; selfIntersectionPairs?: number; selfIntersectionStrategy?: string; remeshResolution?: number }
interface BBoxLite { width: number; height: number; depth?: number | null }
interface FabricateEl extends HTMLElement { value?: string | undefined; checked?: boolean | undefined; disabled?: boolean | undefined; options?: HTMLOptionsCollection; placeholder?: string }
interface FabricateEls { panel: FabricateEl; status: FabricateEl; source: FabricateEl; reason: FabricateEl; plan: FabricateEl; suggestion: FabricateEl; nextAction: FabricateEl; triangles: FabricateEl; vertices: FabricateEl; bodies: FabricateEl; boolean: FabricateEl; objects: FabricateEl; volume: FabricateEl; worldSize: FabricateEl; physical: FabricateEl; warnings: FabricateEl; preparation: FabricateEl; repairStatus: FabricateEl; lattice: FabricateEl; printability: FabricateEl; printChecks: FabricateEl; manufacturing: FabricateEl; manufacturingChecks: FabricateEl; manufacturingProcess: FabricateEl; manufacturingGating: FabricateEl; manufacturingWall: FabricateEl; manufacturingStrut: FabricateEl; manufacturingOpening: FabricateEl; manufacturingOverhang: FabricateEl; manufacturingSlicer: FabricateEl; manufacturingVerification: FabricateEl; manufacturingNotes: FabricateEl; progress: FabricateEl; progressLabel: FabricateEl; progressFill: FabricateEl; cancelButton: FabricateEl; productExportButton: FabricateEl; exportButton: FabricateEl; unitSelect: FabricateEl; scaleInput: FabricateEl; scopeSelect: FabricateEl; booleanSelect: FabricateEl; formatSelect: FabricateEl; compositionNote: FabricateEl; latticePreview: FabricateEl; finishQuality: FabricateEl; productRenderer: FabricateEl; productMaterial: FabricateEl; productQuality: FabricateEl; productShadow: FabricateEl; productLighting: FabricateEl; productAo: FabricateEl; productReset: FabricateEl; curveStyle: FabricateEl; jointStyle: FabricateEl; envelope: FabricateEl; radiusProfile: FabricateEl; taper: FabricateEl; weld: FabricateEl; cap: FabricateEl; repair: FabricateEl; capStrategy: FabricateEl; topology: FabricateEl; nonOrientable: FabricateEl; selfIntersections: FabricateEl; remeshResolution: FabricateEl; quality: FabricateEl; prepHint: FabricateEl; csgSelect: FabricateEl; }
interface ControlsPorts {
  fabrication?: App;
  render?: RendererLike;
  notebook?: App;
  preset?: App;
  lab?: App;
  form?: App;
  look?: App;
  keep?: App;
  ingest?: App;
  advisor?: App;
}

export class Controls {
  app: App;
  fabrication: FabricateControls['fabrication'];
  render: RendererLike;
  notebookPort: App;
  presetPort: KeepControls['presetPort'];
  labPort: App;
  formPort: FormControls['formPort'];
  lookPort: LookControls['lookPort'];
  keepPort: KeepControls['keepPort'];
  ingestPort: App;
  advisorPort: App;
  container: HTMLElement;
  fabricationReport: FabricationReport | null;
  fabricationInput: FabricationInputLike | null;
  latticePreviewMeshes: WeakMap<object, unknown>;
  fabricationJobs: FabricationJobs;
  expressionFields: Map<string, ExpressionField>;
  harmonicsEditor: HarmonicsEditor | null;
  operatorStack: OperatorStack | null;
  sectionGuis: GUI[];
  presetState: { selected: string; name: string };
  presetFilter: { query: string; category: string };
  presetPanel: PresetPanel | null;
  paletteStore: PaletteStore;
  uiState: UiState;
  sectionEls: Map<string, SectionMeta>;
  mode: string;
  modeBar!: HTMLElement | null;
  modeIntent!: HTMLElement | null;
  chainEl!: HTMLElement | null;
  statusEl!: HTMLElement | null;
  statusText!: HTMLElement | null;
  statusShow!: HTMLElement | null;
  advancedToggle!: HTMLButtonElement | null;
  sectionsHost!: HTMLElement | null;
  parametricsToggle!: HTMLInputElement | null;
  uvDomainToggle!: HTMLInputElement | null;
  surfaceInspectorToggle!: HTMLInputElement | null;
  seamsToggle!: HTMLInputElement | null;
  fabricateEls!: FabricateEls | null;
  lookPresetButtons!: Map<string, { button: HTMLButtonElement; preset: LookPreset }> | null;
  userLookName!: HTMLInputElement | null;
  userLookList!: HTMLDivElement | null;
  coordinatePinButton!: HTMLButtonElement | null;
  coordinatePinRelease!: HTMLButtonElement | null;
  coordinatePinStatus!: HTMLSpanElement | null;
  timeController!: Controller | null;
  timeBaseMax!: number;
  modeToggles!: ModeToggleEntry[];
  presetSectionBody!: HTMLElement | null;
  presetsGui!: GUI | null;
  focusAfterBuild!: string | null;
  forcedScrollTop!: number | null;
  labPanel!: LabPanel | null;
  notebookPanel!: NotebookPanel | null;
  advisorPanel!: AdvisorPanel | null;
  explorePanel!: ExplorePanel | null;
  evolutionPanel!: EvolutionPanel | null;
  imagePanel!: ImagePanel | null;
  timelinePanel!: TimelinePanel | null;

  constructor(app: App, container: HTMLElement, ports: ControlsPorts = {}) {
    this.app = app;
    this.fabrication = (ports.fabrication ?? app) as unknown as FabricateControls['fabrication'];
    this.render = ports.render ?? app.renderer;
    this.notebookPort = (ports.notebook ?? app) as unknown as App;
    this.presetPort = (ports.preset ?? app) as unknown as KeepControls['presetPort'];
    this.labPort = (ports.lab ?? app) as unknown as App;
    this.formPort = (ports.form ?? app) as unknown as FormControls['formPort'];
    this.lookPort = (ports.look ?? app) as unknown as LookControls['lookPort'];
    this.keepPort = (ports.keep ?? app) as unknown as KeepControls['keepPort'];
    this.ingestPort = (ports.ingest ?? app) as unknown as App;
    this.advisorPort = (ports.advisor ?? app) as unknown as App;
    this.container = container;
    this.fabricationReport = null;
    this.fabricationInput = null;
    this.latticePreviewMeshes = new WeakMap();
    this.fabricationJobs = new FabricationJobs({
      onProgress: (progress) => this.onFabricationProgress(progress),
      onResult: (report) => this.onFabricationResult(report as unknown as FabricationReport),
      onError: (message) => this.onFabricationError(message),
    });
    this.expressionFields = new Map(); // key → ExpressionField
    this.harmonicsEditor = null;
    this.operatorStack = null;
    this.sectionGuis = [];
    this.presetState = { selected: '', name: '' };
    this.presetFilter = { query: '', category: 'all' };
    this.presetPanel = null;
    this.paletteStore = new PaletteStore(globalThis.localStorage ?? null);
    this.uiState = loadUiState();
    this.sectionEls = new Map();
    this.mode = this.uiState.mode;
    this.modeBar = null;
    this.statusEl = null;
    this.statusText = null;
    this.statusShow = null;
    this.advancedToggle = null;

    this.build();
  }

  /* ———————— layout ———————— */

    section(title: string, { mode = 'form', id = null, open = undefined }: { mode?: string; id?: string | null; open?: boolean } = {}): HTMLElement {
    const sectionId = id ?? slugify(title);
    const el = document.createElement('section');
    el.className = 'panel-section';
    el.dataset.mode = mode;
    el.dataset.sectionId = sectionId;
    el.id = `panel-section-${sectionId}`;

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'panel-h';
    header.setAttribute('aria-controls', `${el.id}-body`);
    const titleEl = document.createElement('span');
    titleEl.className = 'panel-h-title';
    titleEl.textContent = title;
    const caret = document.createElement('span');
    caret.className = 'panel-h-caret';
    caret.setAttribute('aria-hidden', 'true');
    caret.textContent = '⌄';
    header.append(titleEl, caret);
    header.addEventListener('click', () => this.toggleSection(sectionId));

    const body = document.createElement('div');
    body.className = 'panel-body';
    body.id = `${el.id}-body`;
    el.append(header, body);
    (this.sectionsHost ?? this.container).appendChild(el);

    const alias = SECTION_ALIASES[sectionId];
    const saved = this.uiState.sections[sectionId] ?? (alias !== undefined ? this.uiState.sections[alias] : undefined);
    const isOpen = typeof saved === 'boolean' ? saved : (open ?? DEFAULT_OPEN.has(sectionId));
    const meta = { id: sectionId, el, body, header, mode };
    this.sectionEls.set(sectionId, meta);
    this.applySectionOpen(meta, isOpen);
    return body;
  }

  applySectionOpen(meta: SectionMeta, open: boolean): void {
    meta.body.hidden = !open;
    meta.el.classList.toggle('open', open);
    meta.header.setAttribute('aria-expanded', String(open));
  }

  toggleSection(sectionId: string): void {
    const meta = this.sectionEls.get(sectionId);
    if (!meta) return;
    const open = meta.header.getAttribute('aria-expanded') !== 'true';
    this.uiState.sections[sectionId] = open;
    this.applySectionOpen(meta, open);
    this.saveUiState();
    if (sectionId === 'presets' && open) this.presetPanel?.resume?.();
  }

  buildModeBar(): void {
    const header = document.createElement('div');
    header.className = 'panel-header';

    const bar = document.createElement('div');
    bar.className = 'panel-modes';
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'Panel workspace');
    for (const mode of MODES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'panel-mode';
      button.dataset.mode = mode.id;
      button.id = `panel-mode-${mode.id}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'panel-sections-region');
      button.tabIndex = mode.id === this.mode ? 0 : -1;
      button.textContent = mode.label;
      button.addEventListener('click', () => this.setMode(mode.id, { resetScroll: true }));
      button.addEventListener('keydown', (event) => this.handleModeKey(event, mode.id));
      bar.appendChild(button);
    }

    const status = document.createElement('div');
    status.className = 'panel-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const text = document.createElement('span');
    text.className = 'panel-status-text';
    const show = document.createElement('button');
    show.type = 'button';
    show.className = 'panel-status-show';
    show.textContent = 'Show layer';
    show.hidden = true;
    show.addEventListener('click', () => {
      const index = this.app.document.activeLayer ?? 0;
      this.app.setLayerVisible(index, true);
    });
    const resetLayout = document.createElement('button');
    resetLayout.type = 'button';
    resetLayout.className = 'panel-status-reset';
    resetLayout.textContent = 'RESET';
    resetLayout.title = 'Reset panel sections to their default open state';
    resetLayout.setAttribute('aria-label', 'Reset panel layout');
    resetLayout.addEventListener('click', () => {
      this.uiState.sections = {};
      for (const meta of this.sectionEls.values()) {
        this.applySectionOpen(meta, DEFAULT_OPEN.has(meta.id));
      }
      this.saveUiState();
      this.setMode(this.mode);
    });
    status.append(text, show, resetLayout);

    const intent = document.createElement('div');
    intent.className = 'panel-intent';
    intent.textContent = MODE_INTENTS[this.mode] ?? MODE_INTENTS.form!;

    const chain = document.createElement('div');
    chain.className = 'panel-chain';
    chain.setAttribute('aria-label', 'Generative chain');

    header.append(bar, status, intent, chain);
    this.container.appendChild(header);
    this.modeBar = bar;
    this.statusEl = status;
    this.statusText = text;
    this.statusShow = show;
    this.modeIntent = intent;
    this.chainEl = chain;
  }

  renderChain(layer: LayerShape, index: number, instance: boolean, source: LayerShape | null, operators: Rec[]): void {
    if (!this.chainEl) return;
    const parts: HTMLElement[] = [];
    const add = (label: string, title: string, onClick: () => void, className = ''): void => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `panel-chain-step ${className}`.trim();
      button.textContent = label;
      button.title = title;
      button.addEventListener('click', onClick);
      parts.push(button);
    };
    const arrow = () => {
      const span = document.createElement('span');
      span.className = 'panel-chain-arrow';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = '→';
      parts.push(span);
    };
    const sourceName = instance ? (source?.name ?? 'missing source') : layer.name;
    add(
      `Source · ${sourceName}`,
      instance ? `Select source layer ${sourceName}` : 'Open generator section',
      () => {
        if (instance && source) {
          const sourceIndex = this.app.document.layers?.indexOf(source) ?? -1;
          if (sourceIndex >= 0) this.app.setActiveLayer(sourceIndex);
        } else {
          this.setMode('form');
          this.openSectionById('generator');
        }
      },
      'panel-chain-source',
    );
    arrow();
    add(
      `${operators.length} op${operators.length === 1 ? '' : 's'}`,
      'Open operators',
      () => {
        this.setMode('form');
        this.openSectionById('operators');
      },
      'panel-chain-ops',
    );
    arrow();
    const solidReady = Boolean(this.fabricationReport?.source);
    add(
      solidReady ? 'Solid ready' : 'Solid —',
      'Open Fabricate',
      () => this.setMode('fabricate'),
      solidReady ? 'panel-chain-solid ready' : 'panel-chain-solid',
    );
    this.chainEl.replaceChildren(...parts);
  }

  openSectionById(sectionId: string): void {
    const meta = this.sectionEls.get(sectionId);
    if (!meta) return;
    this.uiState.sections[sectionId] = true;
    this.applySectionOpen(meta, true);
    this.saveUiState();
    meta.header.scrollIntoView({ block: 'nearest' });
  }

  handleModeKey(event: KeyboardEvent, modeId: string): void {
    const index = MODES.findIndex((mode) => mode.id === modeId);
    if (index < 0) return;
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % MODES.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + MODES.length) % MODES.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = MODES.length - 1;
    if (next === null) return;
    event.preventDefault();
    const nextMode = MODES[next]!;
    this.setMode(nextMode.id, { resetScroll: true });
    this.modeBar?.querySelector<HTMLElement>(`[data-mode="${nextMode.id}"]`)?.focus();
  }

  setMode(modeId: string, { resetScroll = false }: { resetScroll?: boolean } = {}): void {
    if (!MODES.some((mode) => mode.id === modeId)) modeId = 'form';
    this.mode = modeId;
    this.uiState.mode = modeId;
    if (this.modeBar) {
      for (const button of this.modeBar.querySelectorAll<HTMLElement>('.panel-mode')) {
        const active = button.dataset.mode === modeId;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      }
    }
    if (this.modeIntent) this.modeIntent.textContent = MODE_INTENTS[modeId] ?? MODE_INTENTS.form!;
    if (this.sectionsHost) this.sectionsHost.setAttribute('aria-labelledby', `panel-mode-${modeId}`);
    for (const meta of this.sectionEls.values()) {
      meta.el.hidden = meta.mode !== modeId;
    }
    const modeSections = [...this.sectionEls.values()].filter((meta) => meta.mode === modeId);
    if (modeSections.length && modeSections.every((meta) => meta.body.hidden)) {
      const primary = this.sectionEls.get(MODE_PRIMARY[modeId]!);
      if (primary) this.applySectionOpen(primary, true);
    }
    this.saveUiState();
    if (resetScroll) this.container.scrollTop = 0;
    if (modeId === 'fabricate') this.refreshFabricate?.();
    this.syncLatticePreview?.(modeId === 'fabricate' ? this.fabricationReport : null);
    this.app.syncProductPreview?.();
    this.refreshStatus();
  }

  syncParametricsToggle(): void {
    if (this.parametricsToggle) {
      this.parametricsToggle.checked = this.app.isParametricsVisible();
    }
  }

  syncUVDomainToggle(): void {
    if (this.uvDomainToggle) {
      this.uvDomainToggle.checked = this.app.isUVDomainVisible();
    }
  }

  syncSurfaceInspectorToggle(): void {
    if (this.surfaceInspectorToggle) {
      this.surfaceInspectorToggle.checked = this.app.isSurfaceInspectorEnabled();
    }
  }

  syncSeamsToggle(): void {
    if (this.seamsToggle) {
      this.seamsToggle.checked = this.app.isSeamsVisible();
    }
  }

  refreshStatus(): void {
    if (!this.statusEl || !this.statusText || !this.statusShow) return;
    const doc = this.app.document;
    const layers = doc.layers ?? [];
    const index = Math.max(0, Math.min(layers.length - 1, doc.activeLayer ?? 0));
    const layer = layers[index];
    if (!layer) {
      this.statusText.textContent = 'No active layer';
      this.statusShow.hidden = true;
      return;
    }
    const visible = layer.visible !== false;
    const instance = isInstanceLayer(layer);
    const source = instance ? sourceLayerFor(doc as never, layer as never) as unknown as LayerShape : null;
    const generator = instance ? null : Generators.get(layer.generator?.id ?? '');
    const operators = layer.operators ?? [];
    const disabled = operators.filter((op) => !op.enabled).length;
    const mods = (instance ? 0 : countMods(layer.generator)) + operators.reduce((sum, op) => sum + countMods(op), 0);
    const tracks = (doc.animation?.timeline?.tracks ?? [])
      .filter((track) => (track.layer ?? 0) === index).length;
    const projection = doc.view?.projection ?? '3d';
    const generatorName = generator?.name ?? layer.generator?.id ?? 'generator';
    const chain = instance ? `instance ← ${source?.name ?? 'missing source'}` : generatorName;
    const parts = [
      `Layer ${index + 1}/${layers.length}`,
      layer.name,
      visible ? 'visible' : 'hidden',
    ];
    if (chain && chain !== layer.name) parts.push(chain);
    parts.push(`${operators.length} op${operators.length === 1 ? '' : 's'}${disabled ? ` · ${disabled} off` : ''}`);
    if (mods) parts.push(`${mods} mod${mods === 1 ? '' : 's'}`);
    if (layer.locked) parts.push('content locked');
    if (tracks) parts.push(`${tracks} track${tracks === 1 ? '' : 's'}`);
    if (projection !== '3d') parts.push(`view ${projection.toUpperCase()}`);
    this.statusText.textContent = parts.join(' · ');
    this.statusEl.classList.toggle('hidden-layer', !visible);
    this.statusShow.hidden = visible;
    this.renderChain(layer, index, instance, source ?? null, operators as Rec[]);
  }

  saveUiState(): void {
    try {
      localStorage.setItem(UI_STATE_KEY, JSON.stringify({
        mode: this.mode,
        sections: this.uiState.sections,
        advancedParams: Boolean(this.uiState.advancedParams),
      }));
    } catch {
      // UI state is optional; blocked storage must not break the panel.
    }
  }

  makeGui(body: HTMLElement): GUI {
    const gui = new GUI({ container: body, title: '' });
    this.sectionGuis.push(gui);
    return gui;
  }

  build(): void {
    // A full rebuild destroys the panel DOM. Keep the user's place: a
    // slider drag or an adopted variation must not jump the inspector to
    // the top.
    const previousScroll = this.forcedScrollTop ?? this.container.scrollTop;
    this.forcedScrollTop = null;
    const active = document.activeElement;
    const activeFocusId = active?.getAttribute?.('data-focus-id') ?? null;
    const focusAfterBuild = this.focusAfterBuild ?? activeFocusId;
    this.focusAfterBuild = null;

    for (const gui of this.sectionGuis) gui.destroy();
    this.sectionGuis = [];
    this.presetsGui = null;
    this.presetPanel?.destroy?.();
    this.presetPanel = null;
    this.presetSectionBody = null;
    this.modeToggles = [];
    for (const field of this.expressionFields.values()) field.destroy?.();
    this.expressionFields = new Map();
    this.harmonicsEditor = null;
    this.operatorStack = null;
    this.labPanel?.destroy?.();
    this.labPanel = null;
    this.notebookPanel = null;
    this.explorePanel = null;
    this.timelinePanel?.destroy?.();
    this.timelinePanel = null;
    this.advisorPanel?.destroy?.();
    this.advisorPanel = null;
    this.imagePanel?.destroy?.();
    this.imagePanel = null;
    this.evolutionPanel = null;
    this.container.innerHTML = '';
    this.sectionsHost = null;
    this.sectionEls = new Map();
    this.modeBar = null;
    this.statusEl = null;
    this.statusText = null;
    this.statusShow = null;
    this.advancedToggle = null;
    this.buildModeBar();
    const sectionsHost = document.createElement('div');
    sectionsHost.className = 'panel-sections';
    sectionsHost.id = 'panel-sections-region';
    sectionsHost.setAttribute('role', 'tabpanel');
    sectionsHost.setAttribute('aria-labelledby', `panel-mode-${this.mode}`);
    this.container.appendChild(sectionsHost);
    this.sectionsHost = sectionsHost;

    this.buildLayersSection();
    this.buildInstanceSection();
    this.buildGeneratorSection();
    this.buildParamsSection();
    this.buildEquationsSection();
    this.buildHarmonicsSection();
    this.buildOperatorsSection();
    this.buildLooksSection();
    this.buildCameraSection();
    this.buildCanvasSection();
    this.buildCoordinatesSection();
    this.buildUnitsSection();
    this.buildFabricateSection();
    this.buildStyleSection();
    this.buildRenderSection();
    this.buildOverlaysSection();
    this.buildImageSection();
    this.buildAnimationSection();
    this.buildTimelineSection();
    this.buildMutationSection();
    this.buildAnalysisSection();
    this.buildNotebookSection();
    this.buildAdvisorSection();
    this.buildExploreSection();
    this.buildEvolutionSection();
    this.buildPresetsSection();
    this.buildExportSection();
    this.setMode(this.uiState.mode, { resetScroll: false });
    this.refreshStatus();

    this.container.scrollTop = previousScroll;
    // Focus and layout can both trigger an implicit scroll after the
    // synchronous build. Restore across the next two frames.
    requestAnimationFrame(() => {
      this.container.scrollTop = previousScroll;
      requestAnimationFrame(() => {
        this.container.scrollTop = previousScroll;
      });
    });
    if (focusAfterBuild) {
      const target = this.container.querySelector(`[data-focus-id="${focusAfterBuild}"]`);
      (target as HTMLElement | null)?.focus?.({ preventScroll: true });
    }
    // Some browsers still scroll the newly focused element into view on
    // the next layout task; correct once more after it settles.
    setTimeout(() => {
      this.container.scrollTop = previousScroll;
    }, 120);
  }

  /* ———————— sections ———————— */

  buildLayersSection() { buildLayersSection(this as unknown as FormControls); }

  async renameLayerPrompt(index: number): Promise<void> {
    const layer = this.app.document.layers?.[index];
    if (!layer) return;
    const name = await (this.app.dialogs as unknown as { prompt(options?: Rec): Promise<string | null> }).prompt({
      title: 'Rename layer',
      label: 'Layer name',
      value: layer.name,
      confirmText: 'Rename',
    });
    if (name === null) return;
    this.app.renameLayer(index, name);
  }

  buildInstanceSection() { buildInstanceSection(this as unknown as FormControls); }

  buildGeneratorSection() { buildGeneratorSection(this as unknown as FormControls); }

  buildParamsSection() { buildParamsSection(this as unknown as FormControls); }

  buildEquationsSection() { buildEquationsSection(this as unknown as FormControls); }

  buildHarmonicsSection() { buildHarmonicsSection(this as unknown as FormControls); }

  buildOperatorsSection() { buildOperatorsSection(this as unknown as FormControls); }

  panelHint(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'panel-hint';
    el.textContent = text;
    return el;
  }

  activeGeneratorDefinition(): { id?: string; capabilities?: { geometryKind?: string }; [key: string]: unknown } | null {
    const layer = this.app.activeLayer;
    const generator = isInstanceLayer(layer)
      ? sourceGeneratorFor(this.app.document, layer)
      : layer?.generator;
    const generatorId = generator?.id;
    return generatorId && Generators.has(generatorId) ? Generators.get(generatorId) : null;
  }

  activeLayerGeometryKind(): string {
    const generator = this.activeGeneratorDefinition();
    return generator?.capabilities?.geometryKind
      ?? (supportsSpatial(generator) ? 'curve3d' : 'curve2d');
  }

  activeLayerHasSurface(): boolean {
    const kind = this.activeLayerGeometryKind();
    if (kind === 'surface' || kind === 'mesh' || kind === 'solid') return true;
    const index = this.app.document.activeLayer ?? 0;
    const layer = this.app.evaluation?.layers?.[index] ?? this.app.evaluation ?? null;
    return Boolean(layer?.meshes?.length);
  }

  activeLayerIsSpatial(): boolean {
    return supportsSpatial(this.activeGeneratorDefinition());
  }

  buildLooksSection() { buildLooksSection(this as unknown as LookControls); }

  refreshUserLooks(): void {
    if (!this.userLookList) return;
    const looks = (this.app.lookStore as unknown as { list?: () => Array<{ id: string; name: string }> })?.list?.() ?? [];
    this.userLookList.replaceChildren();
    if (!looks.length) {
      const empty = this.panelHint('No saved looks yet. Save the current appearance above.');
      empty.classList.add('user-look-empty');
      this.userLookList.appendChild(empty);
      return;
    }
    for (const look of looks) {
      const row = document.createElement('div');
      row.className = 'user-look-item';
      const name = document.createElement('span');
      name.className = 'user-look-item-name';
      name.textContent = look.name;
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'lab-button user-look-apply';
      apply.textContent = 'APPLY';
      apply.addEventListener('click', () => {
        if (this.app.applyUserLook(look.id)) {
          this.refreshLookPresets();
          this.refreshUserLooks();
        }
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'lab-button user-look-delete';
      remove.textContent = 'DELETE';
      remove.addEventListener('click', async () => {
        const ok = await (this.app.dialogs as unknown as { confirm(options?: Rec): Promise<boolean | null> }).confirm({
          title: 'Delete look?',
          message: `Remove “${look.name}” from this workspace?`,
          confirmText: 'Delete',
          cancelText: 'Keep',
        });
        if (ok) this.app.deleteUserLook(look.id);
      });
      row.append(name, apply, remove);
      this.userLookList.appendChild(row);
    }
  }

  refreshLookPresets(): void {
    if (!this.lookPresetButtons) return;
    const view = this.app.document.view;
    for (const [id, entry] of this.lookPresetButtons) {
      const availability = this.app.lookPresetState(id);
      entry.button.disabled = !availability.available;
      entry.button.dataset.available = String(availability.available);
      entry.button.classList.toggle('active', availability.available && lookPresetMatchesView(entry.preset, view));
      entry.button.title = availability.reason ?? entry.preset.description;
    }
  }

  buildCameraSection() { buildCameraSection(this as unknown as LookControls); }

  buildCanvasSection() { buildCanvasSection(this as unknown as LookControls); }

  buildCoordinatesSection() { buildCoordinatesSection(this as unknown as LookControls); }

  refreshCoordinatePin(): void {
    if (!this.coordinatePinStatus) return;
    const pin = (this.render?.coordinatePinReadout?.() ?? null) as { text: string } | null;
    this.coordinatePinStatus.textContent = pin ? `Pinned · ${pin.text}` : 'No pinned coordinate';
    if (this.coordinatePinRelease) this.coordinatePinRelease.disabled = !pin;
    if (this.coordinatePinButton) {
      this.coordinatePinButton.disabled = !this.activeLayerIsSpatial();
    }
  }

  buildUnitsSection() { buildUnitsSection(this as unknown as LookControls); }

  buildFabricateSection() { buildFabricateSection(this as unknown as FabricateControls); }

  refreshFabricate(): void {
    const els = this.fabricateEls;
    if (!els) return;
    if (this.mode !== 'fabricate') {
      this.fabricationJobs?.cancel();
      this.fabricationReport = null;
      return;
    }
    const doc = this.app.document;
    const input = {
      evaluation: this.app.evaluation,
      layerIndex: doc.activeLayer ?? 0,
      units: doc.view?.units ?? null,
      preparation: doc.view?.fabrication ?? null,
    };
    this.syncFabricateControls(input);
    // Preview mode is a view preference; it must not invalidate the prepared
    // solid or reschedule the worker job.
    const { latticePreview: _latticePreview, ...fabricationPrep } = input.preparation ?? {};
    const prepKey = JSON.stringify(fabricationPrep);
    const unitsKey = JSON.stringify(doc.view?.units ?? null);
    const docKey = fabricationDocumentKey(doc, input.layerIndex);
    const same = this.fabricationInput?.docKey === docKey
      && this.fabricationInput?.prepKey === prepKey
      && this.fabricationInput?.unitsKey === unitsKey
      && this.fabricationInput?.layerIndex === input.layerIndex;
    if (isHeavyFabrication(input.preparation)) {
      if (same && this.fabricationReport) {
        this.renderFabricate(this.fabricationReport);
        return;
      }
      if (same && this.fabricationJobs.running) return;
      this.fabricationReport = null;
      this.fabricationInput = { ...input, prepKey, docKey, unitsKey };
      this.renderFabricateWorking('preparing', 0);
      this.fabricationJobs.schedule(input);
      return;
    }
    this.fabricationJobs.cancel();
    const report = buildFabricationReport(input as never);
    this.fabricationReport = report;
    this.fabricationInput = { ...input, prepKey, docKey, unitsKey };
    this.renderFabricate(report);
  }

  /** Mirror any prepared solid into the canvas when Solid preview is on. */
  syncLatticePreview(report: FabricationReport | null = this.fabricationReport): void {
    const doc = this.app.document;
    const preparation = (doc.view?.fabrication ?? {}) as unknown as PreparationLike;
    const activeLayer = doc.layers?.[doc.activeLayer ?? 0];
    const isCutout = preparation.latticeMode === 'cutouts';
    const isLattice = activeLayer?.generator?.id === 'surface-lattice'
      || (preparation.lattice === true && isCutout);
    const mesh = report?.source?.geometry ?? null;
    const latticeReady = Boolean(report?.lattice?.struts || report?.lattice?.holes);
    const solidReady = Boolean(report?.source) && report?.exportable !== false;
    const show = this.mode === 'fabricate'
      && preparation.latticePreview !== 'network'
      && (isLattice ? latticeReady : solidReady)
      && Boolean(mesh);
    let previewMesh = mesh;
    if (show && mesh && 'faces' in mesh && Array.isArray(mesh.faces) && mesh.faces.length > 60_000) {
      const cached = this.latticePreviewMeshes.get(mesh);
      if (cached) {
        previewMesh = cached as never;
      } else {
        const simplified = manifoldSimplify(mesh as never, { tolerance: 0.35 });
        if (simplified.ok && simplified.geometry) {
          previewMesh = simplified.geometry as never;
          this.latticePreviewMeshes.set(mesh, previewMesh);
        }
      }
    }
    const previewLayer = (doc.layers ?? []).find((layer) => (
      layer.visible !== false && layer.fabricationRole !== 'cutter'
    )) ?? activeLayer;
    this.app.setFabricationPreview(show ? { mesh: previewMesh, layerId: previewLayer?.id ?? null } as never : null);
    if (this.fabricateEls?.latticePreview) {
      this.fabricateEls.latticePreview.disabled = !isLattice;
    }
  }

  syncFabricateControls(input: FabricationInputLike): void {
    const els = this.fabricateEls;
    if (!els) return;
    const units = input.units ?? {};
    const preparation = input.preparation ?? {};
    els.unitSelect.value = (PHYSICAL_UNIT_SYSTEMS as readonly string[]).includes(units.world ?? '') ? units.world! : 'unitless';
    els.scaleInput.disabled = units.world === 'unitless';
    const activeLayer = this.app.document.layers?.[this.app.document.activeLayer ?? 0];
    const isSurfaceLattice = activeLayer?.generator?.id === 'surface-lattice';
    if (els.latticePreview) {
      els.latticePreview.value = preparation.latticePreview === 'network' ? 'network' : 'solid';
      els.latticePreview.disabled = !isSurfaceLattice
        && !(preparation.lattice === true && preparation.latticeMode === 'cutouts');
      const authored = els.latticePreview.options?.[0];
      if (authored) {
        authored.textContent = preparation.latticeMode === 'cutouts' ? 'Authored' : 'Network';
      }
    }
    if (els.finishQuality) {
      els.finishQuality.value = ['draft', 'standard', 'high'].includes(preparation.finishQuality ?? '')
        ? preparation.finishQuality
        : 'standard';
      els.finishQuality.disabled = !isSurfaceLattice;
    }
    if (els.curveStyle) {
      els.curveStyle.value = preparation.curveStyle === 'organic' ? 'organic' : 'polyline';
      els.curveStyle.disabled = !isSurfaceLattice;
    }
    if (els.jointStyle) {
      els.jointStyle.value = ['technical', 'rounded', 'blend', 'auto'].includes(preparation.jointStyle ?? '')
        ? preparation.jointStyle
        : 'technical';
      els.jointStyle.disabled = !isSurfaceLattice;
    }
    if (els.envelope) {
      els.envelope.value = preparation.envelope === 'outer' ? 'outer' : 'centerline';
      els.envelope.disabled = !isSurfaceLattice;
    }
    if (els.radiusProfile) {
      els.radiusProfile.value = preparation.radiusProfile === 'taper' ? 'taper' : 'constant';
      els.radiusProfile.disabled = !isSurfaceLattice;
    }
    if (els.taper) {
      els.taper.value = String(preparation.taper ?? 0.85);
      els.taper.disabled = !isSurfaceLattice || preparation.radiusProfile !== 'taper';
    }
    const previewSettings = this.app.document.view.preview ?? {};
    const productAvailable = Boolean(this.fabricationReport?.source)
      && preparation.latticePreview !== 'network'
      && (this.app.document.view.projection ?? '3d') === '3d';
    if (els.productRenderer) {
      els.productRenderer.value = previewSettings.backend === 'webgl' ? 'webgl' : 'p5';
      els.productRenderer.disabled = !productAvailable;
      els.productRenderer.title = productAvailable
        ? 'Technical uses p5; Product uses the optional WebGL/PBR preview.'
        : 'Build the solid preview in the 3D view to enable Product preview.';
    }
    if (els.productMaterial) {
      els.productMaterial.value = String(previewSettings.material ?? 'ceramic');
      els.productMaterial.disabled = previewSettings.backend !== 'webgl';
    }
    if (els.productQuality) {
      els.productQuality.value = String(previewSettings.quality ?? 'standard');
      els.productQuality.disabled = previewSettings.backend !== 'webgl';
    }
    if (els.productShadow) {
      els.productShadow.checked = previewSettings.shadow !== false;
      els.productShadow.disabled = previewSettings.backend !== 'webgl';
    }
    if (els.productLighting) {
      els.productLighting.value = String(previewSettings.lighting ?? 'studio');
      els.productLighting.disabled = previewSettings.backend !== 'webgl';
    }
    if (els.productAo) {
      els.productAo.checked = previewSettings.ao === true;
      els.productAo.disabled = previewSettings.backend !== 'webgl';
    }
    const manufacturing = (preparation.manufacturing ?? {}) as unknown as { process?: string; gating?: string; minWall?: number; minStrut?: number; minOpeningWidth?: number; overhangAngle?: number; verification?: { slicer?: string; result?: string; notes?: string } | null };
    if (els.manufacturingProcess) els.manufacturingProcess.value = manufacturing.process ?? 'fdm';
    if (els.manufacturingGating) els.manufacturingGating.value = manufacturing.gating ?? 'warn';
    if (els.manufacturingWall) els.manufacturingWall.value = String(manufacturing.minWall ?? '');
    if (els.manufacturingStrut) els.manufacturingStrut.value = String(manufacturing.minStrut ?? '');
    if (els.manufacturingOpening) els.manufacturingOpening.value = String(manufacturing.minOpeningWidth ?? '');
    if (els.manufacturingOverhang) els.manufacturingOverhang.value = String(manufacturing.overhangAngle ?? '');
    if (els.manufacturingSlicer) els.manufacturingSlicer.value = manufacturing.verification?.slicer ?? '';
    if (els.manufacturingVerification) els.manufacturingVerification.value = manufacturing.verification?.result ?? 'unverified';
    if (els.manufacturingNotes) els.manufacturingNotes.value = manufacturing.verification?.notes ?? '';
    const worldFactor = units.mmPerWorldUnit;
    els.scaleInput.value = typeof worldFactor === 'number' && Number.isFinite(worldFactor) && worldFactor > 0
      ? String(worldFactor)
      : '';
    els.scaleInput.placeholder = units.world === 'unitless' ? 'set mm/unit' : 'mm per world unit';
    if (els.weld) {
      els.weld.checked = preparation.weld === true;
      els.weld.disabled = preparation.repair === true;
    }
    if (els.cap) {
      els.cap.checked = preparation.cap === true;
      els.cap.disabled = preparation.repair === true;
    }
    if (els.repair) els.repair.checked = preparation.repair === true;
    if (els.capStrategy) {
      els.capStrategy.value = preparation.capStrategy ?? 'auto';
      els.capStrategy.disabled = preparation.repair !== true;
    }
    if (els.topology) {
      els.topology.value = preparation.topology ?? 'none';
      els.topology.disabled = preparation.repair !== true;
    }
    if (els.nonOrientable) {
      els.nonOrientable.value = preparation.nonOrientable ?? 'cut';
      els.nonOrientable.disabled = preparation.repair !== true;
    }
    if (els.selfIntersections) {
      els.selfIntersections.value = preparation.selfIntersections ?? 'none';
      els.selfIntersections.disabled = preparation.repair !== true;
    }
    if (els.remeshResolution) {
      els.remeshResolution.value = String(preparation.remeshResolution ?? 64);
      els.remeshResolution.disabled = preparation.repair !== true;
    }
    if (els.quality) {
      els.quality.value = preparation.quality ?? 'custom';
      els.quality.disabled = preparation.repair !== true;
    }
  }

  renderFabricate(report: FabricationReport | null): void {
    const els = this.fabricateEls;
    if (!els || !report) return;
    if (els.progress) els.progress.hidden = true;
    if (els.cancelButton) els.cancelButton.hidden = true;
    const doc = this.app.document;
    const preparation = (doc.view?.fabrication ?? {}) as unknown as PreparationLike;
    if (els.scopeSelect) els.scopeSelect.value = report.scope ?? 'single';
    if (els.formatSelect) els.formatSelect.value = preparation.format === '3mf' ? '3mf' : 'stl';
    if (els.booleanSelect) {
      const grouped = Boolean(report.groups?.length);
      els.booleanSelect.value = grouped || report.scope === 'single'
        ? 'none'
        : String(report.boolean?.operation ?? preparation.boolean ?? 'none');
      els.booleanSelect.disabled = grouped || report.scope === 'single' || (report.closed ?? 0) < 2;
      els.booleanSelect.title = grouped ? 'Grouped preset recipe' : '';
      for (const option of els.booleanSelect.options ?? []) {
        if (option.value === 'difference' || option.value === 'intersection') {
          option.disabled = (report.closed ?? 0) < 2;
        }
      }
    }
    if (els.csgSelect) {
      els.csgSelect.value = preparation.csgStrategy ?? 'auto';
      els.csgSelect.disabled = report.scope === 'single' || (report.boolean?.operation ?? 'none') === 'none';
    }
    const lattice = report.lattice as unknown as LatticeReport | null;
    const ready = Boolean(report.exportable);
    const state = ready
      ? 'ready'
      : report.candidates.length
        ? (report.unitsReady ? 'invalid' : 'units')
        : 'empty';
    els.status.textContent = ready
      ? (lattice?.struts
        ? 'READY · lattice body'
        : report.groups?.length
          ? `READY · ${report.groups.length} grouped ${report.groups.length === 1 ? 'body' : 'bodies'}`
          : report.boolean
            ? `READY · ${(report.boolean as unknown as BooleanReport).operation} result`
            : report.multiBody
              ? `READY · ${report.bodies} bodies`
              : report.repair
              ? 'READY · repaired closed body'
              : (report.prepared ? 'READY · prepared closed body' : 'READY · validated closed body'))
      : state === 'units'
        ? 'UNITS REQUIRED'
        : state === 'invalid'
          ? 'NOT FABRICABLE'
          : 'NO SOURCE';
    els.status.dataset.state = state;
    els.panel.dataset.exportable = String(ready);

    els.source.textContent = report.source
      ? lattice?.struts
        ? `${report.layerName ?? 'Active layer'} · lattice network · ${lattice.struts} struts`
        : report.groups?.length
          ? `${report.layerName ?? 'Active layer'} · grouped recipe · ${report.groups.length} groups · ${report.bodies} bodies`
          : report.boolean
            ? `${report.layerName ?? 'Active layer'} · boolean ${(report.boolean as unknown as BooleanReport).operation} · ${(report.boolean as unknown as BooleanReport).operands} operands`
            : report.multiBody
              ? `${report.layerName ?? 'Active layer'} · multi-body mesh · ${report.bodies} shells`
              : `${report.layerName ?? 'Active layer'} · ${report.source.kind} ${report.source.id ?? ''}`.trim()
      : `${report.layerName ?? 'Active layer'} · no closed Mesh/Solid`;
    const formatLabel = preparation.format === '3mf' ? '3MF' : 'Binary STL';
    els.reason.textContent = report.reason ?? (ready
      ? lattice?.mode === 'cutouts'
        ? `${formatLabel} · millimetres · ${lattice.holes} holes · ${formatNumber(lattice.holeDiameter ?? 0)} mm`
        : lattice?.struts
        ? `${formatLabel} · millimetres · ${lattice.struts} struts · ${formatNumber((lattice.radius ?? 1.75) * 2)} mm`
        : report.groups?.length
          ? `${formatLabel} · millimetres · ${report.groups.length} grouped ${report.groups.length === 1 ? 'body' : 'bodies'}${report.repair ? ' · repaired' : (report.prepared ? ' · prepared' : '')}`
          : report.boolean
            ? `${formatLabel} · millimetres · ${(report.boolean as unknown as BooleanReport).operation} of ${(report.boolean as unknown as BooleanReport).operands} bodies${report.repair ? ' · repaired' : (report.prepared ? ' · prepared' : '')}`
            : `${formatLabel} · millimetres · ${report.multiBody ? `${report.bodies} disjoint bodies` : 'single body'}${report.repair ? ' · repaired' : (report.prepared ? ' · prepared' : '')}`
      : report.candidates.length && (preparation.weld || preparation.cap)
        ? 'Preparation did not produce a closed body; adjust weld/cap or inspect the checks.'
        : 'Enable Weld or Cap to prepare an open mesh, or select a validated body.');

    els.triangles.textContent = report.source ? String(report.triangles) : '—';
    els.vertices.textContent = report.source ? String(report.vertices) : '—';
    if (els.bodies) els.bodies.textContent = String(report.bodies ?? 0);
    if (els.objects) {
      const objects = report.boolean ? 1 : (report.scope === 'single' ? 1 : (report.closed ?? 0));
      els.objects.textContent = String(objects);
    }
    if (els.boolean) {
      const stats = (report.boolean as unknown as BooleanReport | null)?.stats;
      els.boolean.textContent = report.boolean
        ? `${(report.boolean as unknown as BooleanReport).operation} · ${(report.boolean as unknown as BooleanReport).operands} operands · ${stats?.strategy ?? 'bsp'}${stats?.fallback ? ` (${stats.fallback})` : ''}`
        : (report.booleanEmpty ? 'empty' : 'none');
    }

    const worldScale = millimetresPerUnit(doc.view?.units, 'world');
    if (report.volume !== null && report.volume !== undefined) {
      const physicalVolume = worldScale ? report.volume * worldScale ** 3 : report.volume;
      els.volume.textContent = worldScale
        ? `${formatNumber(physicalVolume)} mm³`
        : `${formatNumber(report.volume)} unit³`;
    } else {
      els.volume.textContent = '—';
    }

    els.worldSize.textContent = report.bbox
      ? `${formatNumber(report.bbox.width)} × ${formatNumber(report.bbox.height)} × ${formatNumber(report.bbox.depth)}`
      : '—';
    els.physical.textContent = report.physical
      ? `${formatPhysicalLength(report.physical.width)} × ${formatPhysicalLength(report.physical.height)} × ${formatPhysicalLength(report.physical.depth ?? 0)}`
      : 'unitless';
    const checks = [...(report.errors ?? []), ...(report.warnings ?? [])];
    els.warnings.textContent = checks.length
      ? checks.join(' · ')
      : (!report.source ? 'no body to validate' : 'validated');
    if (els.preparation) {
      const prep = report.preparation;
      const changed = [];
      if (prep?.mergedVertices) changed.push(`${prep.mergedVertices} welded`);
      if (prep?.removedFaces) changed.push(`${prep.removedFaces} faces removed`);
      if (prep?.cappedLoops) changed.push(`${prep.cappedLoops} loops capped`);
      if (prep?.addedTriangles) changed.push(`+${prep.addedTriangles} triangles`);
      els.preparation.textContent = report.prepared
        ? (changed.length ? changed.join(' · ') : 'prepared')
        : 'off';
    }
    if (els.printability) {
      const print = report.printability as unknown as PrintReport | null;
      els.printability.textContent = print
        ? `${Math.round((print.overhangRatio ?? 0) * 100)}% overhang · bed ${formatNumber(print.bedContactAreaMm2 ?? 0)} mm²${print.minFeatureMm ? ` · min ${formatNumber(print.minFeatureMm)} mm` : ''}`
        : '—';
    }
    if (els.printChecks) {
      const print = report.printability as unknown as PrintReport | null;
      const extra = print?.lattice?.openingWidthMm != null && print?.lattice?.openingWidthMm !== undefined
        ? `opening ${formatNumber(print.lattice.openingWidthMm)} mm`
        : null;
      els.printChecks.textContent = print?.warnings?.length
        ? print.warnings.join(' · ')
        : (!report.source ? 'no checks' : (extra ?? 'no warnings'));
      if (els.printChecks.dataset) els.printChecks.dataset.state = print?.status ?? '';
    }
    if (els.manufacturing) {
      const manufacturing = report.manufacturing;
      els.manufacturing.textContent = manufacturing
        ? `${manufacturing.overall} · ${manufacturing.process} · ${manufacturing.gating} · slicer ${manufacturing.verification?.result ?? 'unverified'}`
        : '—';
      if (els.manufacturing.dataset) els.manufacturing.dataset.state = manufacturing?.overall ?? '';
    }
    if (els.manufacturingChecks) {
      const manufacturing = report.manufacturing;
      const issues = (manufacturing?.checks ?? [])
        .filter((check) => check.severity !== 'ok')
        .map((check) => `${check.label}: ${check.source}`);
      els.manufacturingChecks.textContent = manufacturing
        ? (issues.length ? issues.join(' · ') : 'all checks pass')
        : '—';
      if (els.manufacturingChecks.dataset) {
        els.manufacturingChecks.dataset.state = manufacturing?.overall ?? '';
      }
    }
    const previewSettings = this.app.document.view.preview ?? {};
    const productAvailable = Boolean(report.source)
      && preparation.latticePreview !== 'network'
      && (doc.view.projection ?? '3d') === '3d';
    if (els.productRenderer) {
      els.productRenderer.value = previewSettings.backend === 'webgl' ? 'webgl' : 'p5';
      els.productRenderer.disabled = !productAvailable;
    }
    if (els.productMaterial) {
      els.productMaterial.value = String(previewSettings.material ?? 'ceramic');
      els.productMaterial.disabled = previewSettings.backend !== 'webgl';
    }
    if (els.productQuality) {
      els.productQuality.value = String(previewSettings.quality ?? 'standard');
      els.productQuality.disabled = previewSettings.backend !== 'webgl';
    }
    if (els.productShadow) {
      els.productShadow.checked = previewSettings.shadow !== false;
      els.productShadow.disabled = previewSettings.backend !== 'webgl';
    }
    if (els.productLighting) {
      els.productLighting.value = String(previewSettings.lighting ?? 'studio');
      els.productLighting.disabled = previewSettings.backend !== 'webgl';
    }
    if (els.productAo) {
      els.productAo.checked = previewSettings.ao === true;
      els.productAo.disabled = previewSettings.backend !== 'webgl';
    }
    if (els.lattice) {
      const lattice = report.lattice as unknown as LatticeReport | null;
      const activeLayer = doc.layers?.[doc.activeLayer ?? 0];
      const latticeActive = preparation.lattice === true && activeLayer?.generator?.id === 'surface-lattice';
      const finish = lattice?.finishQuality ? ` · ${lattice.finishQuality}` : '';
      const curves = lattice?.curveStyle === 'organic' ? ' organic' : '';
      const joins = lattice?.jointMethod ? ` ${lattice.jointMethod}` : '';
      els.lattice.textContent = lattice?.mode === 'cutouts'
        ? `${lattice.holes} holes · ${formatNumber(lattice.holeDiameter ?? 0)} mm`
        : lattice?.struts
          ? `${lattice.struts} struts · ${formatNumber((lattice.radius ?? 1.75) * 2)} mm · ${lattice.joints ?? 0} joins${finish}${curves}${joins}${lattice.microCaps ? ` · ${lattice.microCaps} microcaps` : ''}`
          : (latticeActive ? 'building…' : 'off');
    }
    if (els.repairStatus) {
      const repair = report.repair as unknown as RepairReportLite | null;
      const actions: string[] = [];
      if (repair) {
        const removed = (repair.removedInvalidFaces ?? 0)
          + (repair.removedDegenerateFaces ?? 0)
          + (repair.removedDuplicateFaces ?? 0);
        if (removed) actions.push(`${removed} faces removed`);
        if (repair.weldedVertices) actions.push(`${repair.weldedVertices} welded`);
        if (repair.flippedFaces) actions.push(`${repair.flippedFaces} faces flipped`);
        if (repair.flippedShells) actions.push(`${repair.flippedShells} shells flipped`);
        if (repair.cappedLoops) {
          actions.push(`${repair.cappedLoops} caps (${repair.planarCaps ?? 0} planar / ${repair.fanCaps ?? 0} fan)`);
        }
        if (repair.fallbackCaps) actions.push(`${repair.fallbackCaps} fan fallbacks`);
        if (repair.skippedLoops) actions.push(`${repair.skippedLoops} holes skipped`);
        if (repair.orientationContradictions) actions.push(`${repair.orientationContradictions} orientation conflicts`);
        if (repair.topologySplitEdges) actions.push(`${repair.topologySplitEdges} edges split`);
        if (repair.topologyDuplicatedVertices) actions.push(`${repair.topologyDuplicatedVertices} vertices duplicated`);
        if (repair.topologyCuts) actions.push(`${repair.topologyCuts} seam cuts`);
        if (repair.topologyRemovedFaces) actions.push(`${repair.topologyRemovedFaces} topology faces removed`);
        if (repair.topologyNonOrientable) actions.push('non-orientable topology');
        if (repair.selfIntersectionPairs) actions.push(`${repair.selfIntersectionPairs} self-intersecting pairs`);
        if (repair.selfIntersectionStrategy && repair.selfIntersectionStrategy !== 'none') {
          actions.push(`self-intersections ${repair.selfIntersectionStrategy}${repair.remeshResolution ? ` @${repair.remeshResolution}` : ''}`);
        }
      }
      els.repairStatus.textContent = repair
        ? (actions.length ? actions.join(' · ') : 'no changes')
        : 'off';
    }

    const instanceCount = (doc.layers ?? []).filter(isInstanceLayer).length;
    const compositionScope = report.scope === 'composition';
    els.compositionNote.hidden = instanceCount === 0 && !compositionScope;
    els.compositionNote.textContent = compositionScope
      ? report.groups?.length
        ? `Composition · ${report.groups.length} boolean groups · ${report.bodies ?? 0} derived bod${report.bodies === 1 ? 'y' : 'ies'}`
        : report.boolean
          ? `Composition · ${(report.boolean as unknown as BooleanReport).operation} of ${(report.boolean as unknown as BooleanReport).operands} bodies · one derived shell`
          : `Composition · ${report.bodies ?? 0} validated bod${report.bodies === 1 ? 'y' : 'ies'} · separate shells, not a union`
      : instanceCount
        ? `Composition · ${instanceCount} instance${instanceCount === 1 ? '' : 's'} · ${report.multiBody ? `${report.bodies} bodies` : 'one body'} · scope: ${report.scope ?? 'single'}`
        : '';

    if (els.productExportButton) {
      const productVisible = previewSettings.backend === 'webgl'
        && Boolean(this.app.productPreviewActive)
        && Boolean(report.source);
      els.productExportButton.hidden = !productVisible;
      els.productExportButton.disabled = !productVisible;
    }
    els.exportButton.disabled = !ready;
    const format = preparation.format === '3mf' ? '3MF' : 'STL';
    els.exportButton.textContent = `EXPORT ${format}`;
    els.exportButton.title = ready
      ? `Write ${format === '3MF' ? 'one 3MF package with separate objects' : 'one binary STL'} in millimetres`
      : (report.reason ?? 'Select a validated closed Mesh/Solid');
    this.updateFabricateNarrative(report);
    this.syncLatticePreview(report);
  }

  updateFabricateNarrative(report: FabricationReport | null, errorMessage: string | null = null): void {
    const els = this.fabricateEls;
    if (!els) return;
    const doc = this.app.document;
    const preparation = (doc.view?.fabrication ?? {}) as unknown as PreparationLike;
    const units = doc.view?.units ?? {};
    const scope = report?.scope ?? preparation.scope ?? 'single';
    const scopeLabel = scope === 'composition' ? 'composition' : (scope === 'active-layer' ? 'active layer' : 'single body');
    const format = (preparation.format ?? 'stl') === '3mf' ? '3MF' : 'STL';
    const parts = ['Plan', scopeLabel];
    if (preparation.repair) {
      const self = preparation.selfIntersections && preparation.selfIntersections !== 'none'
        ? ` ${preparation.selfIntersections}`
        : '';
      parts.push(`repair${self} @${preparation.remeshResolution ?? 64}`);
    }
    const activeLayer = doc.layers?.[doc.activeLayer ?? 0];
    const latticeActive = preparation.lattice === true
      && (activeLayer?.generator?.id === 'surface-lattice' || preparation.latticeMode === 'cutouts');
    if (latticeActive) {
      parts.push('lattice');
    } else if (preparation.boolean && preparation.boolean !== 'none') {
      parts.push(`${preparation.boolean}${preparation.csgStrategy ? ` (${preparation.csgStrategy})` : ''}`);
    }
    parts.push(format);
    parts.push(units.world && units.world !== 'unitless' ? units.world : 'unitless');
    if (els.plan) els.plan.textContent = parts.join(' · ');

    const bbox = (report?.bbox ?? this.app.evaluation?.worldBBox ?? null) as unknown as BBoxLite | null;
    const diagonal = bbox
      ? Math.hypot(bbox.width, bbox.height, bbox.depth ?? 0)
      : null;
    if (els.suggestion) {
      if (diagonal) {
        const suggested = diagonal < 10 ? 32 : (diagonal < 30 ? 64 : 128);
        els.suggestion.textContent = `Suggested resolution: ${suggested} · bbox ${diagonal.toFixed(1)}`;
      } else {
        els.suggestion.textContent = 'Suggested resolution: —';
      }
    }
    if (els.nextAction) {
      els.nextAction.textContent = this.nextFabricationAction(report, preparation, errorMessage);
    }
  }

  nextFabricationAction(report: FabricationReport | null, preparation: PreparationLike | null, errorMessage: string | null = null): string {
    if (errorMessage) return `Next: ${errorMessage}`;
    if (!report) return 'Next: running heavy fabrication job…';
    if (!report.source) {
      if (!report.candidates?.length) return 'Next: select a spatial layer with a closed body.';
      if (!preparation?.repair && !preparation?.cap) return 'Next: enable Repair or Cap to close the mesh.';
      if ((preparation?.selfIntersections ?? 'none') === 'none'
        && (report.errors ?? []).some((error) => error.includes('self-intersect'))) {
        return 'Next: choose Auto or Manifold SDF for self-intersections.';
      }
      if (preparation?.boolean && preparation.boolean !== 'none' && (report.closed ?? 0) < 2) {
        return 'Next: select at least two validated bodies for the boolean.';
      }
      return `Next: ${report.reason ?? 'inspect the checks.'}`;
    }
    if (!report.unitsReady) return 'Next: set an explicit world scale in Output.';
    return 'Ready to export.';
  }

  renderFabricateWorking(phase: string, value: number): void {
    const els = this.fabricateEls;
    if (!els) return;
    els.status.textContent = `WORKING · ${phase}`;
    els.status.dataset.state = 'working';
    els.panel.dataset.exportable = 'false';
    els.exportButton.disabled = true;
    if (els.cancelButton) els.cancelButton.hidden = false;
    this.updateFabricationProgress(phase, value);
    els.reason.textContent = 'Preparing the fabrication body in the worker. You can keep orbiting the camera.';
    this.syncLatticePreview(null);
    this.updateFabricateNarrative(null);
  }

  updateFabricationProgress(phase: string, value: number): void {
    const els = this.fabricateEls;
    if (!els) return;
    const percent = Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 100)));
    const labels: Record<string, string> = {
      engine: 'Starting engine',
      preparing: 'Preparing solid',
      boolean: 'Combining bodies',
      sdf: 'Repairing surface',
      done: 'Finishing',
    };
    if (els.progress) els.progress.hidden = false;
    if (els.progressLabel) {
      els.progressLabel.textContent = `${labels[phase] ?? phase}${percent > 0 && percent < 100 ? ` · ${percent}%` : '…'}`;
    }
    if (els.progressFill) {
      els.progressFill.classList.toggle('indeterminate', percent < 100);
      if (percent >= 100) els.progressFill.style.width = '100%';
      else els.progressFill.style.width = percent > 0 ? `${Math.max(8, percent)}%` : '35%';
    }
  }

  onFabricationProgress({ phase, value }: { phase: string; value: number }): void {
    if (this.mode !== 'fabricate') return;
    const els = this.fabricateEls;
    if (!els) return;
    els.status.textContent = `WORKING · ${phase}`;
    this.updateFabricationProgress(phase, value);
  }

  onFabricationResult(report: FabricationReport): void {
    if (this.mode !== 'fabricate') return;
    this.fabricationReport = report;
    const els = this.fabricateEls;
    if (els?.cancelButton) els.cancelButton.hidden = true;
    if (els?.progress) els.progress.hidden = true;
    this.renderFabricate(report);
  }

  onFabricationError(message: string): void {
    const els = this.fabricateEls;
    this.fabricationReport = null;
    this.syncLatticePreview(null);
    if (!els) return;
    els.status.textContent = 'NOT FABRICABLE';
    els.status.dataset.state = 'invalid';
    els.panel.dataset.exportable = 'false';
    els.exportButton.disabled = true;
    if (els.cancelButton) els.cancelButton.hidden = true;
    if (els.progress) els.progress.hidden = true;
    els.reason.textContent = message;
    this.updateFabricateNarrative(null, message);
  }

  cancelFabrication(): void {
    this.fabricationJobs?.cancel();
    this.fabricationReport = null;
    this.fabricationInput = null;
    this.latticePreviewMeshes = new WeakMap();
    const els = this.fabricateEls;
    if (!els) return;
    els.status.textContent = 'CANCELLED';
    els.status.dataset.state = 'cancelled';
    els.panel.dataset.exportable = 'false';
    els.exportButton.disabled = true;
    if (els.cancelButton) els.cancelButton.hidden = true;
    if (els.progress) els.progress.hidden = true;
    els.reason.textContent = 'Fabrication job cancelled.';
    this.updateFabricateNarrative(null, 'job cancelled; adjust settings and run again.');
  }

  buildStyleSection() { buildStyleSection(this as unknown as KeepControls); }

  buildRenderSection() { buildRenderSection(this as unknown as KeepControls); }

  buildOverlaysSection() { buildOverlaysSection(this as unknown as KeepControls); }

  buildRampEditor(body: HTMLElement): void {
    const view = this.app.document.view;
    const wrap = document.createElement('div');
    wrap.className = 'ramp-editor';
    const head = document.createElement('div');
    head.className = 'lab-subhead';
    head.textContent = 'Color ramp';
    const hint = this.panelHint('Global · Gradient Wireframe only · independent from palettes');
    const preview = document.createElement('div');
    preview.className = 'ramp-preview';
    const stopsEl = document.createElement('div');
    stopsEl.className = 'ramp-stops';
    const actions = document.createElement('div');
    actions.className = 'ramp-actions';

    const stops = () => sanitizeColorRamp(view.colorRamp) ?? [...DEFAULT_COLOR_RAMP];
    const paint = (list: string[]): void => {
      preview.style.background = `linear-gradient(90deg, ${list.join(', ')})`;
    };
    const add = document.createElement('button');
    add.className = 'lab-button ramp-add';
    add.textContent = '+ Add stop';
    add.addEventListener('click', () => {
      const next = [...stops()];
      if (next.length >= 6) return;
      next.push(next[next.length - 1] ?? '#ffffff');
      view.colorRamp = next;
      render();
      this.app.rebuild();
    });
    const reset = document.createElement('button');
    reset.className = 'lab-button ramp-reset';
    reset.textContent = 'Reset';
    reset.addEventListener('click', () => {
      view.colorRamp = null;
      render();
      this.app.rebuild();
    });
    actions.append(add, reset);

    const render = (): void => {
      stopsEl.replaceChildren();
      const list = stops();
      list.forEach((color, index) => {
        const item = document.createElement('span');
        item.className = 'ramp-stop';
        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'ramp-color';
        input.value = color;
        input.setAttribute('aria-label', `Ramp stop ${index + 1}`);
        input.addEventListener('input', () => {
          const next = [...stops()];
          next[index] = input.value;
          view.colorRamp = next;
          paint(next);
          reset.disabled = false;
          this.app.rebuild();
        });
        item.appendChild(input);
        if (list.length > 2) {
          const remove = document.createElement('button');
          remove.className = 'ramp-remove';
          remove.textContent = '×';
          remove.title = 'Remove stop';
          remove.addEventListener('click', () => {
            const next = [...stops()];
            next.splice(index, 1);
            view.colorRamp = next;
            render();
            this.app.rebuild();
          });
          item.appendChild(remove);
        }
        stopsEl.appendChild(item);
      });
      paint(list);
      add.disabled = list.length >= 6;
      reset.disabled = view.colorRamp == null;
    };

    render();
    wrap.append(head, hint, preview, stopsEl, actions);
    body.appendChild(wrap);
  }

  /** Keep render toggles truthful after geometry or layer changes. */
  refreshRenderModes(): void {
    if (!this.modeToggles?.length) return;
    const view = this.app.document.view;
    const order = RenderPasses.ids();
    view.modes = normalizeModes(view.modes, order);
    for (const entry of this.modeToggles) {
      const applies = this.renderPassApplies(entry.def);
      const checked = view.modes.includes(entry.id);
      const reason = applies ? '' : this.renderPassReason(entry.def);
      entry.input.disabled = !applies;
      entry.input.checked = checked;
      entry.row.classList.toggle('inapplicable', !applies);
      entry.row.classList.toggle('off', !checked);
      entry.badge.hidden = applies;
      entry.reasonEl.textContent = reason;
      entry.opacity.disabled = !applies || !checked;
      if (entry.colorInput) {
        entry.colorInput.disabled = !applies || !checked;
        const override = view.passStyle?.[entry.id] as { color?: string; width?: number } | undefined;
        const base = (view.style?.stroke ?? {}) as { color?: string; width?: number };
        const value = override?.color ?? base.color ?? '#ffffff';
        if (document.activeElement !== entry.colorInput && entry.colorInput.value !== value) entry.colorInput.value = value;
      }
      if (entry.widthInput) {
        entry.widthInput.disabled = !applies || !checked;
        const override = view.passStyle?.[entry.id] as { color?: string; width?: number } | undefined;
        const base = (view.style?.stroke ?? {}) as { color?: string; width?: number };
        const value = String(override?.width ?? base.width ?? 1);
        if (document.activeElement !== entry.widthInput && entry.widthInput.value !== value) entry.widthInput.value = value;
      }
      const title = applies ? (entry.def.description ?? entry.def.name) : reason;
      entry.row.title = title;
      entry.row.setAttribute('aria-disabled', String(!applies));
    }
  }

  /** Explain why a pass cannot act on the current visible geometry. */
  renderPassReason(def: RenderPassDefinition): string {
    if (def.id === 'surface-wireframe' || def.id === 'surface-fill') {
      return 'Requires surface or mesh geometry';
    }
    if (def.id === 'epicycles') return 'Requires the Fourier generator';
    if (def.id === 'control-polygon') return 'Requires spline control points';
    if (def.id === 'negative-space') return 'Requires a closed curve';
    return 'Not applicable to the current geometry';
  }

  /** Does a render pass apply to at least one visible layer? */
  renderPassApplies(def: RenderPassDefinition): boolean {
    if (typeof def.appliesTo !== 'function') return true;
    const evaluation = this.app.evaluation;
    const doc = this.app.document;
    const layers = Array.isArray(evaluation?.layers) && evaluation.layers.length
      ? evaluation.layers.filter((layer) => layer.visible !== false)
      : [{
        generator: doc.generator,
        operators: doc.operators,
        curves: evaluation?.curves ?? [],
        meshes: evaluation?.meshes ?? [],
      }];
    return layers.some((layer) => def.appliesTo!({
      document: {
        ...doc,
        generator: layer.generator ?? doc.generator,
        operators: layer.operators ?? doc.operators,
      },
      curves: layer.curves ?? [],
      meshes: layer.renderMeshes ?? layer.meshes ?? [],
      view: doc.view,
      time: doc.animation?.time ?? 0,
    } as never));
  }

  buildImageSection() { buildImageSection(this as unknown as KeepControls); }

  buildAnimationSection() { buildAnimationSection(this as unknown as KeepControls); }

  /**
   * Keep the time playhead moving past 4π without turning the slider into
   * a million-unit control. The visible range grows with the current time,
   * so the knob always has somewhere to advance while the early range stays
   * precise.
   */
  syncTimeRange(value: number): void {
    if (!this.timeController) return;
    const base = this.timeBaseMax ?? 12.5664;
    const n = Number(value);
    const max = Math.max(base, (Number.isFinite(n) ? n : 0) + base);
    if (Math.abs(((this.timeController as unknown as { _max?: number })._max ?? base) - max) < 1e-6) return;
    this.timeController.max(max);
    this.timeController.updateDisplay();
  }

  buildTimelineSection() { buildTimelineSection(this as unknown as KeepControls); }

  buildMutationSection() { buildMutationSection(this as unknown as KeepControls); }

  buildAnalysisSection() { buildAnalysisSection(this as unknown as KeepControls); }

  buildNotebookSection() { buildNotebookSection(this as unknown as KeepControls); }

  buildAdvisorSection() { buildAdvisorSection(this as unknown as KeepControls); }

  buildExploreSection() { buildExploreSection(this as unknown as KeepControls); }

  buildEvolutionSection() { buildEvolutionSection(this as unknown as KeepControls); }

  buildPresetsSection() { buildPresetsSection(this as unknown as KeepControls); }

  rebuildPresetsSection(): void {
    if (this.presetsGui) {
      const index = this.sectionGuis.indexOf(this.presetsGui);
      if (index >= 0) this.sectionGuis.splice(index, 1);
      this.presetsGui.destroy();
      this.presetsGui = null;
    }
    this.buildPresetsSection();
  }

  buildExportSection() { buildExportSection(this as unknown as KeepControls); }

  /* ———————— external triggers ———————— */

  rebuildAll(): void {
    this.build();
    this.sync();
  }

  sync(): void {
    for (const field of this.expressionFields.values()) field.refresh();
    this.harmonicsEditor?.refresh?.();
    this.operatorStack?.refresh?.();
    this.advisorPanel?.refresh?.();
    this.evolutionPanel?.refresh?.();
    this.refreshStatus();
  }

  /** Refresh displayed values after a non-structural parameter adoption. */
  refreshValues(): void {
    const update = (gui: GUI | null | undefined): void => {
      for (const controller of gui?.controllersRecursive?.() ?? []) {
        controller.updateDisplay?.();
      }
    };
    for (const gui of this.sectionGuis) update(gui);
    for (const gui of this.operatorStack?.itemGuis ?? []) update(gui);
    for (const field of this.expressionFields.values()) field.refresh();
    this.advisorPanel?.refresh?.();
    this.explorePanel?.refresh?.();
    this.evolutionPanel?.refresh?.();
    this.refreshStatus();
  }

  showErrors(errors: Array<{ stage?: string; key?: string | null; message?: string }> = []): void {
    this.operatorStack?.setErrors?.(errors as never);
    if (!this.expressionFields.size) return;
    // route errors by stage index + key. Stage 0 = generator.
    const byKey = new Map();
    for (const err of errors ?? []) {
      if (err.stage !== 'generator') continue;
      const key = err.key ?? null;
      if (key && !byKey.has(key)) byKey.set(key, err.message);
    }
    for (const [key, field] of this.expressionFields) {
      field.setError(byKey.get(key) ?? null);
    }
  }
}





function fabricationDocumentKey(doc: DocumentShape | null | undefined, layerIndex: number): string {
  const layers = (doc?.layers ?? []).map((layer) => ({
    id: layer?.id ?? null,
    type: layer?.type ?? null,
    visible: layer?.visible !== false,
    locked: layer?.locked === true,
    seed: layer?.seed ?? null,
    generator: layer?.generator ?? null,
    operators: layer?.operators ?? null,
    source: layer?.source ?? null,
    transform: layer?.transform ?? null,
  }));
  return JSON.stringify({
    layerIndex,
    layers,
    seed: doc?.seed ?? null,
    time: doc?.animation?.time ?? 0,
  });
}

function countMods(stage: { mods?: Rec } | null | undefined): number {
  if (!stage?.mods) return 0;
  return Object.values(stage.mods).filter((value) => typeof value === 'string' && value.trim()).length;
}

function slugify(title: string): string {
  return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatNumber(value: unknown): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const abs = Math.abs(number);
  if (abs >= 100) return number.toFixed(1);
  if (abs >= 10) return number.toFixed(2);
  return number.toFixed(3);
}


function resolveMode(value: unknown): string {
  if (MODES.some((mode) => mode.id === value)) return String(value);
  return MODE_ALIASES[String(value)] ?? 'form';
}

function loadUiState() {
  const fallback = { mode: 'form', sections: {}, advancedParams: false };
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    return {
      mode: resolveMode(data?.mode),
      sections: data?.sections && typeof data.sections === 'object' ? data.sections : {},
      advancedParams: data?.advancedParams === true,
    };
  } catch {
    return fallback;
  }
}
