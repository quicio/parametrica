/**
 * operators/geometry/symmetry.js — symmetrize · optical correction.
 */

import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { bboxAll } from '../../sampling/sampling.js';

let id = 0;
const opId = () => `sy-${id++}`;

Operators.register({
  id: 'symmetrize',
  name: 'Symmetrize (dihedral)',
  category: 'geometry',
  params: {
    folds: { label: 'Folds', type: TYPE.NUMBER, min: 1, max: 16, step: 1, default: 4 },
    reflect: { label: 'Reflect Odd Folds', type: TYPE.BOOLEAN, default: true },
  },
  apply(curves, p) {
    const out = [];
    for (let fold = 0; fold < p.folds; fold++) {
      const a = (fold / p.folds) * Math.PI * 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const mirrored = p.reflect && fold % 2 === 1;
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
});

Operators.register({
  id: 'optical-correction',
  name: 'Optical Correction',
  category: 'geometry',
  params: {
    amount: { label: 'Amount', type: TYPE.NUMBER, min: 0, max: 1, step: 0.01, default: 0.5 },
  },
  apply(curves, p) {
    if (p.amount <= 0) return curves;
    const box = bboxAll(curves);
    const half = Math.max(1e-6, box.height / 2);
    return curves.map((c) => ({
      ...c,
      id: opId(),
      points: c.points.map((pt) => {
        // upper mass reads heavier: narrow top, widen bottom, lift centroid
        const t = (pt.y - box.cy) / half; // −1 top … +1 bottom
        const scale = 1 + 0.04 * p.amount * t;
        return {
          x: box.cx + (pt.x - box.cx) * scale,
          y: pt.y - 0.012 * p.amount * half,
        };
      }),
    }));
  },
});
