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
    for (const gui of this.sectionGuis) gui.destroy();
    this.sectionGuis = [];
    // the preset select controller died with its GUI above — never
    // destroy it twice (NotFoundError on removeChild)
    this.presetSelect = null;
    this.presetsGui = null;
    this.expressionFields = new Map();
    this.container.innerHTML = '';

    this.buildGeneratorSection();
    this.buildParamsSection();
    this.buildEquationsSection();
    this.buildHarmonicsSection();
    this.buildOperatorsSection();
    this.buildViewSection();
    this.buildAnimationSection();
    this.buildMutationSection();
    this.buildPresetsSection();
    this.buildExportSection();
  }

  /* ———————— sections ———————— */

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
    this.harmonicsEditor = new HarmonicsEditor(this.app.document.generator, () => this.app.rebuild());
    body.appendChild(this.harmonicsEditor.el);
  }

  buildOperatorsSection() {
    const body = this.section('Operators');
    this.operatorStack = new OperatorStack(this.app, body, () => this.app.rebuild(), () => this.app.rebuildAll());
  }

  buildViewSection() {
    const gui = this.makeGui(this.section('View'));
    const view = this.app.document.view;
    gui.add(view, 'strokeWeight', 0.5, 8, 0.1).name('Stroke Weight').onChange(() => this.app.rebuild());
    gui.add(view, 'guides').name('CAD Guides').onChange(() => {});
    // viz modes
    const modeOptions = {};
    for (const def of RenderPasses.list()) modeOptions[def.name] = def.id;
    const proxy = { modes: view.modes.slice() };
    gui.add(proxy, 'modes', modeOptions).name('Viz Modes').onChange((v) => {
      view.modes = v;
    });
    // overlays
    for (const o of OVERLAYS) {
      gui.add(view.overlays, o.id).name(o.name).onChange(() => this.app.rebuild());
    }
  }

  buildAnimationSection() {
    const gui = this.makeGui(this.section('Animation'));
    const a = this.app.document.animation;
    gui.add(a, 'playing').name('Play').onChange(() => this.app.rebuild());
    gui.add(a, 'speed', 0.05, 4, 0.05).name('Speed').onChange(() => {});
    gui.add(a, 'time', 0, 12.5664, 0.01).name('Time').onChange((t) => this.app.setTime(t)).listen();
    gui.add({ reset: () => this.app.resetTime() }, 'reset').name('Reset Time');
  }

  buildMutationSection() {
    const gui = this.makeGui(this.section('Mutation'));
    const btn = gui.add({ mutate: () => this.app.mutate() }, 'mutate').name('Mutate');
    btn.domElement.classList.add('gl-accent');
  }

  buildPresetsSection() {
    const body = this.section('Presets');
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
          console.warn('[parametrica] preset save failed:', err.message);
        }
      },
    }, 'save').name('Save Preset');
    this.presetsGui.add({
      remove: () => {
        if (this.app.presets.delete(this.presetState.selected)) {
          this.presetState.selected = '';
          this.rebuildPresetsSection();
        }
      },
    }, 'remove').name('Delete Preset');
    this.presetsGui.add({ importJSON: () => this.app.openImportDialog() }, 'importJSON').name('Import JSON…');
  }

  rebuildPresetsSection() {
    if (!this.presetsGui) return;
    this.presetsGui.destroy();
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
        if (!ok) console.warn('[parametrica] clipboard unavailable — use Export JSON');
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
