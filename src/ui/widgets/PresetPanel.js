/**
 * PresetPanel.js — grouped, searchable, visual preset library.
 *
 * Rows carry a deterministic thumbnail, identifying text and a star. Previews
 * are generated lazily through PresetManager so browsing never touches the
 * live document or the first paint.
 */

import { Generators } from '../../core/registry.js';
import { CATEGORY_USER, PRESET_CATEGORIES, categoryInfo } from '../../presets/catalog.js';

const CATEGORY_ORDER = new Map([
  ...PRESET_CATEGORIES.map((category, index) => [category.id, index]),
  [CATEGORY_USER.id, PRESET_CATEGORIES.length],
]);

const PREVIEWS_PER_TICK = 4;

function monogram(name) {
  return String(name ?? '').trim().charAt(0).toUpperCase() || '·';
}

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
    this.previewQueue = [];
    this.previewQueued = new Set();
    this.previewHandle = null;
    this.observer = null;
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
    this.listEl.setAttribute('aria-label', 'Preset results');

    this.el.append(tools, this.chips, this.statusEl, this.listEl);

    if (typeof IntersectionObserver === 'function') {
      this.observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          this.observer.unobserve(entry.target);
          this.enqueuePreview(entry.target.dataset.preview);
        }
      }, { root: this.listEl, rootMargin: '80px 0px' });
    }
  }

  destroy() {
    this.observer?.disconnect();
    this.observer = null;
    if (this.previewHandle != null) {
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(this.previewHandle);
      else clearTimeout(this.previewHandle);
    }
    this.previewHandle = null;
    this.previewQueue = [];
    this.previewQueued.clear();
  }

  refresh() {
    this.entries = this.app.presets.entries();
    this.categories = this.app.presets.categories();
    const ids = new Set(this.categories.map((category) => category.id));
    if (!ids.has(this.state.category)) this.state.category = 'all';
    this.renderChips();
    this.renderList();
  }

  /** Re-observe visible rows, e.g. after the section opens. */
  resume() {
    this.observePreviews();
  }

  /** Focus the active filter control, used after deleting a filtered preset. */
  focusFilter(category = this.state.category) {
    const chip = this.chips.querySelector(`[data-category="${category}"]`)
      ?? this.chips.querySelector('[data-category="all"]');
    chip?.focus();
  }

  renderChips() {
    const focused = this.chips.contains(document.activeElement)
      ? document.activeElement.dataset.category
      : null;
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
    if (focused) {
      this.chips.querySelector(`[data-category="${focused}"]`)?.focus();
    }
  }

  renderList() {
    this.observer?.disconnect();
    this.listEl.replaceChildren();
    const results = this.app.presets.search(this.state.query);
    const { matches, scopeLabel } = this.filter(results);
    this.statusEl.textContent = matches.length
      ? `${matches.length} of ${this.entries.length} presets · ${scopeLabel}`
      : `No matches in ${scopeLabel}`;

    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'preset-empty';
      empty.textContent = this.emptyMessage(scopeLabel);
      this.listEl.append(empty);
      return;
    }

    if (this.state.category === 'recent') {
      for (const entry of matches) this.listEl.append(this.item(entry));
    } else {
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

    this.observePreviews();
  }

  filter(entries) {
    if (this.state.category === 'favorites') {
      return {
        matches: this.app.presets.favoriteEntries(entries),
        scopeLabel: 'Favorites',
      };
    }
    if (this.state.category === 'recent') {
      const order = new Map(
        this.app.presets.recentEntries().map((entry, index) => [entry.name, index]),
      );
      return {
        matches: entries
          .filter((entry) => order.has(entry.name))
          .sort((a, b) => order.get(a.name) - order.get(b.name)),
        scopeLabel: 'Recent',
      };
    }
    if (this.state.category !== 'all') {
      return {
        matches: entries.filter((entry) => entry.category === this.state.category),
        scopeLabel: categoryInfo(this.state.category).label,
      };
    }
    return { matches: entries, scopeLabel: 'All' };
  }

  emptyMessage(scopeLabel) {
    if (this.state.query) return `No matches for “${this.state.query}” in ${scopeLabel}.`;
    if (this.state.category === 'favorites') return 'No favorites yet. Star a preset to keep it here.';
    if (this.state.category === 'recent') return 'No recent presets yet. Open one from the library.';
    return 'No presets in this category yet.';
  }

  item(entry) {
    const row = document.createElement('div');
    row.className = 'preset-item';
    row.dataset.presetRow = entry.name;
    const active = this.app.document.name === entry.name;
    row.classList.toggle('active', active);

    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'preset-apply';
    apply.dataset.preset = entry.name;
    apply.title = entry.description || entry.name;
    if (active) apply.setAttribute('aria-current', 'true');

    const thumb = document.createElement('span');
    thumb.className = 'preset-thumb';
    thumb.dataset.preview = entry.name;
    thumb.setAttribute('aria-hidden', 'true');
    const fallback = monogram(entry.name);
    thumb.textContent = fallback;
    const cached = this.app.presets.preview(entry.name);
    if (cached) this.setThumbnail(thumb, cached, fallback);

    const copy = document.createElement('span');
    copy.className = 'preset-copy';
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
    copy.append(head, description);
    apply.append(thumb, copy);

    const star = document.createElement('button');
    star.type = 'button';
    star.className = 'preset-star';
    const favorite = this.app.presets.isFavorite(entry.name);
    this.paintStar(star, entry.name, favorite);
    star.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleFavorite(entry.name, star);
    });

    apply.addEventListener('click', () => {
      this.app.controls.presetState.selected = entry.name;
      this.app.applyPreset(entry.name);
    });

    row.append(apply, star);
    return row;
  }

  paintStar(star, name, favorite) {
    star.textContent = favorite ? '★' : '☆';
    star.setAttribute('aria-pressed', String(favorite));
    star.setAttribute('aria-label', favorite ? `Unfavorite ${name}` : `Favorite ${name}`);
    star.title = star.getAttribute('aria-label');
  }

  toggleFavorite(name, star) {
    const row = star.closest('.preset-item');
    const rows = [...this.listEl.querySelectorAll('.preset-item')];
    const index = row ? rows.indexOf(row) : -1;
    const favorite = this.app.presets.toggleFavorite(name);
    this.paintStar(star, name, favorite);
    this.categories = this.app.presets.categories();
    this.renderChips();
    if (this.state.category === 'favorites' && !favorite) {
      this.renderList();
      const nextRows = [...this.listEl.querySelectorAll('.preset-item')];
      const target = nextRows[Math.min(Math.max(index, 0), nextRows.length - 1)]
        ?.querySelector('.preset-apply');
      (target ?? this.chips.querySelector('[data-category="favorites"]'))?.focus();
    }
  }

  setThumbnail(thumb, dataUrl, fallback = monogram(thumb.dataset.preview)) {
    if (!dataUrl) {
      thumb.textContent = fallback;
      return;
    }
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.src = dataUrl;
    img.addEventListener('error', () => {
      thumb.textContent = fallback;
    });
    thumb.replaceChildren(img);
  }

  observePreviews() {
    const thumbs = [...this.listEl.querySelectorAll('.preset-thumb[data-preview]')];
    if (!this.observer) {
      for (const thumb of thumbs) {
        if (!thumb.querySelector('img')) this.enqueuePreview(thumb.dataset.preview);
      }
      return;
    }
    this.observer.disconnect();
    for (const thumb of thumbs) {
      if (!thumb.querySelector('img')) this.observer.observe(thumb);
    }
  }

  enqueuePreview(name) {
    if (!name || this.previewQueued.has(name)) return;
    if (this.app.presets.preview(name)) return;
    this.previewQueued.add(name);
    this.previewQueue.push(name);
    this.schedulePreviewFlush();
  }

  schedulePreviewFlush() {
    if (this.previewHandle != null) return;
    const run = () => {
      this.previewHandle = null;
      let count = 0;
      while (this.previewQueue.length && count < PREVIEWS_PER_TICK) {
        const name = this.previewQueue.shift();
        this.previewQueued.delete(name);
        const dataUrl = this.app.presets.ensurePreview(name);
        if (dataUrl) this.applyPreview(name, dataUrl);
        count++;
      }
      if (this.previewQueue.length) this.schedulePreviewFlush();
    };
    if (typeof requestIdleCallback === 'function') {
      this.previewHandle = requestIdleCallback(run, { timeout: 500 });
    } else {
      this.previewHandle = setTimeout(run, 0);
    }
  }

  applyPreview(name, dataUrl) {
    for (const thumb of this.listEl.querySelectorAll('.preset-thumb')) {
      if (thumb.dataset.preview !== name) continue;
      if (thumb.querySelector('img')) continue;
      this.setThumbnail(thumb, dataUrl);
    }
  }
}
