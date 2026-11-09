/**
 * lab/notebookRepository.js — storage boundary for the notebook.
 *
 * Notebook owns hierarchy and validation; repositories only move snapshots in
 * and out. A future IndexedDB or remote implementation can plug in here.
 */

import { PersistenceRepository } from '../core/persistence.js';

export class LocalNotebookRepository {
  constructor(storage = globalThis.localStorage ?? null, key = 'parametrica.notebook.v1', repository = null) {
    this.repository = repository ?? new PersistenceRepository(storage);
    this.storage = this.repository.storage;
    this.key = key;
    this.lastError = null;
  }

  load() {
    this.lastError = null;
    const snapshot = this.repository.read(this.key);
    this.lastError = this.repository.lastError;
    return snapshot;
  }

  save(snapshot) {
    this.lastError = null;
    const ok = this.repository.write(this.key, snapshot);
    if (!ok) this.lastError = this.repository.lastError ?? 'notebook storage unavailable';
    return ok;
  }

  clear() {
    this.repository.remove(this.key);
  }
}

export class MemoryNotebookRepository {
  constructor(initial = null) {
    this.snapshot = initial ? structuredClone(initial) : null;
  }

  load() {
    return this.snapshot ? structuredClone(this.snapshot) : null;
  }

  save(snapshot) {
    this.snapshot = structuredClone(snapshot);
    return true;
  }

  clear() {
    this.snapshot = null;
  }
}

/**
 * Normalize the accepted notebook shapes (legacy array, v1/v2 object) into
 * the current snapshot shape. Sanitization of individual records stays in
 * Notebook so invalid checkpoints can be skipped with a report.
 */
export function migrateNotebook(raw) {
  if (Array.isArray(raw)) {
    return { version: 2, projects: [], series: [], checkpoints: raw };
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.checkpoints)) {
    throw new Error('Invalid notebook JSON');
  }
  return {
    version: 2,
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    series: Array.isArray(raw.series) ? raw.series : [],
    checkpoints: raw.checkpoints,
  };
}
