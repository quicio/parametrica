/**
 * presets/PresetManager.js — v2 preset persistence & sharing.
 *
 *  - Built-in mathematical presets (read-only factories).
 *  - User presets (full GlyphDocuments) in localStorage.
 *  - JSON documents are the share format; v1 presets migrate
 *    automatically via sanitizeDocument().
 */

import { BUILT_IN_PRESETS } from './builtins.js';
import { sanitizeDocument, createDocument, APP_ID, DOCUMENT_VERSION } from '../core/document.js';

const STORAGE_KEY = 'parametrica.presets.v0';

export class PresetManager {
  constructor(storage = globalThis.localStorage ?? null) {
    this.storage = storage ?? null;
    this.user = this.#load();
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
