/**
 * operators/geometry/project.ts — project · clip.
 */

import { Operators } from '../../core/registry.ts';
import { TYPE } from '../../core/schema.ts';

type Rec = Record<string, unknown>;
interface Vec2 { x: number; y: number }
interface CurveLike extends Rec { points: Vec2[]; closed?: boolean; id?: string }

let id = 0;
const opId = (): string => `pj-${id++}`;

Operators.register(({
  id: 'project',
  name: 'Project',
  category: 'geometry',
  params: {
    mode: { label: 'Target', type: TYPE.SELECT, options: ['circle', 'line'], default: 'circle' },
    radius: { label: 'Radius', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 260 },
    mix: { label: 'Mix', type: TYPE.NUMBER, min: 0, max: 1, step: 0.01, default: 1 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const radius = Number(p.radius);
    const mix = Number(p.mix);
    return curves.map((c) => ({
      ...c,
      id: opId(),
      points: c.points.map((pt) => {
        let target: Vec2;
        if (p.mode === 'circle') {
          const len = Math.hypot(pt.x, pt.y) || 1e-9;
          target = { ...pt, x: (pt.x / len) * radius, y: (pt.y / len) * radius };
        } else {
          target = { ...pt, x: pt.x, y: 0 };
        }
        return {
          ...pt,
          x: pt.x + (target.x - pt.x) * mix,
          y: pt.y + (target.y - pt.y) * mix,
        };
      }),
    }));
  },
}) as never);

Operators.register(({
  id: 'clip',
  name: 'Clip',
  category: 'geometry',
  params: {
    shape: { label: 'Window', type: TYPE.SELECT, options: ['rect', 'circle'], default: 'circle' },
    width: { label: 'Width', type: TYPE.NUMBER, min: 40, max: 1200, step: 1, default: 640 },
    height: { label: 'Height', type: TYPE.NUMBER, min: 40, max: 1200, step: 1, default: 640 },
    radius: { label: 'Radius', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 320 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const width = Number(p.width);
    const height = Number(p.height);
    const radius = Number(p.radius);
    const inside = p.shape === 'circle'
      ? (pt: Vec2): boolean => Math.hypot(pt.x, pt.y) <= radius
      : (pt: Vec2): boolean => Math.abs(pt.x) <= width / 2 && Math.abs(pt.y) <= height / 2;
    const out: unknown[] = [];
    for (const c of curves) {
      let run: Vec2[] = [];
      const flush = (): void => {
        if (run.length > 1) out.push({ id: opId(), points: run, closed: false, meta: { source: 'clip' } });
        run = [];
      };
      const n = c.points.length;
      const count = c.closed ? n : n - 1;
      for (let i = 0; i < count; i++) {
        const a = c.points[i]!;
        const b = c.points[(i + 1) % n]!;
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
}) as never);
