/**
 * presets/PresetManager.js — v2 preset persistence & sharing.
 *
 *  - Built-in mathematical presets (read-only factories).
 *  - User presets (full GlyphDocuments) in localStorage.
 *  - Workspace metadata: favorites, recents and persisted user previews.
 *  - JSON documents are the share format; v1 presets migrate
 *    automatically via sanitizeDocument().
 */

import { BUILT_IN_PRESETS } from './builtins.js';
import { CATEGORY_USER, PRESET_CATEGORIES, presetInfo } from './catalog.js';
import { PREVIEW_MAX_CHARS, previewKey } from './preview.js';
import { sanitizeDocument, createDocument, APP_ID, DOCUMENT_VERSION } from '../core/document.js';

const STORAGE_KEY = 'parametrica.presets.v0';
export const META_STORAGE_KEY = 'parametrica.presets.meta.v1';
export const META_VERSION = 1;
export const RECENT_LIMIT = 8;

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isPngDataUrl(value) {
  return typeof value === 'string'
    && value.startsWith('data:image/png;base64,')
    && value.length <= PREVIEW_MAX_CHARS;
}

export class PresetManager {
  #generatorCache = new Map();
  #favorites = new Set();
  #recent = [];
  #previews = new Map();
  lastMetaError = null;

  constructor(storage = globalThis.localStorage ?? null, options = {}) {
    this.storage = storage ?? null;
    this.renderPreview = typeof options.renderPreview === 'function'
      ? options.renderPreview
      : null;
    this.user = this.#load();
    this.#loadMeta();
  }

  /**
   * Catalog entries for the preset browser: built-ins plus user presets.
   * Built-in documents are only instantiated once per name to read the
   * generator id; descriptions and categories come from `catalog.js`.
   */
  entries() {
    const builtIns = Object.keys(BUILT_IN_PRESETS).map((name) => {
      const info = presetInfo(name);
      return {
        name,
        builtIn: true,
        category: info.category,
        description: info.description,
        tags: info.tags,
        generator: this.#generatorFor(name),
      };
    });
    const user = Object.keys(this.user).sort().map((name) => {
      const doc = this.user[name];
      return {
        name,
        builtIn: false,
        category: CATEGORY_USER.id,
        description: 'Saved from this workspace.',
        tags: ['user', doc.generator?.id ?? doc.layers?.find((layer) => layer?.generator?.id)?.generator.id ?? ''],
        generator: doc.generator?.id ?? doc.layers?.find((layer) => layer?.generator?.id)?.generator.id ?? 'unknown',
      };
    });
    return [...builtIns, ...user];
  }

  /** Category chips with live counts. Empty categories are hidden. */
  categories() {
    const entries = this.entries();
    const counts = new Map();
    for (const entry of entries) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    const all = { id: 'all', label: 'All', hint: 'Every preset', count: entries.length };
    const favorites = {
      id: 'favorites',
      label: 'Favorites',
      hint: 'Starred presets',
      count: entries.filter((entry) => this.#favorites.has(entry.name)).length,
    };
    const recent = this.recentEntries(entries);
    const groups = PRESET_CATEGORIES.map((category) => ({
      ...category,
      count: counts.get(category.id) ?? 0,
    }));
    if (counts.get(CATEGORY_USER.id)) {
      groups.push({ ...CATEGORY_USER, count: counts.get(CATEGORY_USER.id) });
    }
    return [
      all,
      favorites,
      ...(recent.length ? [{ id: 'recent', label: 'Recent', hint: 'Recently opened', count: recent.length }] : []),
      ...groups.filter((category) => category.count > 0),
    ];
  }

  /** Case- and accent-insensitive search across names, descriptions, tags and generators. */
  search(query) {
    const needle = normalizeText(query);
    const entries = this.entries();
    if (!needle) return entries;
    return entries.filter((entry) => (
      normalizeText(entry.name).includes(needle)
      || normalizeText(entry.description).includes(needle)
      || normalizeText(entry.category).includes(needle)
      || normalizeText(entry.generator).includes(needle)
      || entry.tags.some((tag) => normalizeText(tag).includes(needle))
    ));
  }

  /* ———————— favorites & recents ———————— */

  isFavorite(name) {
    return this.#favorites.has(name);
  }

  /** Toggle a favorite without applying the preset. Returns the new state. */
  toggleFavorite(name) {
    if (!this.#isKnown(name)) return false;
    if (this.#favorites.has(name)) this.#favorites.delete(name);
    else this.#favorites.add(name);
    this.#persistMeta();
    return this.#favorites.has(name);
  }

  favoriteEntries(entries = this.entries()) {
    return entries.filter((entry) => this.#favorites.has(entry.name));
  }

  /** Record a successful preset application. Returns false for unknown names. */
  markUsed(name, at = Date.now()) {
    if (!this.#isKnown(name)) return false;
    const timestamp = Number.isFinite(at) ? at : Date.now();
    this.#recent = [
      { name, at: timestamp },
      ...this.#recent.filter((item) => item.name !== name),
    ].slice(0, RECENT_LIMIT);
    this.#persistMeta();
    return true;
  }

  recentEntries(entries = this.entries()) {
    const byName = new Map(entries.map((entry) => [entry.name, entry]));
    return this.#recent.map((item) => byName.get(item.name)).filter(Boolean);
  }

  /* ———————— previews ———————— */

  /** Return a cached preview only when it still matches the preset document. */
  preview(name) {
    const cached = this.#previews.get(name);
    if (!cached) return null;
    const doc = this.get(name);
    if (!doc) return null;
    return cached.hash === previewKey(doc) ? cached.dataUrl : null;
  }

  /** Generate a preview on demand and cache it. Browser renderer is injected. */
  ensurePreview(name) {
    const doc = this.get(name);
    if (!doc || typeof this.renderPreview !== 'function') return null;
    const hash = previewKey(doc);
    const cached = this.#previews.get(name);
    if (cached?.hash === hash) return cached.dataUrl;
    let dataUrl;
    try {
      dataUrl = this.renderPreview(doc);
    } catch {
      dataUrl = null;
    }
    if (!isPngDataUrl(dataUrl)) {
      this.#previews.delete(name);
      return null;
    }
    this.#previews.set(name, { hash, dataUrl });
    if (!this.isBuiltIn(name)) this.#persistMeta();
    return dataUrl;
  }

  /* ———————— catalog helpers ———————— */

  #generatorFor(name) {
    if (!this.#generatorCache.has(name)) {
      try {
        const doc = BUILT_IN_PRESETS[name]();
        const generatorId = doc.generator?.id
          ?? doc.layers?.find((layer) => layer?.generator?.id)?.generator.id
          ?? 'unknown';
        this.#generatorCache.set(name, generatorId);
      } catch {
        this.#generatorCache.set(name, 'unknown');
      }
    }
    return this.#generatorCache.get(name);
  }

  #isKnown(name) {
    return this.isBuiltIn(name) || Object.prototype.hasOwnProperty.call(this.user, name);
  }

  #load() {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) return {};
      const out = {};
      for (const [name, doc] of Object.entries(JSON.parse(raw))) {
        const clean = sanitizeDocument(doc);
        if (clean) out[name] = { ...clean, name };
      }
      return out;
    } catch {
      return {};
    }
  }

  #persist() {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.user));
    } catch {
      /* storage unavailable — session-local presets */
    }
  }

  #loadMeta() {
    try {
      const raw = this.storage?.getItem(META_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;
      const known = new Set(this.names());
      this.#favorites = new Set(
        (Array.isArray(data.favorites) ? data.favorites : [])
          .filter((name) => typeof name === 'string' && known.has(name)),
      );
      const seen = new Set();
      this.#recent = (Array.isArray(data.recent) ? data.recent : [])
        .filter((item) => {
          if (!item || typeof item.name !== 'string') return false;
          if (!Number.isFinite(item.at) || !known.has(item.name)) return false;
          if (seen.has(item.name)) return false;
          seen.add(item.name);
          return true;
        })
        .map((item) => ({ name: item.name, at: item.at }))
        .sort((a, b) => b.at - a.at)
        .slice(0, RECENT_LIMIT);
      if (data.previews && typeof data.previews === 'object') {
        for (const [name, entry] of Object.entries(data.previews)) {
          if (this.isBuiltIn(name) || !known.has(name)) continue;
          if (!entry || typeof entry.hash !== 'string' || !isPngDataUrl(entry.dataUrl)) continue;
          this.#previews.set(name, { hash: entry.hash, dataUrl: entry.dataUrl });
        }
      }
    } catch (error) {
      this.lastMetaError = error?.message ?? 'invalid preset metadata';
    }
  }

  #persistMeta() {
    try {
      const previews = {};
      for (const [name, entry] of this.#previews) {
        if (this.isBuiltIn(name) || !isPngDataUrl(entry.dataUrl)) continue;
        previews[name] = { hash: entry.hash, dataUrl: entry.dataUrl };
      }
      const payload = {
        version: META_VERSION,
        favorites: [...this.#favorites],
        recent: this.#recent,
        previews,
      };
      this.storage?.setItem(META_STORAGE_KEY, JSON.stringify(payload));
      this.lastMetaError = null;
    } catch (error) {
      this.lastMetaError = error?.message ?? 'preset metadata storage unavailable';
    }
  }

  /* ———————— preset documents ———————— */

  names() {
    return [...Object.keys(BUILT_IN_PRESETS), ...Object.keys(this.user).sort()];
  }

  isBuiltIn(name) {
    return Object.prototype.hasOwnProperty.call(BUILT_IN_PRESETS, name);
  }

  /** @returns {object|null} fresh document instance */
  get(name) {
    if (this.isBuiltIn(name)) return BUILT_IN_PRESETS[name]();
    const doc = this.user[name];
    return doc ? sanitizeDocument(doc) : null;
  }

  save(name, document) {
    const clean = String(name ?? '').trim();
    if (!clean) throw new Error('Preset name required');
    if (this.isBuiltIn(clean)) throw new Error(`"${clean}" is a built-in preset name`);
    const existed = Object.prototype.hasOwnProperty.call(this.user, clean);
    const doc = sanitizeDocument(document) ?? createDocument('parametric');
    this.user[clean] = { ...doc, name: clean };
    this.#persist();
    if (existed) {
      this.#previews.delete(clean);
      this.#persistMeta();
    }
    return clean;
  }

  delete(name) {
    if (this.isBuiltIn(name) || !(name in this.user)) return false;
    delete this.user[name];
    this.#favorites.delete(name);
    this.#recent = this.#recent.filter((item) => item.name !== name);
    this.#previews.delete(name);
    this.#persist();
    this.#persistMeta();
    return true;
  }

  serialize(name, document) {
    const doc = sanitizeDocument(document) ?? createDocument('parametric');
    return JSON.stringify({ app: APP_ID, ...doc, name: String(name ?? doc.name ?? 'untitled') }, null, 2);
  }

  /**
   * Parse any preset JSON: current Parametrica document, legacy glyph-lab v2,
   * or v1 legacy. The dual-format read lives in sanitizeDocument(); this
   * wrapper just propagates the name.
   * @returns {{name: string, document: object}}
   */
  parse(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data || typeof data !== 'object') throw new Error('Invalid preset JSON');
    const document = sanitizeDocument(data);
    if (!document) throw new Error('Unrecognized preset format');
    return { name: typeof data.name === 'string' ? data.name : document.name, document };
  }
}

export { DOCUMENT_VERSION };
