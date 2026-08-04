/**
 * schema.js — parameter schema helpers, generalized from v1.
 *
 * Every generator and operator declares a schema:
 *   { key: { label, type, min, max, step, default, options, doc } }
 *
 * Types: number | boolean | select | expression | source | harmonics
 *
 * Numbers are "AnimatableValues": the stored value may be a plain number
 * or { expr: "3 + 0.5*sin(time)" } (spec §12).
 */

import { compileExpression } from '../math/expression.js';

export const TYPE = {
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  SELECT: 'select',
  EXPRESSION: 'expression', // single-line formula field
  SOURCE: 'source',         // multi-line formula program
  HARMONICS: 'harmonics',   // fourier harmonic table
};

/** Defaults for every key in a schema. */
export function schemaDefaults(schema) {
  const out = {};
  for (const [key, s] of Object.entries(schema)) out[key] = s.default;
  return out;
}

/** Clamp/snap/validate one value against its schema entry. */
export function sanitizeValue(schemaEntry, value) {
  const s = schemaEntry;
  if (!s) return value;

  switch (s.type) {
    case TYPE.BOOLEAN:
      return Boolean(value);

    case TYPE.SELECT:
      return s.options.includes(value) ? value : s.default;

    case TYPE.EXPRESSION:
    case TYPE.SOURCE: {
      const text = String(value ?? s.default);
      // Invalid syntax falls back to default — never store broken math.
      return compileExpression(text).ok ? text : s.default;
    }

    case TYPE.HARMONICS:
      return sanitizeHarmonics(value, s.default);

    case TYPE.NUMBER:
    default: {
      // Animatable: { expr } passes through if it compiles.
      if (value && typeof value === 'object' && typeof value.expr === 'string') {
        return compileExpression(value.expr).ok ? { expr: value.expr } : s.default;
      }
      let v = Number(value);
      if (!Number.isFinite(v)) v = s.default;
      if (typeof s.min === 'number') v = Math.max(s.min, v);
      if (typeof s.max === 'number') v = Math.min(s.max, v);
      if (s.step) v = Math.round(v / s.step) * s.step;
      return Number(v.toFixed(5));
    }
  }
}

/** Full params object from arbitrary input (unknown keys dropped). */
export function sanitizeParams(schema, input) {
  const out = schemaDefaults(schema);
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(schema)) {
    if (key in input) out[key] = sanitizeValue(schema[key], input[key]);
  }
  return out;
}

function sanitizeHarmonics(value, fallback) {
  if (!Array.isArray(value)) return structuredClone(fallback ?? []);
  const clean = [];
  for (const h of value.slice(0, 64)) {
    if (!h || typeof h !== 'object') continue;
    clean.push({
      freq: finite(h.freq, 1, -64, 64),
      amp: finite(h.amp, 0.5, -16, 16),
      phase: finite(h.phase, 0, -64, 64),
      rot: finite(h.rot, 0, -Math.PI * 2, Math.PI * 2),
      ox: finite(h.ox, 0, -8, 8),
      oy: finite(h.oy, 0, -8, 8),
    });
  }
  return clean;
}

function finite(v, dflt, lo, hi) {
  let n = Number(v);
  if (!Number.isFinite(n)) n = dflt;
  return Math.min(hi, Math.max(lo, n));
}
