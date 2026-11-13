/**
 * operators/geometry/resample.js — resample · subdivide · smooth.
 */

import { Operators } from '../../core/registry.ts';
import { TYPE } from '../../core/schema.ts';

type Rec = Record<string, unknown>;
interface Vec2 { x: number; y: number }
interface CurveLike { points: Vec2[]; closed?: boolean; id?: string; [key: string]: unknown }
import { resampleUniform } from '../../sampling/sampling.js';

let id = 0;
const opId = (): string => `rs-${id++}`;

Operators.register(({
  id: 'resample',
  name: 'Resample (arc-length uniform)',
  category: 'geometry',
  params: {
    points: { label: 'Points', type: TYPE.NUMBER, min: 16, max: 4000, step: 1, default: 500 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    return curves.map((c) => ({ ...c, id: opId(), points: resampleUniform(c.points as never, Number(p.points), Boolean(c.closed)) }));
  },
}) as never);

Operators.register(({
  id: 'subdivide',
  name: 'Subdivide',
  category: 'geometry',
  params: {
    level: { label: 'Level', type: TYPE.NUMBER, min: 1, max: 4, step: 1, default: 1 },
    scheme: { label: 'Scheme', type: TYPE.SELECT, options: ['midpoint', 'chaikin'], default: 'chaikin' },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    return curves.map((c) => {
      let pts = c.points;
      for (let l = 0; l < Number(p.level); l++) {
        pts = p.scheme === 'chaikin' ? chaikin(pts, Boolean(c.closed)) : midpoint(pts, Boolean(c.closed));
      }
      return { ...c, id: opId(), points: pts };
    });
  },
}) as never);

Operators.register(({
  id: 'smooth',
  name: 'Smooth (Laplacian)',
  category: 'geometry',
  params: {
    iterations: { label: 'Iterations', type: TYPE.NUMBER, min: 1, max: 12, step: 1, default: 2 },
    strength: { label: 'Strength', type: TYPE.NUMBER, min: 0.05, max: 1, step: 0.05, default: 0.5 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    return curves.map((c) => {
      let pts = c.points.map((pt) => ({ ...pt }));
      for (let it = 0; it < Number(p.iterations); it++) {
        pts = laplacian(pts, Boolean(c.closed), Number(p.strength));
      }
      return { ...c, id: opId(), points: pts };
    });
  },
}) as never);

function midpoint(points: Vec2[], closed: boolean): Vec2[] {
  const out = [];
  const n = points.length;
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    out.push({ ...a }, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  }
  if (!closed) out.push({ ...points[n - 1]! });
  return out;
}

function chaikin(points: Vec2[], closed: boolean): Vec2[] {
  const out = [];
  const n = points.length;
  const count = closed ? n : n - 1;
  if (!closed) out.push({ ...points[0]! });
  for (let i = 0; i < count; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    out.push(
      { ...a, x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 },
      { ...b, x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 },
    );
  }
  if (!closed) out.push({ ...points[n - 1]! });
  return out;
}

function laplacian(points: Vec2[], closed: boolean, strength: number): Vec2[] {
  const n = points.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) {
      out[i] = points[i]!;
      continue;
    }
    const prev = points[(((i - 1) % n) + n) % n]!;
    const next = points[(i + 1) % n]!;
    const current = points[i]!;
    out[i] = {
      x: current.x + strength * ((prev.x + next.x) / 2 - current.x),
      y: current.y + strength * ((prev.y + next.y) / 2 - current.y),
    };
  }
  return out;
}
