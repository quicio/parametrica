/**
 * render/passes/fields.js — negative space · signed distance · topology.
 */

import { RenderPasses } from '../../core/registry.js';
import { polylineIntersections, selfIntersections } from '../../analysis/intersections.js';

RenderPasses.register({
  id: 'negative-space',
  name: 'Negative Space',
  draw(p, { curves }) {
    p.noStroke();
    p.fill(255);
    for (const c of curves) {
      if (!c.closed) continue;
      p.beginShape();
      for (const pt of c.points) p.vertex(pt.x, pt.y);
      p.endShape(p.CLOSE);
    }
  },
});

/* ———————— signed distance field (cached raster) ———————— */

const sdfCache = { key: null, image: null };

RenderPasses.register({
  id: 'signed-distance',
  name: 'Signed Distance',
  draw(p, { curves }) {
    const key = curves;
    if (sdfCache.key !== key) {
      sdfCache.key = key;
      sdfCache.image = computeSDF(p, curves);
    }
    if (sdfCache.image) p.image(sdfCache.image, -p.width / 2, -p.height / 2, p.width, p.height);
  },
});

const SDF_GRID = 96;

function computeSDF(p, curves) {
  const w = p.width;
  const h = p.height;
  const segs = [];
  for (const c of curves) {
    const stride = Math.max(1, Math.floor(c.points.length / 600));
    for (let i = 0; i < c.points.length - stride; i += stride) {
      segs.push([c.points[i], c.points[i + stride]]);
    }
    if (segs.length > 1600) break;
  }
  if (!segs.length) return null;

  const img = p.createImage(SDF_GRID, Math.max(1, Math.round((SDF_GRID * h) / w)));
  img.loadPixels();
  const cellW = w / img.width;
  const cellH = h / img.height;
  for (let gy = 0; gy < img.height; gy++) {
    for (let gx = 0; gx < img.width; gx++) {
      const px = -w / 2 + (gx + 0.5) * cellW;
      const py = -h / 2 + (gy + 0.5) * cellH;
      let d2 = Infinity;
      for (const [a, b] of segs) {
        const d = pointSegmentDist2(px, py, a, b);
        if (d < d2) d2 = d;
      }
      const dist = Math.sqrt(d2);
      // contour banding: bright near the curve, periodic echoes outward
      const band = 0.5 + 0.5 * Math.cos(dist * 0.12);
      const falloff = Math.exp(-dist * 0.012);
      const v = Math.min(255, 255 * band * (0.25 + 0.75 * falloff));
      const idx = 4 * (gy * img.width + gx);
      img.pixels[idx] = v;
      img.pixels[idx + 1] = v;
      img.pixels[idx + 2] = v * (0.55 + 0.45 * falloff);
      img.pixels[idx + 3] = 255;
    }
  }
  img.updatePixels();
  return img;
}

function pointSegmentDist2(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy || 1e-12;
  const t = Math.min(1, Math.max(0, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return (px - cx) * (px - cx) + (py - cy) * (py - cy);
}

/* ———————— topology: intersection markers ———————— */

RenderPasses.register({
  id: 'topology',
  name: 'Topology (intersections)',
  draw(p, { curves }) {
    const total = curves.reduce((s, c) => s + c.points.length, 0);
    if (total > 6000) {
      // budget guard: honest refusal beats a frozen tab
      p.fill(227, 6, 19);
      p.noStroke();
      p.textSize(10);
      p.text('topology: too many points (>6000)', -p.width / 2 + 20, p.height / 2 - 16);
      return;
    }
    const markers = [];
    for (const c of curves) {
      markers.push(...selfIntersections(c.points, { closed: c.closed }));
    }
    for (let i = 0; i < curves.length; i++) {
      for (let j = i + 1; j < curves.length; j++) {
        markers.push(...polylineIntersections(curves[i].points, curves[j].points, {
          closedA: curves[i].closed, closedB: curves[j].closed,
        }));
      }
    }
    p.noFill();
    p.stroke(227, 6, 19, 220);
    p.strokeWeight(1);
    for (const m of markers) {
      p.line(m.x - 5, m.y, m.x + 5, m.y);
      p.line(m.x, m.y - 5, m.x, m.y + 5);
      p.circle(m.x, m.y, 7);
    }
  },
});
