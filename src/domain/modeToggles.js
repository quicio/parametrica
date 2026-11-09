/**
 * modeToggles.js — array-safe helpers for the View panel's render modes.
 *
 * lil-gui's option controller writes a scalar; Parametrica's document
 * expects `string[]`. These helpers keep the invariant explicit and
 * testable without a DOM.
 */

/** Normalize arbitrary input to a non-empty array of unique mode ids. */
export function normalizeModes(modes, order = []) {
  const list = Array.isArray(modes) ? modes.filter((m) => typeof m === 'string') : [];
  const allowed = order.length ? new Set(order) : null;
  const unique = [...new Set(list)].filter((m) => !allowed || allowed.has(m));
  if (!unique.length) return ['stroke'];
  return order.length
    ? order.filter((m) => unique.includes(m))
    : unique;
}

/**
 * Add/remove one mode while preserving registry order.
 * @param {string[]} modes
 * @param {string} id
 * @param {boolean} enabled
 * @param {string[]} order  registry ids
 * @returns {string[]}
 */
export function toggleMode(modes, id, enabled, order = []) {
  const set = new Set(normalizeModes(modes, order));
  if (enabled) set.add(id);
  else set.delete(id);
  // Never leave the canvas with no passes: 'stroke' is the fallback.
  if (!set.size) set.add('stroke');
  const known = order.filter((m) => set.has(m));
  const extra = order.length ? [] : [...set].filter((m) => !order.includes(m));
  return [...new Set([...known, ...extra])];
}
