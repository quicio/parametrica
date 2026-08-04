/**
 * P5Renderer.js — real-time p5 rendering surface.
 *
 *  - Black background, white monoline strokes, no fill.
 *  - High-DPI: pixelDensity follows window.devicePixelRatio.
 *  - Perfect anti-aliasing: smooth() + native Bézier rasterization —
 *    the same Bézier segments the SVG exporter writes.
 *  - CAD guides: hairline axes + frame, ultra-low alpha.
 *  - Redraws every frame; geometry is swapped atomically by the app.
 */

import p5 from 'p5';

export class P5Renderer {
  /**
   * @param {HTMLElement} container
   * @param {object} app  read access to app.params + app.geometry
   */
  constructor(container, app) {
    this.container = container;
    this.app = app;
    this.p = null;

    this.sketch = new p5((p) => {
      this.p = p;
      p.setup = () => {
        const { w, h } = this.size();
        const canvas = p.createCanvas(w, h);
        canvas.parent(container);
        p.pixelDensity(window.devicePixelRatio || 1);
        p.smooth();
        p.frameRate(60);
      };
      p.draw = () => this.drawFrame(p);
      p.windowResized = () => this.fitToContainer();
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.fitToContainer());
      this.resizeObserver.observe(container);
    }
  }

  /** Current CSS-pixel drawing surface size. */
  size() {
    const rect = this.container.getBoundingClientRect();
    return {
      w: Math.max(320, Math.floor(rect.width)),
      h: Math.max(320, Math.floor(rect.height)),
    };
  }

  fitToContainer() {
    if (!this.p) return;
    const { w, h } = this.size();
    if (w !== this.p.width || h !== this.p.height) this.p.resizeCanvas(w, h);
  }

  drawFrame(p) {
    p.background(0);
    const geometry = this.app.geometry;
    if (!geometry) return;

    p.push();
    p.translate(p.width / 2, p.height / 2);

    this.drawGuides(p);

    p.noFill();
    p.stroke(255);
    p.strokeWeight(this.app.params.strokeWeight);
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);

    this.strokeSegments(p, geometry.master.segments);
    if (this.app.params.mirror) {
      this.strokeSegments(p, geometry.mirrorSegments);
    }

    p.pop();
  }

  strokeSegments(p, segments) {
    if (!segments.length) return;
    p.beginShape();
    p.vertex(segments[0].p0.x, segments[0].p0.y);
    for (const s of segments) {
      p.bezierVertex(s.p1.x, s.p1.y, s.p2.x, s.p2.y, s.p3.x, s.p3.y);
    }
    p.endShape();
  }

  drawGuides(p) {
    const w = p.width;
    const h = p.height;
    p.push();
    p.strokeWeight(1);
    // mirror axis + equator
    p.stroke(255, 255, 255, 16);
    p.line(0, -h / 2, 0, h / 2);
    p.line(-w / 2, 0, w / 2, 0);
    // frame
    p.noFill();
    p.stroke(255, 255, 255, 10);
    p.rect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28);
    p.pop();
  }
}
