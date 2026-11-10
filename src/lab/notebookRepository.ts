/** Storage boundary for the notebook. */

import { PersistenceRepository } from '../core/persistence.ts';
import type { StorageLike } from '../core/persistence.ts';

export interface NotebookRepository {
  lastError?: string | null;
  load(): unknown;
  save(snapshot: unknown): boolean;
  clear(): void;
}

export interface NotebookSnapshot {
  version: number;
  projects: unknown[];
  series: unknown[];
  checkpoints: unknown[];
}

export class LocalNotebookRepository implements NotebookRepository {
  repository: PersistenceRepository;
  storage: StorageLike | null;
  key: string;
  lastError: string | null;

  constructor(
    storage: StorageLike | null = globalThis.localStorage ?? null,
    key = 'parametrica.notebook.v1',
    repository: PersistenceRepository | null = null,
  ) {
    this.repository = repository ?? new PersistenceRepository(storage);
    this.storage = this.repository.storage;
    this.key = key;
    this.lastError = null;
  }

  load(): unknown {
    this.lastError = null;
    const snapshot = this.repository.read(this.key);
    this.lastError = this.repository.lastError;
    return snapshot;
  }

  save(snapshot: unknown): boolean {
    this.lastError = null;
    const ok = this.repository.write(this.key, snapshot);
    if (!ok) this.lastError = this.repository.lastError ?? 'notebook storage unavailable';
    return ok;
  }

  clear(): void {
    this.repository.remove(this.key);
  }
}

export class MemoryNotebookRepository implements NotebookRepository {
  snapshot: unknown;

  constructor(initial: unknown = null) {
    this.snapshot = initial ? structuredClone(initial) : null;
  }

  load(): unknown {
    return this.snapshot ? structuredClone(this.snapshot) : null;
  }

  save(snapshot: unknown): boolean {
    this.snapshot = structuredClone(snapshot);
    return true;
  }

  clear(): void {
    this.snapshot = null;
  }
}

export function migrateNotebook(raw: unknown): NotebookSnapshot {
  if (Array.isArray(raw)) {
    return { version: 2, projects: [], series: [], checkpoints: raw };
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { checkpoints?: unknown }).checkpoints)) {
    throw new Error('Invalid notebook JSON');
  }
  const source = raw as { projects?: unknown; series?: unknown; checkpoints: unknown[] };
  return {
    version: 2,
    projects: Array.isArray(source.projects) ? source.projects : [],
    series: Array.isArray(source.series) ? source.series : [],
    checkpoints: source.checkpoints,
  };
}
