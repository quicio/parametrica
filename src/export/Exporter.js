/**
 * Exporter.js — SVG / PNG / JSON from evaluated curves.
 *
 * SVG: one clean <path> per curve (M + L + Z for closed), coordinates
 * rounded to 2 decimals, black field, white monoline, the full
 * Parametrica document embedded as an XML comment — every SVG is a preset.
 */

import { APP_ID } from '../core/document.js';
import { RenderPasses } from '../core/registry.js';
import { projectCurves, projectionFor } from '../render/projection.js';

/**
 * Active features the SVG builder does not represent. Used to warn instead of
 * silently implying full render fidelity.
 * @param {object} view
 * @param {Array|null} layers evaluated layers (optional)
 * @returns {string[]}
 */
export function unsupportedSvgFeatures(view = {}, layers = null) {
  const modes = Array.isArray(view?.modes) ? view.modes : ['stroke'];
  const features = [];
  const hasMeshes = Array.isArray(layers)
    ? layers.some((layer) => layer.visible !== false && (
      (layer.renderMeshes?.length ?? 0) > 0 || (layer.meshes?.length ?? 0) > 0
    ))
    : false;
  if (modes.includes('gradient-wireframe')) features.push('Gradient Wireframe');
  if (modes.includes('surface-fill') && hasMeshes) features.push('Surface Fill');
  for (const id of modes) {
    if (id === 'stroke' || id === 'gradient-wireframe' || id === 'surface-fill') continue;
    if (!RenderPasses.has(id)) continue;
    features.push(RenderPasses.get(id).name);
  }
  if (view?.overlays && Object.values(view.overlays).some(Boolean)) features.push('Overlays');
  const hasBlend = Array.isArray(layers)
    ? layers.some((layer) => layer.style?.blend && layer.style.blend !== 'normal')
    : false;
  if (hasBlend || (view?.style?.blend && view.style.blend !== 'normal')) {
    features.push('Blend mode');
  }
  return [...new Set(features)];
}

export class Exporter {
  constructor(app) {
    this.app = app;
  }

  /* ——— Pure builder (DOM-free, unit-testable) ——— */

  /**
   * @param {Array} curves   evaluated curves
   * @param {object} view    { strokeWeight }
   * @param {object} size    { w, h }
   * @param {object} document  embedded as metadata
   */
  static buildSVG(curves, view, { w, h }, document = null, layers = null) {
    const artboard = view.artboard ?? {
      width: w,
      height: h,
      background: '#000000',
    };
    const fallbackStyle = view.style ?? {
      stroke: { color: '#ffffff', width: view.strokeWeight ?? 2, opacity: 1, cap: 'round', join: 'round' },
      fill: { enabled: false, color: '#ffffff', opacity: 1 },
    };
    const width = artboard.width;
    const height = artboard.height;
    const meta = document
      ? `<!-- parametrica document: ${escapeComment(JSON.stringify({ app: APP_ID, ...document }))} -->\n`
      : '';

    const groups = Array.isArray(layers) && layers.length
      ? layers.filter((layer) => layer.visible !== false)
        .map((layer) => ({ curves: layer.curves ?? [], style: layer.style ?? fallbackStyle }))
      : [{ curves, style: fallbackStyle }];

    const pathElements = groups
      .filter((group) => group.curves.length)
      .map((group) => {
        const paths = buildPaths(group.curves);
        if (!paths) return '';
        const attrs = styleAttrs(group.style, view);
        return layers
          ? `  <g ${attrs}>${paths}</g>`
          : `  <path d="${paths}" ${attrs}/>`;
      })
      .join('\n');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      meta +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(-width / 2)} ${fmt(-height / 2)} ${fmt(width)} ${fmt(height)}" width="${fmt(width)}" height="${fmt(height)}">`,
      `  <rect x="${fmt(-width / 2)}" y="${fmt(-height / 2)}" width="${fmt(width)}" height="${fmt(height)}" fill="${escapeAttr(artboard.background)}"/>`,
      pathElements,
      '</svg>',
      '',
    ].join('\n');
  }

  /* ——— Browser-bound actions ——— */

  exportSVG() {
    const doc = this.app.document;
    const artboard = doc.view.artboard;
    const w = artboard?.width ?? this.app.renderer.size().w;
    const h = artboard?.height ?? this.app.renderer.size().h;
    const evaluation = this.app.evaluation;
    const projection = evaluation.viewProjection ?? projectionFor(evaluation.curves, doc.view.projection ?? '3d');
    const layers = projection === '3d'
      ? evaluation.layers
      : evaluation.layers?.map((layer) => {
        const applied = layer.appliedProjection ?? evaluation.appliedProjection ?? null;
        return applied === projection
          ? layer
          : {
            ...layer,
            curves: projectCurves(layer.curves, projection, {
              fit: Number(layer.generator?.params?.fit) || 0,
            }),
          };
      });
    const applied = evaluation.appliedProjection ?? null;
    const curves = projection === '3d' || applied === projection
      ? evaluation.curves
      : projectCurves(evaluation.curves, projection, {
        fit: Number(doc.generator?.params?.fit) || 0,
      });
    const exportLayers = evaluation.layers ?? [{
      visible: true,
      meshes: evaluation.meshes ?? [],
      renderMeshes: evaluation.renderMeshes ?? [],
      style: doc.view.style,
    }];
    const omitted = unsupportedSvgFeatures(doc.view, exportLayers);
    if (omitted.length) {
      this.app.notify?.(
        `SVG omits: ${omitted.join(', ')}. Use PNG for full fidelity.`,
        'info',
      );
    }
    const svg = Exporter.buildSVG(curves, doc.view, { w, h }, doc, layers);
    downloadFile(`parametrica-${timestamp()}.svg`, svg, 'image/svg+xml');
  }

  exportPNG() {
    const dataUrl = this.app.renderer.artboardDataURL();
    if (!dataUrl) {
      this.app.renderer.p.saveCanvas(`parametrica-${timestamp()}`, 'png');
      return;
    }
    downloadDataURL(`parametrica-${timestamp()}.png`, dataUrl);
  }

  /**
   * Export the active timeline as one animated GIF. The frame plan comes from
   * the same duration/FPS contract as the PNG sequence; the playhead and
   * playback state are restored even when rendering fails.
   */
  async exportGIF({
    duration = this.app.document.animation?.timeline?.duration ?? 6,
    fps = 12,
    maxSize = 360,
    loop = this.app.document.animation?.timeline?.loop ?? true,
    onProgress = null,
  } = {}) {
    const { gifFrameTimes, encodeGIF } = await import('./gif.js');
    const times = gifFrameTimes(duration, fps);
    const renderer = this.app.renderer;
    if (!renderer?.renderNow || !renderer?.artboardImageData) {
      throw new Error('Renderer is not ready');
    }
    const animation = this.app.document.animation;
    const oldTime = animation.time;
    const oldPlaying = animation.playing;
    const frames = [];
    try {
      animation.playing = false;
      for (let index = 0; index < times.length; index++) {
        this.app.setTime(times[index]);
        renderer.renderNow();
        const frame = renderer.artboardImageData(maxSize);
        if (!frame) throw new Error(`frame ${index + 1} could not be captured`);
        frames.push(frame);
        onProgress?.({ frame: index + 1, total: times.length });
        // Let the status line paint during longer exports.
        if ((index + 1) % 8 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const bytes = encodeGIF(frames, { fps, loop });
      downloadBytes(`parametrica-${timestamp()}.gif`, bytes, 'image/gif');
      return {
        frames: frames.length,
        width: frames[0].width,
        height: frames[0].height,
        bytes: bytes.length,
      };
    } finally {
      animation.playing = oldPlaying;
      this.app.setTime(oldTime);
    }
  }

  exportJSON() {
    downloadFile(
      `parametrica-${timestamp()}.json`,
      this.app.presets.serialize(this.app.document.name, this.app.document),
      'application/json',
    );
  }

  async copyJSON() {
    const json = this.app.presets.serialize(this.app.document.name, this.app.document);
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch {
      return false;
    }
  }
}

const fmt = (n) => Number(Number(n).toFixed(2));

function buildPaths(curves) {
  return curves
    .filter((c) => c.points.length > 1)
    .map((c) => {
      const pts = c.points;
      let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
      for (let i = 1; i < pts.length; i++) d += ` L ${fmt(pts[i].x)} ${fmt(pts[i].y)}`;
      if (c.closed) d += ' Z';
      return d;
    })
    .join(' ');
}

function styleAttrs(style, view) {
  const stroke = style.stroke ?? {};
  const fill = style.fill ?? {};
  return [
    `fill="${fill.enabled ? escapeAttr(fill.color) : 'none'}"`,
    `fill-opacity="${fmt(fill.enabled ? fill.opacity : 0)}"`,
    `stroke="${escapeAttr(stroke.color ?? '#ffffff')}"`,
    `stroke-width="${fmt(stroke.width ?? view.strokeWeight)}"`,
    `stroke-opacity="${fmt(stroke.opacity ?? 1)}"`,
    `stroke-linecap="${escapeAttr(stroke.cap ?? 'round')}"`,
    `stroke-linejoin="${escapeAttr(stroke.join ?? 'round')}"`,
  ].join(' ');
}

function escapeComment(text) {
  return text.replace(/--/g, '—');
}

function escapeAttr(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function downloadDataURL(filename, dataUrl) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadBytes(filename, bytes, mimeType) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
