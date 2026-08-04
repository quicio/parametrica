/**
 * operators/geometry/transform.js — mirror · rotate · scale · normalize.
 * Pure Curve[] → Curve[].
 */

import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { fitCurves } from '../../sampling/sampling.js';

let id = 0;
const opId = (p) => `${p}-${id++}`;
const clone = (c, points) => ({ ...c, id: opId('tf'), points });

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
    const flipX = (pt) => ({ x: -pt.x, y: pt.y });
    const flipY = (pt) => ({ x: pt.x, y: -pt.y });
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
    cx: { label: 'Center X', type: TYPE.NUMBER, min: -400, max: 400, step: 1, default: 0 },
    cy: { label: 'Center Y', type: TYPE.NUMBER, min: -400, max: 400, step: 1, default: 0 },
  },
  apply(curves, p) {
    const a = (p.angle * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return curves.map((c) => clone(c, c.points.map((pt) => {
      const dx = pt.x - p.cx;
      const dy = pt.y - p.cy;
      return { x: p.cx + dx * cos - dy * sin, y: p.cy + dx * sin + dy * cos };
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
  },
  apply(curves, p) {
    return curves.map((c) => clone(c, c.points.map((pt) => ({ x: pt.x * p.sx, y: pt.y * p.sy }))));
  },
});

Operators.register({
  id: 'normalize',
  name: 'Normalize',
  category: 'geometry',
  params: {
    size: { label: 'Fit Size', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 340 },
  },
  apply(curves, p) {
    return fitCurves(curves, p.size);
  },
});
