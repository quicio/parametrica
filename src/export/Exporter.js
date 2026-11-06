/**
 * Exporter.js — SVG / PNG / GIF / JSON from evaluated curves and passes.
 *
 * SVG: replays the active vector render passes into an SVG recorder, keeps
 * artboard/layer order and embeds the full Parametrica document as an XML
 * comment. Signed Distance is the only raster-only omission.
 */

import { APP_ID } from '../core/document.js';
import { RenderPasses } from '../core/registry.js';
import { analyzeAll } from '../analysis/differential.js';
import { bboxAll } from '../sampling/sampling.js';
import { buildRenderScene } from '../application/renderSceneBuilder.js';
import { drawOverlays } from '../viz/overlays.js';
import { SvgContext } from './svgContext.js';
import { artboardToMillimetres, millimetresPerUnit } from '../core/units.js';
import { exportBinarySTL, STL_MIME_TYPE } from './stl.js';
import { export3MF, THREE_MF_MIME_TYPE } from './3mf.js';
import { buildFabricationReport } from '../application/fabricationSource.js';
import { resolvePassStyle } from '../render/passStyle.js';

/**
 * Active features the SVG builder does not represent as vector primitives.
 * Used to warn instead of silently implying full render fidelity.
 * @param {object} view
 * @param {Array|null} layers evaluated layers (optional)
 * @returns {string[]}
 */
export function unsupportedSvgFeatures(view = {}, layers = null) {
  const globalModes = Array.isArray(view?.modes) ? view.modes : ['stroke'];
  const layersWithModes = Array.isArray(layers) ? layers.filter((layer) => layer.visible !== false) : [];
  const modeSets = layersWithModes.length
    ? layersWithModes.map((layer) => (
      Array.isArray(layer.modes) && layer.modes.length ? layer.modes : globalModes
    ))
    : [globalModes];
  const modes = new Set(modeSets.flat());
  const features = [];
  // Vector passes are recorded through the same draw code as the canvas.
  // Signed Distance is raster-only, so it remains an explicit omission.
  if (view?.layout === 'quad') features.push('Quad view layout (canvas-only)');
  if (modes.has('signed-distance')) features.push('Signed Distance (raster-only)');
  // Blend is represented with CSS mix-blend-mode. It is supported by
  // browsers, but not by every SVG consumer.
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
  static buildSVG(curves, view = {}, { w, h }, document = null, layers = null, options = {}) {
    const artboard = view.artboard ?? {
      width: w,
      height: h,
      background: '#000000',
    };
    const fallbackStyle = view.style ?? {
      stroke: { color: '#ffffff', width: view.strokeWeight ?? 0.5, opacity: 1, cap: 'round', join: 'round' },
      fill: { enabled: false, color: '#ffffff', opacity: 1 },
      blend: 'normal',
    };
    const width = artboard.width;
    const height = artboard.height;
    const source = Array.isArray(layers) && layers.length
      ? layers.filter((layer) => layer.visible !== false)
      : [{
        curves: Array.isArray(curves) ? curves : [],
        style: fallbackStyle,
        meshes: options.meshes ?? [],
        bbox: options.bbox ?? null,
      }];
    const modes = Array.isArray(view.modes) && view.modes.length ? view.modes : ['stroke'];
    const time = options.time ?? document?.animation?.time ?? 0;
    const omitted = options.onUnsupported ?? null;
    const meta = document
      ? `<!-- parametrica document: ${escapeComment(JSON.stringify({ app: APP_ID, ...document }))} -->\n`
      : '';

    const layerMarkup = [];
    const allCurves = source.flatMap((layer) => layer.curves ?? []);
    for (let index = 0; index < source.length; index++) {
      const layer = source[index];
      const layerCurves = layer.curves ?? [];
      const meshes = layer.renderMeshes ?? layer.meshes ?? [];
      if (!layerCurves.length && !meshes.length) continue;
      const style = layer.style ?? fallbackStyle;
      const layerModes = Array.isArray(layer.modes) && layer.modes.length ? layer.modes : modes;
      const layerData = {
        curves: layerCurves,
        bbox: layer.bbox ?? bboxAll(layerCurves),
        meshes,
        analysis: analyzeAll(layerCurves),
        view: { ...view, style, colorMetric: layer.colorMetric ?? view.colorMetric },
        document,
        time,
      };
      const passes = [];
      for (const mode of layerModes) {
        if (!RenderPasses.has(mode)) continue;
        if (mode === 'signed-distance') {
          omitted?.('Signed Distance (raster-only)');
          continue;
        }
        const ctx = new SvgContext(width, height, `svg-${index}-${mode}`);
        try {
          const passView = {
            ...layerData.view,
            style: resolvePassStyle(mode, view, style),
          };
          RenderPasses.get(mode).draw(ctx, { ...layerData, view: passView });
        } catch {
          omitted?.(RenderPasses.get(mode).name);
          continue;
        }
        const markup = ctx.toMarkup('      ');
        if (markup) {
          const opacity = Number(view.passOpacity?.[mode]);
          const opacityAttr = Number.isFinite(opacity) && opacity < 1 ? ` opacity="${fmt(opacity)}"` : '';
          passes.push(`    <g class="svg-pass" data-pass="${escapeAttr(mode)}"${opacityAttr}>\n${markup}\n    </g>`);
        }
      }
      if (!passes.length) continue;
      const blend = blendMode(style.blend);
      const attrs = [`class="svg-layer"`, `data-layer="${index}"`];
      if (blend) {
        attrs.push(`data-blend="${blend}"`, `style="mix-blend-mode:${blend}"`);
      }
      layerMarkup.push(`  <g ${attrs.join(' ')}>\n${passes.join('\n')}\n  </g>`);
    }

    let overlayMarkup = '';
    if (hasOverlays(view.overlays) && allCurves.length) {
      const ctx = new SvgContext(width, height, 'svg-overlays');
      try {
        drawOverlays(ctx, {
          curves: allCurves,
          analysis: analyzeAll(allCurves),
          bbox: bboxAll(allCurves),
          view,
        });
        const markup = ctx.toMarkup('    ');
        if (markup) overlayMarkup = `  <g class="svg-overlays" data-overlays="true">\n${markup}\n  </g>`;
      } catch {
        omitted?.('Overlays');
      }
    }

    const body = [...layerMarkup, overlayMarkup].filter(Boolean).join('\n');
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      meta +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(-width / 2)} ${fmt(-height / 2)} ${fmt(width)} ${fmt(height)}" width="${fmt(width)}" height="${fmt(height)}" style="isolation:isolate">`,
      `  <rect x="${fmt(-width / 2)}" y="${fmt(-height / 2)}" width="${fmt(width)}" height="${fmt(height)}" fill="${escapeAttr(artboard.background)}"/>`,
      body,
      '</svg>',
      '',
    ].join('\n');
  }

  /* ——— Browser-bound actions ——— */

  /** Build SVG for the current evaluation without touching download state. */
  buildSVGFromCurrent() {
    const doc = this.app.document;
    const artboard = doc.view.artboard;
    const w = artboard?.width ?? this.app.renderer.size().w;
    const h = artboard?.height ?? this.app.renderer.size().h;
    const scene = buildRenderScene({
      evaluation: this.app.evaluation,
      document: doc,
      view: doc.view,
    });
    const layers = scene.layers;
    const curves = layers.flatMap((layer) => layer.curves);
    const omitted = new Set(unsupportedSvgFeatures(doc.view, layers));
    const svg = Exporter.buildSVG(curves, doc.view, { w, h }, doc, layers, {
      time: doc.animation.time,
      onUnsupported: (name) => omitted.add(name),
    });
    return { svg, omitted: [...omitted] };
  }

  static buildPlotterSVG(curves, view = {}, { w, h }, document = null, layers = null) {
    const artboard = view.artboard ?? { width: w, height: h, background: '#000000' };
    const width = artboard.width;
    const height = artboard.height;
    const fallbackStyle = view.style ?? {
      stroke: { color: '#ffffff', width: view.strokeWeight ?? 0.5, opacity: 1, cap: 'round', join: 'round' },
    };
    const source = Array.isArray(layers) && layers.length
      ? layers.filter((layer) => layer.visible !== false)
      : [{ curves: Array.isArray(curves) ? curves : [], style: fallbackStyle }];
    const meta = document
      ? `<!-- parametrica document: ${escapeComment(JSON.stringify({ app: APP_ID, ...document }))} -->\n`
      : '';
    const groups = [];
    for (let index = 0; index < source.length; index++) {
      const layer = source[index];
      const layerCurves = Array.isArray(layer.curves) ? layer.curves : [];
      const stroke = (layer.style ?? fallbackStyle).stroke ?? {};
      const d = layerCurves
        .filter((curve) => curve.points?.length > 1)
        .map((curve) => {
          const points = curve.points;
          let path = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
          for (let i = 1; i < points.length; i++) {
            path += ` L ${fmt(points[i].x)} ${fmt(points[i].y)}`;
          }
          return curve.closed ? `${path} Z` : path;
        })
        .filter(Boolean)
        .join(' ');
      if (!d) continue;
      groups.push(`  <g class="plotter-layer" data-layer="${index}" fill="none" stroke="${escapeAttr(stroke.color ?? '#ffffff')}" stroke-opacity="${fmt(stroke.opacity ?? 1)}" stroke-width="${fmt(stroke.width ?? view.strokeWeight)}" stroke-linecap="${escapeAttr(stroke.cap ?? 'round')}" stroke-linejoin="${escapeAttr(stroke.join ?? 'round')}">`);
      groups.push(`    <path d="${d}"/>`);
      groups.push('  </g>');
    }
    const pageMmWidth = artboardToMillimetres(width, view.units);
    const pageMmHeight = artboardToMillimetres(height, view.units);
    const physicalPage = pageMmWidth !== null && pageMmHeight !== null;
    const pageSize = physicalPage
      ? `width="${fmt(pageMmWidth)}mm" height="${fmt(pageMmHeight)}mm" data-units="mm" data-mm-per-artboard-unit="${fmt(millimetresPerUnit(view.units, 'artboard'))}"`
      : `width="${fmt(width)}" height="${fmt(height)}"`;
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      meta +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(-width / 2)} ${fmt(-height / 2)} ${fmt(width)} ${fmt(height)}" ${pageSize} data-plotter="true">`,
      ...groups,
      '</svg>',
      '',
    ].join('\n');
  }

  buildSTLFromCurrent() {
    const doc = this.app.document;
    const report = buildFabricationReport({
      evaluation: this.app.evaluation,
      layerIndex: doc.activeLayer ?? 0,
      units: doc.view?.units ?? null,
      preparation: doc.view?.fabrication ?? null,
    });
    if (!report.exportable || !report.source) {
      throw new Error(report.reason ?? 'No validated closed Mesh/Solid to export');
    }
    return exportBinarySTL(report.source.geometry, {
      units: doc.view?.units ?? null,
      name: doc.name,
    });
  }

  build3MFFromCurrent() {
    const doc = this.app.document;
    const report = buildFabricationReport({
      evaluation: this.app.evaluation,
      layerIndex: doc.activeLayer ?? 0,
      units: doc.view?.units ?? null,
      preparation: doc.view?.fabrication ?? null,
    });
    if (!report.exportable || !report.source) {
      throw new Error(report.reason ?? 'No validated closed Mesh/Solid to export');
    }
    const bodies = report.boolean || report.scope === 'single'
      ? [report.source.geometry]
      : report.candidates.filter((candidate) => candidate.exportable).map((candidate) => candidate.geometry);
    return export3MF(bodies, {
      units: doc.view?.units ?? null,
      name: doc.name,
    });
  }

  exportSTL() {
    try {
      const result = this.buildSTLFromCurrent();
      downloadBytes(`parametrica-${timestamp()}.stl`, result.data, STL_MIME_TYPE);
      this.app.notify?.(`Exported STL · ${result.triangles} triangles · ${result.unit}`);
      return result;
    } catch (error) {
      this.app.notify?.(error.message, 'error');
      return null;
    }
  }

  export3MF() {
    try {
      const result = this.build3MFFromCurrent();
      downloadBytes(`parametrica-${timestamp()}.3mf`, result.data, THREE_MF_MIME_TYPE);
      this.app.notify?.(`Exported 3MF · ${result.objects} objects · ${result.triangles} triangles · ${result.unit}`);
      return result;
    } catch (error) {
      this.app.notify?.(error.message, 'error');
      return null;
    }
  }

  exportPlotterSVG() {
    const doc = this.app.document;
    const artboard = doc.view.artboard;
    const w = artboard?.width ?? this.app.renderer.size().w;
    const h = artboard?.height ?? this.app.renderer.size().h;
    const scene = buildRenderScene({
      evaluation: this.app.evaluation,
      document: doc,
      view: doc.view,
    });
    const curves = scene.layers.flatMap((layer) => layer.curves);
    const svg = Exporter.buildPlotterSVG(curves, doc.view, { w, h }, doc, scene.layers);
    downloadFile(`parametrica-plotter-${timestamp()}.svg`, svg, 'image/svg+xml');
  }

  exportSVG() {
    const { svg, omitted } = this.buildSVGFromCurrent();
    if (omitted.length) {
      this.app.notify?.(
        `SVG omits: ${omitted.join(', ')}. Use PNG for full fidelity.`,
        'info',
      );
    }
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

function blendMode(value) {
  return value === 'multiply' || value === 'screen' || value === 'difference'
    ? value
    : null;
}

function hasOverlays(overlays) {
  return Boolean(overlays && Object.values(overlays).some(Boolean));
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
