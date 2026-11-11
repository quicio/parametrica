/** Multi-curve generator helpers. */

import { makeScope } from './context.ts';
import type { GeneratorContext } from './context.ts';
import { postProcess } from '../sampling/parametric.ts';
import { TAU } from '../math/periods.ts';
import type { ParamSchema } from '../core/schema.ts';
import type { GeneratorDefinition } from '../core/registry.ts';

export interface Point { x: number; y: number }
export interface CurveLike {
  id?: string;
  points: Point[];
  closed?: boolean;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}
export interface ComposeOptions {
  count: number;
  t0?: number;
  t1?: number;
  closed?: boolean;
  source?: string;
  scope: Record<string, unknown>;
}
export type BranchFn = (index: number, context: { scope: Record<string, unknown>; t0: number; t1: number }) => Point[];

/** Compose a Curve[] from a per-sample branch function. */
export function composeCurves(branchFn: BranchFn, {
  count,
  t0 = 0,
  t1 = TAU,
  closed = false,
  source = 'compose',
  scope,
}: ComposeOptions): CurveLike[] {
  const curves: CurveLike[] = [];
  for (let i = 0; i < count; i++) {
    scope.t = t0 + ((t1 - t0) * i) / Math.max(1, count - 1);
    scope.theta = scope.t;
    const points = branchFn(i, { scope, t0, t1 });
    if (!Array.isArray(points) || points.length < 2) continue;
    const clean: Point[] = [];
    for (const p of points) {
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) clean.push(p);
      else if (clean.length) break;
    }
    if (clean.length >= 2) {
      curves.push({
        id: `${source}-${i}`,
        points: clean,
        closed,
        meta: { source, branch: i },
      });
    }
  }
  return curves;
}

export interface MultiCurveOptions<P extends object> {
  id: string;
  name: string;
  category?: string;
  params: ParamSchema;
  sample: (params: P, ctx: GeneratorContext, scope: Record<string, unknown>) => CurveLike[];
}

/** Sugar for generators that emit multiple curves. */
export function registerMultiCurveGenerator<P extends object>({ id, name, category = 'attractor', params, sample }: MultiCurveOptions<P>): GeneratorDefinition {
  return {
    id,
    name,
    category,
    params,
    domain: () => ({ t0: 0, t1: TAU, closed: false }),
    sample(p: P, ctx: GeneratorContext) {
      const scope = makeScope(ctx);
      const curves = sample(p, ctx, scope);
      return postProcess(curves as never, p as never);
    },
  } as unknown as GeneratorDefinition;
}
