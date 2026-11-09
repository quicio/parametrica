/**
 * render/fill.js — solid and gradient fill application for render passes.
 *
 * Passes receive a p5-like context. SVG export supplies its recorder instead;
 * both paths share the same resolved bbox gradient.
 */

import { resolveFillGradient } from '../core/fillGradient.js';

export function fillGradientEnabled(fill) {
  return Boolean(fill?.enabled && fill.gradient?.enabled);
}

/** Apply a fill and return true when a gradient was used. */
export function applyFill(p, fill, bbox, alpha = 1) {
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
    const spec = resolveFillGradient(fill.gradient, bbox);
    if (context && spec) {
      const gradient = spec.type === 'radial'
        ? context.createRadialGradient(spec.cx, spec.cy, 0, spec.cx, spec.cy, spec.r)
        : context.createLinearGradient(spec.x1, spec.y1, spec.x2, spec.y2);
      for (const stop of spec.stops) {
        gradient.addColorStop(stop.offset, toRgba(stop.color, opacity));
      }
      context.fillStyle = gradient;
      return true;
    }
  }
  const rgb = hexToRgb(fill.color, [255, 255, 255]);
  p.fill(rgb[0], rgb[1], rgb[2], Math.round(clamp01(fill.opacity) * clamp01(alpha) * 255));
  return false;
}

/**
 * Fill closed contours as one even-odd path. Canvas and SVG must agree, so
 * both receive every contour in the same path instead of filling each
 * separately (which would paint over holes).
 */
export function drawEvenOddFill(p, curves, fill, bbox) {
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
    const points = curve.points;
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      context.lineTo(points[i].x, points[i].y);
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
export function setFillDepth(p, depthAlpha) {
  const depth = clamp01(depthAlpha);
  if (typeof p.fillDepth === 'function') {
    p.fillDepth(depth);
  } else if (p.drawingContext) {
    p.drawingContext.globalAlpha = depth;
  }
}

function toRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex, [255, 255, 255]);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
}

function hexToRgb(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const hex = value.replace('#', '');
  if (hex.length === 3) {
    return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
  }
  if (hex.length === 6) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  return fallback;
}

function clamp01(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}
