/**
 * presets/PresetManager.js — v2 preset persistence & sharing.
 *
 *  - Built-in mathematical presets (read-only factories).
 *  - User presets (full GlyphDocuments) in localStorage.
 *  - JSON documents are the share format; v1 presets migrate
 *    automatically via sanitizeDocument().
 */

import { BUILT_IN_PRESETS } from './builtins.js';
import { CATEGORY_USER, PRESET_CATEGORIES, presetInfo } from './catalog.js';
import { sanitizeDocument, createDocument, APP_ID, DOCUMENT_VERSION } from '../core/document.js';

const STORAGE_KEY = 'parametrica.presets.v0';

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export class PresetManager {
  #generatorCache = new Map();

  constructor(storage = globalThis.localStorage ?? null) {
    this.storage = storage ?? null;
    this.user = this.#load();
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
        tags: ['user', doc.generator?.id ?? ''],
        generator: doc.generator?.id ?? 'unknown',
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
    const groups = PRESET_CATEGORIES.map((category) => ({
      ...category,
      count: counts.get(category.id) ?? 0,
    }));
    if (counts.get(CATEGORY_USER.id)) {
      groups.push({ ...CATEGORY_USER, count: counts.get(CATEGORY_USER.id) });
    }
    return [all, ...groups.filter((category) => category.count > 0)];
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

  #generatorFor(name) {
    if (!this.#generatorCache.has(name)) {
      try {
        this.#generatorCache.set(name, BUILT_IN_PRESETS[name]().generator.id);
      } catch {
        this.#generatorCache.set(name, 'unknown');
      }
    }
    return this.#generatorCache.get(name);
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
    const doc = sanitizeDocument(document) ?? createDocument('parametric');
    this.user[clean] = { ...doc, name: clean };
    this.#persist();
    return clean;
  }

  delete(name) {
    if (this.isBuiltIn(name) || !(name in this.user)) return false;
    delete this.user[name];
    this.#persist();
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
