/**
 * domain/modeToggles.ts — array-safe helpers for render-mode ids.
 *
 * lil-gui writes a scalar; the document expects string[]. These helpers keep
 * the invariant explicit without a DOM.
 */

/** Normalize arbitrary input to a non-empty array of unique mode ids. */
export function normalizeModes(modes: unknown, order: readonly string[] = []): string[] {
  const list = Array.isArray(modes)
    ? modes.filter((mode): mode is string => typeof mode === 'string')
    : [];
  const allowed = order.length ? new Set(order) : null;
  const unique = [...new Set(list)].filter((mode) => !allowed || allowed.has(mode));
  if (!unique.length) return ['stroke'];
  return order.length
    ? order.filter((mode) => unique.includes(mode))
    : unique;
}

/** Add/remove one mode while preserving registry order. */
export function toggleMode(
  modes: unknown,
  id: string,
  enabled: boolean,
  order: readonly string[] = [],
): string[] {
  const set = new Set(normalizeModes(modes, order));
  if (enabled) set.add(id);
  else set.delete(id);
  if (!set.size) set.add('stroke');
  const known = order.filter((mode) => set.has(mode));
  const extra = order.length ? [] : [...set].filter((mode) => !order.includes(mode));
  return [...new Set([...known, ...extra])];
}
