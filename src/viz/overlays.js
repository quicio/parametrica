/**
 * viz/overlays.js — live-mathematics overlays (spec §10).
 *
 * Independently toggleable diagnostic layers, always drawn on top:
 * inflection points, sample points, arc-length ruler, bounding box.
 */

export const OVERLAYS = [
  { id: 'inflections', name: 'Inflection Points' },
  { id: 'samplePoints', name: 'Sampled Points' },
  { id: 'ruler', name: 'Arc-Length Ruler' },
  { id: 'bbox', name: 'Bounding Box' },
];

export function drawOverlays(p, { curves, analysis, bbox, view }) {
  const on = view.overlays ?? {};
  if (on.inflections) drawInflections(p, curves, analysis);
  if (on.samplePoints) drawSamplePoints(p, curves);
  if (on.ruler) drawRuler(p, curves);
  if (on.bbox && bbox) drawBBox(p, bbox);
}

function drawInflections(p, curves, analysis) {
  p.noStroke();
  p.fill(227, 6, 19, 230);
  curves.forEach((c, ci) => {
    const a = analysis.perCurve[ci];
    if (!a) return;
    for (const i of a.inflections) {
      p.circle(c.points[i].x, c.points[i].y, 6);
    }
  });
}

function drawSamplePoints(p, curves) {
  p.noFill();
  p.stroke(255, 120);
  p.strokeWeight(1);
  for (const c of curves) {
    const step = Math.max(1, Math.floor(c.points.length / 200));
    for (let i = 0; i < c.points.length; i += step) {
      p.circle(c.points[i].x, c.points[i].y, 3);
    }
  }
}

function drawRuler(p, curves) {
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
      const dx = next.x - pt.x;
      const dy = next.y - pt.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 6;
      const ny = (dx / len) * 6;
      p.line(pt.x - nx, pt.y - ny, pt.x + nx, pt.y + ny);
    }
  }
}

function drawBBox(p, bbox) {
  p.noFill();
  p.stroke(255, 50);
  p.strokeWeight(0.75);
  p.rect(bbox.minX, bbox.minY, bbox.width, bbox.height);
  p.stroke(227, 6, 19, 120);
  p.line(bbox.cx - 6, bbox.cy, bbox.cx + 6, bbox.cy);
  p.line(bbox.cx, bbox.cy - 6, bbox.cx, bbox.cy + 6);
}
