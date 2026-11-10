/** Solid and gradient fill application for render passes. */

import { resolveFillGradient } from '../core/fillGradient.js';

interface Vec2 { x: number; y: number; depthAlpha?: number; [key: string]: unknown }
interface CurveLike {
  points?: Vec2[];
  closed?: boolean;
  [key: string]: unknown;
}
interface FillLike {
  enabled?: boolean;
  color?: string;
  opacity?: number;
  gradient?: unknown;
  [key: string]: unknown;
}
interface BoundsLike {
  width?: unknown;
  height?: unknown;
  minX?: unknown;
  minY?: unknown;
  [key: string]: unknown;
}
interface GradientSpec {
  type: string;
  cx?: number;
  cy?: number;
  r?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  stops: Array<{ offset: number; color: string }>;
}
export interface FillContext {
  noFill(): unknown;
  fill(r: number, g: number, b: number, a: number): unknown;
  fillGradient?(gradient: unknown, bbox: unknown, opacity: number): unknown;
  fillContours?(curves: CurveLike[], fill: FillLike, bbox: unknown): unknown;
  fillDepth?(depth: number): unknown;
  drawingContext?: CanvasRenderingContext2D | null;
}

export function fillGradientEnabled(fill: FillLike | null | undefined): boolean {
  return Boolean(fill?.enabled && (fill.gradient as { enabled?: boolean } | undefined)?.enabled);
}

/** Apply a fill and return true when a gradient was used. */
export function applyFill(
  p: FillContext,
  fill: FillLike | null | undefined,
  bbox: BoundsLike | null | undefined,
  alpha = 1,
): boolean {
  if (!fill?.enabled) {
    p.noFill();
    return false;
  }
  if (fillGradientEnabled(fill)) {
    const opacity = clamp01(fill.opacity) * clamp01(alpha);
    if (typeof p.fillGradient === 'function') {
      p.fillGradient(fill.gradient, bbox, opacity);
      return true;
    }
    const context = p.drawingContext;
    const spec = resolveFillGradient(fill.gradient, bbox) as unknown as GradientSpec;
    if (context && spec) {
      const gradient = spec.type === 'radial'
        ? context.createRadialGradient(spec.cx ?? 0, spec.cy ?? 0, 0, spec.cx ?? 0, spec.cy ?? 0, spec.r ?? 0)
        : context.createLinearGradient(spec.x1 ?? 0, spec.y1 ?? 0, spec.x2 ?? 0, spec.y2 ?? 0);
      for (const stop of spec.stops) {
        gradient.addColorStop(stop.offset, toRgba(stop.color, opacity));
      }
      context.fillStyle = gradient;
      return true;
    }
  }
  const rgb = hexToRgb(fill.color, [255, 255, 255]);
  p.fill(rgb[0] ?? 255, rgb[1] ?? 255, rgb[2] ?? 255, Math.round(clamp01(fill.opacity) * clamp01(alpha) * 255));
  return false;
}

/**
 * Fill closed contours as one even-odd path. Canvas and SVG must agree, so
 * both receive every contour in the same path instead of filling each
 * separately (which would paint over holes).
 */
export function drawEvenOddFill(
  p: FillContext,
  curves: ReadonlyArray<CurveLike> | null | undefined,
  fill: FillLike | null | undefined,
  bbox: BoundsLike | null | undefined,
): boolean {
  if (!fill?.enabled) return false;
  const closed = (Array.isArray(curves) ? curves : [])
    .filter((curve) => curve?.closed
      && Array.isArray(curve.points)
      && curve.points.length >= 2
      && curve.points[0]?.depthAlpha == null);
  if (!closed.length) return false;

  if (typeof p.fillContours === 'function') {
    p.fillContours(closed, fill, bbox);
    return true;
  }

  const context = p.drawingContext;
  if (!context || typeof context.beginPath !== 'function' || typeof context.fill !== 'function') {
    return false;
  }
  applyFill(p, fill, bbox);
  context.beginPath();
  for (const curve of closed) {
    const points = curve.points ?? [];
    const first = points[0];
    if (!first) continue;
    context.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      if (!point) continue;
      context.lineTo(point.x, point.y);
    }
    context.closePath();
  }
  context.fill('evenodd');
  return true;
}

/**
 * Depth multiplier for gradient Surface Fill. Canvas gradients already carry
 * fill opacity in their stops; SVG stores it in the paint and multiplies here.
 */
export function setFillDepth(p: FillContext, depthAlpha: unknown): void {
  const depth = clamp01(depthAlpha);
  if (typeof p.fillDepth === 'function') {
    p.fillDepth(depth);
  } else if (p.drawingContext) {
    p.drawingContext.globalAlpha = depth;
  }
}

function toRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex, [255, 255, 255]);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
}

function hexToRgb(value: unknown, fallback: number[]): number[] {
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

function clamp01(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}
