/**
 * operators/geometry/expressionClip.ts — keep/discard points with a
 * boolean expression, emitting one open polyline per surviving run.
 */

import { Operators } from '../../core/registry.ts';
import { TYPE } from '../../core/schema.ts';
import { compileExpression } from '../../math/expression.ts';
import type { GeneratorContext } from '../../generators/context.ts';

type Rec = Record<string, unknown>;
interface Vec2 { x: number; y: number }
interface CurveLike extends Rec { points: Vec2[]; closed?: boolean; id?: string; meta?: Rec }
interface CompiledExpression { ok: boolean; fn?: (scope: Rec) => number; error?: { message: string } }

let id = 0;
const opId = (): string => `clipx-${id++}`;

Operators.register(({
  id: 'expression-clip',
  name: 'Clip (expression)',
  category: 'geometry',
  params: {
    expr: {
      label: 'Keep if…', type: TYPE.EXPRESSION,
      default: 'x^2 + y^2 < 160^2',
      doc: 'Boolean expression evaluated per point. Uses x, y, i, n and time.',
    },
    invert: { label: 'Invert', type: TYPE.BOOLEAN, default: false },
  },
  apply(curves: CurveLike[], p: Rec, ctx: GeneratorContext): unknown[] {
    const compiled = compileExpression(String(p.expr ?? '')) as CompiledExpression;
    if (!compiled.ok) {
      const error = new Error(`clip expression: ${compiled.error?.message ?? 'invalid expression'}`) as Error & { key?: string; span?: unknown };
      error.key = 'expr';
      error.span = compiled.error;
      throw error;
    }
    const fn = compiled.fn!;
    const scope = Object.assign(Object.create(null), ctx.scope, { time: ctx.time ?? 0 }) as Rec;
    const out: unknown[] = [];

    for (const c of curves) {
      const runs: Vec2[][] = [];
      let current: Vec2[] = [];
      let dropped = false;
      for (let i = 0; i < c.points.length; i++) {
        const pt = c.points[i]!;
        scope.x = pt.x;
        scope.y = pt.y;
        scope.i = i;
        scope.n = c.points.length;
        let value: number;
        try {
          value = fn(scope);
        } catch (e) {
          const error = new Error(`clip expression: ${e instanceof Error ? e.message : String(e)}`) as Error & { key?: string };
          error.key = 'expr';
          throw error;
        }
        let keep = Number.isFinite(value) ? Boolean(value) : false;
        if (p.invert) keep = !keep;
        if (keep) {
          current.push(pt);
        } else {
          dropped = true;
          if (current.length >= 2) runs.push(current);
          current = [];
        }
      }
      if (current.length >= 2) runs.push(current);
      else if (current.length === 1) dropped = true;

      runs.forEach((points, index) => {
        out.push({
          ...c,
          id: `${c.id ?? opId()}-clip${index}`,
          points,
          closed: Boolean(c.closed) && !dropped && runs.length === 1,
          meta: { ...(c.meta ?? {}), clip: 'expression', segment: index },
        });
      });
    }
    return out;
  },
}) as never);
