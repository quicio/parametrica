/**
 * P5Adapter.js — p5 rendering backend.
 *
 *  - Drives the animation clock: when the transport plays, time advances
 *    (delta × speed) and the document re-evaluates at the new time —
 *    the glyph becomes a living mathematical object.
 *  - Composes registered render passes (view.modes) plus overlays.
 *  - HiDPI via pixelDensity; black field; CAD guides.
 */

import { Generators, RenderPasses } from '../../core/registry.ts';
import { supportsSpatial } from '../../core/capabilities.ts';
import { drawOverlays } from '../../viz/overlays.ts';
import { buildRenderScene } from '../../application/renderSceneBuilder.ts';
import { drawEvenOddFill } from '../fill.ts';
import { traceFillGroups, withoutTraceFill } from '../traceFill.ts';
import {
  buildViewportDescriptor,
  coordinateUnitInfo,
  formatCoordinateReadout,
  isOrthographicProjection,
  localPointInPanel,
  panelAtPoint,
  quadPanelLayout,
  worldFromArtboardPoint,
} from '../../view/viewportCoordinates.ts';
import { resolvePassStyle } from '../passStyle.js';
import {
  drawCoordinates,
  drawGuides,
  drawInspectionOverlay,
  drawQuadView,
  drawReference,
  drawSeamOverlay,
  drawUnderlay,
} from './overlays.ts';
import { pickSurface } from '../../domain/interaction/surfacePicker.ts';
import { clamp, orbitCamera, zoomCamera } from '../../view/cameraController.ts';
import { artboardPointFromCanvas } from '../../domain/interaction/ray.ts';
import { AnimationController } from '../../application/animationController.js';

const ANALYSIS_MODES = new Set(['tangents', 'normals', 'curvature']);

/** Does any active layer pass need differential geometry? */
function needsLayerAnalysis(view: Rec | null | undefined): boolean {
  const modes = Array.isArray(view?.modes) ? view.modes : [];
  if (modes.some((m) => ANALYSIS_MODES.has(m))) return true;
  return modes.includes('gradient-wireframe')
    && (view?.colorMetric === 'curvature' || view?.colorMetric === 'arc');
}

/** Does the current view read differential geometry at all? */
function needsAnalysis(view: Rec | null | undefined): boolean {
  if ((view?.overlays as Rec | undefined)?.inflections) return true;
  return needsLayerAnalysis(view);
}

function blendModeConstant(p: P5Like, value: unknown): unknown {
  if (value === 'multiply') return p.MULTIPLY;
  if (value === 'screen') return p.SCREEN;
  if (value === 'difference') return p.DIFFERENCE;
  return p.BLEND;
}

import { Renderer } from '../Renderer.ts';
import type { DocumentShape, LayerShape } from '../../core/documentTypes.ts';
import type { EngineEvaluation, EngineLayerResult, EngineGeometry, EngineCurve } from '../../core/engineTypes.ts';
import type { AllCurveAnalysis } from '../../analysis/differential.ts';
import type { CameraState } from '../../view/camera.ts';
import type { RenderScene, RenderLayer } from '../../domain/scene.ts';
import type { EngineCurve as EngineCurveType } from '../../core/engineTypes.ts';

type Rec = Record<string, unknown>;
interface CanvasPoint { x: number; y: number }
interface ArtboardInfo { width: number; height: number; background?: string; margin?: number }
interface ArtboardRect extends CanvasPoint { w: number; h: number; scale: number; artboard: ArtboardInfo }
interface PointerState { x: number; y: number }
interface DragState { startX: number; startY: number; yaw: number; pitch: number }
interface CoordinatePin extends Rec { projection?: string; layout?: string; world?: unknown; layerId?: string | null; sourceLayerId?: string | null; meshId?: string | null; mesh?: EngineGeometry | null }
interface P5CanvasLike { parent(element: HTMLElement): unknown }
interface P5Like {
  width: number;
  height: number;
  deltaTime: number;
  mouseX: number;
  mouseY: number;
  mouseButton: number;
  drawingContext: CanvasRenderingContext2D & { canvas: HTMLCanvasElement };
  canvas?: HTMLCanvasElement;
  LEFT: number;
  MULTIPLY: unknown;
  SCREEN: unknown;
  DIFFERENCE: unknown;
  BLEND: unknown;
  setup?: () => void;
  draw?: () => void;
  windowResized?: () => void;
  mousePressed?: (event?: Event) => void;
  mouseDragged?: (event?: Event) => void;
  mouseReleased?: (event?: Event) => void;
  mouseMoved?: (event?: Event) => void;
  mouseWheel?: (event: WheelEvent) => boolean | void;
  createCanvas(width: number, height: number): P5CanvasLike;
  pixelDensity(value: number): void;
  smooth(): void;
  frameRate(value: number): void;
  background(...args: unknown[]): void;
  blendMode(mode: unknown): void;
  noLoop(): void;
  loop(): void;
  noStroke(): void;
  noFill(): void;
  fill(...args: unknown[]): void;
  rect(x: number, y: number, w: number, h: number): void;
  push(): void;
  pop(): void;
  translate(x: number, y: number): void;
  scale(value: number): void;
  resizeCanvas(width: number, height: number): void;
}
interface P5AppLike {
  document: DocumentShape;
  evaluation: EngineEvaluation | null;
  activeLayer: LayerShape | null;
  activeLayerIsInstance?(): boolean;
  activeLayerSource?(): LayerShape | null;
  activeLayerGeometryKind?(): string;
  clearSurfaceInspection?(): void;
  inspectAtCanvas?(x: number, y: number): unknown;
  notify?(message: string, kind?: string): void;
  pointerDragging: boolean;
  rebuild(): void;
  setTime(time: number): void;
  fabricationPreview: unknown;
  surfaceInspector?: { onViewportChange?(): void; onLayoutChange?(quad: boolean): void; [key: string]: unknown };
  seamLegend?: { onLayoutChange?(quad: boolean): void; [key: string]: unknown };
  [key: string]: unknown;
}

export class P5Adapter extends Renderer {
  app: P5AppLike;
  container: HTMLElement;
  p: P5Like | null;
  sketch: unknown;
  ready: boolean;
  loadError: unknown;
  dragState: DragState | null;
  animation: AnimationController;
  captureCanvas: HTMLCanvasElement | null;
  captureContext: CanvasRenderingContext2D | null;
  lastScene: RenderScene | null;
  quadActive: boolean;
  frameSamples: number[];
  overlayDegraded: boolean;
  performanceWarned: boolean;
  _seamOverlays: WeakMap<object, unknown>;
  _coordinatePointer: PointerState | null;
  _lastCoordinatePointer: PointerState | null;
  _coordinatePin: CoordinatePin | null;
  _lastCoordinateReadout: Rec | null;
  readyPromise: Promise<P5Adapter | null>;
  resizeObserver: ResizeObserver | null = null;
  captureMode: boolean = false;
  _artboardRect: ArtboardRect | null = null;
  productPreviewActive: boolean = false;

  constructor(container: HTMLElement, app: P5AppLike) {
    super(container);
    this.container = container;
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

  async load(): Promise<P5Adapter | null> {
    try {
      const { default: p5 } = await import('p5');
      this.sketch = new p5((p) => this.mount(p as P5Like));
      this.ready = true;
      requestAnimationFrame(() => this.fitToContainer());
      return this;
    } catch (error) {
      this.loadError = error;
      console.error('[parametrica] p5 failed to load:', error);
      return null;
    }
  }

  mount(p?: P5Like): void {
    if (!p) return;
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
    const isOverCanvas = (event: Event | undefined): boolean => {
      // Trust the DOM event target first — this is the only
      // authoritative check. Fall back to coordinate tests if no
      // event is present (defensive, should not happen in practice).
      if (event && event.target) return event.target === p.drawingContext.canvas;
      return false;
    };
    p.mousePressed = (event?: Event) => {
      if (p.mouseButton !== p.LEFT) return;
      if (!isOverCanvas(event)) return;
      this._coordinatePointer = { x: p.mouseX, y: p.mouseY };
      // Orthographic views have no camera to rotate.
      if ((this.app.document.view.projection ?? '3d') !== '3d') return;
      this.dragState = { startX: p.mouseX, startY: p.mouseY, yaw: this.app.document.view.camera.yaw, pitch: this.app.document.view.camera.pitch };
      this.app.pointerDragging = true;
    };
    p.mouseDragged = (event?: Event) => {
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
    p.mouseReleased = (event?: Event) => {
      // Release anywhere ends the drag — the user might drag off the
      // canvas. Don't require isOverCanvas here.
      this.dragState = null;
      this.app.pointerDragging = false;
      if (isOverCanvas(event)) {
        this._coordinatePointer = { x: p.mouseX, y: p.mouseY };
        this.app.inspectAtCanvas?.(p.mouseX, p.mouseY);
      }
    };
    p.mouseMoved = (event?: Event) => {
      if (this.captureMode || !isOverCanvas(event)) return;
      this._coordinatePointer = { x: p.mouseX, y: p.mouseY };
      if (this.quadActive) return;
      this.app.inspectAtCanvas?.(p.mouseX, p.mouseY);
    };
    p.mouseWheel = (event: WheelEvent) => {
      // Scroll-wheel zooms by adjusting FOV. Only respond when the
      // wheel happens over the canvas — over the panel, native
      // scrolling handles the slider/scrollbar.
      if (!isOverCanvas(event)) return;
      event.preventDefault();
      if ((this.app.document.view.projection ?? '3d') !== '3d') return false;
      const next = zoomCamera(this.app.document.view.camera, (event as unknown as { delta: number }).delta);
      this.app.document.view.camera.fov = next.fov;
      this.app.rebuild();
      return false;
    };
  }

  size(): { w: number; h: number } {
    const rect = this.container.getBoundingClientRect();
    return { w: Math.max(320, Math.floor(rect.width)), h: Math.max(320, Math.floor(rect.height)) };
  }

  fitToContainer(): void {
    if (!this.p) return;
    const { w, h } = this.size();
    if (w !== this.p.width || h !== this.p.height) {
      this.p.resizeCanvas(w, h);
      this.app.surfaceInspector?.onViewportChange?.();
    }
  }

  /** Pause the technical canvas while the optional product preview is active. */
  setProductPreviewActive(active: boolean): void {
    this.productPreviewActive = active === true;
    const canvas = this.p?.drawingContext?.canvas ?? this.p?.canvas;
    if (canvas) canvas.style.visibility = this.productPreviewActive ? 'hidden' : 'visible';
    if (!this.p) return;
    if (this.productPreviewActive) this.p.noLoop();
    else this.p.loop();
  }

  /** Render one frame immediately (used by sequence export). */
  renderNow(): void {
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
  artboardRect(): ArtboardRect {
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
  thumbnailDataURL(maxSize = 256, maxChars = 65_536): string | null {
    const source = this.p?.drawingContext?.canvas ?? this.p?.canvas;
    if (!source || !source.width || !source.height) return null;
    // Redraw without the reference underlay before capturing.
    this.captureMode = true;
    try { if (this.p) this.drawFrame(this.p); } finally { this.captureMode = false; }
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
  artboardDataURL(): string | null {
    const source = this.p?.drawingContext?.canvas ?? this.p?.canvas;
    if (!source) return null;
    this.captureMode = true;
    try { if (this.p) this.drawFrame(this.p); } finally { this.captureMode = false; }
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
  artboardImageData(maxSize = 360): { width: number; height: number; data: Uint8ClampedArray } | null {
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

  sourceCrop(): { sx: number; sy: number; sw: number; sh: number; artboard: ArtboardInfo } {
    const p = this.p!;
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

  drawFrame(p: P5Like): void {
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
      ? app.activeLayerSource?.()?.generator
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
      } as never)
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
        this.drawSceneContent(p, scene as RenderScene, {
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
            this.drawSeamOverlay(p, scene as RenderScene, rect);
            this.drawInspectionOverlay(p, scene as RenderScene, rect);
          }
          const cursor = this.coordinatePointerArtboardPoint();
          let cursorWorld = null;
          if (cursor && scene && doc.view.coordinates?.cursor) {
            const picked = pickSurface({
              evaluation: app.evaluation as never,
              scene: scene as never,
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

  trackFrame(started: number, doc: DocumentShape): void {
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

  drawSceneContent(p: P5Like, scene: RenderScene, {
    document: doc,
    time,
    view,
    modes,
    analysisByLayer = null,
    combinedAnalysis = null,
  }: {
    document: DocumentShape;
    time: number;
    view: unknown;
    modes: string[];
    analysisByLayer?: Map<string, AllCurveAnalysis | undefined> | null | undefined;
    combinedAnalysis?: AllCurveAnalysis | null | undefined;
  }): void {
    // Image traces keep holes in separate layers; paint each trace group as
    // one even-odd path before any strokes so the hole stays transparent.
    for (const fillGroup of traceFillGroups(scene.layers as never)) {
      p.push();
      p.blendMode(blendModeConstant(p, (fillGroup.layers[0]?.style as Rec | undefined)?.blend ?? (view as Rec).style));
      drawEvenOddFill(p, fillGroup.curves as never, fillGroup.fill as never, fillGroup.bbox as never);
      p.pop();
      p.blendMode(p.BLEND);
    }

    const viewData = view as Rec;
    for (const group of scene.layers) {
      const layerModes = Array.isArray(group.modes) && group.modes.length ? group.modes : modes;
      const layerStyle = withoutTraceFill((group.style ?? (view as Rec).style) as never, group.trace as never);
      const layerAnalysisNeeded = needsLayerAnalysis({ ...viewData, modes: layerModes });
      const layerData: Rec = {
        curves: group.curves,
        bbox: group.bbox,
        view: {
          ...viewData,
          style: layerStyle,
          colorMetric: group.colorMetric ?? viewData.colorMetric,
        },
        document: doc,
        time,
        meshes: group.meshes ?? [],
      };
      if (layerAnalysisNeeded) {
        layerData.analysis = analysisByLayer?.get(group.id) ?? combinedAnalysis ?? null;
      }
      p.push();
      p.blendMode(blendModeConstant(p, (group.style as Rec | undefined)?.blend ?? (view as Rec).style));
      try {
        for (const modeId of layerModes) {
          if (!RenderPasses.has(modeId)) continue;
          p.push();
          const context = p.drawingContext;
          const previousAlpha = context?.globalAlpha ?? 1;
          const opacity = Number((viewData.passOpacity as Rec | undefined)?.[modeId]);
          if (context && Number.isFinite(opacity)) context.globalAlpha = previousAlpha * clamp(opacity, 0, 1);
          try {
            const passView = {
              ...(layerData.view as Rec),
              style: resolvePassStyle(modeId, viewData as never, layerStyle as never),
            };
            const draw = RenderPasses.get(modeId).draw as unknown as (p: unknown, data: unknown) => void;
            draw(p, { ...layerData, view: passView });
          } catch (e) {
            console.warn(`[parametrica] pass "${modeId}" failed:`, e instanceof Error ? e.message : String(e));
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
    drawOverlays(p as never, {
      curves: scene.layers.flatMap((layer) => layer.curves) as never,
      bbox: scene.meta.bbox as never,
      analysis: combinedAnalysis as never,
      view: view as never,
      document: doc,
      time,
    });
    p.pop();
  }

  drawQuadView(p: P5Like, evaluation: EngineEvaluation, doc: DocumentShape, artboard: ArtboardInfo): void { drawQuadView(this as never, p as never, evaluation, doc, artboard as never); }

  /** Pointer position in local artboard coordinates, or null outside. */
  coordinatePointerArtboardPoint(): CanvasPoint | null {
    const pointer = this._coordinatePointer;
    const rect = this._artboardRect;
    if (!pointer || !rect) return null;
    const x = (pointer.x - rect.x - rect.w / 2) / rect.scale;
    const y = (pointer.y - rect.y - rect.h / 2) / rect.scale;
    const artboard = rect.artboard;
    if (Math.abs(x) > artboard.width / 2 || Math.abs(y) > artboard.height / 2) return null;
    return { x, y };
  }

  currentCoordinateReadout(): Rec | null {
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
  setCoordinatePin(readout: Rec | null | undefined): boolean {
    if (!readout?.world) {
      this._coordinatePin = null;
      return false;
    }
    const pin: CoordinatePin = {
      ...(readout as CoordinatePin),
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

  clearCoordinatePin(): void {
    this._coordinatePin = null;
  }

  /**
   * Revalidate a pin after evaluation or projection changes. Pins derived from
   * geometry are dropped when their source mesh is gone; orthographic pins are
   * dropped when the projection or layout changes. Stale values are never
   * reported as current.
   */
  invalidateCoordinatePin(): void {
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
      if (!pin.projection || !allowed.includes(pin.projection)) {
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

  hasCoordinatePin(): boolean {
    return Boolean(this._coordinatePin);
  }

  coordinatePinReadout(): CoordinatePin | null {
    return this._coordinatePin;
  }

  #evaluationLayer(layerId: string | null | undefined): EngineLayerResult | null {
    return (this.app.evaluation?.layers ?? []).find((layer) => layer.id === layerId) ?? null;
  }

  /**
   * Resolve the readable world coordinates at a canvas point using the same
   * panel descriptor as the overlay. Useful for tests and future inspectors.
   */
  coordinateReadoutAtCanvas(canvasX: number, canvasY: number): Rec | null {
    const doc = this.app.document;
    const evaluation = this.app.evaluation;
    if (!evaluation || !doc) return null;
    const rect = this.artboardRect();
    const artboardPoint = artboardPointFromCanvas({ x: canvasX, y: canvasY }, rect as never);
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
      } as never);
      const descriptor = buildViewportDescriptor({
        projection: panel.projection,
        transform: (scene.meta.referenceTransform ?? scene.transform) as never,
        units,
        unitDisplay,
        panelSize: { w: panel.w, h: panel.h },
      });
      const world = worldFromArtboardPoint({
        descriptor,
        point: localPointInPanel(artboardPoint as never, panel as never) as never,
      });
      return world
        ? { projection: panel.projection, world, text: formatCoordinateReadout(world, descriptor.units) }
        : null;
    }
    const projection = doc.view.projection ?? '3d';
    const scene = buildRenderScene({ evaluation, document: doc, view: doc.view } as never);
    if (!isOrthographicProjection(projection)) {
      const picked = pickSurface({
        evaluation,
        scene,
        artboardPoint,
        activeLayerId: doc.layers?.[doc.activeLayer ?? 0]?.id ?? null,
      } as never);
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
      transform: (scene.meta.referenceTransform ?? scene.transform) as never,
      units,
      unitDisplay,
      panelSize: { w: rect.artboard.width, h: rect.artboard.height },
    });
    const world = worldFromArtboardPoint({ descriptor, point: artboardPoint as never });
    return world
      ? { projection, world, text: formatCoordinateReadout(world, descriptor.units) }
      : null;
  }

  drawCoordinates(p: P5Like, options: Rec = {}): void { drawCoordinates(this as never, p as never, options as never); }

  /**
   * Reference image, drawn in artboard coordinates behind the geometry.
   * Purely UI state; it never enters the document or a saved preset.
   */
  drawUnderlay(p: P5Like, artboard: ArtboardInfo): void { drawUnderlay(this as never, p as never, artboard as never); }

  drawSeamOverlay(p: P5Like, scene: RenderScene, rect: ArtboardRect): void { drawSeamOverlay(this as never, p as never, scene, rect as never); }

  drawInspectionOverlay(p: P5Like, scene: RenderScene, rect: ArtboardRect): void { drawInspectionOverlay(this as never, p as never, scene, rect as never); }

  drawReference(p: P5Like, scene: RenderScene, scale: number, options: Rec = {}): void { drawReference(this as never, p as never, scene, scale, options as never); }

  drawGuides(p: P5Like, artboard: ArtboardInfo): void { drawGuides(this as never, p as never, artboard as never); }
}

