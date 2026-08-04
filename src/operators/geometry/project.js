/**
 * operators/geometry/project.js — project · clip.
 */

import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';

let id = 0;
const opId = () => `pj-${id++}`;

Operators.register({
  id: 'project',
  name: 'Project',
  category: 'geometry',
  params: {
    mode: { label: 'Target', type: TYPE.SELECT, options: ['circle', 'line'], default: 'circle' },
    radius: { label: 'Radius', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 260 },
    mix: { label: 'Mix', type: TYPE.NUMBER, min: 0, max: 1, step: 0.01, default: 1 },
  },
  apply(curves, p) {
    return curves.map((c) => ({
      ...c,
      id: opId(),
      points: c.points.map((pt) => {
        let target;
        if (p.mode === 'circle') {
          const len = Math.hypot(pt.x, pt.y) || 1e-9;
          target = { x: (pt.x / len) * p.radius, y: (pt.y / len) * p.radius };
        } else {
          target = { x: pt.x, y: 0 };
        }
        return {
          x: pt.x + (target.x - pt.x) * p.mix,
          y: pt.y + (target.y - pt.y) * p.mix,
        };
      }),
    }));
  },
});

Operators.register({
  id: 'clip',
  name: 'Clip',
  category: 'geometry',
  params: {
    shape: { label: 'Window', type: TYPE.SELECT, options: ['rect', 'circle'], default: 'circle' },
    width: { label: 'Width', type: TYPE.NUMBER, min: 40, max: 1200, step: 1, default: 640 },
    height: { label: 'Height', type: TYPE.NUMBER, min: 40, max: 1200, step: 1, default: 640 },
    radius: { label: 'Radius', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 320 },
  },
  apply(curves, p) {
    const inside = p.shape === 'circle'
      ? (pt) => Math.hypot(pt.x, pt.y) <= p.radius
      : (pt) => Math.abs(pt.x) <= p.width / 2 && Math.abs(pt.y) <= p.height / 2;
    const out = [];
    for (const c of curves) {
      let run = [];
      const flush = () => {
        if (run.length > 1) out.push({ id: opId(), points: run, closed: false, meta: { source: 'clip' } });
        run = [];
      };
      const n = c.points.length;
      const count = c.closed ? n : n - 1;
      for (let i = 0; i < count; i++) {
        const a = c.points[i];
        const b = c.points[(i + 1) % n];
        const aIn = inside(a);
        const bIn = inside(b);
        if (aIn) run.push(a);
        if (aIn !== bIn) {
          // bisect for the crossing point
          let lo = 0; let hi = 1;
          for (let k = 0; k < 24; k++) {
            const mid = (lo + hi) / 2;
            const probe = { x: a.x + (b.x - a.x) * mid, y: a.y + (b.y - a.y) * mid };
            if (inside(probe) === aIn) lo = mid; else hi = mid;
          }
          const cross = { x: a.x + (b.x - a.x) * lo, y: a.y + (b.y - a.y) * lo };
          if (aIn) { run.push(cross); flush(); } else { run.push(cross); }
        }
        if (!aIn && bIn) run.push(b);
      }
      flush();
    }
    return out;
  },
});
