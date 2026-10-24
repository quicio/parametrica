/**
 * Controls.js — v2 instrument panel.
 *
 * Sections: GENERATOR · PARAMETERS · EQUATIONS · HARMONICS · OPERATORS ·
 * VIEW · ANIMATION · MUTATION · PRESETS · EXPORT.
 * Plain params bind through lil-gui; formulas, harmonic tables and the
 * operator stack are custom Swiss-styled components.
 */

import GUI from 'lil-gui';
import { Generators, RenderPasses } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { OVERLAYS } from '../viz/overlays.js';
import { ExpressionField } from './widgets/ExpressionField.js';
import { HarmonicsEditor } from './widgets/HarmonicsEditor.js';
import { OperatorStack, bindStageParams } from './widgets/OperatorStack.js';
import { normalizeModes, toggleMode } from './widgets/modeToggles.js';
import { LabPanel } from './widgets/LabPanel.js';
import { NotebookPanel } from './widgets/NotebookPanel.js';
import { TimelinePanel } from './widgets/TimelinePanel.js';
import { AdvisorPanel } from './widgets/AdvisorPanel.js';
import { ImagePanel } from './widgets/ImagePanel.js';
import { EvolutionPanel } from './widgets/EvolutionPanel.js';
import { ExplorePanel } from './widgets/ExplorePanel.js';
import { ARTBOARD_PRESETS, PALETTES, paletteById } from '../render/palettes.js';

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
    this.presetSelect = null;

    this.build();
  }

  /* ———————— layout ———————— */

  section(title) {
    const el = document.createElement('section');
    el.className = 'panel-section';
    const h = document.createElement('div');
    h.className = 'panel-h';
    h.textContent = title;
    el.appendChild(h);
    const body = document.createElement('div');
    body.className = 'panel-body';
    el.appendChild(body);
    this.container.appendChild(el);
    return body;
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
    // the preset select controller died with its GUI above — never
    // destroy it twice (NotFoundError on removeChild)
    this.presetSelect = null;
    this.presetsGui = null;
    this.presetSectionBody = null;
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

    this.buildLayersSection();
    this.buildGeneratorSection();
    this.buildParamsSection();
    this.buildEquationsSection();
    this.buildHarmonicsSection();
    this.buildOperatorsSection();
    this.buildViewSection();
    this.buildArtboardSection();
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

  buildLayersSection() {
    const body = this.section('Layers');
    const layers = this.app.document.layers ?? [];
    const bar = document.createElement('div');
    bar.className = 'layers-bar';
    const add = document.createElement('button');
    add.className = 'layer-add';
    add.textContent = '+ ADD LAYER';
    add.title = 'Add a new layer';
    add.addEventListener('click', () => this.app.addLayer('parametric'));
    bar.appendChild(add);
    body.appendChild(bar);

    const list = document.createElement('div');
    list.className = 'layers-list';
    layers.forEach((layer, index) => {
      const row = document.createElement('div');
      row.className = 'layer-row';
      row.classList.toggle('active', index === this.app.document.activeLayer);
      row.classList.toggle('hidden', layer.visible === false);
      row.classList.toggle('locked', Boolean(layer.locked));

      const visibility = document.createElement('button');
      visibility.className = 'layer-icon';
      visibility.textContent = layer.visible === false ? '○' : '●';
      visibility.title = layer.visible === false ? 'Show layer' : 'Hide layer';
      visibility.addEventListener('click', (event) => {
        event.stopPropagation();
        const next = layer.visible === false;
        this.app.setLayerVisible(index, next);
        visibility.textContent = next ? '●' : '○';
        row.classList.toggle('hidden', !next);
      });

      const lock = document.createElement('button');
      lock.className = 'layer-icon';
      lock.textContent = layer.locked ? 'L' : '·';
      lock.title = layer.locked ? 'Unlock layer' : 'Lock layer';
      lock.addEventListener('click', (event) => {
        event.stopPropagation();
        const next = !layer.locked;
        this.app.setLayerLocked(index, next);
      });

      const name = document.createElement('span');
      name.className = 'layer-name';
      name.textContent = layer.name;
      name.title = layer.name;

      const up = layerButton('↑', 'Move layer up', () => this.app.moveLayer(index, -1), index === 0);
      const down = layerButton('↓', 'Move layer down', () => this.app.moveLayer(index, 1), index === layers.length - 1);
      const duplicate = layerButton('⧉', 'Duplicate layer', () => this.app.duplicateLayer(index));
      const remove = layerButton('×', 'Remove layer', () => this.app.removeLayer(index), layers.length <= 1);

      row.append(visibility, lock, name, up, down, duplicate, remove);
      row.addEventListener('click', () => {
        if (index !== this.app.document.activeLayer) this.app.setActiveLayer(index);
      });
      list.appendChild(row);
    });
    body.appendChild(list);
  }

  buildGeneratorSection() {
    const gui = this.makeGui(this.section('Generator'));
    const options = {};
    for (const def of Generators.list()) options[def.name] = def.id;
    const proxy = { id: this.app.document.generator.id };
    gui.add(proxy, 'id', options)
      .name('Mathematical Model')
      .onChange((id) => this.app.setGenerator(id));
  }

  buildParamsSection() {
    const gui = this.makeGui(this.section('Parameters'));
    const gen = Generators.get(this.app.document.generator.id);
    const stage = this.app.document.generator;
    const plain = Object.entries(gen.params).filter(([, s]) =>
      [TYPE.NUMBER, TYPE.BOOLEAN, TYPE.SELECT].includes(s.type));
    if (plain.length) {
      bindStageParams(gui, Object.fromEntries(plain), stage, () => this.app.rebuild());
    }
  }

  buildEquationsSection() {
    const gen = Generators.get(this.app.document.generator.id);
    const exprEntries = Object.entries(gen.params).filter(([, s]) =>
      [TYPE.EXPRESSION, TYPE.SOURCE].includes(s.type));
    if (!exprEntries.length) return;

    const body = this.section('Equations');
    const stage = this.app.document.generator;
    for (const [key, s] of exprEntries) {
      const field = new ExpressionField({
        label: s.label ?? key,
        multiline: s.type === TYPE.SOURCE,
        doc: s.doc ?? '',
        get: () => stage.params[key],
        set: (v) => {
          stage.params[key] = v;
          this.app.rebuild();
        },
      });
      body.appendChild(field.el);
      this.expressionFields.set(key, field);
    }
  }

  buildHarmonicsSection() {
    const gen = Generators.get(this.app.document.generator.id);
    const hasHarmonics = Object.keys(gen.params).some((k) => k === 'harmonicsX' || k === 'harmonicsY');
    if (!hasHarmonics) return;
    const body = this.section('Harmonics');
    this.harmonicsEditor = new HarmonicsEditor({
      getRows: (axis) => this.app.document.generator.params[axis] ?? [],
      onChange: (axis, rows) => {
        this.app.document.generator.params[axis] = rows;
        this.app.rebuild();
      },
    });
    body.appendChild(this.harmonicsEditor.el);
  }

  buildOperatorsSection() {
    const body = this.section('Operators');
    this.operatorStack = new OperatorStack(this.app, body, () => this.app.rebuild(), () => this.app.rebuildAll());
  }

  buildViewSection() {
    const body = this.section('View');
    const gui = this.makeGui(body);
    const view = this.app.document.view;
    view.projection ??= '3d';
    const projection = gui
      .add(view, 'projection', {
        '3D camera': '3d',
        'XY · Planta': 'xy',
        'XZ · Alzado': 'xz',
        'YZ · Perfil': 'yz',
      })
      .name('Projection');
    projection.domElement.classList.add('view-projection-row');
    projection.$widget?.querySelector?.('select')?.classList.add('view-projection');
    gui.add(view, 'guides').name('CAD Guides').onChange(() => this.app.rebuild());

    // Render modes are a multi-select, but lil-gui's option controller
    // writes a scalar. Use one checkbox per registered pass and keep
    // view.modes an array (see modeToggles.js).
    const order = RenderPasses.ids();
    view.modes = normalizeModes(view.modes, order);
    const modesBody = document.createElement('div');
    modesBody.className = 'mode-toggles';
    const modeInputs = [];
    for (const def of RenderPasses.list()) {
      const row = document.createElement('label');
      row.className = 'mode-toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = view.modes.includes(def.id);
      input.addEventListener('change', () => {
        const next = toggleMode(this.app.document.view.modes, def.id, input.checked, order);
        this.app.document.view.modes = next;
        // Reflect the normalized state for every checkbox (disabling the
        // last pass falls back to stroke, even if another box was clicked).
        for (const entry of modeInputs) entry.input.checked = next.includes(entry.id);
        this.app.rebuild();
      });
      const text = document.createElement('span');
      text.textContent = def.name;
      row.append(input, text);
      modesBody.appendChild(row);
      modeInputs.push({ id: def.id, input });
    }
    body.appendChild(modesBody);

    // overlays
    for (const o of OVERLAYS) {
      gui.add(view.overlays, o.id).name(o.name).onChange(() => this.app.rebuild());
    }
  }

  buildArtboardSection() {
    const body = this.section('Artboard');
    const view = this.app.document.view;
    const ab = view.artboard;
    const st = view.style;
    const grid = document.createElement('div');
    grid.className = 'artboard-grid';

    const row = (label, control) => {
      const el = document.createElement('label');
      el.className = 'artboard-row';
      const name = document.createElement('span');
      name.className = 'artboard-label';
      name.textContent = label;
      el.append(name, control);
      grid.appendChild(el);
      return el;
    };
    const number = (value, min, max, step, apply) => {
      const input = document.createElement('input');
      input.className = 'artboard-input';
      input.type = 'number';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      input.addEventListener('change', () => {
        const n = Math.min(max, Math.max(min, Number(input.value) || min));
        input.value = String(n);
        apply(n);
        rebuild();
      });
      return input;
    };
    const color = (value, apply) => {
      const input = document.createElement('input');
      input.className = 'artboard-color';
      input.type = 'color';
      input.value = value;
      input.addEventListener('input', () => { apply(input.value); rebuild(); });
      return input;
    };
    const select = (options, value, apply) => {
      const input = document.createElement('select');
      input.className = 'artboard-input';
      for (const option of options) {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        input.appendChild(opt);
      }
      input.value = value;
      input.addEventListener('change', () => { apply(input.value); rebuild(); });
      return input;
    };
    const rebuild = () => {
      view.strokeWeight = st.stroke.width;
      this.app.rebuild();
    };

    const presetSelect = document.createElement('select');
    presetSelect.className = 'artboard-input';
    for (const preset of ARTBOARD_PRESETS) {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    }
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom';
    presetSelect.appendChild(customOption);
    const initialPreset = ARTBOARD_PRESETS.find((p) => p.width === ab.width && p.height === ab.height);
    presetSelect.value = initialPreset?.id ?? 'custom';
    presetSelect.addEventListener('change', () => {
      const preset = ARTBOARD_PRESETS.find((p) => p.id === presetSelect.value);
      if (!preset) return;
      ab.width = preset.width;
      ab.height = preset.height;
      sync();
      rebuild();
    });
    row('Preset', presetSelect);

    const widthInput = number(ab.width, 240, 4096, 1, (v) => { ab.width = v; presetSelect.value = 'custom'; });
    const heightInput = number(ab.height, 240, 4096, 1, (v) => { ab.height = v; presetSelect.value = 'custom'; });
    row('Width', widthInput);
    row('Height', heightInput);
    row('Background', color(ab.background, (v) => { ab.background = v; syncPalette(); }));

    const margin = document.createElement('input');
    margin.className = 'artboard-range';
    margin.type = 'range';
    margin.min = '0';
    margin.max = '120';
    margin.step = '1';
    margin.value = String(ab.margin);
    const marginValue = document.createElement('span');
    marginValue.className = 'artboard-value';
    marginValue.textContent = `${ab.margin}px`;
    margin.addEventListener('input', () => {
      ab.margin = Number(margin.value);
      marginValue.textContent = `${ab.margin}px`;
      rebuild();
    });
    const marginWrap = document.createElement('span');
    marginWrap.className = 'artboard-range-wrap';
    marginWrap.append(margin, marginValue);
    row('Margin', marginWrap);

    row('Stroke', color(st.stroke.color, (v) => { st.stroke.color = v; syncPalette(); }));
    row('Stroke width', number(st.stroke.width, 0.1, 40, 0.1, (v) => { st.stroke.width = v; view.strokeWeight = v; }));
    const strokeOpacity = document.createElement('input');
    strokeOpacity.className = 'artboard-range';
    strokeOpacity.type = 'range';
    strokeOpacity.min = '0';
    strokeOpacity.max = '1';
    strokeOpacity.step = '0.01';
    strokeOpacity.value = String(st.stroke.opacity);
    strokeOpacity.addEventListener('input', () => { st.stroke.opacity = Number(strokeOpacity.value); rebuild(); });
    row('Stroke opacity', strokeOpacity);
    row('Cap', select(
      [{ value: 'round', label: 'Round' }, { value: 'butt', label: 'Butt' }, { value: 'square', label: 'Square' }],
      st.stroke.cap, (v) => { st.stroke.cap = v; },
    ));
    row('Join', select(
      [{ value: 'round', label: 'Round' }, { value: 'miter', label: 'Miter' }, { value: 'bevel', label: 'Bevel' }],
      st.stroke.join, (v) => { st.stroke.join = v; },
    ));

    const fillToggle = document.createElement('input');
    fillToggle.className = 'artboard-check';
    fillToggle.type = 'checkbox';
    fillToggle.checked = Boolean(st.fill.enabled);
    fillToggle.addEventListener('change', () => { st.fill.enabled = fillToggle.checked; rebuild(); });
    row('Fill', fillToggle);
    row('Fill color', color(st.fill.color, (v) => { st.fill.color = v; }));
    const fillOpacity = document.createElement('input');
    fillOpacity.className = 'artboard-range';
    fillOpacity.type = 'range';
    fillOpacity.min = '0';
    fillOpacity.max = '1';
    fillOpacity.step = '0.01';
    fillOpacity.value = String(st.fill.opacity);
    fillOpacity.addEventListener('input', () => { st.fill.opacity = Number(fillOpacity.value); rebuild(); });
    row('Fill opacity', fillOpacity);

    row('Blend', select(
      [{ value: 'normal', label: 'Normal' }, { value: 'multiply', label: 'Multiply' }, { value: 'screen', label: 'Screen' }, { value: 'difference', label: 'Difference' }],
      st.blend, (v) => { st.blend = v; },
    ));

    const paletteSelect = document.createElement('select');
    paletteSelect.className = 'artboard-input';
    for (const palette of PALETTES) {
      const opt = document.createElement('option');
      opt.value = palette.id;
      opt.textContent = palette.name;
      paletteSelect.appendChild(opt);
    }
    paletteSelect.addEventListener('change', () => {
      const palette = paletteById(paletteSelect.value);
      ab.background = palette.background;
      st.stroke.color = palette.stroke;
      st.fill.color = palette.fill;
      sync();
      rebuild();
    });
    const paletteWrap = document.createElement('span');
    paletteWrap.className = 'artboard-palette';
    const swatch = document.createElement('span');
    swatch.className = 'artboard-swatch';
    paletteWrap.append(paletteSelect, swatch);
    row('Palette', paletteWrap);

    const sync = () => {
      widthInput.value = String(ab.width);
      heightInput.value = String(ab.height);
      margin.value = String(ab.margin);
      marginValue.textContent = `${ab.margin}px`;
      const preset = ARTBOARD_PRESETS.find((p) => p.width === ab.width && p.height === ab.height);
      presetSelect.value = preset?.id ?? 'custom';
      swatch.style.background = `linear-gradient(135deg, ${ab.background} 50%, ${st.stroke.color} 50%)`;
    };
    const syncPalette = () => { swatch.style.background = `linear-gradient(135deg, ${ab.background} 50%, ${st.stroke.color} 50%)`; };
    syncPalette();
    body.appendChild(grid);
  }

  buildImageSection() {
    const body = this.section('Image');
    this.imagePanel = new ImagePanel(this.app);
    body.appendChild(this.imagePanel.el);
  }

  buildAnimationSection() {
    const gui = this.makeGui(this.section('Animation'));
    const a = this.app.document.animation;
    gui.add(a, 'playing').name('Play').onChange(() => this.app.rebuild());
    gui.add(a, 'speed', 0.05, 4, 0.05).name('Speed').onChange(() => {});
    gui.add(a, 'time', 0, 12.5664, 0.01).name('Time').onChange((t) => this.app.setTime(t)).listen();
    gui.add({ reset: () => this.app.resetTime() }, 'reset').name('Reset Time');
  }

  buildTimelineSection() {
    const body = this.section('Timeline');
    this.timelinePanel = new TimelinePanel(this.app);
    body.appendChild(this.timelinePanel.el);
  }

  buildMutationSection() {
    const gui = this.makeGui(this.section('Mutation'));
    const btn = gui.add({ mutate: () => this.app.mutate() }, 'mutate').name('Mutate');
    btn.domElement.classList.add('gl-accent');
    gui.add({ undo: () => this.app.undo() }, 'undo').name('Undo (⌘Z)');
    gui.add({ redo: () => this.app.redo() }, 'redo').name('Redo (⇧⌘Z)');
    gui.add(this.app.document, 'seed', 0, 999999, 1)
      .name('Seed')
      .onChange((v) => this.app.setSeed(v))
      .listen();
    gui.add({ reroll: () => this.app.rerollSeed() }, 'reroll').name('Reroll Seed');
  }

  buildAnalysisSection() {
    const body = this.section('Analysis');
    this.labPanel = new LabPanel(this.app);
    body.appendChild(this.labPanel.el);
  }

  buildNotebookSection() {
    const body = this.section('Notebook');
    this.notebookPanel = new NotebookPanel(this.app);
    body.appendChild(this.notebookPanel.el);
  }

  buildAdvisorSection() {
    const body = this.section('Advisor');
    this.advisorPanel = new AdvisorPanel(this.app);
    body.appendChild(this.advisorPanel.el);
  }

  buildExploreSection() {
    const body = this.section('Explore');
    this.explorePanel = new ExplorePanel(this.app);
    body.appendChild(this.explorePanel.el);
  }

  buildEvolutionSection() {
    const body = this.section('Evolution');
    this.evolutionPanel = new EvolutionPanel(this.app);
    body.appendChild(this.evolutionPanel.el);
  }

  buildPresetsSection() {
    // Reuse the section on GUI-only rebuilds; otherwise every save would
    // append an empty "Presets" section.
    const body = this.presetSectionBody ?? this.section('Presets');
    this.presetSectionBody = body;
    body.replaceChildren();
    this.presetsGui = this.makeGui(body);

    const names = this.app.presets.names();
    if (!this.presetState.selected && names.length) this.presetState.selected = names[0];

    this.presetsGui.add(this.presetState, 'selected', names).name('Library').onChange((n) => this.app.applyPreset(n));
    this.presetsGui.add(this.presetState, 'name').name('Name');
    this.presetsGui.add({
      save: () => {
        try {
          const name = this.app.presets.save(this.presetState.name, this.app.document);
          this.presetState.name = name;
          this.presetState.selected = name;
          this.rebuildPresetsSection();
          this.sync();
        } catch (err) {
          this.app.notify?.(`Preset save failed: ${err.message}`, 'error');
        }
      },
    }, 'save').name('Save Preset');
    this.presetsGui.add({
      remove: () => {
        if (this.app.presets.delete(this.presetState.selected)) {
          this.presetState.selected = '';
          this.rebuildPresetsSection();
        } else if (this.app.presets.isBuiltIn(this.presetState.selected)) {
          this.app.notify?.('Built-in presets cannot be deleted', 'error');
        }
      },
    }, 'remove').name('Delete Preset');
    this.presetsGui.add({ importJSON: () => this.app.openImportDialog() }, 'importJSON').name('Import JSON…');
  }

  rebuildPresetsSection() {
    if (this.presetsGui) {
      const index = this.sectionGuis.indexOf(this.presetsGui);
      if (index >= 0) this.sectionGuis.splice(index, 1);
      this.presetsGui.destroy();
      this.presetsGui = null;
    }
    this.buildPresetsSection();
  }

  buildExportSection() {
    const gui = this.makeGui(this.section('Export'));
    const ex = this.app.exporter;
    gui.add({ svg: () => ex.exportSVG() }, 'svg').name('Export SVG');
    gui.add({ png: () => ex.exportPNG() }, 'png').name('Export PNG');
    gui.add({ json: () => ex.exportJSON() }, 'json').name('Export JSON');
    gui.add({
      copy: async () => {
        const ok = await ex.copyJSON();
        if (!ok) this.app.notify?.('Clipboard unavailable — use Export JSON', 'error');
        else this.app.notify?.('Document copied to clipboard');
      },
    }, 'copy').name('Copy JSON');
  }

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
  }

  showErrors(errors) {
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


function layerButton(label, title, onClick, disabled = false) {
  const button = document.createElement('button');
  button.className = 'layer-icon';
  button.textContent = label;
  button.title = title;
  button.disabled = disabled;
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}
