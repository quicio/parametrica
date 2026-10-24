/**
 * P5Renderer.js — v2 rendering surface.
 *
 *  - Drives the animation clock: when the transport plays, time advances
 *    (delta × speed) and the document re-evaluates at the new time —
 *    the glyph becomes a living mathematical object.
 *  - Composes registered render passes (view.modes) plus overlays.
 *  - HiDPI via pixelDensity; black field; CAD guides.
 */

import { RenderPasses } from '../core/registry.js';
import { bboxAll } from '../sampling/sampling.js';
import { drawOverlays } from '../viz/overlays.js';
import { projectCurves } from './projection.js';

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

const ANALYSIS_MODES = new Set(['tangents', 'normals', 'curvature']);

/** Does the current view read differential geometry? */
function needsAnalysis(view) {
  if (view?.overlays?.inflections) return true;
  const modes = Array.isArray(view?.modes) ? view.modes : [];
  return modes.some((m) => ANALYSIS_MODES.has(m));
}

export class P5Renderer {
  constructor(container, app) {
    this.container = container;
    this.app = app;
    this.p = null;
    this.sketch = null;
    this.ready = false;
    this.loadError = null;
    this.dragState = null;

    // p5 is the largest dependency in the bundle. Importing it lazily
    // keeps the first paint and the control panel responsive while the
    // renderer chunk arrives.
    this.readyPromise = this.load();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.fitToContainer());
      this.resizeObserver.observe(container);
    }
  }

  async load() {
    try {
      const { default: p5 } = await import('p5');
      this.sketch = new p5((p) => this.mount(p));
      this.ready = true;
      return this;
    } catch (error) {
      this.loadError = error;
      console.error('[parametrica] p5 failed to load:', error);
      return null;
    }
  }

  mount(p) {
    this.p = p;
    p.setup = () => {
      const { w, h } = this.size();
      p.createCanvas(w, h).parent(this.container);
      p.pixelDensity(window.devicePixelRatio || 1);
      p.smooth();
      p.frameRate(60);
      const canvas = p.drawingContext?.canvas;
      if (canvas) {
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Parametric geometry canvas');
      }
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
      // Orthographic views have no camera to rotate.
      if ((this.app.document.view.projection ?? '3d') !== '3d') return;
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
    p.mouseReleased = () => {
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
      if ((this.app.document.view.projection ?? '3d') !== '3d') return false;
      const cam = this.app.document.view.camera;
      const factor = event.delta > 0 ? 1.08 : 1 / 1.08;
      cam.fov = clamp(cam.fov * factor, 1, 2000);
      this.app.rebuild();
      return false;
    };
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

  /** Render one frame immediately (used by sequence export). */
  renderNow() {
    if (!this.p) return;
    // Exports and thumbnails are mathematised: the reference underlay is
    // UI-only and must never leak into captured artifacts.
    this.captureMode = true;
    try {
      this.drawFrame(this.p);
    } finally {
      this.captureMode = false;
    }
  }

  /** Artboard rectangle in canvas CSS coordinates. */
  artboardRect() {
    const p = this.p;
    const artboard = this.app.document.view.artboard ?? { width: 900, height: 900 };
    const width = p?.width ?? this.size().w;
    const height = p?.height ?? this.size().h;
    const scale = Math.min(width / artboard.width, height / artboard.height);
    const w = artboard.width * scale;
    const h = artboard.height * scale;
    return {
      x: (width - w) / 2,
      y: (height - h) / 2,
      w,
      h,
      scale,
      artboard,
    };
  }

  /**
   * Capture the current artboard as a PNG data URL for the notebook.
   * Preserves aspect ratio, tries progressively smaller sizes and gives up
   * above the 64 KB notebook cap.
   */
  thumbnailDataURL(maxSize = 256, maxChars = 65_536) {
    const source = this.p?.drawingContext?.canvas ?? this.p?.canvas;
    if (!source || !source.width || !source.height) return null;
    // Redraw without the reference underlay before capturing.
    this.captureMode = true;
    try { this.drawFrame(this.p); } finally { this.captureMode = false; }
    const crop = this.sourceCrop();
    const sizes = [maxSize, 192, 128, 96, 64].filter((s) => s <= maxSize);
    for (const size of sizes) {
      try {
        const scale = Math.min(size / crop.sw, size / crop.sh);
        const w = Math.max(1, Math.round(crop.sw * scale));
        const h = Math.max(1, Math.round(crop.sh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.fillStyle = this.app.document.view.artboard?.background ?? '#000000';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
        const url = canvas.toDataURL('image/png');
        if (url.length <= maxChars) return url;
      } catch {
        /* try the next size */
      }
    }
    return null;
  }

  /** Full-size artboard PNG for export. */
  artboardDataURL() {
    const source = this.p?.drawingContext?.canvas ?? this.p?.canvas;
    if (!source) return null;
    this.captureMode = true;
    try { this.drawFrame(this.p); } finally { this.captureMode = false; }
    try {
      const crop = this.sourceCrop();
      const width = Math.max(1, Math.round(crop.artboard.width));
      const height = Math.max(1, Math.round(crop.artboard.height));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  sourceCrop() {
    const p = this.p;
    const source = p.drawingContext.canvas;
    const rect = this.artboardRect();
    const kx = source.width / p.width;
    const ky = source.height / p.height;
    return {
      sx: rect.x * kx,
      sy: rect.y * ky,
      sw: rect.w * kx,
      sh: rect.h * ky,
      artboard: rect.artboard,
    };
  }

  drawFrame(p) {
    const { app } = this;
    const doc = app.document;

    // animation transport
    if (doc.animation.playing && !this.captureMode) {
      const dt = Math.min(0.1, p.deltaTime / 1000);
      app.setTime(doc.animation.time + dt * doc.animation.speed);
    }

    p.background(5);
    const rect = this.artboardRect();
    this._artboardRect = rect;
    const artboard = doc.view.artboard;
    p.push();
    p.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    p.scale(rect.scale);

    // Artboard field. The surround stays dark so the composition reads as
    // a page inside the instrument.
    p.noStroke();
    p.fill(artboard.background);
    p.rect(-artboard.width / 2, -artboard.height / 2, artboard.width, artboard.height);

    if (doc.view.guides) this.drawGuides(p, artboard);

    if (!this.captureMode) this.drawUnderlay(p, artboard);

    const evaluation = app.evaluation;
    if (evaluation) {
      const data = {
        curves: evaluation.curves,
        bbox: evaluation.bbox,
        view: doc.view,
        document: doc,
        time: doc.animation.time,
      };
      // Differential geometry is lazy: only read it when an active pass
      // or overlay actually uses tangents/normals/curvature/inflections.
      const analysis = needsAnalysis(doc.view) ? evaluation.analysis : undefined;
      const modes = Array.isArray(doc.view.modes) ? doc.view.modes : ['stroke'];
      const projection = doc.view.projection ?? '3d';
      const sourceGroups = Array.isArray(evaluation.layers) && evaluation.layers.length
        ? evaluation.layers.filter((layer) => layer.visible !== false && layer.curves.length)
        : [{ curves: evaluation.curves, style: doc.view.style, bbox: evaluation.bbox, generator: doc.generator }];
      const groups = sourceGroups.map((group) => ({
        ...group,
        curves: projectCurves(group.curves, projection, {
          fit: Number(group.generator?.params?.fit) || 0,
        }),
      }));

      for (const group of groups) {
        const layerData = {
          ...data,
          curves: group.curves,
          bbox: group.curves.length ? bboxAll(group.curves) : (group.bbox ?? evaluation.bbox),
          view: { ...doc.view, style: group.style ?? doc.view.style },
        };
        if (analysis) layerData.analysis = analysis;
        for (const modeId of modes) {
          if (!RenderPasses.has(modeId)) continue;
          p.push();
          try {
            RenderPasses.get(modeId).draw(p, layerData);
          } catch (e) {
            console.warn(`[parametrica] pass "${modeId}" failed:`, e.message);
          }
          p.pop();
        }
      }
      p.push();
      const renderCurves = groups.flatMap((group) => group.curves);
      drawOverlays(p, {
        ...data,
        curves: renderCurves,
        bbox: renderCurves.length ? bboxAll(renderCurves) : data.bbox,
        analysis,
      });
      p.pop();
    }

    p.pop();
  }

  /**
   * Reference image, drawn in artboard coordinates behind the geometry.
   * Purely UI state; it never enters the document or a saved preset.
   */
  drawUnderlay(p, artboard) {
    const underlay = this.app.imageUnderlay;
    const image = underlay?.image;
    if (!underlay?.visible || !image?.complete || !image.naturalWidth) return;
    const ctx = p.drawingContext;
    if (!ctx) return;
    const base = Math.min(artboard.width / image.naturalWidth, artboard.height / image.naturalHeight);
    const w = image.naturalWidth * base * (Number(underlay.scale) || 1);
    const h = image.naturalHeight * base * (Number(underlay.scale) || 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-artboard.width / 2, -artboard.height / 2, artboard.width, artboard.height);
    ctx.clip();
    ctx.globalAlpha = clamp(underlay.opacity ?? 0.35, 0, 1);
    ctx.translate(Number(underlay.x) || 0, Number(underlay.y) || 0);
    ctx.rotate(Number(underlay.rotation) || 0);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  drawGuides(p, artboard) {
    const w = artboard.width;
    const h = artboard.height;
    const margin = artboard.margin;
    p.push();
    p.strokeWeight(1);
    p.stroke(255, 255, 255, 16);
    p.line(0, -h / 2, 0, h / 2);
    p.line(-w / 2, 0, w / 2, 0);
    p.noFill();
    p.stroke(255, 255, 255, 10);
    p.rect(-w / 2 + margin, -h / 2 + margin, w - margin * 2, h - margin * 2);
    p.pop();
  }
}
