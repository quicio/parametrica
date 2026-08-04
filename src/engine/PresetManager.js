/**
 * PresetManager.js — save / restore / share glyph configurations.
 *
 *  - Built-in presets ship with the app (read-only).
 *  - User presets persist to localStorage.
 *  - Every preset is a plain JSON document { app, version, name, params }
 *    that can be exported as a file, copied to the clipboard, imported
 *    back, or pasted by hand. All input passes through sanitizeParams().
 */

import { defaultParams, sanitizeParams } from '../core/params.js';

const STORAGE_KEY = 'glyph-lab.presets.v1';
const PRESET_VERSION = 1;

export const BUILT_IN_PRESETS = {
  'Vesica Prime': {
    ...defaultParams(),
  },
  Hourglass: {
    ...defaultParams(),
    width: 170, height: 400,
    crossTop: 0.26, crossBottom: 0.26,
    waist: 0.3, innerOffset: 6,
    tension: 0.42, tipSharpness: 0.18,
    strokeWeight: 2.5,
  },
  Needle: {
    ...defaultParams(),
    width: 110, height: 520,
    crossTop: 0.58, crossBottom: 0.58,
    waist: 0.07, innerOffset: 0,
    tension: 0.18, tipSharpness: 0.9,
    opticalCorrection: 0.6, strokeWeight: 1.5,
  },
  Chalice: {
    ...defaultParams(),
    width: 200, height: 340,
    crossTop: 0.62, crossBottom: 0.3,
    waist: 0.2, innerOffset: -8,
    tension: 0.22, tipSharpness: 0.5,
    strokeWeight: 3,
  },
};

export class PresetManager {
  /** @param {Storage|null} storage  injectable (null in tests / SSR) */
  constructor(storage = globalThis.localStorage ?? null) {
    this.storage = storage ?? null;
    this.user = this.#load();
  }

  #load() {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const out = {};
      for (const [name, params] of Object.entries(parsed)) {
        out[name] = sanitizeParams(params);
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
      /* storage full/blocked — presets remain session-local */
    }
  }

  /** Built-ins first, then user presets (alphabetical within groups). */
  names() {
    return [
      ...Object.keys(BUILT_IN_PRESETS),
      ...Object.keys(this.user).sort(),
    ];
  }

  isBuiltIn(name) {
    return Object.prototype.hasOwnProperty.call(BUILT_IN_PRESETS, name);
  }

  /** @returns {object|null} a defensive copy of the preset params */
  get(name) {
    const params = BUILT_IN_PRESETS[name] ?? this.user[name];
    return params ? { ...params } : null;
  }

  save(name, params) {
    const clean = String(name ?? '').trim();
    if (!clean) throw new Error('Preset name required');
    this.user[clean] = sanitizeParams(params);
    this.#persist();
    return clean;
  }

  delete(name) {
    if (this.isBuiltIn(name)) return false; // built-ins are immutable
    if (!(name in this.user)) return false;
    delete this.user[name];
    this.#persist();
    return true;
  }

  /** Serialize params to the canonical shareable JSON document. */
  serialize(name, params) {
    return JSON.stringify(
      {
        app: 'glyph-lab',
        version: PRESET_VERSION,
        name: String(name ?? 'untitled'),
        params: sanitizeParams(params),
      },
      null,
      2,
    );
  }

  /**
   * Parse a preset JSON document. Accepts the canonical wrapper
   * { app, version, name, params } or a bare params object.
   * @returns {{name: string, params: object}}
   */
  parse(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data || typeof data !== 'object') throw new Error('Invalid preset JSON');
    const rawParams = data.params ?? data;
    const name = typeof data.name === 'string' ? data.name : 'imported';
    return { name, params: sanitizeParams(rawParams) };
  }
}
