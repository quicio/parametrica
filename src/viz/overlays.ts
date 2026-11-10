/** Live-mathematics diagnostic overlays. */

import type { AllCurveAnalysis } from '../analysis/differential.ts';

export { OVERLAYS } from '../domain/overlays.ts';

export interface OverlayPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}
export interface OverlayCurve {
  points: OverlayPoint[];
  analysis?: unknown;
  [key: string]: unknown;
}
export interface OverlayBBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
  [key: string]: unknown;
}
export interface OverlayView {
  overlays?: Record<string, unknown>;
  [key: string]: unknown;
}
export interface OverlayContext {
  noStroke(): unknown;
  noFill(): unknown;
  stroke(...args: unknown[]): unknown;
  fill(...args: unknown[]): unknown;
  strokeWeight(value: number): unknown;
  circle(x: number, y: number, diameter: number): unknown;
  line(x1: number, y1: number, x2: number, y2: number): unknown;
  rect(x: number, y: number, width: number, height: number): unknown;
}
export interface OverlayData {
  curves: OverlayCurve[];
  analysis: AllCurveAnalysis;
  bbox?: OverlayBBox | null;
  view: OverlayView;
}

export function drawOverlays(p: OverlayContext, { curves, analysis, bbox, view }: OverlayData): void {
  const on = view.overlays ?? {};
  if (on.inflections) drawInflections(p, curves, analysis);
  if (on.samplePoints) drawSamplePoints(p, curves);
  if (on.ruler) drawRuler(p, curves);
  if (on.bbox && bbox) drawBBox(p, bbox);
}

function drawInflections(p: OverlayContext, curves: ReadonlyArray<OverlayCurve>, analysis: AllCurveAnalysis): void {
  p.noStroke();
  p.fill(227, 6, 19, 230);
  curves.forEach((c, ci) => {
    const a = analysis.perCurve[ci];
    if (!a) return;
    for (const i of a.inflections) {
      const point = c.points[i];
      if (point) p.circle(point.x, point.y, 6);
    }
  });
}

function drawSamplePoints(p: OverlayContext, curves: ReadonlyArray<OverlayCurve>): void {
  p.noFill();
  p.stroke(255, 120);
  p.strokeWeight(1);
  for (const c of curves) {
    const step = Math.max(1, Math.floor(c.points.length / 200));
    for (let i = 0; i < c.points.length; i += step) {
      const point = c.points[i];
      if (point) p.circle(point.x, point.y, 3);
    }
  }
}

function drawRuler(p: OverlayContext, curves: ReadonlyArray<OverlayCurve>): void {
  p.stroke(255, 90);
  p.strokeWeight(1);
  for (const c of curves) {
    // tick every ~10% of arc length
    const a = c.analysis ?? null;
    void a;
    const total = c.points.length;
    const step = Math.max(1, Math.floor(total / 10));
    for (let i = 0; i < total; i += step) {
      const pt = c.points[i];
      const next = c.points[Math.min(total - 1, i + 1)];
      if (!pt || !next) continue;
      const dx = next.x - pt.x;
      const dy = next.y - pt.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 6;
      const ny = (dx / len) * 6;
      p.line(pt.x - nx, pt.y - ny, pt.x + nx, pt.y + ny);
    }
  }
}

function drawBBox(p: OverlayContext, bbox: OverlayBBox): void {
  p.noFill();
  p.stroke(255, 50);
  p.strokeWeight(0.75);
  p.rect(bbox.minX, bbox.minY, bbox.width, bbox.height);
  p.stroke(227, 6, 19, 120);
  p.line(bbox.cx - 6, bbox.cy, bbox.cx + 6, bbox.cy);
  p.line(bbox.cx, bbox.cy - 6, bbox.cx, bbox.cy + 6);
}
