/**
 * animatable.js — every parameter can animate (spec §12).
 *
 * A numeric parameter is an AnimatableValue:
 *   240                          → constant
 *   { expr: "180 + 60*sin(time)" } → time-driven
 *
 * Modulations are additional optional expressions stored per stage
 * (document.generator.mods / operators[i].mods) that override the base
 * value when present. Resolution is pure and time-driven — never
 * accumulative — so scrubbing is exact.
 */

import { compileExpression } from '../math/expression.js';
import { TYPE, clampNumber } from '../core/schema.js';
import { resolveTimelineValue } from './timeline.js';

/**
 * Resolve a full params object against its schema for a given context.
 * Non-numeric types pass through untouched.
 *
 * @param {object} schema
 * @param {object} params   stored values (numbers or {expr})
 * @param {object} mods     optional overriding expressions { key: "…" }
 * @param {{time: number, scope: object}} ctx  scope = stdlib base
 * @param {Array} errors    collect { key, message }
 * @returns {object} resolved params (numbers stay numbers)
 */
export function resolveParams(schema, params, mods, ctx, errors = []) {
  const out = {};
  for (const [key, s] of Object.entries(schema)) {
    let value = params?.[key] ?? s.default;

    if (s.type === TYPE.NUMBER) {
      if (ctx.timeline && ctx.stagePath) {
        const timed = resolveTimelineValue(
          ctx.timeline,
          `${ctx.stagePath}.${key}`,
          ctx.layerIndex ?? 0,
          ctx.time,
        );
        if (timed !== null) value = clampNumber(s, timed);
      }
      const modSource = typeof mods?.[key] === 'string' && mods[key].trim() ? mods[key] : null;
      if (modSource) {
        const raw = evaluateExpr(modSource, { ...ctx.scope, time: ctx.time, value: toNumber(value, s.default) }, errors, key);
        value = Number.isFinite(raw) ? clampNumber(s, raw) : toNumber(s.default, s.default);
      } else if (value && typeof value === 'object' && typeof value.expr === 'string') {
        const raw = evaluateExpr(value.expr, { ...ctx.scope, time: ctx.time }, errors, key);
        value = Number.isFinite(raw) ? clampNumber(s, raw) : toNumber(s.default, s.default);
      } else {
        value = clampNumber(s, toNumber(value, s.default));
      }
    }
    out[key] = value;
  }
  return out;
}

function evaluateExpr(source, scope, errors, key) {
  const compiled = compileExpression(source);
  if (!compiled.ok) {
    errors.push({ key, message: compiled.error.message });
    return null;
  }
  try {
    const v = compiled.fn(scope);
    if (!Number.isFinite(v)) {
      errors.push({ key, message: 'expression returned non-finite value' });
      return null;
    }
    return v;
  } catch (e) {
    errors.push({ key, message: e.message });
    return null;
  }
}

function toNumber(v, dflt) {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}
