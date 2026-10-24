/**
 * cache.js — bounded, in-memory response cache for the optional LLM layer.
 *
 * The cache key is deterministic: document hash + descriptor version +
 * provider id + prompt version. Nothing is written to localStorage, so a
 * model response never becomes a hidden source of truth across sessions.
 */

export class AdvisorCache {
  constructor(limit = 50) {
    this.limit = Math.max(1, Number(limit) || 50);
    this.map = new Map();
  }

  get(key) {
    if (!key) return null;
    const value = this.map.get(key);
    if (value == null) return null;
    // Refresh recency so the bounded cache evicts the least recently used.
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key, value) {
    if (!key || value == null) return;
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.limit) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }

  has(key) {
    return Boolean(key) && this.map.has(key);
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}

export function cacheKey(input, provider, promptVersion = '1') {
  return [
    input?.current?.documentHash ?? 'no-hash',
    input?.current?.version ?? 1,
    provider?.id ?? 'offline',
    promptVersion,
  ].join(':');
}
