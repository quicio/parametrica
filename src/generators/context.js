/**
 * generators/context.js — per-sample expression context and errors.
 */

import { compileExpression } from '../math/expression.js';

export function compileOrThrow(source, label, key = null) {
  const compiled = compileExpression(source);
  if (!compiled.ok) {
    const err = new Error(`${label}: ${compiled.error.message}`);
    if (key) err.key = key;
    if (compiled.error) err.span = compiled.error;
    throw err;
  }
  return compiled.fn;
}

/** Build a per-sample scope: stdlib base + t/theta/time, mutated in place. */
export function makeScope(ctx) {
  const scope = Object.assign(Object.create(null), ctx.scope);
  scope.time = ctx.time ?? 0;
  return scope;
}
