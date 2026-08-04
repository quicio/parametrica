/**
 * render/passes/core.js — stroke · points · wireframe · control polygon.
 */

import { RenderPasses } from '../../core/registry.js';

export function traceCurve(p, curve) {
  // Two paths: if the curve carries per-point depth, draw segment-by-segment
  // so each segment's stroke alpha can fade with depth. Otherwise use the
  // cheap beginShape/vertex path.
  const pts = curve.points;
  if (curve.closed) {
    p.beginShape();
    for (const pt of pts) p.vertex(pt.x, pt.y);
    p.endShape(p.CLOSE);
    return;
  }
  if (pts[0]?.depthAlpha != null) {
    // depth-aware path: one line per segment with its own alpha
    p.beginShape(p.LINES);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const alpha = Math.round(((a.depthAlpha ?? 1) + (b.depthAlpha ?? 1)) / 2 * 255);
      p.stroke(255, alpha);
      p.vertex(a.x, a.y);
      p.vertex(b.x, b.y);
    }
    p.endShape();
    return;
  }
  p.beginShape();
  for (const pt of pts) p.vertex(pt.x, pt.y);
  p.endShape();
}

RenderPasses.register({
  id: 'stroke',
  name: 'Stroke',
  draw(p, { curves, view }) {
    p.noFill();
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
    for (const c of curves) {
      // If any point has depthAlpha, the tracer handles stroke per segment;
      // otherwise we set a single stroke for the whole curve.
      const hasDepth = c.points[0]?.depthAlpha != null;
      if (!hasDepth) {
        p.stroke(255);
        p.strokeWeight(view.strokeWeight);
      } else {
        p.strokeWeight(view.strokeWeight);
      }
      traceCurve(p, c);
    }
  },
});

RenderPasses.register({
  id: 'points',
  name: 'Points',
  draw(p, { curves }) {
    p.noFill();
    p.stroke(255, 200);
    p.strokeWeight(2);
    for (const c of curves) {
      for (const pt of c.points) p.point(pt.x, pt.y);
    }
  },
});

RenderPasses.register({
  id: 'wireframe',
  name: 'Wireframe',
  draw(p, { curves }) {
    p.noFill();
    p.stroke(255, 90);
    p.strokeWeight(0.75);
    for (const c of curves) traceCurve(p, c);
    p.stroke(255, 160);
    p.strokeWeight(1.5);
    const step = Math.max(1, Math.floor(maxPoints(curves) / 400));
    for (const c of curves) {
      for (let i = 0; i < c.points.length; i += step) p.point(c.points[i].x, c.points[i].y);
    }
  },
});

RenderPasses.register({
  id: 'control-polygon',
  name: 'Control Polygon',
  draw(p, { curves }) {
    for (const c of curves) {
      const cps = c.meta?.controlPoints;
      if (!cps?.length) continue;
      p.noFill();
      p.stroke(255, 70);
      p.strokeWeight(0.75);
      p.beginShape();
      for (const cp of cps) p.vertex(cp.x, cp.y);
      p.endShape(c.closed ? p.CLOSE : undefined);
      p.noStroke();
      p.fill(227, 6, 19, 200);
      for (const cp of cps) p.square(cp.x - 2, cp.y - 2, 4);
    }
  },
});

function maxPoints(curves) {
  return curves.reduce((m, c) => Math.max(m, c.points.length), 1);
}
