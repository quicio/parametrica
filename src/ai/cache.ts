/** Bounded, in-memory response cache for the optional LLM layer. */

type Rec = Record<string, unknown>;

export class AdvisorCache<T = unknown> {
  limit: number;
  map: Map<string, T>;

  constructor(limit = 50) {
    this.limit = Math.max(1, Number(limit) || 50);
    this.map = new Map();
  }

  get(key: string | null | undefined): T | null {
    if (!key) return null;
    const value = this.map.get(key);
    if (value == null) return null;
    // Refresh recency so the bounded cache evicts the least recently used.
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string | null | undefined, value: T | null | undefined): void {
    if (!key || value == null) return;
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.limit) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }

  has(key: string | null | undefined): boolean {
    return Boolean(key) && this.map.has(key as string);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

export function cacheKey(input: Rec | null | undefined, provider: Rec | null | undefined, promptVersion = '1'): string {
  const current = (input?.current && typeof input.current === 'object' ? input.current : {}) as Rec;
  return [
    current.documentHash ?? 'no-hash',
    current.version ?? 1,
    provider?.id ?? 'offline',
    promptVersion,
  ].join(':');
}
