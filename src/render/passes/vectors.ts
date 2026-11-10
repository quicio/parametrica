/** tangents · normals · curvature heatmap. */

import { RenderPasses } from '../../core/registry.js';
import type { PassAnalysis, PassContext, PassCurve, PassData, PassPoint } from './types.ts';

function drawVectorField(
  p: PassContext,
  curves: ReadonlyArray<PassCurve>,
  analysis: PassAnalysis,
  key: 'tangents' | 'normals',
  color: number[],
  length = 18,
): void {
  p.stroke(...color);
  p.strokeWeight(0.75);
  curves.forEach((c, ci) => {
    const vectors = analysis.perCurve?.[ci]?.[key];
    if (!vectors?.length) return;
    const step = Math.max(1, Math.floor(c.points.length / 80));
    for (let i = 0; i < c.points.length; i += step) {
      const pt = c.points[i];
      const v = vectors[i];
      if (!pt || !v) continue;
      p.line(pt.x, pt.y, pt.x + v.x * length, pt.y + v.y * length);
    }
  });
}

RenderPasses.register({
  id: 'tangents',
  name: 'Tangents',
  group: 'diagnostic',
  description: 'Tangent vectors at samples.',
  draw(p: PassContext, { curves = [], analysis = null }: PassData) {
    if (!analysis) return;
    drawVectorField(p, curves, analysis, 'tangents', [255, 255, 255, 140]);
  },
});

RenderPasses.register({
  id: 'normals',
  name: 'Normals',
  group: 'diagnostic',
  description: 'Normal vectors at samples.',
  draw(p: PassContext, { curves = [], analysis = null }: PassData) {
    if (!analysis) return;
    drawVectorField(p, curves, analysis, 'normals', [227, 6, 19, 160]);
  },
});

RenderPasses.register({
  id: 'curvature',
  name: 'Curvature Heatmap',
  group: 'color',
  description: 'Curvature magnitude heatmap.',
  draw(p: PassContext, { curves = [], analysis = null }: PassData) {
    if (!analysis?.perCurve) return;
    // normalize by 95th percentile |κ|
    const all: number[] = [];
    for (const a of analysis.perCurve) {
      const curvatures = a.curvatures ?? [];
      for (let i = 0; i < curvatures.length; i++) all.push(Math.abs(curvatures[i] ?? 0));
    }
    if (!all.length) return;
    all.sort((x, y) => x - y);
    const kMax = all[Math.floor(all.length * 0.95)] || 1e-9;

    p.strokeWeight(2.5);
    p.strokeCap(p.ROUND);
    const white = [255, 255, 255] as const;
    const red = [227, 6, 19] as const;
    curves.forEach((c, ci) => {
      const k = analysis.perCurve?.[ci]?.curvatures;
      if (!k) return;
      for (let i = 0; i < c.points.length - 1; i++) {
        const t = Math.min(1, Math.abs(k[i] ?? 0) / kMax);
        p.stroke(
          white[0] + (red[0] - white[0]) * t,
          white[1] + (red[1] - white[1]) * t,
          white[2] + (red[2] - white[2]) * t,
          220,
        );
        const a = c.points[i];
        const b = c.points[i + 1];
        if (!a || !b) continue;
        p.line(a.x, a.y, b.x, b.y);
      }
    });
  },
});

export type { PassCurve, PassPoint };
