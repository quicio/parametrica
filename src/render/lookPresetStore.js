/**
 * render/lookPresetStore.js — local, user-authored visual Looks.
 *
 * A Look stores view-level appearance only. Geometry, style, units, camera,
 * artboard and fabrication state are never part of the record.
 */

import { OVERLAYS } from '../domain/overlays.js';

export { applyUserLookToView } from '../domain/lookPresets.js';

export const LOOKS_STORAGE_KEY = 'parametrica.looks.v1';
export const LOOKS_VERSION = 1;
const COLOR_METRICS = ['auto', 'height', 'radius', 'curvature', 'arc'];

export function sanitizeUserLook(raw, fallbackName = 'Untitled look') {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 60) : '';
  if (!name) return null;
  const modes = Array.isArray(raw.modes)
    ? [...new Set(raw.modes.filter((mode) => typeof mode === 'string' && mode))]
    : ['stroke'];
  const overlays = {};
  for (const overlay of OVERLAYS) overlays[overlay.id] = Boolean(raw.overlays?.[overlay.id]);
  const passOpacity = {};
  for (const [id, value] of Object.entries(raw.passOpacity ?? {})) {
    const number = Number(value);
    if (Number.isFinite(number)) passOpacity[id] = Math.max(0, Math.min(1, number));
  }
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : slug(name),
    name: name || fallbackName,
    modes: modes.length ? modes : ['stroke'],
    overlays,
    colorMetric: COLOR_METRICS.includes(raw.colorMetric) ? raw.colorMetric : 'auto',
    guides: raw.guides !== false,
    passOpacity,
  };
}

export class LookPresetStore {
  constructor(storage = globalThis.localStorage ?? null, { reservedNames = [] } = {}) {
    this.storage = storage;
    this.reservedNames = new Set(reservedNames);
    this.looks = this.#load();
  }

  list() {
    return [...this.looks].sort((a, b) => a.name.localeCompare(b.name));
  }

  get(id) {
    return this.looks.find((look) => look.id === id) ?? null;
  }

  findByName(name) {
    const normalized = String(name ?? '').trim().toLowerCase();
    return this.looks.find((look) => look.name.toLowerCase() === normalized) ?? null;
  }

  save(name, view) {
    const clean = String(name ?? '').trim();
    if (!clean) return { ok: false, error: 'Look name required' };
    if (this.reservedNames.has(clean)) {
      return { ok: false, error: `"${clean}" is a built-in look` };
    }
    const existing = this.findByName(clean);
    const look = sanitizeUserLook({
      ...view,
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

  remove(id) {
    const before = this.looks.length;
    this.looks = this.looks.filter((look) => look.id !== id);
    if (this.looks.length === before) return false;
    this.#persist();
    return true;
  }

  #load() {
    try {
      const raw = this.storage?.getItem(LOOKS_STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!data || data.version !== LOOKS_VERSION || !Array.isArray(data.looks)) return [];
      return data.looks.map((look) => sanitizeUserLook(look)).filter(Boolean);
    } catch {
      return [];
    }
  }

  #persist() {
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

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'look';
}

function uniqueId(name, looks) {
  const base = slug(name);
  let id = base;
  let suffix = 2;
  while (looks.some((look) => look.id === id)) id = `${base}-${suffix++}`;
  return id;
}
