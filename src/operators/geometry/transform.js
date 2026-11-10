/**
 * operators/geometry/transform.js — translate · mirror · rotate · scale ·
 * normalize. Curves keep their existing 2D semantics; Surface/Mesh geometry
 * is transformed in canonical world space.
 */

import { Operators } from '../../core/registry.ts';
import { TYPE } from '../../core/schema.ts';
import { fitCurves } from '../../sampling/sampling.js';
import { cloneGeometry, mapGeometryPoints } from '../../geometry/transformGeometry.js';
import { compileOptionalExpression, makeExpressionScope, evaluatePointExpression } from '../expression.js';

let id = 0;
const opId = (p) => `${p}-${id++}`;
const DEG = Math.PI / 180;
const SPATIAL_KINDS = ['curve2d', 'curve3d', 'surface', 'mesh'];
const clone = (item) => cloneGeometry(item, { id: opId('tf') });

Operators.register({
  id: 'translate',
  name: 'Translate',
  category: 'geometry',
  space: 'world',
  accepts: SPATIAL_KINDS,
  produces: SPATIAL_KINDS,
  params: {
    dx: { label: 'Δx', type: TYPE.NUMBER, min: -400, max: 400, step: 1, default: 0 },
    dy: { label: 'Δy', type: TYPE.NUMBER, min: -400, max: 400, step: 1, default: 0 },
    dz: { advanced: true, label: 'Δz', type: TYPE.NUMBER, min: -400, max: 400, step: 1, default: 0 },
  },
  apply(items, p) {
    const dx = Number(p.dx) || 0;
    const dy = Number(p.dy) || 0;
    const dz = Number(p.dz) || 0;
    return items.map((item) => mapGeometryPoints(item, (point) => ({
      ...point,
      x: point.x + dx,
      y: point.y + dy,
      ...(Number.isFinite(point.z) ? { z: point.z + dz } : {}),
    }), { id: opId('tf') }));
  },
});

Operators.register({
  id: 'mirror',
  name: 'Mirror',
  category: 'geometry',
  space: 'world',
  accepts: SPATIAL_KINDS,
  produces: SPATIAL_KINDS,
  params: {
    axis: { label: 'Axis', type: TYPE.SELECT, options: ['vertical', 'horizontal', 'both'], default: 'vertical' },
    keepOriginal: { label: 'Keep Original', type: TYPE.BOOLEAN, default: true },
  },
  apply(items, p) {
    const out = p.keepOriginal ? items.map(clone) : [];
    const flipX = (point) => ({ ...point, x: -point.x });
    const flipY = (point) => ({ ...point, y: -point.y });
    for (const item of items) {
      if (p.axis === 'vertical' || p.axis === 'both') {
        out.push(mapGeometryPoints(item, flipX, { id: opId('tf') }));
      }
      if (p.axis === 'horizontal' || p.axis === 'both') {
        out.push(mapGeometryPoints(item, flipY, { id: opId('tf') }));
      }
      if (p.axis === 'both') {
        out.push(mapGeometryPoints(item, (point) => flipY(flipX(point)), { id: opId('tf') }));
      }
    }
    return out;
  },
});

Operators.register({
  id: 'rotate',
  name: 'Rotate',
  category: 'geometry',
  space: 'world',
  accepts: SPATIAL_KINDS,
  produces: SPATIAL_KINDS,
  params: {
    angle: { label: 'Angle (°)', type: TYPE.NUMBER, min: -360, max: 360, step: 0.5, default: 45 },
    angleExpr: {
      label: 'Angle Expr (°)', type: TYPE.EXPRESSION, default: '',
      doc: 'Optional per-point angle added to Angle. Uses x, y, i, n and time.',
    },
    cx: { label: 'Center X', type: TYPE.NUMBER, min: -400, max: 400, step: 1, default: 0 },
    cy: { label: 'Center Y', type: TYPE.NUMBER, min: -400, max: 400, step: 1, default: 0 },
  },
  apply(items, p, ctx) {
    const expr = compileOptionalExpression(p.angleExpr, 'rotate angle', 'angleExpr');
    const scope = expr ? makeExpressionScope(ctx) : null;
    return items.map((item) => {
      const count = geometryPointCount(item);
      let index = 0;
      return mapGeometryPoints(item, (pt) => {
        const i = index++;
        if (scope && pt.z !== undefined) scope.z = pt.z;
        const extra = evaluatePointExpression(expr, scope, pt, i, count) ?? 0;
        const a = (p.angle + extra) * DEG;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const dx = pt.x - p.cx;
        const dy = pt.y - p.cy;
        return { ...pt, x: p.cx + dx * cos - dy * sin, y: p.cy + dx * sin + dy * cos };
      }, { id: opId('tf') });
    });
  },
});

Operators.register({
  id: 'scale',
  name: 'Scale',
  category: 'geometry',
  space: 'world',
  accepts: SPATIAL_KINDS,
  produces: SPATIAL_KINDS,
  params: {
    sx: { label: 'Scale X', type: TYPE.NUMBER, min: 0.05, max: 4, step: 0.01, default: 1 },
    sy: { label: 'Scale Y', type: TYPE.NUMBER, min: 0.05, max: 4, step: 0.01, default: 1 },
    sz: { advanced: true, label: 'Scale Z', type: TYPE.NUMBER, min: 0.05, max: 4, step: 0.01, default: 1 },
    scaleExpr: {
      label: 'Scale Expr (×)', type: TYPE.EXPRESSION, default: '',
      doc: 'Optional per-point uniform multiplier applied on top of Scale X/Y/Z. Uses x, y, i, n and time.',
    },
  },
  apply(items, p, ctx) {
    const expr = compileOptionalExpression(p.scaleExpr, 'scale factor', 'scaleExpr');
    const scope = expr ? makeExpressionScope(ctx) : null;
    const sz = Number(p.sz) || 1;
    return items.map((item) => {
      const count = geometryPointCount(item);
      let index = 0;
      return mapGeometryPoints(item, (pt) => {
        const i = index++;
        const factor = evaluatePointExpression(expr, scope, pt, i, count) ?? 1;
        return {
          ...pt,
          x: pt.x * p.sx * factor,
          y: pt.y * p.sy * factor,
          ...(Number.isFinite(pt.z) ? { z: pt.z * sz * factor } : {}),
        };
      }, { id: opId('tf') });
    });
  },
});

Operators.register({
  id: 'normalize',
  name: 'Normalize',
  category: 'geometry',
  accepts: ['curve2d', 'curve3d'],
  produces: ['curve2d', 'curve3d'],
  params: {
    size: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 340 },
  },
  apply(curves, p) {
    return fitCurves(curves, p.size);
  },
});

function geometryPointCount(item) {
  if (Array.isArray(item?.points)) return item.points.length;
  if (Array.isArray(item?.vertices)) return item.vertices.length;
  if (Array.isArray(item?.grid?.points)) {
    return item.grid.points.reduce((total, row) => total + (Array.isArray(row) ? row.length : 0), 0);
  }
  return 0;
}
