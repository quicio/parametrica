/**
 * operators/topology/repeat.js — structure-multiplying operators:
 * duplicate · radial repeat · polar repeat · grid repeat · recursive repeat.
 */

import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';

let id = 0;
const opId = () => `rp-${id++}`;

const transform = (c, fn) => ({ ...c, id: opId(), points: c.points.map(fn) });

Operators.register({
  id: 'duplicate',
  name: 'Duplicate',
  category: 'topology',
  params: {
    count: { label: 'Copies', type: TYPE.NUMBER, min: 1, max: 24, step: 1, default: 3 },
    dx: { label: 'Δx / copy', type: TYPE.NUMBER, min: -300, max: 300, step: 1, default: 60 },
    dy: { label: 'Δy / copy', type: TYPE.NUMBER, min: -300, max: 300, step: 1, default: 0 },
    rotate: { label: 'Δangle / copy (°)', type: TYPE.NUMBER, min: -180, max: 180, step: 1, default: 0 },
    scale: { label: 'Δscale / copy', type: TYPE.NUMBER, min: 0.5, max: 1.5, step: 0.01, default: 1 },
  },
  apply(curves, p) {
    const out = [];
    for (let k = 0; k < p.count; k++) {
      const a = (p.rotate * k * Math.PI) / 180;
      const cos = Math.cos(a); const sin = Math.sin(a);
      const s = Math.pow(p.scale, k);
      for (const c of curves) {
        out.push(transform(c, (pt) => ({
          x: (pt.x * cos - pt.y * sin) * s + p.dx * k,
          y: (pt.x * sin + pt.y * cos) * s + p.dy * k,
        })));
      }
    }
    return out;
  },
});

Operators.register({
  id: 'radial-repeat',
  name: 'Radial Repeat',
  category: 'topology',
  params: {
    count: { label: 'Copies', type: TYPE.NUMBER, min: 2, max: 48, step: 1, default: 6 },
    radius: { label: 'Orbit Radius', type: TYPE.NUMBER, min: 0, max: 600, step: 1, default: 0 },
    rotateCopies: { label: 'Rotate Copies', type: TYPE.BOOLEAN, default: true },
  },
  apply(curves, p) {
    const out = [];
    for (let k = 0; k < p.count; k++) {
      const a = (k / p.count) * Math.PI * 2;
      const cos = Math.cos(a); const sin = Math.sin(a);
      const ox = Math.cos(a) * p.radius;
      const oy = Math.sin(a) * p.radius;
      for (const c of curves) {
        out.push(transform(c, (pt) => {
          const x = p.rotateCopies ? pt.x * cos - pt.y * sin : pt.x;
          const y = p.rotateCopies ? pt.x * sin + pt.y * cos : pt.y;
          return { x: x + ox, y: y + oy };
        }));
      }
    }
    return out;
  },
});

Operators.register({
  id: 'polar-repeat',
  name: 'Polar Repeat (rings)',
  category: 'topology',
  params: {
    rings: { label: 'Rings', type: TYPE.NUMBER, min: 1, max: 12, step: 1, default: 3 },
    ringScale: { label: 'Scale / Ring', type: TYPE.NUMBER, min: 0.3, max: 1.5, step: 0.01, default: 0.75 },
    rotate: { label: 'Rotate / Ring (°)', type: TYPE.NUMBER, min: -180, max: 180, step: 1, default: 15 },
  },
  apply(curves, p) {
    const out = [];
    for (let ring = 0; ring < p.rings; ring++) {
      const s = Math.pow(p.ringScale, ring);
      const a = (p.rotate * ring * Math.PI) / 180;
      const cos = Math.cos(a); const sin = Math.sin(a);
      for (const c of curves) {
        out.push(transform(c, (pt) => ({
          x: (pt.x * cos - pt.y * sin) * s,
          y: (pt.x * sin + pt.y * cos) * s,
        })));
      }
    }
    return out;
  },
});

Operators.register({
  id: 'grid-repeat',
  name: 'Grid Repeat',
  category: 'topology',
  params: {
    cols: { label: 'Columns', type: TYPE.NUMBER, min: 1, max: 12, step: 1, default: 3 },
    rows: { label: 'Rows', type: TYPE.NUMBER, min: 1, max: 12, step: 1, default: 1 },
    dx: { label: 'Cell Width', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 260 },
    dy: { label: 'Cell Height', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 260 },
  },
  apply(curves, p) {
    const out = [];
    const ox = ((p.cols - 1) * p.dx) / 2;
    const oy = ((p.rows - 1) * p.dy) / 2;
    for (let r = 0; r < p.rows; r++) {
      for (let q = 0; q < p.cols; q++) {
        const tx = q * p.dx - ox;
        const ty = r * p.dy - oy;
        for (const c of curves) {
          out.push(transform(c, (pt) => ({ x: pt.x + tx, y: pt.y + ty })));
        }
      }
    }
    return out;
  },
});

Operators.register({
  id: 'recursive-repeat',
  name: 'Recursive Repeat',
  category: 'topology',
  params: {
    depth: { label: 'Depth', type: TYPE.NUMBER, min: 1, max: 8, step: 1, default: 3 },
    scale: { label: 'Scale / Level', type: TYPE.NUMBER, min: 0.2, max: 0.95, step: 0.01, default: 0.6 },
    rotate: { label: 'Rotate / Level (°)', type: TYPE.NUMBER, min: -180, max: 180, step: 1, default: 20 },
    dx: { label: 'Δx / Level', type: TYPE.NUMBER, min: -200, max: 200, step: 1, default: 0 },
    dy: { label: 'Δy / Level', type: TYPE.NUMBER, min: -200, max: 200, step: 1, default: -60 },
  },
  apply(curves, p) {
    let level = curves.map((c) => ({ ...c, id: opId() }));
    const out = [...level];
    let tx = 0; let ty = 0; let angle = 0; let s = 1;
    for (let d = 1; d < p.depth; d++) {
      tx += p.dx; ty += p.dy;
      angle += (p.rotate * Math.PI) / 180;
      s *= p.scale;
      const cos = Math.cos(angle); const sin = Math.sin(angle);
      const cx = tx; const cy = ty; const cs = cos; const sn = sin; const sc = s;
      level = curves.map((c) => transform(c, (pt) => ({
        x: (pt.x * cs - pt.y * sn) * sc + cx,
        y: (pt.x * sn + pt.y * cs) * sc + cy,
      })));
      out.push(...level);
    }
    return out;
  },
});
