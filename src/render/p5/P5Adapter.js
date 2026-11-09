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
import { drawOverlays } from '../../viz/overlays.js';
import { buildRenderScene } from '../../application/renderSceneBuilder.js';
import { drawEvenOddFill } from '../fill.js';
import { traceFillGroups, withoutTraceFill } from '../traceFill.js';
import {
  buildViewportDescriptor,
  coordinateUnitInfo,
  formatCoordinateReadout,
  isOrthographicProjection,
  localPointInPanel,
  panelAtPoint,
  quadPanelLayout,
  worldFromArtboardPoint,
} from '../../view/viewportCoordinates.js';
import { resolvePassStyle } from '../passStyle.js';
import {
  drawCoordinates,
  drawGuides,
  drawInspectionOverlay,
  drawQuadView,
  drawReference,
  drawSeamOverlay,
  drawUnderlay,
} from './overlays.js';
import { pickSurface } from '../../domain/interaction/surfacePicker.js';
import { clamp, orbitCamera, zoomCamera } from '../../view/cameraController.js';
import { artboardPointFromCanvas } from '../../domain/interaction/ray.js';
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
    this.frameSamples = [];
    this.overlayDegraded = false;
    this.performanceWarned = false;
    this._seamOverlays = new WeakMap();
    this._coordinatePointer = null;
    this._lastCoordinatePointer = null;
    this._coordinatePin = null;
    this._lastCoordinateReadout = null;

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
          if (this._coordinatePointer) this._lastCoordinatePointer = this._coordinatePointer;
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

  /** Pause the technical canvas while the optional product preview is active. */
  setProductPreviewActive(active) {
    this.productPreviewActive = active === true;
    const canvas = this.p?.drawingContext?.canvas ?? this.p?.canvas;
    if (canvas) canvas.style.visibility = this.productPreviewActive ? 'hidden' : 'visible';
    if (!this.p) return;
    if (this.productPreviewActive) this.p.noLoop();
    else this.p.loop();
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
    const frameStarted = performance.now();
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
    const activeGenerator = app.activeLayerIsInstance?.()
      ? app.activeLayerSource()?.generator
      : app.activeLayer?.generator;
    const spatial = Boolean(activeGenerator && supportsSpatial(Generators.get(activeGenerator.id)));
    const quad = doc.view.layout === 'quad' && spatial;
    if (quad !== this.quadActive) {
      this.quadActive = quad;
      if (!this.captureMode) {
        this.app.surfaceInspector?.onLayoutChange?.(quad);
        this.app.seamLegend?.onLayoutChange?.(quad);
      }
    }
    const scene = evaluation && !quad
      ? buildRenderScene({
        evaluation,
        document: doc,
        view: doc.view,
        preview: this.app.fabricationPreview && !this.app.pointerDragging && !doc.animation?.playing
          ? this.app.fabricationPreview
          : null,
      })
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
          const degradeOverlays = this.overlayDegraded && doc.animation.playing;
          if (!degradeOverlays) {
            this.drawSeamOverlay(p, scene, rect);
            this.drawInspectionOverlay(p, scene, rect);
          }
          const cursor = this.coordinatePointerArtboardPoint();
          let cursorWorld = null;
          if (cursor && scene && doc.view.coordinates?.cursor) {
            const picked = pickSurface({
              evaluation: app.evaluation,
              scene,
              artboardPoint: cursor,
              activeLayerId: doc.layers?.[doc.activeLayer ?? 0]?.id ?? null,
            });
            cursorWorld = picked?.world ?? null;
          }
          this.drawCoordinates(p, {
            view: doc.view,
            projection: scene?.meta?.projection ?? doc.view.projection ?? '3d',
            transform: scene?.meta?.referenceTransform ?? scene?.transform ?? null,
            units: doc.view.units,
            panelSize: { w: artboard.width, h: artboard.height },
            pixelsPerArtboardUnit: rect.scale,
            cursor,
            cursorWorld,
          });
        }
      }
    }

    p.pop();
    this.trackFrame(frameStarted, doc);
  }

  trackFrame(started, doc) {
    if (this.captureMode) return;
    if (!doc.animation?.playing) {
      this.frameSamples = [];
      this.overlayDegraded = false;
      this.performanceWarned = false;
      return;
    }
    const elapsed = performance.now() - started;
    if (!Number.isFinite(elapsed) || elapsed < 0) return;
    this.frameSamples.push(elapsed);
    if (this.frameSamples.length > 20) this.frameSamples.shift();
    if (this.frameSamples.length < 12) return;
    const average = this.frameSamples.reduce((sum, value) => sum + value, 0) / this.frameSamples.length;
    if (average > 33) {
      this.overlayDegraded = true;
      if (!this.performanceWarned) {
        this.performanceWarned = true;
        this.app.notify?.('Dense scene: seam and inspection overlays paused during playback.', 'info');
      }
    }
  }

  drawSceneContent(p, scene, {
    document: doc,
    time,
    view,
    modes,
    analysisByLayer = null,
    combinedAnalysis = null,
  }) {
    // Image traces keep holes in separate layers; paint each trace group as
    // one even-odd path before any strokes so the hole stays transparent.
    for (const fillGroup of traceFillGroups(scene.layers)) {
      p.push();
      p.blendMode(blendModeConstant(p, fillGroup.layers[0]?.style?.blend ?? view.style?.blend));
      drawEvenOddFill(p, fillGroup.curves, fillGroup.fill, fillGroup.bbox);
      p.pop();
      p.blendMode(p.BLEND);
    }

    for (const group of scene.layers) {
      const layerModes = Array.isArray(group.modes) && group.modes.length ? group.modes : modes;
      const layerStyle = withoutTraceFill(group.style ?? view.style, group.trace);
      const layerAnalysisNeeded = needsLayerAnalysis({ ...view, modes: layerModes });
      const layerData = {
        curves: group.curves,
        bbox: group.bbox,
        view: {
          ...view,
          style: layerStyle,
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
            const passView = {
              ...layerData.view,
              style: resolvePassStyle(modeId, view, layerStyle),
            };
            RenderPasses.get(modeId).draw(p, { ...layerData, view: passView });
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

  drawQuadView(p, evaluation, doc, artboard) { drawQuadView(this, p, evaluation, doc, artboard); }

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

  currentCoordinateReadout() {
    const pointer = this._coordinatePointer ?? this._lastCoordinatePointer;
    if (!pointer) return this._lastCoordinateReadout;
    if (this._coordinatePointer) this._lastCoordinatePointer = this._coordinatePointer;
    const readout = this.coordinateReadoutAtCanvas(pointer.x, pointer.y);
    this._lastCoordinateReadout = readout;
    return readout;
  }

  /**
   * Pin the last valid readout. A 3D pin remembers the mesh identity so it
   * can be invalidated when the geometry it came from is re-evaluated.
   */
  setCoordinatePin(readout) {
    if (!readout?.world) {
      this._coordinatePin = null;
      return false;
    }
    const pin = {
      ...readout,
      layout: this.app.document?.view?.layout ?? 'single',
    };
    if (pin.meshId) {
      const layer = this.#evaluationLayer(pin.layerId ?? pin.sourceLayerId);
      if (!layer) {
        this._coordinatePin = null;
        return false;
      }
      pin.mesh = layer.meshes?.find((mesh) => mesh.id === pin.meshId) ?? null;
      if (!pin.mesh) {
        this._coordinatePin = null;
        return false;
      }
    }
    this._coordinatePin = pin;
    return true;
  }

  clearCoordinatePin() {
    this._coordinatePin = null;
  }

  /**
   * Revalidate a pin after evaluation or projection changes. Pins derived from
   * geometry are dropped when their source mesh is gone; orthographic pins are
   * dropped when the projection or layout changes. Stale values are never
   * reported as current.
   */
  invalidateCoordinatePin() {
    const pin = this._coordinatePin;
    if (!pin) return;
    const view = this.app.document?.view;
    const projection = view?.projection ?? '3d';
    const layout = view?.layout ?? 'single';
    if (pin.layout !== layout) {
      this._coordinatePin = null;
      return;
    }
    if (layout === 'quad') {
      const allowed = quadPanelLayout(1, 1).map((panel) => panel.projection);
      if (!allowed.includes(pin.projection)) {
        this._coordinatePin = null;
        return;
      }
    } else if (pin.projection !== projection) {
      this._coordinatePin = null;
      return;
    }
    if (!pin.meshId) return;
    const layer = this.#evaluationLayer(pin.layerId ?? pin.sourceLayerId);
    if (!layer) {
      this._coordinatePin = null;
      return;
    }
    const mesh = layer.meshes?.find((entry) => entry.id === pin.meshId) ?? null;
    if (!mesh || mesh !== pin.mesh) this._coordinatePin = null;
  }

  hasCoordinatePin() {
    return Boolean(this._coordinatePin);
  }

  coordinatePinReadout() {
    return this._coordinatePin;
  }

  #evaluationLayer(layerId) {
    return (this.app.evaluation?.layers ?? []).find((layer) => layer.id === layerId) ?? null;
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
    const spatial = ['surface', 'mesh', 'solid', 'curve3d'].includes(
      this.app.activeLayerGeometryKind?.() ?? 'curve2d',
    );
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
    const scene = buildRenderScene({ evaluation, document: doc, view: doc.view });
    if (!isOrthographicProjection(projection)) {
      const picked = pickSurface({
        evaluation,
        scene,
        artboardPoint,
        activeLayerId: doc.layers?.[doc.activeLayer ?? 0]?.id ?? null,
      });
      if (!picked) return null;
      const unitInfo = coordinateUnitInfo(units, unitDisplay);
      return {
        projection,
        world: picked.world,
        text: formatCoordinateReadout(picked.world, unitInfo),
        sourceLayerId: picked.sourceLayerId ?? null,
        layerId: picked.layerId ?? null,
        surfaceId: picked.surfaceId ?? null,
        meshId: picked.meshId ?? null,
      };
    }
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

  drawCoordinates(p, options = {}) { drawCoordinates(this, p, options); }

  /**
   * Reference image, drawn in artboard coordinates behind the geometry.
   * Purely UI state; it never enters the document or a saved preset.
   */
  drawUnderlay(p, artboard) { drawUnderlay(this, p, artboard); }

  drawSeamOverlay(p, scene, rect) { drawSeamOverlay(this, p, scene, rect); }

  drawInspectionOverlay(p, scene, rect) { drawInspectionOverlay(this, p, scene, rect); }

  drawReference(p, scene, scale, options = {}) { drawReference(this, p, scene, scale, options); }

  drawGuides(p, artboard) { drawGuides(this, p, artboard); }
}

