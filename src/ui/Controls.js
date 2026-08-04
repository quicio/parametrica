/**
 * Controls.js — lil-gui instrument panel.
 *
 *  - One controller per schema parameter, grouped by folder.
 *  - Every change instantly regenerates the glyph (no apply button).
 *  - No anchor manipulation, no drawing tools: sliders only.
 *  - Actions: Mutate, preset save/restore/delete, JSON import,
 *    SVG / PNG / JSON / clipboard export.
 */

import GUI from 'lil-gui';
import { PARAM_SCHEMA, PARAM_KEYS } from '../core/params.js';

export class Controls {
  /**
   * @param {object} app
   * @param {HTMLElement} container
   */
  constructor(app, container) {
    this.app = app;
    this.gui = new GUI({ container, title: 'Controls' });
    this.presetState = { selected: '', name: '' };
    this.presetSelect = null;

    this.buildParamControllers();
    this.buildActions();
    this.buildPresets();
    this.buildExport();

    // Hidden file input for JSON preset import.
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'application/json,.json';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', () => this.handleImportFile());
    document.body.appendChild(this.fileInput);
  }

  buildParamControllers() {
    const folders = {};
    for (const key of PARAM_KEYS) {
      const schema = PARAM_SCHEMA[key];
      const folderName = schema.folder ?? 'Glyph';
      if (!folders[folderName]) {
        folders[folderName] = this.gui.addFolder(folderName);
        folders[folderName].open();
      }
      const folder = folders[folderName];
      let controller;
      if (schema.type === 'boolean') {
        controller = folder.add(this.app.params, key).name(schema.label);
      } else {
        controller = folder
          .add(this.app.params, key, schema.min, schema.max, schema.step)
          .name(schema.label);
      }
      controller.onChange(() => this.app.onParamsChanged());
    }
  }

  buildActions() {
    const folder = this.gui.addFolder('Mutation');
    const actions = { mutate: () => this.app.mutate() };
    const btn = folder.add(actions, 'mutate').name('Mutate');
    btn.domElement.classList.add('gl-accent');
    folder.open();
  }

  buildPresets() {
    const folder = this.gui.addFolder('Presets');
    this.presetsFolder = folder;

    this.rebuildPresetSelect();

    folder.add(this.presetState, 'name').name('Name');
    folder
      .add(
        {
          save: () => {
            try {
              const name = this.app.presets.save(this.presetState.name, this.app.params);
              this.presetState.name = name;
              this.presetState.selected = name;
              this.rebuildPresetSelect();
              this.sync();
            } catch (err) {
              console.warn('[glyph-lab] preset save failed:', err.message);
            }
          },
        },
        'save',
      )
      .name('Save Preset');
    folder
      .add(
        {
          remove: () => {
            if (this.app.presets.delete(this.presetState.selected)) {
              this.presetState.selected = '';
              this.rebuildPresetSelect();
              this.sync();
            }
          },
        },
        'remove',
      )
      .name('Delete Preset');
    folder
      .add({ importJSON: () => this.fileInput.click() }, 'importJSON')
      .name('Import JSON…');
    folder.open();
  }

  buildExport() {
    const folder = this.gui.addFolder('Export');
    const { exporter } = this.app;
    folder.add({ svg: () => exporter.exportSVG() }, 'svg').name('Export SVG');
    folder.add({ png: () => exporter.exportPNG() }, 'png').name('Export PNG');
    folder.add({ json: () => exporter.exportJSON() }, 'json').name('Export JSON');
    folder
      .add(
        {
          copy: async () => {
            const ok = await exporter.copyJSON();
            if (!ok) console.warn('[glyph-lab] clipboard unavailable — use Export JSON');
          },
        },
        'copy',
      )
      .name('Copy JSON');
    folder.open();
  }

  /** Rebuild the preset dropdown (lil-gui options can't update in place). */
  rebuildPresetSelect() {
    if (this.presetSelect) {
      this.presetSelect.destroy();
      this.presetSelect = null;
    }
    const names = this.app.presets.names();
    if (!names.length) return;
    if (!names.includes(this.presetState.selected)) {
      this.presetState.selected = names[0];
    }
    // The select must be the FIRST child of the folder for stable order.
    this.presetSelect = this.presetsFolder
      .add(this.presetState, 'selected', names)
      .name('Library')
      .onChange((name) => this.app.applyPreset(name));
    // Move to top of the folder's DOM children.
    const el = this.presetSelect.domElement;
    el.parentElement.prepend(el);
  }

  handleImportFile() {
    const file = this.fileInput.files?.[0];
    this.fileInput.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = this.app.importJSON(String(reader.result));
      if (ok) this.sync();
      else console.warn('[glyph-lab] could not parse preset file');
    };
    reader.readAsText(file);
  }

  /** Push app.params → all widgets (after mutation / preset load). */
  sync() {
    for (const controller of this.gui.controllersRecursive()) {
      controller.updateDisplay();
    }
  }
}
