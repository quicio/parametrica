/**
 * PresetPanel.js — grouped, searchable preset library.
 *
 * The flat lil-gui select was hard to scan at ~40 entries. This browser keeps
 * the same apply/save/delete workflow but adds categories, counts, search,
 * one-line descriptions and a clear active state.
 */

import { Generators } from '../../core/registry.js';
import { CATEGORY_USER, PRESET_CATEGORIES, categoryInfo } from '../../presets/catalog.js';

const CATEGORY_ORDER = new Map([
  ...PRESET_CATEGORIES.map((category, index) => [category.id, index]),
  [CATEGORY_USER.id, PRESET_CATEGORIES.length],
]);

export class PresetPanel {
  /**
   * @param {object} app
   * @param {{ query: string, category: string }} state  survives panel rebuilds
   */
  constructor(app, state) {
    this.app = app;
    this.state = state;
    this.entries = [];
    this.categories = [];
    this.el = document.createElement('div');
    this.el.className = 'preset-panel';
    this.build();
    this.refresh();
  }

  build() {
    const tools = document.createElement('div');
    tools.className = 'preset-tools';

    this.searchInput = document.createElement('input');
    this.searchInput.className = 'preset-search';
    this.searchInput.type = 'search';
    this.searchInput.placeholder = 'Search presets…';
    this.searchInput.setAttribute('aria-label', 'Search presets');
    this.searchInput.dataset.focusId = 'preset-search';
    this.searchInput.value = this.state.query;
    this.searchInput.addEventListener('input', () => {
      this.state.query = this.searchInput.value;
      this.renderList();
    });
    tools.append(this.searchInput);

    this.chips = document.createElement('div');
    this.chips.className = 'preset-chips';
    this.chips.setAttribute('role', 'group');
    this.chips.setAttribute('aria-label', 'Preset categories');

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'preset-status';
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.setAttribute('aria-live', 'polite');

    this.listEl = document.createElement('div');
    this.listEl.className = 'preset-list';

    this.el.append(tools, this.chips, this.statusEl, this.listEl);
  }

  refresh() {
    this.entries = this.app.presets.entries();
    this.categories = this.app.presets.categories();
    this.renderChips();
    this.renderList();
  }

  renderChips() {
    this.chips.replaceChildren();
    for (const category of this.categories) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'preset-chip';
      button.dataset.category = category.id;
      button.textContent = `${category.label} ${category.count}`;
      button.title = category.hint;
      const active = this.state.category === category.id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => {
        this.state.category = category.id;
        this.renderChips();
        this.renderList();
      });
      this.chips.append(button);
    }
  }

  renderList() {
    this.listEl.replaceChildren();
    const matches = this.app.presets.search(this.state.query).filter((entry) => (
      this.state.category === 'all' || entry.category === this.state.category
    ));
    const scope = this.categories.find((category) => category.id === this.state.category);
    const scopeLabel = scope?.label ?? 'presets';
    this.statusEl.textContent = matches.length
      ? `${matches.length} of ${this.entries.length} presets · ${scopeLabel}`
      : `No matches in ${scopeLabel}`;

    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'preset-empty';
      empty.textContent = this.state.query
        ? 'Try a different term or category.'
        : 'No presets in this category yet.';
      this.listEl.append(empty);
      return;
    }

    const groups = new Map();
    for (const entry of matches) {
      if (!groups.has(entry.category)) groups.set(entry.category, []);
      groups.get(entry.category).push(entry);
    }
    const ordered = [...groups.entries()].sort((a, b) => (
      (CATEGORY_ORDER.get(a[0]) ?? 99) - (CATEGORY_ORDER.get(b[0]) ?? 99)
    ));
    for (const [categoryId, entries] of ordered) {
      const category = categoryInfo(categoryId);
      const header = document.createElement('div');
      header.className = 'preset-group-h';
      const label = document.createElement('span');
      label.textContent = category.label;
      const count = document.createElement('span');
      count.textContent = String(entries.length);
      header.append(label, count);
      const group = document.createElement('div');
      group.className = 'preset-group';
      group.append(header);
      for (const entry of entries) group.append(this.item(entry));
      this.listEl.append(group);
    }
  }

  item(entry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-item';
    button.dataset.preset = entry.name;
    button.title = entry.description || entry.name;
    const active = this.app.document.name === entry.name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'true');

    const head = document.createElement('span');
    head.className = 'preset-item-head';
    const name = document.createElement('span');
    name.className = 'preset-item-name';
    name.textContent = entry.name;
    const badge = document.createElement('span');
    badge.className = 'preset-item-badge';
    badge.textContent = entry.builtIn
      ? (Generators.get(entry.generator)?.name ?? entry.generator)
      : 'User';
    head.append(name, badge);

    const description = document.createElement('span');
    description.className = 'preset-item-desc';
    description.textContent = entry.description || (entry.builtIn ? 'Built-in preset' : 'Saved preset');

    button.append(head, description);
    button.addEventListener('click', () => {
      this.app.controls.presetState.selected = entry.name;
      this.app.applyPreset(entry.name);
    });
    return button;
  }
}
