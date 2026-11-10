/** Debounced local session snapshots. */

import { sanitizeDocument } from './document.js';
import { PersistenceRepository } from './persistence.ts';
import type { StorageLike } from './persistence.ts';

export const SESSION_VERSION = 1;
export const SESSION_STORAGE_KEY = 'parametrica.session.v1';

type SessionDocument = Record<string, unknown> & {
  animation: { playing: boolean; [key: string]: unknown };
  [key: string]: unknown;
};

export class SessionStore {
  repository: PersistenceRepository;
  storage: StorageLike | null;
  now: () => number;
  delay: number;
  timer: ReturnType<typeof setTimeout> | null;
  lastError: string | null;

  constructor({
    storage = globalThis.localStorage ?? null,
    repository = null,
    now = () => Date.now(),
    delay = 800,
  }: {
    storage?: StorageLike | null;
    repository?: PersistenceRepository | null;
    now?: () => number;
    delay?: number;
  } = {}) {
    this.repository = repository ?? new PersistenceRepository(storage);
    this.storage = this.repository.storage;
    this.now = now;
    this.delay = Math.max(0, Number(delay) || 0);
    this.timer = null;
    this.lastError = null;
  }

  schedule(document: unknown): boolean {
    if (!this.repository.storage || !document) return false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.save(document);
    }, this.delay);
    return true;
  }

  flush(document: unknown): boolean {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    return this.save(document);
  }

  save(document: unknown): boolean {
    if (!this.repository.storage || !document) return false;
    this.lastError = null;
    try {
      const clean = sanitizeDocument(structuredClone(document)) as SessionDocument | null;
      if (!clean) throw new Error('Invalid document');
      clean.animation.playing = false;
      const ok = this.repository.write(SESSION_STORAGE_KEY, {
        version: SESSION_VERSION,
        savedAt: this.now(),
        document: clean,
      });
      if (!ok) this.lastError = this.repository.lastError ?? 'session storage unavailable';
      return ok;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  load(): { savedAt: number; document: SessionDocument } | null {
    if (!this.repository.storage) return null;
    this.lastError = null;
    const data = this.repository.read<{ version?: number; savedAt?: unknown; document?: unknown }>(SESSION_STORAGE_KEY);
    if (data === null) {
      this.lastError = this.repository.lastError;
      return null;
    }
    if (!data || data.version !== SESSION_VERSION) return null;
    const document = sanitizeDocument(data.document) as SessionDocument | null;
    if (!document) return null;
    const savedAt = Number(data.savedAt);
    return {
      savedAt: Number.isFinite(savedAt) ? savedAt : this.now(),
      document,
    };
  }

  clear(): boolean {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.lastError = null;
    const ok = this.repository.remove(SESSION_STORAGE_KEY);
    if (!ok) this.lastError = this.repository.lastError ?? 'session storage unavailable';
    return ok;
  }
}
