/**
 * operators/geometry/deform.js — twist · bend · warp · noise displace.
 */

import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { bboxAll } from '../../sampling/sampling.js';
import { compileExpression } from '../../math/expression.js';
import { createNoise2D } from '../../math/noise.js';
import { analyzeCurve } from '../../analysis/differential.js';

let id = 0;
const opId = () => `df-${id++}`;
const DEG = Math.PI / 180;

Operators.register({
  id: 'twist',
  name: 'Twist',
  category: 'geometry',
  params: {
    angle: { label: 'Angle (°)', type: TYPE.NUMBER, min: -720, max: 720, step: 1, default: 90 },
  },
  apply(curves, p) {
    const box = bboxAll(curves);
    const half = Math.max(1e-6, box.height / 2);
    return curves.map((c) => ({
      ...c,
      id: opId(),
      points: c.points.map((pt) => {
        const a = p.angle * DEG * ((pt.y - box.cy) / half);
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const dx = pt.x - box.cx;
        const dy = pt.y - box.cy;
        return { ...pt, x: box.cx + dx * cos - dy * sin, y: box.cy + dx * sin + dy * cos };
      }),
    }));
  },
});

Operators.register({
  id: 'bend',
  name: 'Bend',
  category: 'geometry',
  params: {
    angle: { label: 'Angle (°)', type: TYPE.NUMBER, min: -170, max: 170, step: 1, default: 60 },
  },
  apply(curves, p) {
    const box = bboxAll(curves);
    const arc = Math.max(1e-3, Math.abs(p.angle) * DEG);
    const R = Math.max(box.width, 1e-3) / arc;
    const sign = Math.sign(p.angle) || 1;
    return curves.map((c) => ({
      ...c,
      id: opId(),
      points: c.points.map((pt) => {
        const u = (pt.x - box.cx) / R;
        return {
          x: box.cx + sign * R * Math.sin(u),
          y: pt.y + sign * R * (1 - Math.cos(u)) * 0.5,
        };
      }),
    }));
  },
});

Operators.register({
  id: 'warp',
  name: 'Warp (expression)',
  category: 'geometry',
  params: {
    exprX: { label: "x'(x,y)", type: TYPE.EXPRESSION, default: 'x + 40*sin(y/60)' },
    exprY: { label: "y'(x,y)", type: TYPE.EXPRESSION, default: 'y' },
  },
  apply(curves, p, ctx) {
    const fx = compileExpression(p.exprX);
    const fy = compileExpression(p.exprY);
    if (!fx.ok) {
      const e = new Error(`warp x': ${fx.error.message}`);
      e.key = 'exprX';
      e.span = fx.error;
      throw e;
    }
    if (!fy.ok) {
      const e = new Error(`warp y': ${fy.error.message}`);
      e.key = 'exprY';
      e.span = fy.error;
      throw e;
    }
    const scope = Object.assign(Object.create(null), ctx.scope, { time: ctx.time ?? 0 });
    return curves.map((c) => ({
      ...c,
      id: opId(),
      points: c.points.map((pt, i) => {
        scope.x = pt.x;
        scope.y = pt.y;
        scope.i = i;
        scope.n = c.points.length;
        const x = fx.fn(scope);
        const y = fy.fn(scope);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return pt;
        return { x, y };
      }),
    }));
  },
});

Operators.register({
  id: 'noise-displace',
  name: 'Noise Displace',
  category: 'geometry',
  params: {
    amplitude: { label: 'Amplitude', type: TYPE.NUMBER, min: 0, max: 120, step: 0.5, default: 14 },
    scale: { label: 'Scale', type: TYPE.NUMBER, min: 0.001, max: 0.1, step: 0.001, default: 0.012 },
    seed: { label: 'Seed', type: TYPE.NUMBER, min: 1, max: 9999, step: 1, default: 1 },
  },
  apply(curves, p, ctx) {
    const noise = createNoise2D((p.seed + (ctx.seed ?? 0)) >>> 0);
    return curves.map((c) => {
      const { normals } = analyzeCurve(c.points, c.closed);
      return {
        ...c,
        id: opId(),
        points: c.points.map((pt, i) => {
          const nrm = normals[i] ?? { x: 0, y: 1 };
          const d = noise(pt.x * p.scale, pt.y * p.scale) * p.amplitude;
          return { ...pt, x: pt.x + nrm.x * d, y: pt.y + nrm.y * d };
        }),
      };
    });
  },
});
