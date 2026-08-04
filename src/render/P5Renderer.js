/**
 * P5Renderer.js — v2 rendering surface.
 *
 *  - Drives the animation clock: when the transport plays, time advances
 *    (delta × speed) and the document re-evaluates at the new time —
 *    the glyph becomes a living mathematical object.
 *  - Composes registered render passes (view.modes) plus overlays.
 *  - HiDPI via pixelDensity; black field; CAD guides.
 */

import p5 from 'p5';
import { RenderPasses } from '../core/registry.js';
import { drawOverlays } from '../viz/overlays.js';

export class P5Renderer {
  constructor(container, app) {
    this.container = container;
    this.app = app;
    this.p = null;

    this.sketch = new p5((p) => {
      this.p = p;
      p.setup = () => {
        const { w, h } = this.size();
        p.createCanvas(w, h).parent(container);
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

  size() {
    const rect = this.container.getBoundingClientRect();
    return { w: Math.max(320, Math.floor(rect.width)), h: Math.max(320, Math.floor(rect.height)) };
  }

  fitToContainer() {
    if (!this.p) return;
    const { w, h } = this.size();
    if (w !== this.p.width || h !== this.p.height) this.p.resizeCanvas(w, h);
  }

  drawFrame(p) {
    const { app } = this;
    const doc = app.document;

    // animation transport
    if (doc.animation.playing) {
      const dt = Math.min(0.1, p.deltaTime / 1000);
      app.setTime(doc.animation.time + dt * doc.animation.speed);
    }

    p.background(0);
    p.push();
    p.translate(p.width / 2, p.height / 2);

    if (doc.view.guides) this.drawGuides(p);

    const evaluation = app.evaluation;
    if (evaluation) {
      const data = {
        curves: evaluation.curves,
        analysis: evaluation.analysis,
        bbox: evaluation.bbox,
        view: doc.view,
        document: doc,
        time: doc.animation.time,
      };
      for (const modeId of doc.view.modes) {
        if (!RenderPasses.has(modeId)) continue;
        p.push();
        try {
          RenderPasses.get(modeId).draw(p, data);
        } catch (e) {
          console.warn(`[parametrica] pass "${modeId}" failed:`, e.message);
        }
        p.pop();
      }
      p.push();
      drawOverlays(p, data);
      p.pop();
    }

    p.pop();
  }

  drawGuides(p) {
    const w = p.width;
    const h = p.height;
    p.push();
    p.strokeWeight(1);
    p.stroke(255, 255, 255, 16);
    p.line(0, -h / 2, 0, h / 2);
    p.line(-w / 2, 0, w / 2, 0);
    p.noFill();
    p.stroke(255, 255, 255, 10);
    p.rect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28);
    p.pop();
  }
}
