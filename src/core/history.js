/**
 * history.js — bounded snapshot history for document-level undo/redo.
 *
 * Pure and DOM-free: snapshots are opaque values (Parametrica stores
 * JSON strings). The App owns coalescing and restoration.
 */

export class History {
  constructor(limit = 50) {
    this.limit = Math.max(1, Math.floor(limit));
    this.past = [];
    this.future = [];
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  /** Store the document state that preceded a change. */
  record(previous) {
    if (previous == null) return;
    this.past.push(previous);
    if (this.past.length > this.limit) this.past.shift();
    this.future.length = 0;
  }

  /** @returns {string|null} the state to restore */
  undo(current) {
    if (!this.past.length) return null;
    const previous = this.past.pop();
    if (current != null) {
      this.future.push(current);
      if (this.future.length > this.limit) this.future.shift();
    }
    return previous;
  }

  /** @returns {string|null} the state to restore */
  redo(current) {
    if (!this.future.length) return null;
    const next = this.future.pop();
    if (current != null) {
      this.past.push(current);
      if (this.past.length > this.limit) this.past.shift();
    }
    return next;
  }

  clear() {
    this.past.length = 0;
    this.future.length = 0;
  }
}
