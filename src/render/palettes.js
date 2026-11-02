/**
 * palettes.js — artboard presets and curated color pairs.
 *
 * Palettes are data, not themes: applying one writes explicit values into
 * the document so the result stays serialisable and reproducible.
 */

export const ARTBOARD_PRESETS = [
  { id: 'square', name: 'Square', width: 900, height: 900 },
  { id: 'portrait', name: 'Portrait 4:5', width: 1080, height: 1350 },
  { id: 'landscape', name: 'Landscape 16:9', width: 1600, height: 900 },
  { id: 'a4-portrait', name: 'A4 Portrait', width: 1240, height: 1754 },
  { id: 'a4-landscape', name: 'A4 Landscape', width: 1754, height: 1240 },
];

export const PALETTES = [
  {
    id: 'monochrome',
    name: 'Monochrome',
    background: '#000000',
    stroke: '#ffffff',
    fill: '#ffffff',
  },
  {
    id: 'paper',
    name: 'Paper',
    background: '#f2eee3',
    stroke: '#121212',
    fill: '#121212',
  },
  {
    id: 'signal',
    name: 'Signal',
    background: '#0d0d0d',
    stroke: '#e30613',
    fill: '#e30613',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    background: '#12162b',
    stroke: '#e8d7ff',
    fill: '#e8d7ff',
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    background: '#ffffff',
    stroke: '#000000',
    fill: '#000000',
  },
];

export function paletteById(id) {
  return PALETTES.find((palette) => palette.id === id) ?? PALETTES[0];
}

export function artboardPresetById(id) {
  return ARTBOARD_PRESETS.find((preset) => preset.id === id) ?? ARTBOARD_PRESETS[0];
}


export const PALETTE_STORAGE_KEY = 'parametrica.palettes.v1';
const CUSTOM_LIMIT = 24;
const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function sanitizePalette(raw, fallbackIndex = 0) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const name = String(source.name ?? '').trim().slice(0, 40);
  return {
    id: typeof source.id === 'string' && source.id.startsWith('custom-')
      ? source.id
      : `custom-${Date.now().toString(36)}-${fallbackIndex}`,
    name: name || `Palette ${fallbackIndex + 1}`,
    background: COLOR_RE.test(source.background) ? source.background : '#000000',
    stroke: COLOR_RE.test(source.stroke) ? source.stroke : '#ffffff',
    fill: COLOR_RE.test(source.fill) ? source.fill : '#ffffff',
    builtIn: false,
  };
}

/** Small local store for user-created palettes. */
export class PaletteStore {
  constructor(storage = globalThis.localStorage ?? null) {
    this.storage = storage;
    this.custom = this.load();
    this.lastError = null;
  }

  load() {
    if (!this.storage) return [];
    try {
      const raw = this.storage.getItem(PALETTE_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .slice(0, CUSTOM_LIMIT)
        .map((entry, index) => sanitizePalette(entry, index))
        .filter((entry) => entry.name);
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return [];
    }
  }

  entries() {
    return [
      ...PALETTES.map((palette) => ({ ...palette, builtIn: true })),
      ...this.custom,
    ];
  }

  get(id) {
    return this.entries().find((palette) => palette.id === id) ?? null;
  }

  isCustom(id) {
    return this.custom.some((palette) => palette.id === id);
  }

  save(name, { background, stroke, fill } = {}) {
    const cleanName = String(name ?? '').trim();
    if (!cleanName) throw new Error('Palette name required');
    const next = sanitizePalette({
      name: cleanName,
      background,
      stroke,
      fill,
      id: `custom-${Date.now().toString(36)}-${this.custom.length + 1}`,
    }, this.custom.length);
    const existing = this.custom.findIndex((palette) => palette.name.toLowerCase() === next.name.toLowerCase());
    if (existing >= 0) this.custom[existing] = { ...next, id: this.custom[existing].id };
    else this.custom.unshift(next);
    this.custom = this.custom.slice(0, CUSTOM_LIMIT);
    this.persist();
    return existing >= 0 ? this.custom[existing] : next;
  }

  delete(id) {
    const index = this.custom.findIndex((palette) => palette.id === id);
    if (index < 0) return false;
    this.custom.splice(index, 1);
    this.persist();
    return true;
  }

  persist() {
    if (!this.storage) return;
    try {
      this.storage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(this.custom));
      this.lastError = null;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
    }
  }
}
