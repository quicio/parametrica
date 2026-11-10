/** Deterministic document/descriptor diffs for the notebook. */

type Rec = Record<string, unknown>;

export interface DiffEntry {
  path: string;
  from: unknown;
  to: unknown;
  delta?: number;
}

/** Flatten nested objects/arrays into a path → leaf map. */
export function flatten(value: unknown, prefix = '', out: Map<string, unknown> = new Map()): Map<string, unknown> {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) flatten(value[i], join(prefix, i), out);
    return out;
  }
  if (value && typeof value === 'object') {
    const source = value as Rec;
    for (const key of Object.keys(source).sort()) flatten(source[key], join(prefix, key), out);
    return out;
  }
  out.set(prefix, value);
  return out;
}

/**
 * Compare form-relevant document fields. View/animation are intentionally
 * excluded: the notebook compares forms, not panel state.
 */
export function documentDiff(a: Rec | null | undefined, b: Rec | null | undefined): DiffEntry[] {
  const left = flatten({ seed: a?.seed, generator: a?.generator, operators: a?.operators, layers: a?.layers });
  const right = flatten({ seed: b?.seed, generator: b?.generator, operators: b?.operators, layers: b?.layers });
  return diffMaps(left, right, false);
}

/** Compare numeric descriptor fields (deltas included). */
export function descriptorDiff(a: Rec | null | undefined, b: Rec | null | undefined): DiffEntry[] {
  const left = flattenDescriptor(a);
  const right = flattenDescriptor(b);
  return diffMaps(left, right, true);
}

function flattenDescriptor(descriptor: Rec | null | undefined): Map<string, unknown> {
  const source = descriptor && typeof descriptor === 'object' ? descriptor : {};
  const filtered: Rec = {};
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

function diffMaps(left: Map<string, unknown>, right: Map<string, unknown>, withDelta: boolean): DiffEntry[] {
  const keys = [...new Set([...left.keys(), ...right.keys()])].sort();
  const out: DiffEntry[] = [];
  for (const path of keys) {
    const from = left.get(path);
    const to = right.get(path);
    if (same(from, to)) continue;
    const entry: DiffEntry = { path, from, to };
    if (withDelta && typeof from === 'number' && typeof to === 'number') {
      entry.delta = round(to - from);
    }
    out.push(entry);
  }
  return out;
}

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  return false;
}

function join(prefix: string, key: string | number): string {
  return prefix ? `${prefix}.${key}` : String(key);
}

function round(value: number): number {
  return Number(value.toFixed(6));
}
