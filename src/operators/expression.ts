/** Shared helpers for optional expression parameters on geometry operators. */

import { compileExpression } from '../math/expression.js';
import type { GeneratorContext } from '../generators/context.ts';

type Rec = Record<string, unknown>;

/** Compile an optional expression. Blank input means "not set" and returns null. */
export function compileOptionalExpression(source: unknown, label: string, key: string): ((scope: Rec) => number) | null {
  if (typeof source !== 'string' || !source.trim()) return null;
  const compiled = compileExpression(source) as { ok: boolean; fn?: (scope: Rec) => number; error?: { message: string } };
  if (!compiled.ok) {
    const error = new Error(`${label}: ${compiled.error?.message ?? 'invalid expression'}`) as Error & { key?: string; span?: unknown };
    error.key = key;
    error.span = compiled.error;
    throw error;
  }
  return compiled.fn!;
}

/** Expression scope with the current time plus the active stdlib. */
export function makeExpressionScope(ctx: GeneratorContext | null | undefined): Rec {
  return Object.assign(Object.create(null), ctx?.scope ?? {}, { time: ctx?.time ?? 0 }) as Rec;
}

/** Evaluate one point expression; non-finite results are ignored. */
export function evaluatePointExpression(
  fn: ((scope: Rec) => number) | null,
  scope: Rec,
  point: { x: number; y: number },
  index: number,
  count: number,
): number | null {
  if (!fn) return null;
  scope.x = point.x;
  scope.y = point.y;
  scope.i = index;
  scope.n = count;
  const value = fn(scope);
  return Number.isFinite(value) ? value : null;
}
