/** Parameter schema helpers. */

import { compileExpression } from '../math/expression.js';

export const TYPE = {
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  SELECT: 'select',
  EXPRESSION: 'expression', // single-line formula field
  SOURCE: 'source',         // multi-line formula program
  HARMONICS: 'harmonics',   // fourier harmonic table
} as const;

export type SchemaType = typeof TYPE[keyof typeof TYPE];

export interface SchemaEntry {
  label?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  snap?: boolean;
  hardMin?: number;
  hardMax?: number;
  default?: unknown;
  options?: unknown[];
  advanced?: boolean;
  doc?: string;
  [key: string]: unknown;
}
export type ParamSchema = Record<string, SchemaEntry>;
export interface Harmonic {
  freq: number;
  amp: number;
  phase: number;
  rot: number;
  ox: number;
  oy: number;
}

/** Defaults for every key in a schema. Structured values are deep-cloned. */
export function schemaDefaults(schema: ParamSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, s] of Object.entries(schema)) out[key] = cloneDefault(s.default);
  return out;
}

function cloneDefault<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Clamp/snap a resolved numeric value against its schema.
 * Used by both base-value sanitization and time-expression resolution so
 * storage and evaluation cannot disagree about a parameter's range.
 */
export function clampNumber(schemaEntry: SchemaEntry, value: unknown): number {
  const s = schemaEntry;
  let v = Number(value);
  if (!Number.isFinite(v)) v = Number(s.default);
  if (!Number.isFinite(v)) return 0;
  // Slider bounds (`min`/`max`) can be narrower than the values accepted
  // by typing. `hardMin`/`hardMax` widen the storage/evaluation range
  // without making the slider unusable.
  const lo = typeof s.hardMin === 'number' ? s.hardMin : s.min;
  const hi = typeof s.hardMax === 'number' ? s.hardMax : s.max;
  if (typeof lo === 'number') v = Math.max(lo, v);
  if (typeof hi === 'number') v = Math.min(hi, v);
  if (s.step && s.snap !== false) v = Math.round(v / s.step) * s.step;
  // Snapping can push a value just past a bound when bounds are not
  // multiples of step; clamp once more.
  if (typeof lo === 'number') v = Math.max(lo, v);
  if (typeof hi === 'number') v = Math.min(hi, v);
  return Number(v.toFixed(5));
}

/** Clamp/snap/validate one value against its schema entry. */
export function sanitizeValue(schemaEntry: SchemaEntry | null | undefined, value: unknown): unknown {
  const s = schemaEntry;
  if (!s) return value;

  switch (s.type) {
    case TYPE.BOOLEAN:
      return Boolean(value);

    case TYPE.SELECT:
      return (s.options ?? []).includes(value) ? value : s.default;

    case TYPE.EXPRESSION:
    case TYPE.SOURCE: {
      const text = String(value ?? s.default);
      // Invalid syntax falls back to default — never store broken math.
      return (compileExpression(text) as { ok: boolean }).ok ? text : s.default;
    }

    case TYPE.HARMONICS:
      return sanitizeHarmonics(value, s.default);

    case TYPE.NUMBER:
    default: {
      // Animatable: { expr } passes through if it compiles; the value is
      // clamped when the expression is resolved at evaluation time.
      if (value && typeof value === 'object' && typeof (value as { expr?: unknown }).expr === 'string') {
        const expr = (value as { expr: string }).expr;
        return (compileExpression(expr) as { ok: boolean }).ok ? { expr } : cloneDefault(s.default);
      }
      return clampNumber(s, value);
    }
  }
}

/** Full params object from arbitrary input (unknown keys dropped). */
export function sanitizeParams(schema: ParamSchema, input: unknown): Record<string, unknown> {
  const out = schemaDefaults(schema);
  if (!input || typeof input !== 'object') return out;
  const source = input as Record<string, unknown>;
  for (const key of Object.keys(schema)) {
    if (key in source) out[key] = sanitizeValue(schema[key], source[key]);
  }
  return out;
}

function sanitizeHarmonics(value: unknown, fallback: unknown): Harmonic[] {
  if (!Array.isArray(value)) return structuredClone((fallback ?? []) as Harmonic[]);
  const clean: Harmonic[] = [];
  for (const h of value.slice(0, 64)) {
    if (!h || typeof h !== 'object') continue;
    const row = h as Record<string, unknown>;
    clean.push({
      freq: finite(row.freq, 1, -64, 64),
      amp: finite(row.amp, 0.5, -16, 16),
      phase: finite(row.phase, 0, -64, 64),
      rot: finite(row.rot, 0, -Math.PI * 2, Math.PI * 2),
      ox: finite(row.ox, 0, -8, 8),
      oy: finite(row.oy, 0, -8, 8),
    });
  }
  return clean;
}

function finite(v: unknown, dflt: number, lo: number, hi: number): number {
  let n = Number(v);
  if (!Number.isFinite(n)) n = dflt;
  return Math.min(hi, Math.max(lo, n));
}
