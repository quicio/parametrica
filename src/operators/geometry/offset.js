/**
 * operators/geometry/offset.js — offset · inflate · shrink.
 *
 * Polyline offset along miter normals (clamped to avoid spikes).
 * For closed curves, "outward" is determined empirically: the offset
 * direction that grows the bounding box — orientation-free and always
 * correct regardless of winding.
 */

import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { bbox } from '../../sampling/sampling.js';

let id = 0;
const opId = () => `off-${id++}`;

/** Offset a polyline by signed distance d (positive = left of travel). */
export function offsetPoints(points, d, closed) {
  const n = points.length;
  if (n < 2 || d === 0) return points.map((p) => ({ ...p }));

  const seg = (i) => {
    const a = points[i];
    const b = points[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1e-9;
    return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  };

  const out = new Array(n);
  const segCount = closed ? n : n - 1;
  for (let i = 0; i < n; i++) {
    const d0 = seg(Math.max(0, Math.min(segCount - 1, i - 1)));
    const d1 = seg(Math.max(0, Math.min(segCount - 1, i)));
    // left normals
    const n0 = { x: -d0.y, y: d0.x };
    const n1 = { x: -d1.y, y: d1.x };
    let mx = n0.x + n1.x;
    let my = n0.y + n1.y;
    const mLen = Math.hypot(mx, my);
    if (mLen < 1e-9) { mx = n0.x; my = n0.y; } else { mx /= mLen; my /= mLen; }
    // miter length, clamped
    const dot = Math.max(0.35, mx * n0.x + my * n0.y);
    const k = Math.min(4, 1 / dot);
    if (!closed && (i === 0 || i === n - 1)) {
      const nn = i === 0 ? n0 : n1;
      out[i] = { x: points[i].x + nn.x * d, y: points[i].y + nn.y * d };
    } else {
      out[i] = { x: points[i].x + mx * d * k, y: points[i].y + my * d * k };
    }
  }
  return out;
}

function signedArea(points, closed) {
  let a = 0;
  const n = points.length;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p = points[i];
    const q = points[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

Operators.register({
  id: 'offset',
  name: 'Offset',
  category: 'geometry',
  params: {
    distance: { label: 'Distance', type: TYPE.NUMBER, min: -120, max: 120, step: 0.5, default: 10 },
    copies: { label: 'Copies', type: TYPE.NUMBER, min: 1, max: 12, step: 1, default: 1 },
  },
  apply(curves, p) {
    const out = curves.map((c) => ({ ...c, id: opId() }));
    for (let k = 1; k <= p.copies; k++) {
      for (const c of curves) {
        out.push({ ...c, id: opId(), points: offsetPoints(c.points, p.distance * k, c.closed) });
      }
    }
    return out;
  },
});

Operators.register({
  id: 'inflate',
  name: 'Inflate',
  category: 'geometry',
  params: {
    amount: { label: 'Amount', type: TYPE.NUMBER, min: 1, max: 150, step: 0.5, default: 12 },
  },
  apply(curves, p) {
    return curves.map((c) => {
      if (!c.closed) return { ...c, id: opId(), points: offsetPoints(c.points, p.amount, false) };
      // outward = direction that grows the bbox
      const plus = offsetPoints(c.points, p.amount, true);
      const minus = offsetPoints(c.points, -p.amount, true);
      const grown = bbox(plus).diagonal >= bbox(minus).diagonal ? plus : minus;
      return { ...c, id: opId(), points: grown };
    });
  },
});

Operators.register({
  id: 'shrink',
  name: 'Shrink',
  category: 'geometry',
  params: {
    amount: { label: 'Amount', type: TYPE.NUMBER, min: 1, max: 150, step: 0.5, default: 8 },
  },
  apply(curves, p) {
    return curves.map((c) => {
      if (!c.closed) return { ...c, id: opId(), points: offsetPoints(c.points, -p.amount, false) };
      const plus = offsetPoints(c.points, p.amount, true);
      const minus = offsetPoints(c.points, -p.amount, true);
      const shrunk = bbox(plus).diagonal <= bbox(minus).diagonal ? plus : minus;
      return { ...c, id: opId(), points: shrunk };
    });
  },
});

// keep linter honest: signedArea reserved for future winding-based ops
void signedArea;
