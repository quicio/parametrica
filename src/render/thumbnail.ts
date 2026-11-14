/** Browser-only polyline thumbnails for exploration. */

import { bboxAll } from '../sampling/sampling.ts';

interface Vec2 { x: number; y: number; [key: string]: unknown }
interface CurveLike {
  points?: Vec2[];
  closed?: boolean;
  [key: string]: unknown;
}
interface BoundsLike {
  width: number;
  height: number;
  cx: number;
  cy: number;
}
export interface ThumbnailOptions {
  size?: number;
  bounds?: BoundsLike | null;
  background?: string;
  stroke?: string;
  strokeWeight?: number;
}

export function curvesDataURL(
  curves: ReadonlyArray<CurveLike> | null | undefined,
  {
    size = 160,
    bounds = null,
    background = '#050505',
    stroke = '#e8e8e8',
    strokeWeight = 1.25,
  }: ThumbnailOptions = {},
): string | null {
  if (!Array.isArray(curves) || !curves.length) return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const box = (bounds ?? bboxAll(curves)) as BoundsLike;
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
    const points = curve.points ?? [];
    const first = points[0];
    if (!first) continue;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      if (!point) continue;
      ctx.lineTo(point.x, point.y);
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
export function boundsOf(groups: ReadonlyArray<ReadonlyArray<CurveLike>>): BoundsLike {
  const curves = groups.flat();
  return bboxAll(curves as never) as BoundsLike;
}
