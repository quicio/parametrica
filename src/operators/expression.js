/**
 * operators/expression.js — shared helpers for optional expression
 * parameters on geometry operators.
 */

import { compileExpression } from '../math/expression.js';

/**
 * Compile an optional expression. Blank input means "not set" and returns
 * null, so numeric controls keep their normal behaviour.
 */
export function compileOptionalExpression(source, label, key) {
  if (typeof source !== 'string' || !source.trim()) return null;
  const compiled = compileExpression(source);
  if (!compiled.ok) {
    const error = new Error(`${label}: ${compiled.error.message}`);
    error.key = key;
    error.span = compiled.error;
    throw error;
  }
  return compiled.fn;
}

/** Expression scope with the current time plus the active stdlib. */
export function makeExpressionScope(ctx) {
  return Object.assign(Object.create(null), ctx?.scope ?? {}, { time: ctx?.time ?? 0 });
}

/** Evaluate one point expression; non-finite results are ignored. */
export function evaluatePointExpression(fn, scope, point, index, count) {
  if (!fn) return null;
  scope.x = point.x;
  scope.y = point.y;
  scope.i = index;
  scope.n = count;
  const value = fn(scope);
  return Number.isFinite(value) ? value : null;
}
