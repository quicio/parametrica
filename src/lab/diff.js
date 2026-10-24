/**
 * diff.js — deterministic document/descriptor diffs for the notebook.
 *
 * Pure and DOM-free. Paths are dot-separated and array indices are numeric
 * segments, e.g. `generator.params.fit` or `operators.0.params.count`.
 */

/** Flatten nested objects/arrays into a path → leaf map. */
export function flatten(value, prefix = '', out = new Map()) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) flatten(value[i], join(prefix, i), out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value).sort()) flatten(value[key], join(prefix, key), out);
    return out;
  }
  out.set(prefix, value);
  return out;
}

/**
 * Compare form-relevant document fields. View/animation are intentionally
 * excluded: the notebook compares forms, not panel state.
 */
export function documentDiff(a, b) {
  const left = flatten({ seed: a?.seed, generator: a?.generator, operators: a?.operators, layers: a?.layers });
  const right = flatten({ seed: b?.seed, generator: b?.generator, operators: b?.operators, layers: b?.layers });
  return diffMaps(left, right, false);
}

/** Compare numeric descriptor fields (deltas included). */
export function descriptorDiff(a, b) {
  const left = flattenDescriptor(a);
  const right = flattenDescriptor(b);
  return diffMaps(left, right, true);
}

function flattenDescriptor(descriptor) {
  const source = descriptor && typeof descriptor === 'object' ? descriptor : {};
  const filtered = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === 'documentHash' || key === 'generator' || key === 'operators' ||
        key === 'analysis' || key === 'version') continue;
    filtered[key] = value;
  }
  const leaves = flatten(filtered);
  for (const [path, value] of [...leaves.entries()]) {
    if (typeof value !== 'number' || path === 'fourier.topHarmonics' || path.startsWith('fourier.topHarmonics.')) {
      leaves.delete(path);
    }
  }
  return leaves;
}

function diffMaps(left, right, withDelta) {
  const keys = [...new Set([...left.keys(), ...right.keys()])].sort();
  const out = [];
  for (const path of keys) {
    const from = left.get(path);
    const to = right.get(path);
    if (same(from, to)) continue;
    const entry = { path, from, to };
    if (withDelta && typeof from === 'number' && typeof to === 'number') {
      entry.delta = round(to - from);
    }
    out.push(entry);
  }
  return out;
}

function same(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  return false;
}

function join(prefix, key) {
  return prefix ? `${prefix}.${key}` : String(key);
}

function round(value) {
  return Number(value.toFixed(6));
}
