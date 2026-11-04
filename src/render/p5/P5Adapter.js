/**
 * P5Adapter.js — p5 rendering backend.
 *
 *  - Drives the animation clock: when the transport plays, time advances
 *    (delta × speed) and the document re-evaluates at the new time —
 *    the glyph becomes a living mathematical object.
 *  - Composes registered render passes (view.modes) plus overlays.
 *  - HiDPI via pixelDensity; black field; CAD guides.
 */

import { Generators, RenderPasses } from '../../core/registry.js';
import { supportsSpatial } from '../../core/capabilities.js';
import { analyzeAll } from '../../analysis/differential.js';
import { drawOverlays } from '../../viz/overlays.js';
import { buildRenderScene } from '../../application/renderSceneBuilder.js';
import { buildSpatialReference } from '../../view/spatialReference.js';
import {
  buildCoordinateTicks,
  buildViewportDescriptor,
  formatCoordinate,
  formatCoordinateReadout,
  isOrthographicProjection,
  localPointInPanel,
  panelAtPoint,
  quadPanelLayout,
  worldFromArtboardPoint,
} from '../../view/viewportCoordinates.js';
import { drawSpatialReference } from '../reference.js';
import { buildInspectionOverlay } from '../../interaction/inspectionOverlay.js';
import { buildSeamOverlay } from '../../interaction/seamOverlay.js';
import { clamp, orbitCamera, zoomCamera } from '../../view/cameraController.js';
import { artboardPointFromCanvas } from '../../interaction/ray.js';
import { AnimationController } from '../../application/animationController.js';

const ANALYSIS_MODES = new Set(['tangents', 'normals', 'curvature']);

/** Does any active layer pass need differential geometry? */
function needsLayerAnalysis(view) {
  const modes = Array.isArray(view?.modes) ? view.modes : [];
  if (modes.some((m) => ANALYSIS_MODES.has(m))) return true;
  return modes.includes('gradient-wireframe')
    && (view?.colorMetric === 'curvature' || view?.colorMetric === 'arc');
}

/** Does the current view read differential geometry at all? */
function needsAnalysis(view) {
  if (view?.overlays?.inflections) return true;
  return needsLayerAnalysis(view);
}

function blendModeConstant(p, value) {
  if (value === 'multiply') return p.MULTIPLY;
  if (value === 'screen') return p.SCREEN;
  if (value === 'difference') return p.DIFFERENCE;
  return p.BLEND;
}

import { Renderer } from '../Renderer.js';

export class P5Adapter extends Renderer {
  constructor(container, app) {
    super(container);
    this.app = app;
    this.p = null;
    this.sketch = null;
    this.ready = false;
    this.loadError = null;
    this.dragState = null;
    this.animation = new AnimationController();
    this.captureCanvas = null;
    this.captureContext = null;
    this.lastScene = null;
    this.quadActive = false;
    this._seamOverlays = new WeakMap();
    this._coordinatePointer = null;

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
      requestAnimationFrame(() => this.fitToContainer());
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
      // CSS can settle after the module starts; the initial p5 size may be
      // narrower than the final flex canvas. Re-fit after layout so the
      // artboard uses the full available width.
      requestAnimationFrame(() => this.fitToContainer());
      const canvas = p.drawingContext?.canvas;
      if (canvas) {
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Parametric geometry canvas');
        canvas.addEventListener('mouseleave', () => {
          this._coordinatePointer = null;
          this.app.clearSurfaceInspection?.();
        });
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
      this._coordinatePointer = { x: p.mouseX, y: p.mouseY };
      // Orthographic views have no camera to rotate.
      if ((this.app.document.view.projection ?? '3d') !== '3d') return;
      this.dragState = { startX: p.mouseX, startY: p.mouseY, yaw: this.app.document.view.camera.yaw, pitch: this.app.document.view.camera.pitch };
      this.app.pointerDragging = true;
    };
    p.mouseDragged = (event) => {
      if (!this.dragState) return;
      if (!isOverCanvas(event)) return;
      this._coordinatePointer = { x: p.mouseX, y: p.mouseY };
      const dx = p.mouseX - this.dragState.startX;
      const dy = p.mouseY - this.dragState.startY;
      const next = orbitCamera(this.app.document.view.camera, this.dragState, dx, dy);
      this.app.document.view.camera.yaw = next.yaw;
      this.app.document.view.camera.pitch = next.pitch;
      this.app.rebuild();
    };
    p.mouseReleased = (event) => {
      // Release anywhere ends the drag — the user might drag off the
      // canvas. Don't require isOverCanvas here.
      this.dragState = null;
      this.app.pointerDragging = false;
      if (isOverCanvas(event)) {
        this._coordinatePointer = { x: p.mouseX, y: p.mouseY };
        this.app.inspectAtCanvas?.(p.mouseX, p.mouseY);
      }
    };
    p.mouseMoved = (event) => {
      if (this.captureMode || !isOverCanvas(event)) return;
      this._coordinatePointer = { x: p.mouseX, y: p.mouseY };
      if (this.quadActive) return;
      this.app.inspectAtCanvas?.(p.mouseX, p.mouseY);
    };
    p.mouseWheel = (event) => {
      // Scroll-wheel zooms by adjusting FOV. Only respond when the
      // wheel happens over the canvas — over the panel, native
      // scrolling handles the slider/scrollbar.
      if (!isOverCanvas(event)) return;
      event.preventDefault();
      if ((this.app.document.view.projection ?? '3d') !== '3d') return false;
      const next = zoomCamera(this.app.document.view.camera, event.delta);
      this.app.document.view.camera.fov = next.fov;
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
    if (w !== this.p.width || h !== this.p.height) {
      this.p.resizeCanvas(w, h);
      this.app.surfaceInspector?.onViewportChange?.();
    }
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

  /**
   * Read the current artboard as RGBA data at a bounded size. Used by GIF
   * export so frames never need a PNG encode/decode round-trip.
   */
  artboardImageData(maxSize = 360) {
    const source = this.p?.drawingContext?.canvas ?? this.p?.canvas;
    if (!source) return null;
    const crop = this.sourceCrop();
    const artboard = crop.artboard;
    const scale = Math.min(1, Math.max(1, Number(maxSize) || 360) / Math.max(artboard.width, artboard.height, 1));
    const width = Math.max(1, Math.round(artboard.width * scale));
    const height = Math.max(1, Math.round(artboard.height * scale));
    if (!this.captureCanvas) {
      this.captureCanvas = document.createElement('canvas');
      this.captureContext = this.captureCanvas.getContext('2d', { willReadFrequently: true });
    }
    const canvas = this.captureCanvas;
    const context = this.captureContext;
    if (!context) return null;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.fillStyle = artboard.background ?? '#000000';
    context.fillRect(0, 0, width, height);
    context.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
    return {
      width,
      height,
      data: context.getImageData(0, 0, width, height).data,
    };
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
      const next = this.animation.advance(doc.animation, p.deltaTime);
      if (next !== null) app.setTime(next);
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

    const evaluation = app.evaluation;
    const spatial = supportsSpatial(Generators.get(doc.generator.id));
    const quad = doc.view.layout === 'quad' && spatial;
    if (quad !== this.quadActive) {
      this.quadActive = quad;
      if (!this.captureMode) {
        this.app.surfaceInspector?.onLayoutChange?.(quad);
        this.app.seamLegend?.onLayoutChange?.(quad);
      }
    }
    const scene = evaluation && !quad
      ? buildRenderScene({ evaluation, document: doc, view: doc.view })
      : null;
    this.lastScene = scene;

    if (doc.view.guides && !quad && !this.captureMode) this.drawGuides(p, artboard);
    if (!this.captureMode && !quad) this.drawUnderlay(p, artboard);
    if (scene && !quad && !this.captureMode) {
      this.drawReference(p, scene, rect.scale, {
        clip: {
          x: -artboard.width / 2,
          y: -artboard.height / 2,
          w: artboard.width,
          h: artboard.height,
        },
      });
    }

    if (evaluation) {
      if (quad) {
        this.drawQuadView(p, evaluation, doc, artboard);
      } else {
        const modes = Array.isArray(doc.view.modes) ? doc.view.modes : ['stroke'];
        const analysisByLayer = new Map(
          (evaluation.layers ?? []).map((layer) => [layer.id, layer.analysis]),
        );
        this.drawSceneContent(p, scene, {
          document: doc,
          time: doc.animation.time,
          view: doc.view,
          modes,
          analysisByLayer,
          combinedAnalysis: needsAnalysis(doc.view) ? evaluation.analysis : undefined,
        });
        if (!this.captureMode) {
          this.drawSeamOverlay(p, scene, rect);
          this.drawInspectionOverlay(p, scene, rect);
          this.drawCoordinates(p, {
            view: doc.view,
            projection: scene?.meta?.projection ?? doc.view.projection ?? '3d',
            transform: scene?.meta?.referenceTransform ?? scene?.transform ?? null,
            units: doc.view.units,
            panelSize: { w: artboard.width, h: artboard.height },
            pixelsPerArtboardUnit: rect.scale,
            cursor: this.coordinatePointerArtboardPoint(),
          });
        }
      }
    }

    p.pop();
  }

  drawSceneContent(p, scene, {
    document: doc,
    time,
    view,
    modes,
    analysisByLayer = null,
    combinedAnalysis = null,
  }) {
    for (const group of scene.layers) {
      const layerModes = Array.isArray(group.modes) && group.modes.length ? group.modes : modes;
      const layerAnalysisNeeded = needsLayerAnalysis({ ...view, modes: layerModes });
      const layerData = {
        curves: group.curves,
        bbox: group.bbox,
        view: {
          ...view,
          style: group.style ?? view.style,
          colorMetric: group.colorMetric ?? view.colorMetric,
        },
        document: doc,
        time,
        meshes: group.meshes ?? [],
      };
      if (layerAnalysisNeeded) {
        layerData.analysis = analysisByLayer?.get(group.id) ?? combinedAnalysis;
      }
      p.push();
      p.blendMode(blendModeConstant(p, group.style?.blend ?? view.style?.blend));
      try {
        for (const modeId of layerModes) {
          if (!RenderPasses.has(modeId)) continue;
          p.push();
          const context = p.drawingContext;
          const previousAlpha = context?.globalAlpha ?? 1;
          const opacity = Number(view.passOpacity?.[modeId]);
          if (context && Number.isFinite(opacity)) context.globalAlpha = previousAlpha * clamp(opacity, 0, 1);
          try {
            RenderPasses.get(modeId).draw(p, layerData);
          } catch (e) {
            console.warn(`[parametrica] pass "${modeId}" failed:`, e.message);
          } finally {
            if (context) context.globalAlpha = previousAlpha;
          }
          p.pop();
        }
      } finally {
        p.pop();
        p.blendMode(p.BLEND);
      }
    }
    p.push();
    drawOverlays(p, {
      curves: scene.layers.flatMap((layer) => layer.curves),
      bbox: scene.meta.bbox,
      analysis: combinedAnalysis,
      view,
      document: doc,
      time,
    });
    p.pop();
  }

  drawQuadView(p, evaluation, doc, artboard) {
    const panels = quadPanelLayout(artboard.width, artboard.height);
    const panelScale = Math.min(1, Math.min(panels[0].w, panels[0].h) / 380);
    const modes = Array.isArray(doc.view.modes) ? doc.view.modes : ['stroke'];
    const artboardPoint = this.coordinatePointerArtboardPoint();
    const hoveredPanel = panelAtPoint(panels, artboardPoint);
    panels.forEach((panel) => {
      const x = panel.cx - panel.w / 2;
      const y = panel.cy - panel.h / 2;
      const view = { ...doc.view, projection: panel.projection, layout: 'single' };
      const scene = buildRenderScene({
        evaluation,
        document: doc,
        view,
        projectionOverride: panel.projection,
      });
      const layers = scene.layers;
      const analysisByLayer = new Map(layers.map((layer) => [layer.id, analyzeAll(layer.curves)]));
      const combinedAnalysis = analyzeAll(layers.flatMap((layer) => layer.curves));
      const context = p.drawingContext;
      p.push();
      p.noFill();
      p.stroke(255, 28);
      p.strokeWeight(1);
      p.rect(x, y, panel.w, panel.h);
      context.save();
      context.beginPath();
      context.rect(x, y, panel.w, panel.h);
      context.clip();
      p.push();
      p.translate(panel.cx, panel.cy);
      p.scale(panelScale);
      if (!this.captureMode) {
        const ground = Boolean(scene.meta.reference?.ground)
          && (panel.projection === '3d' || panel.projection === 'xy');
        this.drawReference(
          p,
          scene,
          (this._artboardRect?.scale ?? 1) * panelScale,
          { ground },
        );
      }
      this.drawSceneContent(p, scene, {
        document: doc,
        time: doc.animation.time,
        view,
        modes,
        analysisByLayer,
        combinedAnalysis,
      });
      if (!this.captureMode) {
        this.drawCoordinates(p, {
          view: doc.view,
          projection: panel.projection,
          transform: scene?.meta?.referenceTransform ?? scene?.transform ?? null,
          units: doc.view.units,
          panelSize: { w: panel.w / panelScale, h: panel.h / panelScale },
          pixelsPerArtboardUnit: (this._artboardRect?.scale ?? 1) * panelScale,
          cursor: hoveredPanel === panel ? localPointInPanel(artboardPoint, panel) : null,
        });
      }
      p.pop();
      context.restore();
      p.pop();

      p.push();
      p.noStroke();
      p.fill(255, 150);
      p.textSize(12);
      p.textAlign(p.LEFT, p.TOP);
      p.text(panel.label, x + 8, y + 8);
      p.pop();
    });
  }

  /** Pointer position in local artboard coordinates, or null outside. */
  coordinatePointerArtboardPoint() {
    const pointer = this._coordinatePointer;
    const rect = this._artboardRect;
    if (!pointer || !rect) return null;
    const x = (pointer.x - rect.x - rect.w / 2) / rect.scale;
    const y = (pointer.y - rect.y - rect.h / 2) / rect.scale;
    const artboard = rect.artboard;
    if (Math.abs(x) > artboard.width / 2 || Math.abs(y) > artboard.height / 2) return null;
    return { x, y };
  }

  /**
   * Resolve the readable world coordinates at a canvas point using the same
   * panel descriptor as the overlay. Useful for tests and future inspectors.
   */
  coordinateReadoutAtCanvas(canvasX, canvasY) {
    const doc = this.app.document;
    const evaluation = this.app.evaluation;
    if (!evaluation || !doc) return null;
    const rect = this.artboardRect();
    const artboardPoint = artboardPointFromCanvas({ x: canvasX, y: canvasY }, rect);
    if (!artboardPoint) return null;
    const units = doc.view.units;
    const unitDisplay = doc.view.coordinates?.unitDisplay ?? 'auto';
    const spatial = supportsSpatial(Generators.get(doc.generator.id));
    const quad = doc.view.layout === 'quad' && spatial;
    if (quad) {
      const panels = quadPanelLayout(rect.artboard.width, rect.artboard.height);
      const panel = panelAtPoint(panels, artboardPoint);
      if (!panel || !isOrthographicProjection(panel.projection)) return null;
      const view = { ...doc.view, projection: panel.projection, layout: 'single' };
      const scene = buildRenderScene({
        evaluation,
        document: doc,
        view,
        projectionOverride: panel.projection,
      });
      const descriptor = buildViewportDescriptor({
        projection: panel.projection,
        transform: scene.meta.referenceTransform ?? scene.transform,
        units,
        unitDisplay,
        panelSize: { w: panel.w, h: panel.h },
      });
      const world = worldFromArtboardPoint({
        descriptor,
        point: localPointInPanel(artboardPoint, panel),
      });
      return world
        ? { projection: panel.projection, world, text: formatCoordinateReadout(world, descriptor.units) }
        : null;
    }
    const projection = doc.view.projection ?? '3d';
    if (!isOrthographicProjection(projection)) return null;
    const scene = buildRenderScene({ evaluation, document: doc, view: doc.view });
    const descriptor = buildViewportDescriptor({
      projection,
      transform: scene.meta.referenceTransform ?? scene.transform,
      units,
      unitDisplay,
      panelSize: { w: rect.artboard.width, h: rect.artboard.height },
    });
    const world = worldFromArtboardPoint({ descriptor, point: artboardPoint });
    return world
      ? { projection, world, text: formatCoordinateReadout(world, descriptor.units) }
      : null;
  }

  drawCoordinates(p, {
    view,
    projection,
    transform,
    units,
    panelSize,
    pixelsPerArtboardUnit,
    cursor = null,
  }) {
    const config = view?.coordinates;
    if (!config || (!config.enabled && !config.cursor)) return;
    if (!isOrthographicProjection(projection) || !transform) return;
    const descriptor = buildViewportDescriptor({
      projection,
      transform,
      units,
      unitDisplay: config.unitDisplay,
      panelSize,
    });
    if (!descriptor.ranges) return;
    const model = buildCoordinateTicks({
      descriptor,
      panelSize,
      step: config.step,
      pixelsPerArtboardUnit,
    });
    if (!model) return;

    const pixels = Number(pixelsPerArtboardUnit);
    const scale = Number.isFinite(pixels) && pixels > 0 ? pixels : 1;
    const px = (value) => value / scale;
    const halfW = panelSize.w / 2;
    const halfH = panelSize.h / 2;
    const unitInfo = descriptor.units;

    p.push();
    p.noStroke();
    if (config.enabled && config.grid) {
      p.stroke(255, 255, 255, 22);
      p.strokeWeight(px(0.55));
      for (const tick of model.horizontal.ticks) {
        p.line(tick.position, -halfH, tick.position, halfH);
      }
      for (const tick of model.vertical.ticks) {
        p.line(-halfW, tick.position, halfW, tick.position);
      }
    }

    if (config.enabled) {
      p.stroke(255, 255, 255, 88);
      p.strokeWeight(px(0.75));
      p.fill(205, 205, 205, 205);
      p.textSize(px(8));
      p.textAlign(p.CENTER, p.BOTTOM);
      for (const tick of model.horizontal.ticks) {
        p.line(tick.position, halfH, tick.position, halfH - px(5));
        p.text(formatCoordinate(tick.value, unitInfo), tick.position, halfH - px(6));
      }
      p.textAlign(p.LEFT, p.CENTER);
      for (const tick of model.vertical.ticks) {
        p.line(-halfW, tick.position, -halfW + px(5), tick.position);
        p.text(formatCoordinate(tick.value, unitInfo), -halfW + px(7), tick.position);
      }
      p.noStroke();
      p.fill(180, 180, 180, 210);
      p.textAlign(p.RIGHT, p.BOTTOM);
      p.text(
        `${descriptor.axes.horizontal.label} →  ${descriptor.axes.vertical.label} ↑${unitInfo.suffix ? `  [${unitInfo.suffix}]` : ''}`,
        halfW - px(7),
        halfH - px(5),
      );
    }

    if (config.cursor && cursor && !this.captureMode) {
      const world = worldFromArtboardPoint({ point: cursor, descriptor });
      if (world) {
        p.noStroke();
        p.fill(230, 230, 230, 225);
        p.textSize(px(8));
        p.textAlign(p.RIGHT, p.TOP);
        p.text(formatCoordinateReadout(world, unitInfo), halfW - px(7), -halfH + px(7));
      }
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

  drawSeamOverlay(p, scene, rect) {
    if (!this.app.isSeamsVisible?.()) return;
    let overlay = this._seamOverlays.get(scene);
    if (!overlay) {
      overlay = buildSeamOverlay({ evaluation: this.app.evaluation, scene });
      this._seamOverlays.set(scene, overlay);
    }
    this.app.seamLegend?.setStatus?.(overlay.status);
    if (!overlay.edges.length) return;
    const scale = rect.scale > 0 ? rect.scale : 1;
    const artboard = rect.artboard;
    const ctx = p.drawingContext;
    if (ctx && artboard) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-artboard.width / 2, -artboard.height / 2, artboard.width, artboard.height);
      ctx.clip();
    }
    p.push();
    drawSeamEdges(p, ctx, overlay.edges.filter((edge) => edge.kind.startsWith('border-')), {
      color: [150, 150, 150, 120],
      weight: 1 / scale,
      dash: null,
    });
    drawSeamEdges(p, ctx, overlay.edges.filter((edge) => edge.kind === 'seam-u' || edge.kind === 'seam-v'), {
      color: [227, 6, 19, 190],
      weight: 1.2 / scale,
      dash: [5 / scale, 4 / scale],
    });
    drawSeamEdges(p, ctx, overlay.edges.filter((edge) => edge.kind.endsWith('-twist')), {
      color: [227, 6, 19, 225],
      weight: 1.4 / scale,
      dash: [2 / scale, 3 / scale],
    });
    p.pop();
    if (ctx && artboard) ctx.restore();
  }

  drawInspectionOverlay(p, scene, rect) {
    const result = this.app.surfaceInspector?.activeResult?.();
    if (!result) return;
    const overlay = buildInspectionOverlay({
      evaluation: this.app.evaluation,
      scene,
      result,
    });
    if (!overlay) return;
    const scale = rect.scale > 0 ? rect.scale : 1;
    const artboard = rect.artboard;
    const ctx = p.drawingContext;
    if (ctx && artboard) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-artboard.width / 2, -artboard.height / 2, artboard.width, artboard.height);
      ctx.clip();
    }
    p.push();
    if (overlay.cell) {
      p.fill(227, 6, 19, 24);
      p.stroke(227, 6, 19, 220);
      p.strokeWeight(1.6 / scale);
      drawOverlayShape(p, overlay.cell);
    }
    if (overlay.triangle) {
      p.fill(245, 245, 245, overlay.mappingValid ? 30 : 0);
      p.stroke(overlay.mappingValid ? 250 : 150, overlay.mappingValid ? 240 : 170);
      p.strokeWeight(1.4 / scale);
      if (!overlay.mappingValid && ctx) ctx.setLineDash([4 / scale, 3 / scale]);
      drawOverlayShape(p, overlay.triangle);
      if (ctx) ctx.setLineDash([]);
    }
    if (overlay.marker) {
      p.noStroke();
      p.fill(5, 5, 5, 200);
      p.circle(overlay.marker.x, overlay.marker.y, 10 / scale);
      p.fill(250, 250, 250, 245);
      p.circle(overlay.marker.x, overlay.marker.y, 5.5 / scale);
      p.stroke(5, 5, 5, 190);
      p.strokeWeight(2 / scale);
      p.line(
        overlay.marker.x - 9 / scale,
        overlay.marker.y,
        overlay.marker.x + 9 / scale,
        overlay.marker.y,
      );
      p.line(
        overlay.marker.x,
        overlay.marker.y - 9 / scale,
        overlay.marker.x,
        overlay.marker.y + 9 / scale,
      );
      p.stroke(250, 250, 250, 220);
      p.strokeWeight(1 / scale);
      p.line(
        overlay.marker.x - 7 / scale,
        overlay.marker.y,
        overlay.marker.x + 7 / scale,
        overlay.marker.y,
      );
      p.line(
        overlay.marker.x,
        overlay.marker.y - 7 / scale,
        overlay.marker.x,
        overlay.marker.y + 7 / scale,
      );
    }
    p.pop();
    if (ctx && artboard) ctx.restore();
  }

  drawReference(p, scene, scale, { ground = null, clip = null } = {}) {
    const config = scene?.meta?.reference;
    const transform = scene?.meta?.referenceTransform;
    if (!config?.enabled || !transform) return;
    const showGround = ground === null ? Boolean(config.ground) : Boolean(ground);
    const reference = buildSpatialReference({
      transform,
      worldBBox: scene.meta.worldBBox,
      ground: showGround,
    });
    const ctx = p.drawingContext;
    let clipped = false;
    if (clip && ctx) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(clip.x, clip.y, clip.w, clip.h);
      ctx.clip();
      clipped = true;
    }
    try {
      drawSpatialReference(p, reference, { scale, ground: showGround });
    } finally {
      if (clipped) ctx.restore();
    }
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

function drawOverlayShape(p, points) {
  p.beginShape();
  for (const point of points) p.vertex(point.x, point.y);
  p.endShape(p.CLOSE);
}

function drawSeamEdges(p, ctx, edges, { color, weight, dash }) {
  if (!edges.length) return;
  p.stroke(...color);
  p.strokeWeight(weight);
  if (ctx) ctx.setLineDash(dash ?? []);
  for (const edge of edges) {
    p.line(edge.points[0].x, edge.points[0].y, edge.points[1].x, edge.points[1].y);
  }
  if (ctx) ctx.setLineDash([]);
}
