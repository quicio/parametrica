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

/** Wrap an angle into the half-open interval (-π, π]. */
function wrapPi(angle) {
  const TAU = Math.PI * 2;
  let a = angle;
  while (a > Math.PI) a -= TAU;
  while (a <= -Math.PI) a += TAU;
  return a;
}

/** Clamp a number to [lo, hi]. */
function clamp(v, lo, hi) {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

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

      // Camera drag: holding the mouse down on the canvas and dragging
      // rotates the document's view.camera. Horizontal delta → yaw,
      // vertical → pitch. Sensitivity is 1° per pixel — predictable,
      // no acceleration. Release ends the drag.
      //
      // IMPORTANT: we must gate on the DOM event target so clicks on
      // the control panel (#ui) — slider drags, scroll wheel over a
      // widget, combobox opens — do NOT trigger camera rotation.
      // Otherwise the panel intercepts slider drags.
      this.dragState = null;
      const isOverCanvas = (event) => {
        // Trust the DOM event target first — this is the only
        // authoritative check. Fall back to coordinate tests if no
        // event is present (defensive, should not happen in practice).
        if (event && event.target) return event.target === p.drawingContext.canvas;
        return false;
      };
      p.mousePressed = (event) => {
        if (p.mouseButton !== p.LEFT) return;
        if (!isOverCanvas(event)) return;
        this.dragState = { startX: p.mouseX, startY: p.mouseY, yaw: this.app.document.view.camera.yaw, pitch: this.app.document.view.camera.pitch };
      };
      p.mouseDragged = (event) => {
        if (!this.dragState) return;
        if (!isOverCanvas(event)) return;
        const dx = p.mouseX - this.dragState.startX;
        const dy = p.mouseY - this.dragState.startY;
        const cam = this.app.document.view.camera;
        // 1° per pixel — wrap yaw into [-π, π), clamp pitch away from
        // the gimbal-lock poles (±π/2 − ε).
        cam.yaw = wrapPi(this.dragState.yaw - dx * (Math.PI / 180));
        cam.pitch = clamp(this.dragState.pitch + dy * (Math.PI / 180), -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
        this.app.rebuild();
      };
      p.mouseReleased = (event) => {
        if (!this.dragState) return;
        // Release anywhere ends the drag — the user might drag off the
        // canvas. Don't require isOverCanvas here.
        this.dragState = null;
      };
      p.mouseWheel = (event) => {
        // Scroll-wheel zooms by adjusting FOV. Only respond when the
        // wheel happens over the canvas — over the panel, native
        // scrolling handles the slider/scrollbar.
        if (!isOverCanvas(event)) return;
        event.preventDefault();
        const cam = this.app.document.view.camera;
        const factor = event.delta > 0 ? 1.08 : 1 / 1.08;
        cam.fov = clamp(cam.fov * factor, 1, 2000);
        this.app.rebuild();
        return false;
      };
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
