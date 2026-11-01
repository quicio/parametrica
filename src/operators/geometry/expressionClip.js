/**
 * operators/geometry/expressionClip.js — keep/discard points with a
 * boolean expression, emitting one open polyline per surviving run.
 */

import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { compileExpression } from '../../math/expression.js';

let id = 0;
const opId = () => `clipx-${id++}`;

Operators.register({
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
  apply(curves, p, ctx) {
    const compiled = compileExpression(p.expr);
    if (!compiled.ok) {
      const error = new Error(`clip expression: ${compiled.error.message}`);
      error.key = 'expr';
      error.span = compiled.error;
      throw error;
    }
    const scope = Object.assign(Object.create(null), ctx.scope, { time: ctx.time ?? 0 });
    const out = [];

    for (const c of curves) {
      const runs = [];
      let current = [];
      let dropped = false;
      for (let i = 0; i < c.points.length; i++) {
        const pt = c.points[i];
        scope.x = pt.x;
        scope.y = pt.y;
        scope.i = i;
        scope.n = c.points.length;
        let value;
        try {
          value = compiled.fn(scope);
        } catch (e) {
          const error = new Error(`clip expression: ${e.message}`);
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
});
