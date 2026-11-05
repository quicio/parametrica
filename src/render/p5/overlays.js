/**
 * render/p5/overlays.js — frame-context overlays for the p5 backend.
 *
 * Coordinate, quad, reference, seam, inspection, guide and underlay drawing
 * lives here. P5Adapter owns the frame lifecycle and passes it in explicitly;
 * these functions never mutate the document or evaluation.
 */

import { analyzeAll } from '../../analysis/differential.js';
import { buildRenderScene } from '../../application/renderSceneBuilder.js';
import { buildInspectionOverlay } from '../../interaction/inspectionOverlay.js';
import { buildSeamOverlay } from '../../interaction/seamOverlay.js';
import { clamp } from '../../view/cameraController.js';
import { buildSpatialReference } from '../../view/spatialReference.js';
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
} from '../../view/viewportCoordinates.js';
import { drawSpatialReference } from '../reference.js';

export function drawQuadView(adapter, p, evaluation, doc, artboard) {
    const panels = quadPanelLayout(artboard.width, artboard.height);
    const panelScale = Math.min(1, Math.min(panels[0].w, panels[0].h) / 380);
    const modes = Array.isArray(doc.view.modes) ? doc.view.modes : ['stroke'];
    const artboardPoint = adapter.coordinatePointerArtboardPoint();
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
      if (!adapter.captureMode) {
        const ground = Boolean(scene.meta.reference?.ground)
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
        adapter.drawCoordinates(p, {
          view: doc.view,
          projection: panel.projection,
          transform: scene?.meta?.referenceTransform ?? scene?.transform ?? null,
          units: doc.view.units,
          panelSize: { w: panel.w / panelScale, h: panel.h / panelScale },
          pixelsPerArtboardUnit: (adapter._artboardRect?.scale ?? 1) * panelScale,
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

export function drawCoordinates(adapter, p, {
  view,
  projection,
  transform,
  units,
  panelSize,
  pixelsPerArtboardUnit,
  cursor = null,
  cursorWorld = null,
} = {}) {
    const config = view?.coordinates;
    if (!config || (!config.enabled && !config.cursor && !adapter._coordinatePin)) return;
    const pixels = Number(pixelsPerArtboardUnit);
    const scale = Number.isFinite(pixels) && pixels > 0 ? pixels : 1;
    const px = (value) => value / scale;
    const halfW = panelSize.w / 2;
    const halfH = panelSize.h / 2;
    const pinned = adapter._coordinatePin?.projection === projection
      ? adapter._coordinatePin.world
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

export function drawUnderlay(adapter, p, artboard) {
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
    ctx.globalAlpha = clamp(underlay.opacity ?? 0.35, 0, 1);
    ctx.translate(Number(underlay.x) || 0, Number(underlay.y) || 0);
    ctx.rotate(Number(underlay.rotation) || 0);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
}

export function drawSeamOverlay(adapter, p, scene, rect) {
    if (!adapter.app.isSeamsVisible?.()) return;
    let overlay = adapter._seamOverlays.get(scene);
    if (!overlay) {
      overlay = buildSeamOverlay({ evaluation: adapter.app.evaluation, scene });
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

export function drawInspectionOverlay(adapter, p, scene, rect) {
    const result = adapter.app.surfaceInspector?.activeResult?.();
    if (!result) return;
    const overlay = buildInspectionOverlay({
      evaluation: adapter.app.evaluation,
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

export function drawReference(adapter, p, scene, scale, { ground = null, clip = null } = {}) {
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

export function drawGuides(adapter, p, artboard) {
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
