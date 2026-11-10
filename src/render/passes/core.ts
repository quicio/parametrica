/** stroke · points · wireframe · control polygon. */

import { RenderPasses } from '../../core/registry.ts';
import { drawEvenOddFill } from '../fill.ts';
import type { PassContext, PassCurve, PassData, Rgb } from './types.ts';

export function traceCurve(
  p: PassContext,
  curve: PassCurve,
  rgb: Rgb = [255, 255, 255],
  baseAlpha = 255,
): void {
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
      if (!a || !b) continue;
      const alpha = Math.round(((a.depthAlpha ?? 1) + (b.depthAlpha ?? 1)) / 2 * baseAlpha);
      p.stroke(rgb[0], rgb[1], rgb[2], alpha);
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
  group: 'base',
  description: 'Primary curve stroke.',
  draw(p: PassContext, { curves = [], view = {}, bbox }: PassData) {
    const style = view.style ?? {};
    const stroke = style.stroke ?? {};
    const fill = style.fill ?? {};
    const rgb = hexToRgb(stroke.color, [255, 255, 255]);
    const alpha = Math.round(clamp01(stroke.opacity) * 255);
    const width = Number.isFinite(stroke.width) ? Number(stroke.width) : view.strokeWeight;
    p.strokeCap(capConstant(p, stroke.cap));
    p.strokeJoin(joinConstant(p, stroke.join));

    // One even-odd path for every closed contour in the layer. Holes are
    // transparent instead of being painted over by the outer contour.
    drawEvenOddFill(p, curves, fill, bbox as never);

    for (const c of curves) {
      const hasDepth = c.points[0]?.depthAlpha != null;
      p.strokeWeight(width ?? 1);
      if (!hasDepth) p.stroke(rgb[0], rgb[1], rgb[2], alpha);
      p.noFill();
      traceCurve(p, c, rgb, alpha);
    }
  },
});

RenderPasses.register({
  id: 'points',
  name: 'Points',
  group: 'base',
  description: 'Sample points along curves.',
  draw(p: PassContext, { curves = [], view = {} }: PassData) {
    const style = view.style ?? {};
    const stroke = style.stroke ?? {};
    const rgb = hexToRgb(stroke.color, [255, 255, 255]);
    p.noFill();
    p.stroke(rgb[0], rgb[1], rgb[2], 200);
    p.strokeWeight(2);
    for (const c of curves) {
      for (const pt of c.points) p.point(pt.x, pt.y);
    }
  },
});

RenderPasses.register({
  id: 'wireframe',
  name: 'Wireframe',
  group: 'diagnostic',
  description: 'Segment wireframe.',
  draw(p: PassContext, { curves = [], view = {} }: PassData) {
    const style = view.style ?? {};
    const rgb = hexToRgb(style.stroke?.color, [255, 255, 255]);
    p.noFill();
    p.stroke(rgb[0], rgb[1], rgb[2], 90);
    p.strokeWeight(0.75);
    for (const c of curves) traceCurve(p, c, rgb, 255);
    p.stroke(rgb[0], rgb[1], rgb[2], 160);
    p.strokeWeight(1.5);
    const step = Math.max(1, Math.floor(maxPoints(curves) / 400));
    for (const c of curves) {
      for (let i = 0; i < c.points.length; i += step) {
        const point = c.points[i];
        if (point) p.point(point.x, point.y);
      }
    }
  },
});

RenderPasses.register({
  id: 'control-polygon',
  name: 'Control Polygon',
  group: 'diagnostic',
  description: 'Spline control polygon and handles.',
  appliesTo({ curves = [] }: PassData) {
    return curves.some((curve) => Boolean(curve.meta?.controlPoints?.length));
  },
  draw(p: PassContext, { curves = [] }: PassData) {
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

function maxPoints(curves: ReadonlyArray<PassCurve>): number {
  return curves.reduce((m, c) => Math.max(m, c.points.length), 1);
}

function clamp01(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

function hexToRgb(value: unknown, fallback: Rgb): Rgb {
  if (typeof value !== 'string') return fallback;
  const hex = value.replace('#', '');
  if (hex.length === 3) {
    return [
      parseInt(`${hex[0]}${hex[0]}`, 16),
      parseInt(`${hex[1]}${hex[1]}`, 16),
      parseInt(`${hex[2]}${hex[2]}`, 16),
    ];
  }
  if (hex.length === 6) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  return fallback;
}

function capConstant(p: PassContext, cap: string | undefined): string {
  if (cap === 'butt') return p.BUTT;
  if (cap === 'square') return p.SQUARE;
  return p.ROUND;
}

function joinConstant(p: PassContext, join: string | undefined): string {
  if (join === 'miter') return p.MITER;
  if (join === 'bevel') return p.BEVEL;
  return p.ROUND;
}
