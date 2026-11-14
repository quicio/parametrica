/** Frame-context overlays for the p5 backend. */

import { analyzeAll } from '../../analysis/differential.ts';
import { buildRenderScene } from '../../application/renderSceneBuilder.ts';
import { buildInspectionOverlay } from '../../interaction/inspectionOverlay.ts';
import { buildSeamOverlay } from '../../interaction/seamOverlay.ts';
import { clamp } from '../../view/cameraController.ts';
import { buildSpatialReference } from '../../view/spatialReference.ts';
import type { BuiltSpatialReference, SpatialTransform } from '../../view/spatialReference.ts';
import {
  buildCoordinateTicks,
  buildViewportDescriptor,
  coordinateUnitInfo,
  formatCoordinate,
  formatCoordinateReadout,
  isOrthographicProjection,
  localPointInPanel,
  panelAtPoint,
  quadPanelLayout,
  worldFromArtboardPoint,
} from '../../view/viewportCoordinates.ts';
import type { CoordinateSettings, NullableWorldPoint, PanelLayout, ViewportDescriptor } from '../../view/viewportCoordinates.ts';
import { drawSpatialReference } from '../reference.ts';
import type { DocumentShape } from '../../core/documentTypes.ts';
import type { RenderScene } from '../../domain/scene.ts';

type Rec = Record<string, unknown>;

interface LocalPoint { x: number; y: number; [key: string]: unknown }
interface PanelRect { x: number; y: number; w: number; h: number }
interface OverlayArtboard { width: number; height: number; margin: number; [key: string]: unknown }
interface CoordinatePin { projection?: string; world?: NullableWorldPoint | null; [key: string]: unknown }
interface ImageUnderlayLike {
  visible?: boolean;
  opacity?: number;
  scale?: number;
  x?: number;
  y?: number;
  rotation?: number;
  image?: HTMLImageElement | null;
  [key: string]: unknown;
}
interface SeamEdge { kind: string; points: LocalPoint[] }
interface SeamOverlay { status?: unknown; edges: SeamEdge[] }
interface InspectionOverlay {
  cell?: LocalPoint[] | null;
  triangle?: LocalPoint[] | null;
  marker?: LocalPoint | null;
  mappingValid?: boolean;
  [key: string]: unknown;
}

export interface P5OverlayContext {
  drawingContext: CanvasRenderingContext2D | null;
  CLOSE: unknown;
  LEFT: unknown;
  RIGHT: unknown;
  CENTER: unknown;
  TOP: unknown;
  BOTTOM: unknown;
  push(): void;
  pop(): void;
  noFill(): void;
  noStroke(): void;
  stroke(...args: unknown[]): void;
  fill(...args: unknown[]): void;
  strokeWeight(value: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  circle(x: number, y: number, diameter: number): void;
  textSize(value: number): void;
  textAlign(horizontal: unknown, vertical?: unknown): void;
  text(value: unknown, x: number, y: number): void;
  translate(x: number, y: number): void;
  scale(value: number): void;
  beginShape(): void;
  vertex(x: number, y: number): void;
  endShape(mode?: unknown): void;
}

export interface OverlayApp {
  imageUnderlay: ImageUnderlayLike | null;
  evaluation: unknown;
  isSeamsVisible?(): boolean;
  seamLegend?: { setStatus?(status: unknown): void };
  surfaceInspector?: { activeResult?(): unknown };
}

export interface P5OverlayAdapter {
  app: OverlayApp;
  captureMode?: boolean;
  _artboardRect?: { scale?: number } | null;
  _coordinatePin?: CoordinatePin | null;
  _seamOverlays: WeakMap<object, SeamOverlay>;
  coordinatePointerArtboardPoint(): LocalPoint | null;
  drawReference(
    p: P5OverlayContext,
    scene: RenderScene,
    scale: number,
    options?: { ground?: boolean; clip?: PanelRect | null },
  ): void;
  drawSceneContent(
    p: P5OverlayContext,
    scene: RenderScene,
    options: Rec,
  ): void;
  drawCoordinates(
    p: P5OverlayContext,
    options: {
      view: DocumentShape['view'];
      projection: string;
      transform: SpatialTransform | null;
      units: unknown;
      panelSize: { w: number; h: number };
      pixelsPerArtboardUnit: number;
      cursor?: LocalPoint | null;
      cursorWorld?: NullableWorldPoint | null;
    },
  ): void;
}

export function drawQuadView(
  adapter: P5OverlayAdapter,
  p: P5OverlayContext,
  evaluation: unknown,
  doc: DocumentShape,
  artboard: OverlayArtboard,
): void {
  const panels = quadPanelLayout(artboard.width, artboard.height);
  const first = panels[0] as PanelLayout;
  const panelScale = Math.min(1, Math.min(first.w, first.h) / 380);
  const modes = Array.isArray(doc.view.modes) ? doc.view.modes : ['stroke'];
  const artboardPoint = adapter.coordinatePointerArtboardPoint();
  const hoveredPanel = panelAtPoint(panels, artboardPoint as never);
  panels.forEach((panel) => {
    const x = panel.cx - panel.w / 2;
    const y = panel.cy - panel.h / 2;
    const view = { ...doc.view, projection: panel.projection, layout: 'single' };
    const scene = buildRenderScene({
      evaluation,
      document: doc,
      view,
      projectionOverride: panel.projection,
    } as never);
    const layers = scene.layers;
    const analysisByLayer = new Map(layers.map((layer) => [layer.id, analyzeAll(layer.curves as never)]));
    const combinedAnalysis = analyzeAll(layers.flatMap((layer) => layer.curves as never));
    const context = p.drawingContext;
    p.push();
    p.noFill();
    p.stroke(255, 28);
    p.strokeWeight(1);
    p.rect(x, y, panel.w, panel.h);
    context?.save();
    if (context) {
      context.beginPath();
      context.rect(x, y, panel.w, panel.h);
      context.clip();
    }
    p.push();
    p.translate(panel.cx, panel.cy);
    p.scale(panelScale);
    if (!adapter.captureMode) {
      const meta = scene.meta as Rec;
      const reference = meta.reference as Rec | undefined;
      const ground = Boolean(reference?.ground)
        && (panel.projection === '3d' || panel.projection === 'xy');
      adapter.drawReference(
        p,
        scene,
        (adapter._artboardRect?.scale ?? 1) * panelScale,
        { ground },
      );
    }
    adapter.drawSceneContent(p, scene, {
      document: doc,
      time: doc.animation.time,
      view,
      modes,
      analysisByLayer,
      combinedAnalysis,
    });
    if (!adapter.captureMode) {
      const meta = scene.meta as Rec;
      adapter.drawCoordinates(p, {
        view: doc.view,
        projection: panel.projection,
        transform: (meta.referenceTransform ?? scene.transform ?? null) as SpatialTransform | null,
        units: doc.view.units,
        panelSize: { w: panel.w / panelScale, h: panel.h / panelScale },
        pixelsPerArtboardUnit: (adapter._artboardRect?.scale ?? 1) * panelScale,
        cursor: hoveredPanel === panel && artboardPoint ? localPointInPanel(artboardPoint as never, panel as never) as LocalPoint : null,
      });
    }
    p.pop();
    context?.restore();
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

export interface DrawCoordinatesOptions {
  view?: { coordinates?: CoordinateSettings; [key: string]: unknown };
  projection?: string;
  transform?: SpatialTransform | null;
  units?: unknown;
  panelSize?: { w: number; h: number };
  pixelsPerArtboardUnit?: number;
  cursor?: LocalPoint | null;
  cursorWorld?: NullableWorldPoint | null;
}

export function drawCoordinates(
  adapter: P5OverlayAdapter,
  p: P5OverlayContext,
  {
    view,
    projection = '3d',
    transform = null,
    units = null,
    panelSize = { w: 0, h: 0 },
    pixelsPerArtboardUnit = 1,
    cursor = null,
    cursorWorld = null,
  }: DrawCoordinatesOptions = {},
): void {
  const config = view?.coordinates;
  if (!config || (!config.enabled && !config.cursor && !adapter._coordinatePin)) return;
  const pixels = Number(pixelsPerArtboardUnit);
  const scale = Number.isFinite(pixels) && pixels > 0 ? pixels : 1;
  const px = (value: number): number => value / scale;
  const halfW = panelSize.w / 2;
  const halfH = panelSize.h / 2;
  const pinned = adapter._coordinatePin?.projection === projection
    ? adapter._coordinatePin.world ?? null
    : null;
  const unitInfo = coordinateUnitInfo(units, config.unitDisplay);
  if (!isOrthographicProjection(projection)) {
    const world = pinned ?? cursorWorld;
    if (!world || (!config.cursor && !pinned)) return;
    p.push();
    p.noStroke();
    p.fill(230, 230, 230, 225);
    p.textSize(px(8));
    p.textAlign(p.RIGHT, p.TOP);
    p.text(formatCoordinateReadout(world, unitInfo), halfW - px(7), -halfH + px(7));
    p.pop();
    return;
  }
  if (!transform) return;
  const descriptor = buildViewportDescriptor({
    projection,
    transform: transform as never,
    units,
    unitDisplay: config.unitDisplay,
    panelSize,
  });
  if (!descriptor.ranges || !descriptor.axes) return;
  const model = buildCoordinateTicks({
    descriptor,
    panelSize,
    step: config.step,
    pixelsPerArtboardUnit,
  });
  if (!model) return;

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

  if ((config.cursor || pinned) && !adapter.captureMode) {
    const world = pinned ?? (cursor ? worldFromArtboardPoint({ point: cursor, descriptor }) : null);
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

export function drawUnderlay(adapter: P5OverlayAdapter, p: P5OverlayContext, artboard: OverlayArtboard): void {
  const underlay = adapter.app.imageUnderlay;
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
  ctx.globalAlpha = clamp(Number(underlay.opacity ?? 0.35), 0, 1);
  ctx.translate(Number(underlay.x) || 0, Number(underlay.y) || 0);
  ctx.rotate(Number(underlay.rotation) || 0);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export function drawSeamOverlay(
  adapter: P5OverlayAdapter,
  p: P5OverlayContext,
  scene: RenderScene,
  rect: { scale: number; artboard?: OverlayArtboard | null; [key: string]: unknown },
): void {
  if (!adapter.app.isSeamsVisible?.()) return;
  let overlay = adapter._seamOverlays.get(scene);
  if (!overlay) {
    overlay = buildSeamOverlay({ evaluation: adapter.app.evaluation as never, scene: scene as never }) as unknown as SeamOverlay;
    adapter._seamOverlays.set(scene, overlay);
  }
  adapter.app.seamLegend?.setStatus?.(overlay.status);
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

export function drawInspectionOverlay(
  adapter: P5OverlayAdapter,
  p: P5OverlayContext,
  scene: RenderScene,
  rect: { scale: number; artboard?: OverlayArtboard | null; [key: string]: unknown },
): void {
  const result = adapter.app.surfaceInspector?.activeResult?.();
  if (!result) return;
  const overlay = buildInspectionOverlay({
    evaluation: adapter.app.evaluation as never,
    scene: scene as never,
    result: result as never,
  }) as unknown as InspectionOverlay | null;
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

export function drawReference(
  adapter: P5OverlayAdapter,
  p: P5OverlayContext,
  scene: RenderScene,
  scale: number,
  { ground = null, clip = null }: { ground?: boolean | null; clip?: PanelRect | null } = {},
): void {
  const meta = scene?.meta as Rec;
  const config = meta?.reference as Rec | undefined;
  const transform = meta?.referenceTransform as SpatialTransform | undefined;
  if (!config?.enabled || !transform) return;
  const showGround = ground === null ? Boolean(config.ground) : Boolean(ground);
  const reference: BuiltSpatialReference | null = buildSpatialReference({
    transform,
    worldBBox: meta.worldBBox as never,
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
    drawSpatialReference(p, reference as never, { scale, ground: showGround });
  } finally {
    if (clipped && ctx) ctx.restore();
  }
}

export function drawGuides(adapter: P5OverlayAdapter, p: P5OverlayContext, artboard: OverlayArtboard): void {
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

function drawOverlayShape(p: P5OverlayContext, points: ReadonlyArray<LocalPoint>): void {
  p.beginShape();
  for (const point of points) p.vertex(point.x, point.y);
  p.endShape(p.CLOSE);
}

function drawSeamEdges(
  p: P5OverlayContext,
  ctx: CanvasRenderingContext2D | null,
  edges: ReadonlyArray<SeamEdge>,
  { color, weight, dash }: { color: number[]; weight: number; dash: number[] | null },
): void {
  if (!edges.length) return;
  p.stroke(...color);
  p.strokeWeight(weight);
  if (ctx) ctx.setLineDash(dash ?? []);
  for (const edge of edges) {
    const a = edge.points[0];
    const b = edge.points[1];
    if (!a || !b) continue;
    p.line(a.x, a.y, b.x, b.y);
  }
  if (ctx) ctx.setLineDash([]);
}
