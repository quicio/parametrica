/**
 * notebook.js — durable, reproducible checkpoints (version 1).
 *
 * Pure model with injected storage. DOM-free: thumbnails are validated
 * data URLs, never generated here. The browser supplies localStorage.
 *
 * Contract: openspec/specs/lab-notebook/spec.md
 */

import { sanitizeDocument, attachLayerAliases } from '../core/document.js';
import { documentDiff, descriptorDiff } from './diff.js';

export const NOTEBOOK_VERSION = 1;
export const NOTEBOOK_STORAGE_KEY = 'parametrica.notebook.v1';
export const MAX_CHECKPOINTS = 50;
export const MAX_THUMBNAIL_CHARS = 65_536;
export const MAX_NAME = 80;
export const MAX_NOTES = 2_000;
export const MAX_TAGS = 12;
export const MAX_TAG = 24;
export const MAX_PARENTS = 4;
export const MAX_GENERATION = 1_000_000;

export class Notebook {
  constructor({
    storage = globalThis.localStorage ?? null,
    now = () => Date.now(),
    limit = MAX_CHECKPOINTS,
  } = {}) {
    this.storage = storage;
    this.now = now;
    this.limit = Math.max(1, Math.floor(limit));
    this.items = [];
    this.lastError = null;
    this.load();
  }

  load() {
    this.items = [];
    this.lastError = null;
    if (!this.storage) return this.items;
    try {
      const raw = this.storage.getItem(NOTEBOOK_STORAGE_KEY);
      if (!raw) return this.items;
      const data = JSON.parse(raw);
      const list = Array.isArray(data) ? data : data?.checkpoints;
      if (!Array.isArray(list)) return this.items;
      const seen = new Set();
      for (const entry of list) {
        const cp = sanitizeCheckpoint(entry, this.now);
        if (!cp || seen.has(cp.id)) continue;
        seen.add(cp.id);
        this.items.push(cp);
      }
      // Drop dangling parents and enforce the limit.
      const ids = new Set(this.items.map((cp) => cp.id));
      for (const cp of this.items) {
        if (cp.parentId && !ids.has(cp.parentId)) cp.parentId = null;
        cp.parents = cp.parents.filter((parent) => ids.has(parent));
      }
      this.items = this.items.slice(-this.limit);
      const kept = new Set(this.items.map((cp) => cp.id));
      for (const cp of this.items) {
        if (cp.parentId && !kept.has(cp.parentId)) cp.parentId = null;
        cp.parents = cp.parents.filter((parent) => kept.has(parent));
      }
    } catch (error) {
      this.lastError = error.message;
      this.items = [];
    }
    return this.items;
  }

  persist() {
    this.lastError = null;
    if (!this.storage) return false;
    try {
      this.storage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(this.toJSON()));
      return true;
    } catch (error) {
      this.lastError = error.message;
      return false;
    }
  }

  get(id) {
    return this.items.find((cp) => cp.id === id) ?? null;
  }

  latest() {
    return this.items[this.items.length - 1] ?? null;
  }

  add({
    name,
    document,
    descriptor,
    thumbnail = null,
    parentId = null,
    parents = [],
    generation = 0,
    tags = [],
    notes = '',
    id = null,
    createdAt = null,
  }) {
    const cp = sanitizeCheckpoint({
      id: id ?? makeId(),
      name,
      createdAt: createdAt ?? this.now(),
      document,
      descriptor,
      thumbnail,
      parentId,
      parents,
      generation,
      tags,
      notes,
    }, this.now);
    if (!cp) throw new Error('Invalid checkpoint');
    if (cp.parentId && !this.get(cp.parentId)) cp.parentId = null;
    this.items.push(cp);
    const known = new Set(this.items.map((item) => item.id));
    cp.parents = cp.parents.filter((parent) => known.has(parent));
    for (const item of this.items) {
      item.parents = item.parents.filter((parent) => known.has(parent));
    }
    if (this.items.length > this.limit) {
      this.items = this.items.slice(-this.limit);
      const ids = new Set(this.items.map((item) => item.id));
      for (const item of this.items) {
        if (item.parentId && !ids.has(item.parentId)) item.parentId = null;
        item.parents = item.parents.filter((parent) => ids.has(parent));
      }
    }
    this.persist();
    return cp;
  }

  update(id, patch = {}) {
    const cp = this.get(id);
    if (!cp) return null;
    if (typeof patch.name === 'string') cp.name = cleanText(patch.name, MAX_NAME) || 'Untitled';
    if (typeof patch.notes === 'string') cp.notes = cleanText(patch.notes, MAX_NOTES);
    if (Array.isArray(patch.tags)) cp.tags = cleanTags(patch.tags);
    this.persist();
    return cp;
  }

  remove(id) {
    const index = this.items.findIndex((cp) => cp.id === id);
    if (index < 0) return false;
    this.items.splice(index, 1);
    for (const cp of this.items) {
      if (cp.parentId === id) cp.parentId = null;
      cp.parents = cp.parents.filter((parent) => parent !== id);
    }
    this.persist();
    return true;
  }

  compare(aId, bId) {
    const a = this.get(aId);
    const b = this.get(bId);
    if (!a || !b) return null;
    return {
      a,
      b,
      parameterDiff: documentDiff(a.document, b.document),
      descriptorDiff: descriptorDiff(a.descriptor, b.descriptor),
    };
  }

  toJSON() {
    return { version: NOTEBOOK_VERSION, checkpoints: this.items };
  }

  exportJSON() {
    return JSON.stringify({
      app: 'parametrica',
      ...this.toJSON(),
    }, null, 2);
  }

  importJSON(text, { replace = false } = {}) {
    const data = typeof text === 'string' ? JSON.parse(text) : text;
    const list = Array.isArray(data) ? data : data?.checkpoints;
    if (!Array.isArray(list)) throw new Error('Invalid notebook JSON');
    if (replace) this.items = [];

    let added = 0;
    let skipped = 0;
    const existing = new Set(this.items.map((cp) => cp.id));
    for (const entry of list) {
      const cp = sanitizeCheckpoint(entry, this.now);
      if (!cp || existing.has(cp.id)) {
        skipped++;
        continue;
      }
      this.items.push(cp);
      existing.add(cp.id);
      added++;
    }

    const ids = new Set(this.items.map((cp) => cp.id));
    for (const cp of this.items) {
      if (cp.parentId && !ids.has(cp.parentId)) cp.parentId = null;
      cp.parents = cp.parents.filter((parent) => ids.has(parent));
    }
    if (this.items.length > this.limit) this.items = this.items.slice(-this.limit);
    const kept = new Set(this.items.map((item) => item.id));
    for (const item of this.items) {
      if (item.parentId && !kept.has(item.parentId)) item.parentId = null;
      item.parents = item.parents.filter((parent) => kept.has(parent));
    }
    this.persist();
    return { added, skipped };
  }
}

/** Validate and clone one checkpoint; returns null when invalid. */
export function sanitizeCheckpoint(raw, now = () => Date.now()) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  if (!id) return null;
  const document = sanitizeDocument(raw.document);
  if (!document) return null;
  const descriptor = raw.descriptor;
  if (!descriptor || typeof descriptor !== 'object' || descriptor.version !== 1) return null;

  const createdAt = Number(raw.createdAt);
  const name = cleanText(raw.name, MAX_NAME) || 'Untitled';
  const thumbnail = isPngDataUrl(raw.thumbnail) && raw.thumbnail.length <= MAX_THUMBNAIL_CHARS
    ? raw.thumbnail
    : null;
  const parentId = typeof raw.parentId === 'string' && raw.parentId ? raw.parentId : null;
  const generation = Number.isFinite(Number(raw.generation))
    ? Math.min(MAX_GENERATION, Math.max(0, Math.floor(Number(raw.generation))))
    : 0;
  const parents = [...new Set(
    (Array.isArray(raw.parents) ? raw.parents : [])
      .filter((parent) => typeof parent === 'string' && parent && parent !== id),
  )].slice(0, MAX_PARENTS);
  return {
    version: NOTEBOOK_VERSION,
    id,
    name,
    createdAt: Number.isFinite(createdAt) ? createdAt : now(),
    document: attachLayerAliases(structuredClone(document)),
    descriptor: structuredClone(descriptor),
    thumbnail,
    parentId,
    parents,
    generation,
    tags: cleanTags(raw.tags),
    notes: cleanText(raw.notes, MAX_NOTES),
  };
}

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  const out = [];
  for (const tag of tags) {
    const clean = cleanText(tag, MAX_TAG);
    if (clean && !out.includes(clean)) out.push(clean);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function isPngDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image/png;base64,');
}

let idCounter = 0;
function makeId() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  idCounter++;
  return `cp-${Date.now().toString(36)}-${idCounter}`;
}
