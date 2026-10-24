/**
 * thumbnail.js — browser-only polyline thumbnails for exploration.
 *
 * Uses a plain 2D canvas so candidate previews can be rendered without
 * touching the live p5 document. Geometry is already fitted by generators;
 * a shared bounds object keeps a family visually comparable.
 */

import { bboxAll } from '../sampling/sampling.js';

export function curvesDataURL(curves, {
  size = 160,
  bounds = null,
  background = '#050505',
  stroke = '#e8e8e8',
  strokeWeight = 1.25,
} = {}) {
  if (!Array.isArray(curves) || !curves.length) return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const box = bounds ?? bboxAll(curves);
  const span = Math.max(box.width, box.height, 1e-6);
  const scale = (size * 0.86) / span;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(scale, scale);
  ctx.translate(-box.cx, -box.cy);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWeight / scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const curve of curves) {
    if (!curve.points?.length) continue;
    ctx.beginPath();
    ctx.moveTo(curve.points[0].x, curve.points[0].y);
    for (let i = 1; i < curve.points.length; i++) {
      ctx.lineTo(curve.points[i].x, curve.points[i].y);
    }
    if (curve.closed) ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** Union bounds across a list of Curve[] groups. */
export function boundsOf(groups) {
  const curves = groups.flat();
  return bboxAll(curves);
}
