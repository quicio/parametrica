/** Height/radius gradient wireframe. */

import { RenderPasses } from '../../core/registry.js';
import { DEFAULT_COLOR_RAMP } from '../../core/document.js';
import { gradientAxisValue } from '../projection.ts';
import type { Projection } from '../projection.ts';
import type { PassAnalysis, PassContext, PassCurve, PassData, PassPoint, Rgb } from './types.ts';

const BUCKETS = 64;

export function rampColor(ramp: unknown, t: unknown): Rgb {
  const stops = normalizeRamp(ramp);
  const u = Math.max(0, Math.min(1, Number(t) || 0));
  const scaled = u * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const a = stops[index] as Rgb;
  const b = stops[index + 1] as Rgb;
  return [
    Math.round(a[0] + (b[0] - a[0]) * local),
    Math.round(a[1] + (b[1] - a[1]) * local),
    Math.round(a[2] + (b[2] - a[2]) * local),
  ];
}

export interface GradientRange {
  min: number;
  max: number;
}

export function gradientRange(
  curves: ReadonlyArray<PassCurve>,
  projection: Projection,
  metric = 'auto',
  analysis: PassAnalysis | null = null,
): GradientRange {
  const effective = effectiveMetric(metric, analysis);
  let min = Infinity;
  let max = -Infinity;
  curves.forEach((curve, index) => {
    for (const value of metricSeries(curve, index, projection, effective, analysis)) {
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  });
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  return { min, max };
}

function effectiveMetric(metric: string | undefined, analysis: PassAnalysis | null): string {
  if (metric === 'curvature' && !analysis?.perCurve?.length) return 'auto';
  return metric && ['height', 'radius', 'curvature', 'arc'].includes(metric) ? metric : 'auto';
}

function metricSeries(
  curve: PassCurve,
  index: number,
  projection: Projection,
  metric: string,
  analysis: PassAnalysis | null,
): number[] {
  const points = curve.points ?? [];
  if (metric === 'arc') {
    const values: number[] = new Array(points.length);
    let total = 0;
    values[0] = 0;
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const previous = points[i - 1];
      if (!current || !previous) continue;
      total += Math.hypot(current.x - previous.x, current.y - previous.y);
      values[i] = total;
    }
    return values;
  }
  const curvatures = analysis?.perCurve?.[index]?.curvatures;
  return points.map((point, pointIndex) => metricValue(point, pointIndex, projection, metric, curvatures));
}

function metricValue(
  point: PassPoint,
  index: number,
  projection: Projection,
  metric: string,
  curvatures: number[] | undefined,
): number {
  if (metric === 'height') return Number.isFinite(point.h3) ? point.h3 as number : point.y;
  if (metric === 'radius') {
    const x = Number.isFinite(point.x3) ? point.x3 as number : point.x;
    const y = Number.isFinite(point.y3) ? point.y3 as number : point.y;
    return Math.hypot(x, y);
  }
  if (metric === 'curvature') return Math.abs(curvatures?.[index] ?? 0);
  return gradientAxisValue(point, projection);
}

RenderPasses.register({
  id: 'gradient-wireframe',
  name: 'Gradient Wireframe',
  group: 'color',
  description: 'Color ramp by height or radius.',
  draw(p: PassContext, { curves = [], view = {}, analysis = null }: PassData) {
    if (!curves.length) return;
    const style = view.style ?? {};
    const stroke = style.stroke ?? {};
    const width = Number.isFinite(stroke.width) ? Number(stroke.width) : view.strokeWeight;
    const alpha = Math.round(clamp01(stroke.opacity) * 255);
    const projection = (view.projection ?? '3d') as Projection;
    const metric = effectiveMetric(view.colorMetric, analysis);
    const ramp = Array.isArray(view.colorRamp) && view.colorRamp.length >= 2
      ? view.colorRamp
      : DEFAULT_COLOR_RAMP as string[];
    const { min, max } = gradientRange(curves, projection, metric, analysis);
    const span = max - min || 1;
    const buckets: PassPoint[][] = Array.from({ length: BUCKETS }, () => []);
    const series = curves.map((curve, index) => metricSeries(curve, index, projection, metric, analysis));

    curves.forEach((curve, curveIndex) => {
      const points = curve.points;
      const values = series[curveIndex];
      if (!values) return;
      const edges = curve.closed ? points.length : points.length - 1;
      for (let i = 0; i < edges; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if (!a || !b) continue;
        const value = ((values[i] ?? 0) + (values[(i + 1) % points.length] ?? 0)) / 2;
        const bucket = Math.max(0, Math.min(BUCKETS - 1, Math.floor(((value - min) / span) * (BUCKETS - 1))));
        buckets[bucket]?.push(a, b);
      }
    });

    p.noFill();
    p.strokeWeight(width ?? 1);
    p.strokeCap(capConstant(p, stroke.cap));
    p.strokeJoin(joinConstant(p, stroke.join));
    for (let i = 0; i < BUCKETS; i++) {
      const segments = buckets[i];
      if (!segments?.length) continue;
      const [r, g, b] = rampColor(ramp, i / (BUCKETS - 1));
      p.stroke(r, g, b, alpha);
      p.beginShape(p.LINES);
      for (const point of segments) p.vertex(point.x, point.y);
      p.endShape();
    }
  },
});

function normalizeRamp(ramp: unknown): Rgb[] {
  const source = Array.isArray(ramp) && ramp.length >= 2 ? ramp as string[] : DEFAULT_COLOR_RAMP as string[];
  const stops = source.map(parseHex).filter((stop): stop is Rgb => Boolean(stop));
  return stops.length >= 2
    ? stops
    : (DEFAULT_COLOR_RAMP as string[]).map(parseHex).filter((stop): stop is Rgb => Boolean(stop));
}

function parseHex(value: unknown): Rgb | null {
  if (typeof value !== 'string') return null;
  const hex = value.replace('#', '').trim();
  if (hex.length === 3) {
    return [
      parseInt(`${hex[0]}${hex[0]}`, 16),
      parseInt(`${hex[1]}${hex[1]}`, 16),
      parseInt(`${hex[2]}${hex[2]}`, 16),
    ];
  }
  if (hex.length === 6) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  return null;
}

function clamp01(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
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
