/**
 * render/passes/core.js — stroke · points · wireframe · control polygon.
 */

import { RenderPasses } from '../../core/registry.js';

export function traceCurve(p, curve) {
  p.beginShape();
  for (const pt of curve.points) p.vertex(pt.x, pt.y);
  if (curve.closed) p.endShape(p.CLOSE);
  else p.endShape();
}

RenderPasses.register({
  id: 'stroke',
  name: 'Stroke',
  draw(p, { curves, view }) {
    p.noFill();
    p.stroke(255);
    p.strokeWeight(view.strokeWeight);
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
    for (const c of curves) traceCurve(p, c);
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
