/** Artboard presets and curated color pairs. */

import type { StorageLike } from '../core/persistence.ts';

export interface ArtboardPreset {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface Palette {
  id: string;
  name: string;
  background: string;
  stroke: string;
  fill: string;
}

export interface CustomPalette extends Palette {
  builtIn: false;
}

export interface StoredPalette extends Palette {
  builtIn: boolean;
}

export const ARTBOARD_PRESETS: readonly ArtboardPreset[] = [
  { id: 'square', name: 'Square', width: 900, height: 900 },
  { id: 'portrait', name: 'Portrait 4:5', width: 1080, height: 1350 },
  { id: 'landscape', name: 'Landscape 16:9', width: 1600, height: 900 },
  { id: 'a4-portrait', name: 'A4 Portrait', width: 1240, height: 1754 },
  { id: 'a4-landscape', name: 'A4 Landscape', width: 1754, height: 1240 },
];

export const PALETTES: readonly Palette[] = [
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

export function paletteById(id: string): Palette {
  return PALETTES.find((palette) => palette.id === id) ?? PALETTES[0] as Palette;
}

export function artboardPresetById(id: string): ArtboardPreset {
  return ARTBOARD_PRESETS.find((preset) => preset.id === id) ?? ARTBOARD_PRESETS[0] as ArtboardPreset;
}

export const PALETTE_STORAGE_KEY = 'parametrica.palettes.v1';
const CUSTOM_LIMIT = 24;
const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function sanitizePalette(raw: unknown, fallbackIndex = 0): CustomPalette {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const name = String(source.name ?? '').trim().slice(0, 40);
  return {
    id: typeof source.id === 'string' && source.id.startsWith('custom-')
      ? source.id
      : `custom-${Date.now().toString(36)}-${fallbackIndex}`,
    name: name || `Palette ${fallbackIndex + 1}`,
    background: COLOR_RE.test(source.background as string) ? source.background as string : '#000000',
    stroke: COLOR_RE.test(source.stroke as string) ? source.stroke as string : '#ffffff',
    fill: COLOR_RE.test(source.fill as string) ? source.fill as string : '#ffffff',
    builtIn: false,
  };
}

export interface NewPalette {
  background?: unknown;
  stroke?: unknown;
  fill?: unknown;
}

/** Small local store for user-created palettes. */
export class PaletteStore {
  storage: StorageLike | null;
  custom: CustomPalette[];
  lastError: string | null;

  constructor(storage: StorageLike | null = globalThis.localStorage ?? null) {
    this.storage = storage;
    this.custom = this.load();
    this.lastError = null;
  }

  load(): CustomPalette[] {
    if (!this.storage) return [];
    try {
      const raw = this.storage.getItem(PALETTE_STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
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

  entries(): StoredPalette[] {
    return [
      ...PALETTES.map((palette) => ({ ...palette, builtIn: true })),
      ...this.custom,
    ];
  }

  get(id: string): StoredPalette | null {
    return this.entries().find((palette) => palette.id === id) ?? null;
  }

  isCustom(id: string): boolean {
    return this.custom.some((palette) => palette.id === id);
  }

  save(name: string, { background, stroke, fill }: NewPalette = {}): CustomPalette {
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
    if (existing >= 0) {
      const current = this.custom[existing];
      if (current) this.custom[existing] = { ...next, id: current.id };
    } else {
      this.custom.unshift(next);
    }
    this.custom = this.custom.slice(0, CUSTOM_LIMIT);
    this.persist();
    return existing >= 0 ? this.custom[existing] ?? next : next;
  }

  delete(id: string): boolean {
    const index = this.custom.findIndex((palette) => palette.id === id);
    if (index < 0) return false;
    this.custom.splice(index, 1);
    this.persist();
    return true;
  }

  persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(this.custom));
      this.lastError = null;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
    }
  }
}
