/**
 * gradient.js — height/radius gradient wireframe.
 *
 * The ramp follows the visible vertical axis: true height (`h3`) in the 3D,
 * xz and yz views, and radial distance in the top-down xy view. Segments are
 * bucketed so a high-sample helix costs at most 64 stroke state changes.
 */

import { RenderPasses } from '../../core/registry.js';
import { DEFAULT_COLOR_RAMP } from '../../core/document.js';
import { gradientAxisValue } from '../projection.js';

const BUCKETS = 64;

export function rampColor(ramp, t) {
  const stops = normalizeRamp(ramp);
  const u = Math.max(0, Math.min(1, Number(t) || 0));
  const scaled = u * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const a = stops[index];
  const b = stops[index + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * local),
    Math.round(a[1] + (b[1] - a[1]) * local),
    Math.round(a[2] + (b[2] - a[2]) * local),
  ];
}

export function gradientRange(curves, projection, metric = 'auto', analysis = null) {
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

function effectiveMetric(metric, analysis) {
  if (metric === 'curvature' && !analysis?.perCurve?.length) return 'auto';
  return ['height', 'radius', 'curvature', 'arc'].includes(metric) ? metric : 'auto';
}

function metricSeries(curve, index, projection, metric, analysis) {
  const points = curve.points ?? [];
  if (metric === 'arc') {
    const values = new Array(points.length);
    let total = 0;
    values[0] = 0;
    for (let i = 1; i < points.length; i++) {
      total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      values[i] = total;
    }
    return values;
  }
  const curvatures = analysis?.perCurve?.[index]?.curvatures;
  return points.map((point, pointIndex) => metricValue(point, pointIndex, projection, metric, curvatures));
}

function metricValue(point, index, projection, metric, curvatures) {
  if (metric === 'height') return Number.isFinite(point.h3) ? point.h3 : point.y;
  if (metric === 'radius') {
    const x = Number.isFinite(point.x3) ? point.x3 : point.x;
    const y = Number.isFinite(point.y3) ? point.y3 : point.y;
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
  draw(p, { curves, view, analysis }) {
    if (!curves.length) return;
    const style = view.style ?? {};
    const stroke = style.stroke ?? {};
    const width = Number.isFinite(stroke.width) ? stroke.width : view.strokeWeight;
    const alpha = Math.round(clamp01(stroke.opacity) * 255);
    const projection = view.projection ?? '3d';
    const metric = effectiveMetric(view.colorMetric, analysis);
    const ramp = Array.isArray(view.colorRamp) && view.colorRamp.length >= 2
      ? view.colorRamp
      : DEFAULT_COLOR_RAMP;
    const { min, max } = gradientRange(curves, projection, metric, analysis);
    const span = max - min || 1;
    const buckets = Array.from({ length: BUCKETS }, () => []);
    const series = curves.map((curve, index) => metricSeries(curve, index, projection, metric, analysis));

    curves.forEach((curve, curveIndex) => {
      const points = curve.points;
      const values = series[curveIndex];
      const edges = curve.closed ? points.length : points.length - 1;
      for (let i = 0; i < edges; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        const value = (values[i] + values[(i + 1) % points.length]) / 2;
        const bucket = Math.max(0, Math.min(BUCKETS - 1, Math.floor(((value - min) / span) * (BUCKETS - 1))));
        buckets[bucket].push(a, b);
      }
    });

    p.noFill();
    p.strokeWeight(width);
    p.strokeCap(capConstant(p, stroke.cap));
    p.strokeJoin(joinConstant(p, stroke.join));
    for (let i = 0; i < BUCKETS; i++) {
      const segments = buckets[i];
      if (!segments.length) continue;
      const [r, g, b] = rampColor(ramp, i / (BUCKETS - 1));
      p.stroke(r, g, b, alpha);
      p.beginShape(p.LINES);
      for (const point of segments) p.vertex(point.x, point.y);
      p.endShape();
    }
  },
});

function normalizeRamp(ramp) {
  const source = Array.isArray(ramp) && ramp.length >= 2 ? ramp : DEFAULT_COLOR_RAMP;
  const stops = source.map(parseHex).filter(Boolean);
  return stops.length >= 2 ? stops : DEFAULT_COLOR_RAMP.map(parseHex);
}

function parseHex(value) {
  if (typeof value !== 'string') return null;
  const hex = value.replace('#', '').trim();
  if (hex.length === 3) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
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

function clamp01(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

function capConstant(p, cap) {
  if (cap === 'butt') return p.BUTT;
  if (cap === 'square') return p.SQUARE;
  return p.ROUND;
}

function joinConstant(p, join) {
  if (join === 'miter') return p.MITER;
  if (join === 'bevel') return p.BEVEL;
  return p.ROUND;
}
