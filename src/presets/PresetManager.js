/**
 * PresetManager.js — save / restore / share glyph configurations.
 *
 *  - Built-in presets ship with the app (read-only).
 *  - User presets persist to localStorage.
 *  - Every preset is a plain JSON document { app, version, name, params }
 *    that can be exported as a file, copied to the clipboard, imported
 *    back, or pasted by hand. All input passes through sanitizeParams().
 */

import { BUILT_IN_PRESETS } from './builtins.js';
import { sanitizeDocument, createDocument, DOCUMENT_VERSION } from '../core/document.js';

const STORAGE_KEY = 'glyph-lab.presets.v2';

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
    return JSON.stringify({ app: 'glyph-lab', ...doc, name: String(name ?? doc.name ?? 'untitled') }, null, 2);
  }

  /**
   * Parse any preset JSON: v2 document, v1 legacy, or bare document.
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
