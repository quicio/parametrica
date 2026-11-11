/** Per-sample expression context and errors. */

import { compileExpression } from '../math/expression.js';

export interface GeneratorContext {
  time?: number;
  seed?: number;
  scope: Record<string, unknown>;
  quality?: Record<string, unknown>;
  document?: unknown;
  timeline?: unknown;
  layerIndex?: number;
  [key: string]: unknown;
}

export type ExpressionFn = (scope: Record<string, unknown>) => number;

export function compileOrThrow(source: string, label: string, key: string | null = null): ExpressionFn {
  const compiled = compileExpression(source) as { ok: boolean; fn?: ExpressionFn; error?: { message: string } };
  if (!compiled.ok) {
    const err = new Error(`${label}: ${compiled.error?.message ?? 'invalid expression'}`) as Error & { key?: string; span?: unknown };
    if (key) err.key = key;
    if (compiled.error) err.span = compiled.error;
    throw err;
  }
  return compiled.fn!;
}

/** Build a per-sample scope: stdlib base + t/theta/time, mutated in place. */
export function makeScope(ctx: GeneratorContext): Record<string, unknown> {
  const scope = Object.assign(Object.create(null), ctx.scope) as Record<string, unknown>;
  scope.time = ctx.time ?? 0;
  return scope;
}
