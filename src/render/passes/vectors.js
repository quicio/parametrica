/**
 * render/passes/vectors.js — tangents · normals · curvature heatmap.
 */

import { RenderPasses } from '../../core/registry.js';

function drawVectorField(p, curves, analysis, key, color, length = 18) {
  p.stroke(...color);
  p.strokeWeight(0.75);
  curves.forEach((c, ci) => {
    const vectors = analysis.perCurve[ci]?.[key];
    if (!vectors?.length) return;
    const step = Math.max(1, Math.floor(c.points.length / 80));
    for (let i = 0; i < c.points.length; i += step) {
      const pt = c.points[i];
      const v = vectors[i];
      p.line(pt.x, pt.y, pt.x + v.x * length, pt.y + v.y * length);
    }
  });
}

RenderPasses.register({
  id: 'tangents',
  name: 'Tangents',
  draw(p, { curves, analysis }) {
    drawVectorField(p, curves, analysis, 'tangents', [255, 255, 255, 140]);
  },
});

RenderPasses.register({
  id: 'normals',
  name: 'Normals',
  draw(p, { curves, analysis }) {
    drawVectorField(p, curves, analysis, 'normals', [227, 6, 19, 160]);
  },
});

RenderPasses.register({
  id: 'curvature',
  name: 'Curvature Heatmap',
  draw(p, { curves, analysis }) {
    // normalize by 95th percentile |κ|
    const all = [];
    for (const a of analysis.perCurve) {
      for (let i = 0; i < a.curvatures.length; i++) all.push(Math.abs(a.curvatures[i]));
    }
    if (!all.length) return;
    all.sort((x, y) => x - y);
    const kMax = all[Math.floor(all.length * 0.95)] || 1e-9;

    p.strokeWeight(2.5);
    p.strokeCap(p.ROUND);
    const white = [255, 255, 255];
    const red = [227, 6, 19];
    curves.forEach((c, ci) => {
      const k = analysis.perCurve[ci]?.curvatures;
      if (!k) return;
      for (let i = 0; i < c.points.length - 1; i++) {
        const t = Math.min(1, Math.abs(k[i]) / kMax);
        p.stroke(
          white[0] + (red[0] - white[0]) * t,
          white[1] + (red[1] - white[1]) * t,
          white[2] + (red[2] - white[2]) * t,
          220,
        );
        const a = c.points[i];
        const b = c.points[i + 1];
        p.line(a.x, a.y, b.x, b.y);
      }
    });
  },
});
