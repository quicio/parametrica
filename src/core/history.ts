/** Bounded snapshot history for document-level undo/redo. */

export class History<T = string> {
  limit: number;
  past: T[];
  future: T[];

  constructor(limit = 50) {
    this.limit = Math.max(1, Math.floor(limit));
    this.past = [];
    this.future = [];
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  record(previous: T | null | undefined): void {
    if (previous == null) return;
    this.past.push(previous);
    if (this.past.length > this.limit) this.past.shift();
    this.future.length = 0;
  }

  undo(current?: T | null): T | null {
    if (!this.past.length) return null;
    const previous = this.past.pop() ?? null;
    if (current != null) {
      this.future.push(current);
      if (this.future.length > this.limit) this.future.shift();
    }
    return previous;
  }

  redo(current?: T | null): T | null {
    if (!this.future.length) return null;
    const next = this.future.pop() ?? null;
    if (current != null) {
      this.past.push(current);
      if (this.past.length > this.limit) this.past.shift();
    }
    return next;
  }

  clear(): void {
    this.past.length = 0;
    this.future.length = 0;
  }
}
