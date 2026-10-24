/**
 * session.js — debounced local session snapshots.
 *
 * A session is the canonical document plus a timestamp. It is stored in
 * localStorage, never in the notebook, and never uploaded. Recovery is an
 * explicit choice: the app shows a banner instead of silently replacing the
 * current document on load.
 */

import { sanitizeDocument } from './document.js';

export const SESSION_VERSION = 1;
export const SESSION_STORAGE_KEY = 'parametrica.session.v1';

export class SessionStore {
  constructor({
    storage = globalThis.localStorage ?? null,
    now = () => Date.now(),
    delay = 800,
  } = {}) {
    this.storage = storage;
    this.now = now;
    this.delay = Math.max(0, Number(delay) || 0);
    this.timer = null;
    this.lastError = null;
  }

  /** Debounced save. Safe to call from every document commit. */
  schedule(document) {
    if (!this.storage || !document) return false;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.save(document);
    }, this.delay);
    return true;
  }

  /** Write immediately, cancelling any pending debounce. */
  flush(document) {
    clearTimeout(this.timer);
    this.timer = null;
    return this.save(document);
  }

  save(document) {
    if (!this.storage || !document) return false;
    this.lastError = null;
    try {
      const clean = sanitizeDocument(structuredClone(document));
      if (!clean) throw new Error('Invalid document');
      // Restoring should never start playback on its own.
      clean.animation.playing = false;
      this.storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        version: SESSION_VERSION,
        savedAt: this.now(),
        document: clean,
      }));
      return true;
    } catch (error) {
      this.lastError = error.message;
      return false;
    }
  }

  /**
   * Read the last snapshot without applying it.
   * @returns {{savedAt:number, document:object}|null}
   */
  load() {
    if (!this.storage) return null;
    this.lastError = null;
    try {
      const raw = this.storage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== SESSION_VERSION) return null;
      const document = sanitizeDocument(data.document);
      if (!document) return null;
      const savedAt = Number(data.savedAt);
      return {
        savedAt: Number.isFinite(savedAt) ? savedAt : this.now(),
        document,
      };
    } catch (error) {
      this.lastError = error.message;
      return null;
    }
  }

  clear() {
    clearTimeout(this.timer);
    this.timer = null;
    this.lastError = null;
    try {
      this.storage?.removeItem(SESSION_STORAGE_KEY);
      return true;
    } catch (error) {
      this.lastError = error.message;
      return false;
    }
  }
}
