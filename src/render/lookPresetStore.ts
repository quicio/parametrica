/** Local, user-authored visual Looks. */

import { OVERLAYS } from '../domain/overlays.ts';
import type { UserLook } from '../domain/lookPresets.ts';
import type { StorageLike } from '../core/persistence.ts';

export { applyUserLookToView } from '../domain/lookPresets.ts';

export const LOOKS_STORAGE_KEY = 'parametrica.looks.v1';
export const LOOKS_VERSION = 1;
const COLOR_METRICS = ['auto', 'height', 'radius', 'curvature', 'arc'];

export interface StoredLook extends UserLook {
  id: string;
  name: string;
}

export type LookSaveResult =
  | { ok: true; look: StoredLook }
  | { ok: false; error: string };

export function sanitizeUserLook(raw: unknown, fallbackName = 'Untitled look'): StoredLook | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const name = typeof source.name === 'string' ? source.name.trim().slice(0, 60) : '';
  if (!name) return null;
  const modes = Array.isArray(source.modes)
    ? [...new Set(source.modes.filter((mode): mode is string => typeof mode === 'string' && Boolean(mode)))]
    : ['stroke'];
  const overlaySource = source.overlays && typeof source.overlays === 'object'
    ? source.overlays as Record<string, unknown>
    : {};
  const overlays: Record<string, boolean> = {};
  for (const overlay of OVERLAYS) overlays[overlay.id] = Boolean(overlaySource[overlay.id]);
  const passOpacity: Record<string, number> = {};
  const passSource = source.passOpacity && typeof source.passOpacity === 'object'
    ? source.passOpacity as Record<string, unknown>
    : {};
  for (const [id, value] of Object.entries(passSource)) {
    const number = Number(value);
    if (Number.isFinite(number)) passOpacity[id] = Math.max(0, Math.min(1, number));
  }
  return {
    id: typeof source.id === 'string' && source.id ? source.id : slug(name),
    name: name || fallbackName,
    modes: modes.length ? modes : ['stroke'],
    overlays,
    colorMetric: COLOR_METRICS.includes(source.colorMetric as string) ? source.colorMetric as string : 'auto',
    guides: source.guides !== false,
    passOpacity,
  };
}

export class LookPresetStore {
  storage: StorageLike | null;
  reservedNames: Set<string>;
  looks: StoredLook[];

  constructor(storage: StorageLike | null = globalThis.localStorage ?? null, { reservedNames = [] }: { reservedNames?: string[] } = {}) {
    this.storage = storage;
    this.reservedNames = new Set(reservedNames);
    this.looks = this.#load();
  }

  list(): StoredLook[] {
    return [...this.looks].sort((a, b) => a.name.localeCompare(b.name));
  }

  get(id: string): StoredLook | null {
    return this.looks.find((look) => look.id === id) ?? null;
  }

  findByName(name: string): StoredLook | null {
    const normalized = String(name ?? '').trim().toLowerCase();
    return this.looks.find((look) => look.name.toLowerCase() === normalized) ?? null;
  }

  save(name: string, view: unknown): LookSaveResult {
    const clean = String(name ?? '').trim();
    if (!clean) return { ok: false, error: 'Look name required' };
    if (this.reservedNames.has(clean)) {
      return { ok: false, error: `"${clean}" is a built-in look` };
    }
    const existing = this.findByName(clean);
    const viewSource = view && typeof view === 'object' ? view as Record<string, unknown> : {};
    const look = sanitizeUserLook({
      ...viewSource,
      id: existing?.id ?? uniqueId(clean, this.looks),
      name: clean,
    });
    if (!look) return { ok: false, error: 'Look could not be saved' };
    this.looks = existing
      ? this.looks.map((entry) => (entry.id === existing.id ? look : entry))
      : [...this.looks, look];
    this.#persist();
    return { ok: true, look };
  }

  remove(id: string): boolean {
    const before = this.looks.length;
    this.looks = this.looks.filter((look) => look.id !== id);
    if (this.looks.length === before) return false;
    this.#persist();
    return true;
  }

  #load(): StoredLook[] {
    try {
      const raw = this.storage?.getItem(LOOKS_STORAGE_KEY);
      if (!raw) return [];
      const data: unknown = JSON.parse(raw);
      if (!data || typeof data !== 'object'
        || (data as { version?: number }).version !== LOOKS_VERSION
        || !Array.isArray((data as { looks?: unknown }).looks)) return [];
      return ((data as { looks: unknown[] }).looks)
        .map((look) => sanitizeUserLook(look))
        .filter((look): look is StoredLook => Boolean(look));
    } catch {
      return [];
    }
  }

  #persist(): boolean {
    try {
      this.storage?.setItem(LOOKS_STORAGE_KEY, JSON.stringify({
        version: LOOKS_VERSION,
        looks: this.looks,
      }));
      return true;
    } catch {
      return false;
    }
  }
}

function slug(value: unknown): string {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'look';
}

function uniqueId(name: string, looks: ReadonlyArray<StoredLook>): string {
  const base = slug(name);
  let id = base;
  let suffix = 2;
  while (looks.some((look) => look.id === id)) id = `${base}-${suffix++}`;
  return id;
}
