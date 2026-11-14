/**
 * presets/PresetManager.ts — v2 preset persistence & sharing.
 *
 *  - Built-in mathematical presets (read-only factories).
 *  - User presets (full GlyphDocuments) in localStorage.
 *  - Workspace metadata: favorites, recents and persisted user previews.
 *  - JSON documents are the share format; v1 presets migrate
 *    automatically via sanitizeDocument().
 */

import { BUILT_IN_PRESETS } from './builtins.ts';
import { CATEGORY_USER, PRESET_CATEGORIES, presetInfo } from './catalog.ts';
import type { DocumentShape } from '../core/documentTypes.ts';
import type { StorageLike } from '../core/persistence.ts';

type Rec = Record<string, unknown>;
export interface PresetEntry {
  name: string;
  builtIn: boolean;
  category: string;
  description: string;
  tags: string[];
  generator: string;
}
export interface PresetCategoryChip {
  id: string;
  label: string;
  hint: string;
  count: number;
}
export interface PreviewCacheEntry { hash: string; dataUrl: string }
export interface PresetManagerOptions {
  repository?: PersistenceRepository;
  renderPreview?: ((document: DocumentShape, options?: { size: number }) => string | null) | null;
}
export interface PresetParseResult { name: string; document: DocumentShape }
import { PREVIEW_MAX_CHARS, previewKey } from './preview.ts';
import { sanitizeDocument, createDocument, APP_ID, DOCUMENT_VERSION } from '../core/document.ts';
import { PersistenceRepository } from '../core/persistence.ts';

const STORAGE_KEY = 'parametrica.presets.v0';
export const META_STORAGE_KEY = 'parametrica.presets.meta.v1';
export const META_VERSION = 1;
export const RECENT_LIMIT = 8;

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isPngDataUrl(value: unknown): value is string {
  return typeof value === 'string'
    && value.startsWith('data:image/png;base64,')
    && value.length <= PREVIEW_MAX_CHARS;
}

export class PresetManager {
  #generatorCache = new Map<string, string>();
  #favorites = new Set<string>();
  #recent: Array<{ name: string; at: number }> = [];
  #previews = new Map<string, PreviewCacheEntry>();
  #largePreviews = new Map<string, PreviewCacheEntry>();
  repository: PersistenceRepository;
  storage: StorageLike | null;
  renderPreview: ((document: DocumentShape, options?: { size: number }) => string | null) | null;
  user: Record<string, DocumentShape>;
  lastMetaError: string | null = null;
  lastError: string | null = null;
  lastQuotaError: string | null = null;

  constructor(storage: StorageLike | null = globalThis.localStorage ?? null, options: PresetManagerOptions = {}) {
    this.repository = options.repository ?? new PersistenceRepository(storage);
    this.storage = this.repository.storage;
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
  entries(): PresetEntry[] {
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
      const doc = this.user[name]!;
      return {
        name,
        builtIn: false,
        category: CATEGORY_USER.id,
        description: 'Saved from this workspace.',
        tags: ['user', doc.generator?.id ?? doc.layers?.find((layer) => layer?.generator?.id)?.generator?.id ?? ''],
        generator: doc.generator?.id ?? doc.layers?.find((layer) => layer?.generator?.id)?.generator?.id ?? 'unknown',
      };
    });
    return [...builtIns, ...user];
  }

  /** Category chips with live counts. Empty categories are hidden. */
  categories(): PresetCategoryChip[] {
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
  search(query: unknown): PresetEntry[] {
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

  isFavorite(name: string): boolean {
    return this.#favorites.has(name);
  }

  /** Toggle a favorite without applying the preset. Returns the new state. */
  toggleFavorite(name: string): boolean {
    if (!this.#isKnown(name)) return false;
    if (this.#favorites.has(name)) this.#favorites.delete(name);
    else this.#favorites.add(name);
    this.#persistMeta();
    return this.#favorites.has(name);
  }

  favoriteEntries(entries: PresetEntry[] = this.entries()): PresetEntry[] {
    return entries.filter((entry) => this.#favorites.has(entry.name));
  }

  /** Record a successful preset application. Returns false for unknown names. */
  markUsed(name: string, at = Date.now()): boolean {
    if (!this.#isKnown(name)) return false;
    const timestamp = Number.isFinite(at) ? at : Date.now();
    this.#recent = [
      { name, at: timestamp },
      ...this.#recent.filter((item) => item.name !== name),
    ].slice(0, RECENT_LIMIT);
    this.#persistMeta();
    return true;
  }

  recentEntries(entries: PresetEntry[] = this.entries()): PresetEntry[] {
    const byName = new Map(entries.map((entry) => [entry.name, entry]));
    return this.#recent
      .map((item) => byName.get(item.name))
      .filter((entry): entry is PresetEntry => Boolean(entry));
  }

  /* ———————— previews ———————— */

  /** Return a cached preview only when it still matches the preset document. */
  preview(name: string): string | null {
    const cached = this.#previews.get(name);
    if (!cached) return null;
    const doc = this.get(name);
    if (!doc) return null;
    return cached.hash === previewKey(doc) ? cached.dataUrl : null;
  }

  /** Generate a preview on demand and cache it. Browser renderer is injected. */
  ensurePreview(name: string): string | null {
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

  /**
   * Generate a session-only preview at a larger size. Never persisted.
   * Used by Start With for composition cards.
   */
  ensureLargePreview(name: string, size: number): string | null {
    const doc = this.get(name);
    if (!doc || typeof this.renderPreview !== 'function') return null;
    const key = `${name}\u0000${size}`;
    const hash = previewKey(doc, { size });
    const cached = this.#largePreviews.get(key);
    if (cached?.hash === hash) return cached.dataUrl;
    let dataUrl;
    try {
      dataUrl = this.renderPreview(doc, { size });
    } catch {
      dataUrl = null;
    }
    if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,') || dataUrl.length > 200_000) {
      this.#largePreviews.delete(key);
      return null;
    }
    this.#largePreviews.set(key, { hash, dataUrl });
    return dataUrl;
  }

  /* ———————— catalog helpers ———————— */

  #generatorFor(name: string): string {
    if (!this.#generatorCache.has(name)) {
      try {
        const doc = BUILT_IN_PRESETS[name]!();
        const generatorId = doc.generator?.id
          ?? doc.layers?.find((layer) => layer?.generator?.id)?.generator?.id
          ?? 'unknown';
        this.#generatorCache.set(name, generatorId);
      } catch {
        this.#generatorCache.set(name, 'unknown');
      }
    }
    return this.#generatorCache.get(name) ?? 'unknown';
  }

  #isKnown(name: string): boolean {
    return this.isBuiltIn(name) || Object.prototype.hasOwnProperty.call(this.user, name);
  }

  #load(): Record<string, DocumentShape> {
    try {
      const raw = this.repository.read(STORAGE_KEY) as Rec | null;
      if (!raw) {
        this.lastError = this.repository.lastError;
        return {};
      }
      const out: Record<string, DocumentShape> = {};
      for (const [name, doc] of Object.entries(raw)) {
        const clean = sanitizeDocument(doc);
        if (clean) out[name] = { ...clean, name };
      }
      return out;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return {};
    }
  }

  #persist(): void {
    const ok = this.repository.write(STORAGE_KEY, this.user);
    this.lastError = ok ? null : this.repository.lastError ?? 'preset storage unavailable';
    this.lastQuotaError = ok ? null : this.repository.lastQuotaError;
  }

  #loadMeta(): void {
    try {
      const data = this.repository.read(META_STORAGE_KEY) as Rec | null;
      if (!data) {
        this.lastMetaError = this.repository.lastError;
        return;
      }
      if (typeof data !== 'object') return;
      const known = new Set(this.names());
      this.#favorites = new Set(
        (Array.isArray(data.favorites) ? data.favorites : [])
          .filter((name) => typeof name === 'string' && known.has(name)),
      );
      const seen = new Set<string>();
      this.#recent = (Array.isArray(data.recent) ? data.recent : [])
        .filter((item): item is { name: string; at: number } => {
          if (!item || typeof item !== 'object') return false;
          const entry = item as Rec;
          if (typeof entry.name !== 'string' || !Number.isFinite(entry.at) || !known.has(entry.name)) return false;
          if (seen.has(entry.name)) return false;
          seen.add(entry.name);
          return true;
        })
        .map((item) => ({ name: item.name, at: Number(item.at) }))
        .sort((a, b) => b.at - a.at)
        .slice(0, RECENT_LIMIT);
      if (data.previews && typeof data.previews === 'object') {
        for (const [name, entry] of Object.entries(data.previews)) {
          if (this.isBuiltIn(name) || !known.has(name)) continue;
          if (!entry || typeof entry !== 'object') continue;
          const preview = entry as Rec;
          if (typeof preview.hash !== 'string' || !isPngDataUrl(preview.dataUrl)) continue;
          this.#previews.set(name, { hash: preview.hash, dataUrl: preview.dataUrl });
        }
      }
    } catch (error) {
      this.lastMetaError = error instanceof Error ? error.message : 'invalid preset metadata';
    }
  }

  #persistMeta(): void {
    try {
      const previews: Record<string, PreviewCacheEntry> = {};
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
      const ok = this.repository.write(META_STORAGE_KEY, payload);
      this.lastMetaError = ok
        ? null
        : this.repository.lastError ?? 'preset metadata storage unavailable';
    } catch (error) {
      this.lastMetaError = error instanceof Error ? error.message : 'preset metadata storage unavailable';
    }
  }

  /* ———————— preset documents ———————— */

  names(): string[] {
    return [...Object.keys(BUILT_IN_PRESETS), ...Object.keys(this.user).sort()];
  }

  isBuiltIn(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(BUILT_IN_PRESETS, name);
  }

  /** @returns {object|null} fresh document instance */
  get(name: string): DocumentShape | null {
    if (this.isBuiltIn(name)) return BUILT_IN_PRESETS[name]!();
    const doc = this.user[name];
    return doc ? sanitizeDocument(doc) : null;
  }

  save(name: unknown, document: unknown): string {
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

  delete(name: string): boolean {
    if (this.isBuiltIn(name) || !(name in this.user)) return false;
    delete this.user[name];
    this.#favorites.delete(name);
    this.#recent = this.#recent.filter((item) => item.name !== name);
    this.#previews.delete(name);
    this.#persist();
    this.#persistMeta();
    return true;
  }

  serialize(name: unknown, document: unknown): string {
    const doc = sanitizeDocument(document) ?? createDocument('parametric');
    return JSON.stringify({ app: APP_ID, ...doc, name: String(name ?? doc.name ?? 'untitled') }, null, 2);
  }

  /**
   * Parse any preset JSON: current Parametrica document, legacy glyph-lab v2,
   * or v1 legacy. The dual-format read lives in sanitizeDocument(); this
   * wrapper just propagates the name.
   * @returns {{name: string, document: object}}
   */
  parse(json: unknown): PresetParseResult {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data || typeof data !== 'object') throw new Error('Invalid preset JSON');
    const document = sanitizeDocument(data);
    if (!document) throw new Error('Unrecognized preset format');
    return { name: typeof data.name === 'string' ? data.name : document.name, document };
  }
}

export { DOCUMENT_VERSION };
