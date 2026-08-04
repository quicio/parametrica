/**
 * operators/geometry/resample.js — resample · subdivide · smooth.
 */

import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { resampleUniform } from '../../sampling/sampling.js';

let id = 0;
const opId = () => `rs-${id++}`;

Operators.register({
  id: 'resample',
  name: 'Resample (arc-length uniform)',
  category: 'geometry',
  params: {
    points: { label: 'Points', type: TYPE.NUMBER, min: 16, max: 4000, step: 1, default: 500 },
  },
  apply(curves, p) {
    return curves.map((c) => ({ ...c, id: opId(), points: resampleUniform(c.points, p.points, c.closed) }));
  },
});

Operators.register({
  id: 'subdivide',
  name: 'Subdivide',
  category: 'geometry',
  params: {
    level: { label: 'Level', type: TYPE.NUMBER, min: 1, max: 4, step: 1, default: 1 },
    scheme: { label: 'Scheme', type: TYPE.SELECT, options: ['midpoint', 'chaikin'], default: 'chaikin' },
  },
  apply(curves, p) {
    return curves.map((c) => {
      let pts = c.points;
      for (let l = 0; l < p.level; l++) {
        pts = p.scheme === 'chaikin' ? chaikin(pts, c.closed) : midpoint(pts, c.closed);
      }
      return { ...c, id: opId(), points: pts };
    });
  },
});

Operators.register({
  id: 'smooth',
  name: 'Smooth (Laplacian)',
  category: 'geometry',
  params: {
    iterations: { label: 'Iterations', type: TYPE.NUMBER, min: 1, max: 12, step: 1, default: 2 },
    strength: { label: 'Strength', type: TYPE.NUMBER, min: 0.05, max: 1, step: 0.05, default: 0.5 },
  },
  apply(curves, p) {
    return curves.map((c) => {
      let pts = c.points.map((pt) => ({ ...pt }));
      for (let it = 0; it < p.iterations; it++) {
        pts = laplacian(pts, c.closed, p.strength);
      }
      return { ...c, id: opId(), points: pts };
    });
  },
});

function midpoint(points, closed) {
  const out = [];
  const n = points.length;
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    out.push({ x: a.x, y: a.y }, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  }
  if (!closed) out.push({ ...points[n - 1] });
  return out;
}

function chaikin(points, closed) {
  const out = [];
  const n = points.length;
  const count = closed ? n : n - 1;
  if (!closed) out.push({ ...points[0] });
  for (let i = 0; i < count; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    out.push(
      { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 },
      { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 },
    );
  }
  if (!closed) out.push({ ...points[n - 1] });
  return out;
}

function laplacian(points, closed, strength) {
  const n = points.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) {
      out[i] = points[i];
      continue;
    }
    const prev = points[(((i - 1) % n) + n) % n];
    const next = points[(i + 1) % n];
    out[i] = {
      x: points[i].x + strength * ((prev.x + next.x) / 2 - points[i].x),
      y: points[i].y + strength * ((prev.y + next.y) / 2 - points[i].y),
    };
  }
  return out;
}
