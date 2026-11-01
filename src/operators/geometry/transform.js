/**
 * operators/geometry/transform.js — mirror · rotate · scale · normalize.
 * Pure Curve[] → Curve[].
 */

import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { fitCurves } from '../../sampling/sampling.js';
import { compileOptionalExpression, makeExpressionScope, evaluatePointExpression } from '../expression.js';

let id = 0;
const opId = (p) => `${p}-${id++}`;
const clone = (c, points) => ({ ...c, id: opId('tf'), points });
const DEG = Math.PI / 180;

Operators.register({
  id: 'mirror',
  name: 'Mirror',
  category: 'geometry',
  params: {
    axis: { label: 'Axis', type: TYPE.SELECT, options: ['vertical', 'horizontal', 'both'], default: 'vertical' },
    keepOriginal: { label: 'Keep Original', type: TYPE.BOOLEAN, default: true },
  },
  apply(curves, p) {
    const out = p.keepOriginal ? curves.map((c) => clone(c, c.points)) : [];
    const flipX = (pt) => ({ ...pt, x: -pt.x });
    const flipY = (pt) => ({ ...pt, y: -pt.y });
    for (const c of curves) {
      if (p.axis === 'vertical' || p.axis === 'both') out.push(clone(c, c.points.map(flipX)));
      if (p.axis === 'horizontal' || p.axis === 'both') out.push(clone(c, c.points.map(flipY)));
      if (p.axis === 'both') out.push(clone(c, c.points.map((pt) => flipY(flipX(pt)))));
    }
    return out;
  },
});

Operators.register({
  id: 'rotate',
  name: 'Rotate',
  category: 'geometry',
  params: {
    angle: { label: 'Angle (°)', type: TYPE.NUMBER, min: -360, max: 360, step: 0.5, default: 45 },
    angleExpr: {
      label: 'Angle Expr (°)', type: TYPE.EXPRESSION, default: '',
      doc: 'Optional per-point angle added to Angle. Uses x, y, i, n and time.',
    },
    cx: { label: 'Center X', type: TYPE.NUMBER, min: -400, max: 400, step: 1, default: 0 },
    cy: { label: 'Center Y', type: TYPE.NUMBER, min: -400, max: 400, step: 1, default: 0 },
  },
  apply(curves, p, ctx) {
    const expr = compileOptionalExpression(p.angleExpr, 'rotate angle', 'angleExpr');
    const scope = expr ? makeExpressionScope(ctx) : null;
    return curves.map((c) => clone(c, c.points.map((pt, i) => {
      const extra = evaluatePointExpression(expr, scope, pt, i, c.points.length) ?? 0;
      const a = (p.angle + extra) * DEG;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const dx = pt.x - p.cx;
      const dy = pt.y - p.cy;
      return { ...pt, x: p.cx + dx * cos - dy * sin, y: p.cy + dx * sin + dy * cos };
    })));
  },
});

Operators.register({
  id: 'scale',
  name: 'Scale',
  category: 'geometry',
  params: {
    sx: { label: 'Scale X', type: TYPE.NUMBER, min: 0.05, max: 4, step: 0.01, default: 1 },
    sy: { label: 'Scale Y', type: TYPE.NUMBER, min: 0.05, max: 4, step: 0.01, default: 1 },
    scaleExpr: {
      label: 'Scale Expr (×)', type: TYPE.EXPRESSION, default: '',
      doc: 'Optional per-point uniform multiplier applied on top of Scale X/Y. Uses x, y, i, n and time.',
    },
  },
  apply(curves, p, ctx) {
    const expr = compileOptionalExpression(p.scaleExpr, 'scale factor', 'scaleExpr');
    const scope = expr ? makeExpressionScope(ctx) : null;
    return curves.map((c) => clone(c, c.points.map((pt, i) => {
      const factor = evaluatePointExpression(expr, scope, pt, i, c.points.length) ?? 1;
      return { ...pt, x: pt.x * p.sx * factor, y: pt.y * p.sy * factor };
    })));
  },
});

Operators.register({
  id: 'normalize',
  name: 'Normalize',
  category: 'geometry',
  params: {
    size: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 340 },
  },
  apply(curves, p) {
    return fitCurves(curves, p.size);
  },
});
