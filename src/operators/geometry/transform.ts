/**
 * operators/geometry/transform.js — translate · mirror · rotate · scale ·
 * normalize. Curves keep their existing 2D semantics; Surface/Mesh geometry
 * is transformed in canonical world space.
 */

import { Operators } from '../../core/registry.ts';
import { TYPE } from '../../core/schema.ts';
import { fitCurves } from '../../sampling/sampling.js';
import { cloneGeometry, mapGeometryPoints } from '../../geometry/transformGeometry.js';
import { compileOptionalExpression, makeExpressionScope, evaluatePointExpression } from '../expression.ts';
import type { GeneratorContext } from '../../generators/context.ts';

type Rec = Record<string, unknown>;
interface PointLike { x: number; y: number; z?: number; [key: string]: unknown }

let id = 0;
const opId = (p: string): string => `${p}-${id++}`;
const DEG = Math.PI / 180;
const SPATIAL_KINDS = ['curve2d', 'curve3d', 'surface', 'mesh'];
const clone = (item: unknown) => cloneGeometry(item as never, { id: opId('tf') });

Operators.register(({
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
  apply(items: unknown[], p: Rec): unknown[] {
    const dx = Number(p.dx) || 0;
    const dy = Number(p.dy) || 0;
    const dz = Number(p.dz) || 0;
    return items.map((item) => mapGeometryPoints(item as never, (point: Rec) => ({
      ...point,
      x: Number(point.x) + dx,
      y: Number(point.y) + dy,
      ...(Number.isFinite(point.z) ? { z: Number(point.z) + dz } : {}),
    }), { id: opId('tf') }));
  },
}) as never);

Operators.register(({
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
  apply(items: unknown[], p: Rec): unknown[] {
    const out: unknown[] = p.keepOriginal ? items.map(clone) : [];
    const flipX = (point: Rec) => ({ ...point, x: -Number(point.x) });
    const flipY = (point: Rec) => ({ ...point, y: -Number(point.y) });
    for (const item of items) {
      if (p.axis === 'vertical' || p.axis === 'both') {
        out.push(mapGeometryPoints(item, flipX, { id: opId('tf') }));
      }
      if (p.axis === 'horizontal' || p.axis === 'both') {
        out.push(mapGeometryPoints(item, flipY, { id: opId('tf') }));
      }
      if (p.axis === 'both') {
        out.push(mapGeometryPoints(item as never, (point: Rec) => flipY(flipX(point)), { id: opId('tf') }));
      }
    }
    return out;
  },
}) as never);

Operators.register(({
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
  apply(items: unknown[], p: Rec, ctx: GeneratorContext): unknown[] {
    const expr = compileOptionalExpression(p.angleExpr, 'rotate angle', 'angleExpr');
    const scope = expr ? makeExpressionScope(ctx) : null;
    return items.map((item) => {
      const count = geometryPointCount(item as Rec);
      let index = 0;
      return mapGeometryPoints(item as never, (pt: PointLike) => {
        const i = index++;
        if (scope && pt.z !== undefined) scope.z = pt.z;
        const extra = evaluatePointExpression(expr, scope as Rec, pt, i, count) ?? 0;
        const angle = Number(p.angle) || 0;
        const cx = Number(p.cx) || 0;
        const cy = Number(p.cy) || 0;
        const a = (angle + extra) * DEG;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        return { ...pt, x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
      }, { id: opId('tf') });
    });
  },
}) as never);

Operators.register(({
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
  apply(items: unknown[], p: Rec, ctx: GeneratorContext): unknown[] {
    const expr = compileOptionalExpression(p.scaleExpr, 'scale factor', 'scaleExpr');
    const scope = expr ? makeExpressionScope(ctx) : null;
    const sz = Number(p.sz) || 1;
    return items.map((item) => {
      const count = geometryPointCount(item as Rec);
      let index = 0;
      return mapGeometryPoints(item as never, (pt: PointLike) => {
        const i = index++;
        const factor = evaluatePointExpression(expr, scope as Rec, pt, i, count) ?? 1;
        const sx = Number(p.sx) || 1;
        const sy = Number(p.sy) || 1;
        return {
          ...pt,
          x: pt.x * sx * factor,
          y: pt.y * sy * factor,
          ...(Number.isFinite(pt.z) ? { z: Number(pt.z) * sz * factor } : {}),
        };
      }, { id: opId('tf') });
    });
  },
}) as never);

Operators.register(({
  id: 'normalize',
  name: 'Normalize',
  category: 'geometry',
  accepts: ['curve2d', 'curve3d'],
  produces: ['curve2d', 'curve3d'],
  params: {
    size: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 340 },
  },
  apply(curves: unknown[], p: Rec): unknown[] {
    return fitCurves(curves, p.size);
  },
}) as never);

function geometryPointCount(item: Rec | null | undefined): number {
  if (Array.isArray(item?.points)) return item.points.length;
  if (Array.isArray(item?.vertices)) return item.vertices.length;
  const grid = item?.grid as Rec | undefined;
  if (Array.isArray(grid?.points)) {
    return (grid.points as unknown[]).reduce<number>((total, row) => total + (Array.isArray(row) ? row.length : 0), 0);
  }
  return 0;
}
