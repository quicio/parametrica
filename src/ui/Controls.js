/**
 * Controls.js — v2 instrument panel.
 *
 * Modes: FORM · LOOK · EXPLORE · PERFORM · INGEST · KEEP.
 * Sections are built once and shown by the active mode.
 * Plain params bind through lil-gui; formulas, harmonic tables and the
 * operator stack are custom Swiss-styled components.
 */

import GUI from 'lil-gui';
import { Generators, RenderPasses } from '../core/registry.js';
import { supportsSpatial } from '../core/capabilities.js';
import { normalizeModes } from './widgets/modeToggles.js';
import { PaletteStore } from '../render/palettes.js';
import { DEFAULT_COLOR_RAMP, sanitizeColorRamp } from '../core/document.js';
import { lookPresetMatchesView } from '../render/lookPresets.js';
import {
  isInstanceLayer,
  sourceGeneratorFor,
  sourceLayerFor,
} from '../core/layers.js';
import {
  PHYSICAL_UNIT_SYSTEMS,
  formatPhysicalLength,
  millimetresPerUnit,
} from '../core/units.js';
import { buildFabricationReport } from '../application/fabricationSource.js';
import { buildLayersSection, buildInstanceSection, buildGeneratorSection, buildParamsSection, buildEquationsSection, buildHarmonicsSection, buildOperatorsSection } from './sections/formSections.js';
import { buildLooksSection, buildCameraSection, buildCanvasSection, buildCoordinatesSection, buildUnitsSection } from './sections/lookSections.js';
import { buildFabricateSection } from './sections/fabricateSections.js';
import { buildStyleSection, buildRenderSection, buildOverlaysSection, buildImageSection, buildAnimationSection, buildTimelineSection, buildMutationSection, buildAnalysisSection, buildNotebookSection, buildAdvisorSection, buildExploreSection, buildEvolutionSection, buildPresetsSection, buildExportSection } from './sections/keepSections.js';

const UI_STATE_KEY = 'parametrica.ui.v1';
const DEFAULT_OPEN = new Set(['generator', 'parameters']);
const SECTION_ALIASES = {
  camera: 'view',
  render: 'view',
  overlays: 'view',
  canvas: 'artboard',
  style: 'artboard',
};
const MODE_ALIASES = {
  work: 'perform',
};
const MODES = [
  { id: 'form', label: 'Form' },
  { id: 'look', label: 'Look' },
  { id: 'explore', label: 'Explore' },
  { id: 'perform', label: 'Perform' },
  { id: 'ingest', label: 'Ingest' },
  { id: 'keep', label: 'Keep' },
  { id: 'fabricate', label: 'Fabricate' },
];

export class Controls {
  /** @param {object} app  @param {HTMLElement} container */
  constructor(app, container) {
    this.app = app;
    this.container = container;
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

  section(title, { mode = 'form', id = null, open = undefined } = {}) {
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
    this.container.appendChild(el);

    const saved = this.uiState.sections[sectionId] ?? this.uiState.sections[SECTION_ALIASES[sectionId]];
    const isOpen = typeof saved === 'boolean' ? saved : (open ?? DEFAULT_OPEN.has(sectionId));
    const meta = { id: sectionId, el, body, header, mode };
    this.sectionEls.set(sectionId, meta);
    this.applySectionOpen(meta, isOpen);
    return body;
  }

  applySectionOpen(meta, open) {
    meta.body.hidden = !open;
    meta.el.classList.toggle('open', open);
    meta.header.setAttribute('aria-expanded', String(open));
  }

  toggleSection(sectionId) {
    const meta = this.sectionEls.get(sectionId);
    if (!meta) return;
    const open = meta.header.getAttribute('aria-expanded') !== 'true';
    this.uiState.sections[sectionId] = open;
    this.applySectionOpen(meta, open);
    this.saveUiState();
    if (sectionId === 'presets' && open) this.presetPanel?.resume?.();
  }

  buildModeBar() {
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
      button.setAttribute('role', 'tab');
      button.textContent = mode.label;
      button.addEventListener('click', () => this.setMode(mode.id, { resetScroll: true }));
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
    status.append(text, show);

    header.append(bar, status);
    this.container.appendChild(header);
    this.modeBar = bar;
    this.statusEl = status;
    this.statusText = text;
    this.statusShow = show;
  }

  setMode(modeId, { resetScroll = false } = {}) {
    if (!MODES.some((mode) => mode.id === modeId)) modeId = 'form';
    this.mode = modeId;
    this.uiState.mode = modeId;
    if (this.modeBar) {
      for (const button of this.modeBar.querySelectorAll('.panel-mode')) {
        const active = button.dataset.mode === modeId;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
      }
    }
    for (const meta of this.sectionEls.values()) {
      meta.el.hidden = meta.mode !== modeId;
    }
    this.saveUiState();
    if (resetScroll) this.container.scrollTop = 0;
    if (modeId === 'fabricate') this.refreshFabricate?.();
    this.refreshStatus();
  }

  syncParametricsToggle() {
    if (this.parametricsToggle) {
      this.parametricsToggle.checked = this.app.isParametricsVisible();
    }
  }

  syncUVDomainToggle() {
    if (this.uvDomainToggle) {
      this.uvDomainToggle.checked = this.app.isUVDomainVisible();
    }
  }

  syncSurfaceInspectorToggle() {
    if (this.surfaceInspectorToggle) {
      this.surfaceInspectorToggle.checked = this.app.isSurfaceInspectorEnabled();
    }
  }

  syncSeamsToggle() {
    if (this.seamsToggle) {
      this.seamsToggle.checked = this.app.isSeamsVisible();
    }
  }

  refreshStatus() {
    if (!this.statusEl || !this.statusText) return;
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
    const source = instance ? sourceLayerFor(doc, layer) : null;
    const generator = instance ? null : Generators.get(layer.generator.id);
    const operators = layer.operators ?? [];
    const disabled = operators.filter((op) => !op.enabled).length;
    const mods = (instance ? 0 : countMods(layer.generator)) + operators.reduce((sum, op) => sum + countMods(op), 0);
    const tracks = (doc.animation?.timeline?.tracks ?? [])
      .filter((track) => (track.layer ?? 0) === index).length;
    const projection = doc.view?.projection ?? '3d';
    const parts = [
      `Layer ${index + 1}/${layers.length}`,
      layer.name,
      visible ? 'visible' : 'hidden',
      instance
        ? `instance ← ${source?.name ?? 'missing source'}`
        : (generator?.name ?? layer.generator.id),
      `${operators.length} op${operators.length === 1 ? '' : 's'}${disabled ? ` · ${disabled} off` : ''}`,
    ];
    if (mods) parts.push(`${mods} mod${mods === 1 ? '' : 's'}`);
    if (layer.locked) parts.push('content locked');
    if (tracks) parts.push(`${tracks} track${tracks === 1 ? '' : 's'}`);
    if (projection !== '3d') parts.push(`view ${projection.toUpperCase()}`);
    this.statusText.textContent = parts.join(' · ');
    this.statusEl.classList.toggle('hidden-layer', !visible);
    this.statusShow.hidden = visible;
  }

  saveUiState() {
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

  makeGui(body) {
    const gui = new GUI({ container: body, title: '' });
    this.sectionGuis.push(gui);
    return gui;
  }

  build() {
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
    this.sectionEls = new Map();
    this.modeBar = null;
    this.statusEl = null;
    this.statusText = null;
    this.statusShow = null;
    this.advancedToggle = null;
    this.buildModeBar();

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
      target?.focus?.({ preventScroll: true });
    }
    // Some browsers still scroll the newly focused element into view on
    // the next layout task; correct once more after it settles.
    setTimeout(() => {
      this.container.scrollTop = previousScroll;
    }, 120);
  }

  /* ———————— sections ———————— */

  buildLayersSection() { buildLayersSection(this); }

  async renameLayerPrompt(index) {
    const layer = this.app.document.layers?.[index];
    if (!layer) return;
    const name = await this.app.dialogs.prompt({
      title: 'Rename layer',
      label: 'Layer name',
      value: layer.name,
      confirmText: 'Rename',
    });
    if (name === null) return;
    this.app.renameLayer(index, name);
  }

  buildInstanceSection() { buildInstanceSection(this); }

  buildGeneratorSection() { buildGeneratorSection(this); }

  buildParamsSection() { buildParamsSection(this); }

  buildEquationsSection() { buildEquationsSection(this); }

  buildHarmonicsSection() { buildHarmonicsSection(this); }

  buildOperatorsSection() { buildOperatorsSection(this); }

  panelHint(text) {
    const el = document.createElement('div');
    el.className = 'panel-hint';
    el.textContent = text;
    return el;
  }

  activeGeneratorDefinition() {
    const layer = this.app.activeLayer;
    const generator = isInstanceLayer(layer)
      ? sourceGeneratorFor(this.app.document, layer)
      : layer?.generator;
    const generatorId = generator?.id;
    return generatorId && Generators.has(generatorId) ? Generators.get(generatorId) : null;
  }

  activeLayerGeometryKind() {
    const generator = this.activeGeneratorDefinition();
    return generator?.capabilities?.geometryKind
      ?? (supportsSpatial(generator) ? 'curve3d' : 'curve2d');
  }

  activeLayerHasSurface() {
    const kind = this.activeLayerGeometryKind();
    if (kind === 'surface' || kind === 'mesh' || kind === 'solid') return true;
    const index = this.app.document.activeLayer ?? 0;
    const layer = this.app.evaluation?.layers?.[index] ?? this.app.evaluation ?? null;
    return Boolean(layer?.meshes?.length);
  }

  activeLayerIsSpatial() {
    return supportsSpatial(this.activeGeneratorDefinition());
  }

  buildLooksSection() { buildLooksSection(this); }

  refreshUserLooks() {
    if (!this.userLookList) return;
    const looks = this.app.lookStore?.list?.() ?? [];
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
        const ok = await this.app.dialogs.confirm({
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

  refreshLookPresets() {
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

  buildCameraSection() { buildCameraSection(this); }

  buildCanvasSection() { buildCanvasSection(this); }

  buildCoordinatesSection() { buildCoordinatesSection(this); }

  refreshCoordinatePin() {
    if (!this.coordinatePinStatus) return;
    const pin = this.app.renderer?.coordinatePinReadout?.() ?? null;
    this.coordinatePinStatus.textContent = pin ? `Pinned · ${pin.text}` : 'No pinned coordinate';
    if (this.coordinatePinRelease) this.coordinatePinRelease.disabled = !pin;
    if (this.coordinatePinButton) {
      this.coordinatePinButton.disabled = !this.activeLayerIsSpatial();
    }
  }

  buildUnitsSection() { buildUnitsSection(this); }

  buildFabricateSection() { buildFabricateSection(this); }

  refreshFabricate() {
    const els = this.fabricateEls;
    if (!els) return;
    const doc = this.app.document;
    const report = buildFabricationReport({
      evaluation: this.app.evaluation,
      layerIndex: doc.activeLayer ?? 0,
      units: doc.view?.units ?? null,
      preparation: doc.view?.fabrication ?? null,
    });
    const units = doc.view?.units ?? {};
    els.unitSelect.value = PHYSICAL_UNIT_SYSTEMS.includes(units.world) ? units.world : 'unitless';
    els.scaleInput.disabled = units.world === 'unitless';
    els.scaleInput.value = Number.isFinite(units.mmPerWorldUnit) && units.mmPerWorldUnit > 0
      ? String(units.mmPerWorldUnit)
      : '';
    els.scaleInput.placeholder = units.world === 'unitless' ? 'set mm/unit' : 'mm per world unit';
    const preparation = doc.view?.fabrication ?? {};
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
    if (els.scopeSelect) els.scopeSelect.value = report.scope ?? 'single';
    if (els.booleanSelect) {
      els.booleanSelect.value = report.scope === 'single' ? 'none' : (report.boolean?.operation ?? preparation.boolean ?? 'none');
      els.booleanSelect.disabled = report.scope === 'single' || (report.closed ?? 0) < 2;
      for (const option of els.booleanSelect.options) {
        if (option.value === 'difference' || option.value === 'intersection') {
          option.disabled = (report.closed ?? 0) < 2;
        }
      }
    }
    const ready = Boolean(report.exportable);
    const state = ready
      ? 'ready'
      : report.candidates.length
        ? (report.unitsReady ? 'invalid' : 'units')
        : 'empty';
    els.status.textContent = ready
      ? (report.boolean
        ? `READY · ${report.boolean.operation} result`
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
      ? report.boolean
        ? `${report.layerName ?? 'Active layer'} · boolean ${report.boolean.operation} · ${report.boolean.operands} operands`
        : report.multiBody
          ? `${report.layerName ?? 'Active layer'} · multi-body mesh · ${report.bodies} shells`
          : `${report.layerName ?? 'Active layer'} · ${report.source.kind} ${report.source.id ?? ''}`.trim()
      : `${report.layerName ?? 'Active layer'} · no closed Mesh/Solid`;
    els.reason.textContent = report.reason ?? (ready
      ? report.boolean
        ? `Binary STL · millimetres · ${report.boolean.operation} of ${report.boolean.operands} bodies${report.repair ? ' · repaired' : (report.prepared ? ' · prepared' : '')}`
        : `Binary STL · millimetres · ${report.multiBody ? `${report.bodies} disjoint bodies` : 'single body'}${report.repair ? ' · repaired' : (report.prepared ? ' · prepared' : '')}`
      : report.candidates.length && (preparation.weld || preparation.cap)
        ? 'Preparation did not produce a closed body; adjust weld/cap or inspect the checks.'
        : 'Enable Weld or Cap to prepare an open mesh, or select a validated body.');

    els.triangles.textContent = report.source ? String(report.triangles) : '—';
    els.vertices.textContent = report.source ? String(report.vertices) : '—';
    if (els.bodies) els.bodies.textContent = String(report.bodies ?? 0);
    if (els.boolean) {
      els.boolean.textContent = report.boolean
        ? `${report.boolean.operation} · ${report.boolean.operands} operands`
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
    els.warnings.textContent = checks.length ? checks.join(' · ') : 'validated';
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
    if (els.repairStatus) {
      const repair = report.repair;
      const actions = [];
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
      }
      els.repairStatus.textContent = repair
        ? (actions.length ? actions.join(' · ') : 'no changes')
        : 'off';
    }

    const instanceCount = (doc.layers ?? []).filter(isInstanceLayer).length;
    const compositionScope = report.scope === 'composition';
    els.compositionNote.hidden = instanceCount === 0 && !compositionScope;
    els.compositionNote.textContent = compositionScope
      ? report.boolean
        ? `Composition · ${report.boolean.operation} of ${report.boolean.operands} bodies · one derived shell`
        : `Composition · ${report.bodies ?? 0} validated bod${report.bodies === 1 ? 'y' : 'ies'} · separate shells, not a union`
      : instanceCount
        ? `Composition · ${instanceCount} instance${instanceCount === 1 ? '' : 's'} · ${report.multiBody ? `${report.bodies} bodies` : 'one body'} · scope: ${report.scope ?? 'single'}`
        : '';

    els.exportButton.disabled = !ready;
    els.exportButton.title = ready
      ? 'Write one binary STL in millimetres'
      : (report.reason ?? 'Select a validated closed Mesh/Solid');
  }

  buildStyleSection() { buildStyleSection(this); }

  buildRenderSection() { buildRenderSection(this); }

  buildOverlaysSection() { buildOverlaysSection(this); }

  buildRampEditor(body) {
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
    const paint = (list) => {
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

    function render() {
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
    }

    render();
    wrap.append(head, hint, preview, stopsEl, actions);
    body.appendChild(wrap);
  }

  /** Keep render toggles truthful after geometry or layer changes. */
  refreshRenderModes() {
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
        const override = view.passStyle?.[entry.id];
        const base = view.style?.stroke ?? {};
        const value = override?.color ?? base.color ?? '#ffffff';
        if (document.activeElement !== entry.colorInput && entry.colorInput.value !== value) entry.colorInput.value = value;
      }
      if (entry.widthInput) {
        entry.widthInput.disabled = !applies || !checked;
        const override = view.passStyle?.[entry.id];
        const base = view.style?.stroke ?? {};
        const value = String(override?.width ?? base.width ?? 1);
        if (document.activeElement !== entry.widthInput && entry.widthInput.value !== value) entry.widthInput.value = value;
      }
      const title = applies ? (entry.def.description ?? entry.def.name) : reason;
      entry.row.title = title;
      entry.row.setAttribute('aria-disabled', String(!applies));
    }
  }

  /** Explain why a pass cannot act on the current visible geometry. */
  renderPassReason(def) {
    if (def.id === 'surface-wireframe' || def.id === 'surface-fill') {
      return 'Requires surface or mesh geometry';
    }
    if (def.id === 'epicycles') return 'Requires the Fourier generator';
    if (def.id === 'control-polygon') return 'Requires spline control points';
    if (def.id === 'negative-space') return 'Requires a closed curve';
    return 'Not applicable to the current geometry';
  }

  /** Does a render pass apply to at least one visible layer? */
  renderPassApplies(def) {
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
    return layers.some((layer) => def.appliesTo({
      document: {
        ...doc,
        generator: layer.generator ?? doc.generator,
        operators: layer.operators ?? doc.operators,
      },
      curves: layer.curves ?? [],
      meshes: layer.renderMeshes ?? layer.meshes ?? [],
      view: doc.view,
      time: doc.animation?.time ?? 0,
    }));
  }

  buildImageSection() { buildImageSection(this); }

  buildAnimationSection() { buildAnimationSection(this); }

  /**
   * Keep the time playhead moving past 4π without turning the slider into
   * a million-unit control. The visible range grows with the current time,
   * so the knob always has somewhere to advance while the early range stays
   * precise.
   */
  syncTimeRange(value) {
    if (!this.timeController) return;
    const base = this.timeBaseMax ?? 12.5664;
    const n = Number(value);
    const max = Math.max(base, (Number.isFinite(n) ? n : 0) + base);
    if (Math.abs((this.timeController._max ?? base) - max) < 1e-6) return;
    this.timeController.max(max);
    this.timeController.updateDisplay();
  }

  buildTimelineSection() { buildTimelineSection(this); }

  buildMutationSection() { buildMutationSection(this); }

  buildAnalysisSection() { buildAnalysisSection(this); }

  buildNotebookSection() { buildNotebookSection(this); }

  buildAdvisorSection() { buildAdvisorSection(this); }

  buildExploreSection() { buildExploreSection(this); }

  buildEvolutionSection() { buildEvolutionSection(this); }

  buildPresetsSection() { buildPresetsSection(this); }

  rebuildPresetsSection() {
    if (this.presetsGui) {
      const index = this.sectionGuis.indexOf(this.presetsGui);
      if (index >= 0) this.sectionGuis.splice(index, 1);
      this.presetsGui.destroy();
      this.presetsGui = null;
    }
    this.buildPresetsSection();
  }

  buildExportSection() { buildExportSection(this); }

  /* ———————— external triggers ———————— */

  rebuildAll() {
    this.build();
    this.sync();
  }

  sync() {
    for (const field of this.expressionFields.values()) field.refresh();
    this.harmonicsEditor?.refresh?.();
    this.operatorStack?.refresh?.();
    this.advisorPanel?.refresh?.();
    this.evolutionPanel?.refresh?.();
    this.refreshStatus();
  }

  /** Refresh displayed values after a non-structural parameter adoption. */
  refreshValues() {
    const update = (gui) => {
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

  showErrors(errors) {
    this.operatorStack?.setErrors?.(errors);
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





function countMods(stage) {
  if (!stage?.mods) return 0;
  return Object.values(stage.mods).filter((value) => typeof value === 'string' && value.trim()).length;
}

function slugify(title) {
  return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const abs = Math.abs(number);
  if (abs >= 100) return number.toFixed(1);
  if (abs >= 10) return number.toFixed(2);
  return number.toFixed(3);
}


function resolveMode(value) {
  if (MODES.some((mode) => mode.id === value)) return value;
  return MODE_ALIASES[value] ?? 'form';
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
