/**
 * operators/geometry/symmetry.ts — symmetrize · optical correction.
 */

import { Operators } from '../../core/registry.ts';
import { TYPE } from '../../core/schema.ts';
import { bboxAll } from '../../sampling/sampling.ts';

type Rec = Record<string, unknown>;
interface Vec2 { x: number; y: number }
interface CurveLike extends Rec { points: Vec2[]; id?: string }

let id = 0;
const opId = (): string => `sy-${id++}`;

Operators.register(({
  id: 'symmetrize',
  name: 'Symmetrize (dihedral)',
  category: 'geometry',
  params: {
    folds: { label: 'Folds', type: TYPE.NUMBER, min: 1, max: 16, step: 1, default: 4 },
    reflect: { label: 'Reflect Odd Folds', type: TYPE.BOOLEAN, default: true },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const folds = Number(p.folds);
    const out: unknown[] = [];
    for (let fold = 0; fold < folds; fold++) {
      const a = (fold / folds) * Math.PI * 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const mirrored = Boolean(p.reflect) && fold % 2 === 1;
      for (const c of curves) {
        out.push({
          ...c,
          id: opId(),
          points: c.points.map((pt) => {
            const x = mirrored ? -pt.x : pt.x;
            return { ...pt, x: x * cos - pt.y * sin, y: x * sin + pt.y * cos };
          }),
        });
      }
    }
    return out;
  },
}) as never);

Operators.register(({
  id: 'kaleidoscope',
  name: 'Kaleidoscope',
  category: 'geometry',
  params: {
    folds: { label: 'Folds', type: TYPE.NUMBER, min: 2, max: 24, step: 1, default: 6 },
    angle: { label: 'Angle Offset (°)', type: TYPE.NUMBER, min: -360, max: 360, step: 1, default: 0 },
    reflect: { label: 'Mirror Sectors', type: TYPE.BOOLEAN, default: true },
    cx: { label: 'Center X', type: TYPE.NUMBER, min: -500, max: 500, step: 1, default: 0 },
    cy: { label: 'Center Y', type: TYPE.NUMBER, min: -500, max: 500, step: 1, default: 0 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const folds = Math.max(1, Math.round(Number(p.folds)));
    const step = (Math.PI * 2) / folds;
    const offset = (Number(p.angle) || 0) * (Math.PI / 180);
    const cx = Number(p.cx) || 0;
    const cy = Number(p.cy) || 0;
    const out: unknown[] = [];
    for (let fold = 0; fold < folds; fold++) {
      const a = offset + fold * step;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      for (const c of curves) {
        out.push({
          ...c,
          id: opId(),
          points: c.points.map((pt) => {
            const dx = pt.x - cx;
            const dy = pt.y - cy;
            return { ...pt, x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
          }),
        });
        if (p.reflect) {
          out.push({
            ...c,
            id: opId(),
            points: c.points.map((pt) => {
              const dx = pt.x - cx;
              const dy = -(pt.y - cy);
              return { ...pt, x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
            }),
          });
        }
      }
    }
    return out;
  },
}) as never);

Operators.register(({
  id: 'optical-correction',
  name: 'Optical Correction',
  category: 'geometry',
  params: {
    amount: { label: 'Amount', type: TYPE.NUMBER, min: 0, max: 1, step: 0.01, default: 0.5 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const amount = Number(p.amount);
    if (amount <= 0) return curves;
    const box = bboxAll(curves) as { cx: number; cy: number; height: number };
    const half = Math.max(1e-6, box.height / 2);
    return curves.map((c) => ({
      ...c,
      id: opId(),
      points: c.points.map((pt) => {
        // upper mass reads heavier: narrow top, widen bottom, lift centroid
        const t = (pt.y - box.cy) / half; // −1 top … +1 bottom
        const scale = 1 + 0.04 * amount * t;
        return {
          x: box.cx + (pt.x - box.cx) * scale,
          y: pt.y - 0.012 * amount * half,
        };
      }),
    }));
  },
}) as never);
