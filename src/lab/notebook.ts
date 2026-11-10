/**
 * notebook.js — durable, reproducible checkpoints (version 1).
 *
 * Pure model with injected storage. DOM-free: thumbnails are validated
 * data URLs, never generated here. The browser supplies localStorage.
 *
 * Contract: openspec/specs/lab-notebook/spec.md
 */

import { sanitizeDocument, attachLayerAliases } from '../core/document.ts';
import { documentDiff, descriptorDiff } from './diff.ts';
import { LocalNotebookRepository, migrateNotebook } from './notebookRepository.ts';
import type { NotebookRepository } from './notebookRepository.ts';
import type { StorageLike } from '../core/persistence.ts';
import type { DocumentShape } from '../core/documentTypes.ts';
import type { FigureDescriptor } from './descriptor.ts';
import type { DiffEntry } from './diff.ts';

type Rec = Record<string, unknown>;
export interface NotebookProject {
  id: string;
  name: string;
  createdAt: number;
  order: number;
}
export interface NotebookSeries {
  id: string;
  projectId: string;
  name: string;
  createdAt: number;
  order: number;
}
export interface Checkpoint {
  version: number;
  id: string;
  name: string;
  createdAt: number;
  document: DocumentShape;
  descriptor: FigureDescriptor;
  thumbnail: string | null;
  parentId: string | null;
  parents: string[];
  generation: number;
  tags: string[];
  notes: string;
  projectId: string;
  seriesId: string | null;
  order: number;
}
export interface NotebookOptions {
  storage?: StorageLike | null;
  repository?: NotebookRepository | null;
  now?: () => number;
  limit?: number;
}
export interface CheckpointInput {
  name: unknown;
  document: unknown;
  descriptor: unknown;
  thumbnail?: unknown;
  parentId?: unknown;
  parents?: unknown;
  generation?: unknown;
  tags?: unknown;
  notes?: unknown;
  id?: unknown;
  createdAt?: unknown;
  projectId?: unknown;
  seriesId?: unknown;
  order?: unknown;
}
export interface NotebookComparison {
  a: Checkpoint;
  b: Checkpoint;
  parameterDiff: DiffEntry[];
  descriptorDiff: DiffEntry[];
}

export const NOTEBOOK_VERSION = 2;
export const NOTEBOOK_STORAGE_KEY = 'parametrica.notebook.v1';
export const INBOX_PROJECT_ID = 'inbox';
export const MAX_CHECKPOINTS = 50;
export const MAX_PROJECTS = 32;
export const MAX_SERIES = 200;
export const MAX_THUMBNAIL_CHARS = 65_536;
export const MAX_NAME = 80;
export const MAX_NOTES = 2_000;
export const MAX_TAGS = 12;
export const MAX_TAG = 24;
export const MAX_PARENTS = 4;
export const MAX_GENERATION = 1_000_000;

export class Notebook {
  storage: StorageLike | null;
  repository: NotebookRepository;
  now: () => number;
  limit: number;
  items: Checkpoint[];
  projects: NotebookProject[];
  series: NotebookSeries[];
  lastError: string | null;

  constructor({
    storage = globalThis.localStorage ?? null,
    repository = null,
    now = () => Date.now(),
    limit = MAX_CHECKPOINTS,
  }: NotebookOptions = {}) {
    this.storage = storage;
    this.repository = repository ?? new LocalNotebookRepository(storage, NOTEBOOK_STORAGE_KEY);
    this.now = now;
    this.limit = Math.max(1, Math.floor(limit));
    this.items = [];
    this.projects = [];
    this.series = [];
    this.lastError = null;
    this.load();
    this.ensureInbox();
  }

  load(): Checkpoint[] {
    this.items = [];
    this.projects = [];
    this.series = [];
    this.lastError = null;
    try {
      const raw = this.repository.load();
      if (this.repository.lastError) throw new Error(this.repository.lastError);
      if (!raw) return this.items;
      const data = migrateNotebook(raw);
      const list = data.checkpoints;
      const rawProjects = data.projects;
      const rawSeries = data.series;
      this.projects = uniqueById(rawProjects
        .map((project, index) => sanitizeProject(project, index, this.now))
        .filter(Boolean));
      this.ensureInbox();
      this.projects = this.projects.slice(0, MAX_PROJECTS);
      const projectIds = new Set(this.projects.map((project) => project.id));
      this.series = uniqueById(rawSeries
        .map((entry, index) => sanitizeSeries(entry, index, this.now))
        .filter((entry) => entry && projectIds.has(entry.projectId)))
        .slice(0, MAX_SERIES);

      const seen = new Set();
      for (const entry of list) {
        const cp = sanitizeCheckpoint(entry, this.now);
        if (!cp || seen.has(cp.id)) continue;
        seen.add(cp.id);
        this.items.push(cp);
      }
      this.normalizeHierarchy();

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
      this.normalizeHierarchy();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.items = [];
      this.projects = [];
      this.series = [];
    }
    return this.items;
  }

  persist(): boolean {
    this.lastError = null;
    try {
      const ok = this.repository.save(this.toJSON());
      if (ok === false) this.lastError = this.repository.lastError ?? 'notebook storage unavailable';
      return ok !== false;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  get(id: string): Checkpoint | null {
    return this.items.find((cp) => cp.id === id) ?? null;
  }

  latest(): Checkpoint | null {
    return this.items[this.items.length - 1] ?? null;
  }

  /* ———————— projects & series ———————— */

  ensureInbox(): void {
    if (!this.projects.some((project) => project.id === INBOX_PROJECT_ID)) {
      this.projects.unshift({
        id: INBOX_PROJECT_ID,
        name: 'Inbox',
        createdAt: this.now(),
        order: 0,
      });
    }
    this.projects.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  }

  getProject(id: string | null | undefined): NotebookProject | null {
    return this.projects.find((project) => project.id === id) ?? null;
  }

  getSeries(id: string | null | undefined): NotebookSeries | null {
    return this.series.find((entry) => entry.id === id) ?? null;
  }

  seriesFor(projectId: string): NotebookSeries[] {
    return this.series
      .filter((entry) => entry.projectId === projectId)
      .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  }

  projectItems(projectId: string): Checkpoint[] {
    return this.items.filter((cp) => cp.projectId === projectId);
  }

  createProject(name: unknown): NotebookProject | null {
    if (this.projects.length >= MAX_PROJECTS) return null;
    const clean = cleanText(name, MAX_NAME);
    if (!clean) return null;
    const order = Math.max(0, ...this.projects.map((project) => project.order));
    const project = {
      id: `project-${makeId()}`,
      name: clean,
      createdAt: this.now(),
      order: order + 1,
    };
    this.projects.push(project);
    this.persist();
    return project;
  }

  renameProject(id: string, name: unknown): NotebookProject | null {
    const project = this.getProject(id);
    const clean = cleanText(name, MAX_NAME);
    if (!project || !clean) return null;
    project.name = clean;
    this.persist();
    return project;
  }

  removeProject(id: string): boolean {
    if (id === INBOX_PROJECT_ID) return false;
    const index = this.projects.findIndex((project) => project.id === id);
    if (index < 0) return false;
    for (const cp of this.items) {
      if (cp.projectId !== id) continue;
      cp.projectId = INBOX_PROJECT_ID;
      cp.seriesId = null;
    }
    this.series = this.series.filter((entry) => entry.projectId !== id);
    this.projects.splice(index, 1);
    this.persist();
    return true;
  }

  createSeries(projectId: string, name: unknown): NotebookSeries | null {
    const project = this.getProject(projectId);
    const clean = cleanText(name, MAX_NAME);
    if (!project || !clean || this.series.length >= MAX_SERIES) return null;
    const order = Math.max(0, ...this.seriesFor(projectId).map((entry) => entry.order));
    const series = {
      id: `series-${makeId()}`,
      projectId,
      name: clean,
      createdAt: this.now(),
      order: order + 1,
    };
    this.series.push(series);
    this.persist();
    return series;
  }

  renameSeries(id: string, name: unknown): NotebookSeries | null {
    const series = this.getSeries(id);
    const clean = cleanText(name, MAX_NAME);
    if (!series || !clean) return null;
    series.name = clean;
    this.persist();
    return series;
  }

  removeSeries(id: string): boolean {
    const series = this.getSeries(id);
    if (!series) return false;
    for (const cp of this.items) {
      if (cp.seriesId === id) cp.seriesId = null;
    }
    this.series = this.series.filter((entry) => entry.id !== id);
    this.persist();
    return true;
  }

  moveSeries(id: string, projectId: string): NotebookSeries | null {
    const series = this.getSeries(id);
    const project = this.getProject(projectId);
    if (!series || !project) return null;
    series.projectId = projectId;
    for (const cp of this.items) {
      if (cp.seriesId === id) cp.projectId = projectId;
    }
    this.normalizeHierarchy();
    this.persist();
    return series;
  }

  moveCheckpoint(id: string, { projectId, seriesId = null }: { projectId: string; seriesId?: string | null }): Checkpoint | null {
    const cp = this.get(id);
    const project = this.getProject(projectId);
    if (!cp || !project) return null;
    const series = seriesId ? this.getSeries(seriesId) : null;
    cp.projectId = projectId;
    cp.seriesId = series && series.projectId === projectId ? seriesId : null;
    this.persist();
    return cp;
  }

  normalizeHierarchy(): void {
    this.ensureInbox();
    const projectIds = new Set(this.projects.map((project) => project.id));
    this.series = this.series.filter((entry) => projectIds.has(entry.projectId));
    this.series.sort((a, b) => a.projectId.localeCompare(b.projectId)
      || a.order - b.order
      || a.createdAt - b.createdAt);
    const seriesById = new Map(this.series.map((entry) => [entry.id, entry]));
    for (const cp of this.items) {
      if (!projectIds.has(cp.projectId)) cp.projectId = INBOX_PROJECT_ID;
      const series = cp.seriesId ? seriesById.get(cp.seriesId) : null;
      if (!series || series.projectId !== cp.projectId) cp.seriesId = null;
    }
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
    projectId = null,
    seriesId = null,
    order = null,
  }: CheckpointInput): Checkpoint {
    this.ensureInbox();
    const requestedProject = typeof projectId === 'string' ? projectId : null;
    const requestedSeries = typeof seriesId === 'string' ? seriesId : null;
    const targetProject = this.getProject(requestedProject) ? requestedProject! : INBOX_PROJECT_ID;
    const targetSeries = requestedSeries ? this.getSeries(requestedSeries) : null;
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
      projectId: targetProject,
      seriesId: targetSeries && targetSeries.projectId === targetProject ? seriesId : null,
      order,
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
    this.normalizeHierarchy();
    this.persist();
    return cp;
  }

  update(id: string, patch: { name?: unknown; notes?: unknown; tags?: unknown } = {}): Checkpoint | null {
    const cp = this.get(id);
    if (!cp) return null;
    if (typeof patch.name === 'string') cp.name = cleanText(patch.name, MAX_NAME) || 'Untitled';
    if (typeof patch.notes === 'string') cp.notes = cleanText(patch.notes, MAX_NOTES);
    if (Array.isArray(patch.tags)) cp.tags = cleanTags(patch.tags);
    this.persist();
    return cp;
  }

  remove(id: string): boolean {
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

  compare(aId: string, bId: string): NotebookComparison | null {
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

  toJSON(): { version: number; projects: NotebookProject[]; series: NotebookSeries[]; checkpoints: Checkpoint[] } {
    return {
      version: NOTEBOOK_VERSION,
      projects: this.projects,
      series: this.series,
      checkpoints: this.items,
    };
  }

  exportJSON(): string {
    return JSON.stringify({
      app: 'parametrica',
      ...this.toJSON(),
    }, null, 2);
  }

  importJSON(text: unknown, { replace = false }: { replace?: boolean } = {}): { added: number; skipped: number; projectsAdded: number; seriesAdded: number } {
    const data = typeof text === 'string' ? JSON.parse(text) : text;
    const list = Array.isArray(data) ? data : data?.checkpoints;
    if (!Array.isArray(list)) throw new Error('Invalid notebook JSON');
    const rawProjects = Array.isArray(data?.projects) ? data.projects : [];
    const rawSeries = Array.isArray(data?.series) ? data.series : [];
    if (replace) {
      this.items = [];
      this.projects = [];
      this.series = [];
    }

    let projectsAdded = 0;
    let seriesAdded = 0;
    const projectIds = new Set(this.projects.map((project) => project.id));
    for (const raw of rawProjects) {
      const project = sanitizeProject(raw, projectsAdded, this.now);
      if (!project || projectIds.has(project.id)) continue;
      this.projects.push(project);
      projectIds.add(project.id);
      projectsAdded++;
    }
    this.ensureInbox();

    const seriesIds = new Set(this.series.map((entry) => entry.id));
    for (const raw of rawSeries) {
      const series = sanitizeSeries(raw, seriesAdded, this.now);
      if (!series || seriesIds.has(series.id) || !projectIds.has(series.projectId)) continue;
      this.series.push(series);
      seriesIds.add(series.id);
      seriesAdded++;
    }

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
    if (this.projects.length > MAX_PROJECTS) this.projects = this.projects.slice(0, MAX_PROJECTS);
    if (this.series.length > MAX_SERIES) this.series = this.series.slice(0, MAX_SERIES);
    this.normalizeHierarchy();
    this.persist();
    return { added, skipped, projectsAdded, seriesAdded };
  }
}

/** Validate and clone one project. */
export function sanitizeProject(raw: unknown, index = 0, now: () => number = () => Date.now()): NotebookProject | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Rec;
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : null;
  if (!id) return null;
  const createdAt = Number(source.createdAt);
  const order = Number.isFinite(Number(source.order)) ? Math.max(0, Math.floor(Number(source.order))) : index;
  return {
    id,
    name: cleanText(source.name, MAX_NAME) || 'Untitled project',
    createdAt: Number.isFinite(createdAt) ? createdAt : now(),
    order,
  };
}

/** Validate and clone one series. */
export function sanitizeSeries(raw: unknown, index = 0, now: () => number = () => Date.now()): NotebookSeries | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Rec;
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : null;
  const projectId = typeof source.projectId === 'string' && source.projectId ? source.projectId : null;
  if (!id || !projectId) return null;
  const createdAt = Number(source.createdAt);
  const order = Number.isFinite(Number(source.order)) ? Math.max(0, Math.floor(Number(source.order))) : index;
  return {
    id,
    projectId,
    name: cleanText(source.name, MAX_NAME) || 'Untitled series',
    createdAt: Number.isFinite(createdAt) ? createdAt : now(),
    order,
  };
}

/** Validate and clone one checkpoint; returns null when invalid. */
export function sanitizeCheckpoint(raw: unknown, now: () => number = () => Date.now()): Checkpoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Rec;
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : null;
  if (!id) return null;
  const document = sanitizeDocument(source.document);
  if (!document) return null;
  const descriptor = source.descriptor;
  if (!descriptor || typeof descriptor !== 'object' || (descriptor as Rec).version !== 1) return null;

  const createdAt = Number(source.createdAt);
  const name = cleanText(source.name, MAX_NAME) || 'Untitled';
  const thumbnail = isPngDataUrl(source.thumbnail) && source.thumbnail.length <= MAX_THUMBNAIL_CHARS
    ? source.thumbnail
    : null;
  const parentId = typeof source.parentId === 'string' && source.parentId ? source.parentId : null;
  const generation = Number.isFinite(Number(source.generation))
    ? Math.min(MAX_GENERATION, Math.max(0, Math.floor(Number(source.generation))))
    : 0;
  const parents = [...new Set(
    (Array.isArray(source.parents) ? source.parents : [])
      .filter((parent: unknown): parent is string => typeof parent === 'string' && Boolean(parent) && parent !== id),
  )].slice(0, MAX_PARENTS);
  const projectId = typeof source.projectId === 'string' && source.projectId
    ? source.projectId
    : INBOX_PROJECT_ID;
  const seriesId = typeof source.seriesId === 'string' && source.seriesId ? source.seriesId : null;
  const order = Number.isFinite(Number(source.order)) ? Math.max(0, Math.floor(Number(source.order))) : 0;
  return {
    version: NOTEBOOK_VERSION,
    id,
    name,
    createdAt: Number.isFinite(createdAt) ? createdAt : now(),
    document: attachLayerAliases(structuredClone(document)),
    descriptor: structuredClone(descriptor) as FigureDescriptor,
    thumbnail,
    parentId,
    parents,
    generation,
    tags: cleanTags(source.tags),
    notes: cleanText(source.notes, MAX_NOTES),
    projectId,
    seriesId,
    order,
  };
}

function uniqueById<T extends { id: string }>(list: ReadonlyArray<T | null>): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const entry of list) {
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
  }
  return out;
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  for (const tag of tags) {
    const clean = cleanText(tag, MAX_TAG);
    if (clean && !out.includes(clean)) out.push(clean);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function isPngDataUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/png;base64,');
}

let idCounter = 0;
function makeId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  idCounter++;
  return `cp-${Date.now().toString(36)}-${idCounter}`;
}
