/** Time-driven parameter resolution. */

import { compileExpression } from '../math/expression.js';
import { TYPE, clampNumber } from '../core/schema.js';
import { resolveTimelineValue } from './timeline.ts';
import type { Timeline } from './timeline.ts';

export interface ParamSchema {
  type?: string;
  default?: unknown;
  min?: number;
  max?: number;
  [key: string]: unknown;
}
export interface ResolutionContext {
  time: number;
  scope: Record<string, unknown>;
  timeline?: Timeline | null;
  stagePath?: string | null;
  layerIndex?: number;
  [key: string]: unknown;
}
export interface ResolutionError {
  key: string;
  message: string;
  [key: string]: unknown;
}

/**
 * Resolve a full params object against its schema for a given context.
 * Non-numeric types pass through untouched.
 */
export function resolveParams(
  schema: Record<string, ParamSchema>,
  params: Record<string, unknown> | null | undefined,
  mods: Record<string, unknown> | null | undefined,
  ctx: ResolutionContext,
  errors: ResolutionError[] = [],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
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
      const mod = mods?.[key];
      const modSource = typeof mod === 'string' && mod.trim() ? mod : null;
      if (modSource) {
        const raw = evaluateExpr(modSource, { ...ctx.scope, time: ctx.time, value: toNumber(value, s.default) }, errors, key);
        value = Number.isFinite(raw) ? clampNumber(s, raw) : toNumber(s.default, s.default);
      } else if (value && typeof value === 'object' && typeof (value as { expr?: unknown }).expr === 'string') {
        const raw = evaluateExpr((value as { expr: string }).expr, { ...ctx.scope, time: ctx.time }, errors, key);
        value = Number.isFinite(raw) ? clampNumber(s, raw) : toNumber(s.default, s.default);
      } else {
        value = clampNumber(s, toNumber(value, s.default));
      }
    }
    out[key] = value;
  }
  return out;
}

function evaluateExpr(
  source: string,
  scope: Record<string, unknown>,
  errors: ResolutionError[],
  key: string,
): number | null {
  const compiled = compileExpression(source) as { ok: boolean; fn: (scope: Record<string, unknown>) => number; error?: { message: string } };
  if (!compiled.ok) {
    errors.push({ key, message: compiled.error?.message ?? 'invalid expression' });
    return null;
  }
  try {
    const v = compiled.fn(scope);
    if (!Number.isFinite(v)) {
      errors.push({ key, message: 'expression returned non-finite value' });
      return null;
    }
    return v;
  } catch (error) {
    errors.push({ key, message: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

function toNumber(v: unknown, dflt: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : Number(dflt);
}
