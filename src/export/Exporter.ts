/**
 * Exporter.js — SVG / PNG / GIF / JSON from evaluated curves and passes.
 *
 * SVG: replays the active vector render passes into an SVG recorder, keeps
 * artboard/layer order and embeds the full Parametrica document as an XML
 * comment. Signed Distance is the only raster-only omission.
 */

import { APP_ID } from '../core/document.js';
import { RenderPasses } from '../core/registry.js';
import { analyzeAll } from '../analysis/differential.ts';
import { bboxAll } from '../sampling/sampling.js';
import { buildRenderScene } from '../application/renderSceneBuilder.ts';
import { drawOverlays } from '../viz/overlays.ts';
import { SvgContext } from './svgContext.ts';
import { artboardToMillimetres, millimetresPerUnit } from '../domain/units.ts';
import { exportBinarySTL, STL_MIME_TYPE } from './stl.ts';
import { export3MF, THREE_MF_MIME_TYPE } from './3mf.ts';
import { buildFabricationReport } from '../application/fabricationSource.ts';
import { resolvePassStyle } from '../domain/passStyle.ts';
import { traceFillGroups, withoutTraceFill } from '../render/traceFill.ts';
import type { FabricationReport } from '../application/fabricationSource.ts';

interface Vec2 { x: number; y: number; [key: string]: unknown }
interface SvgCurveLike {
  points?: Vec2[];
  closed?: boolean;
  [key: string]: unknown;
}
interface SvgStyleLike {
  stroke?: { color?: string; width?: unknown; opacity?: unknown; cap?: string; join?: string; [key: string]: unknown };
  fill?: { enabled?: boolean; [key: string]: unknown };
  blend?: unknown;
  [key: string]: unknown;
}
interface SvgArtboardLike {
  width: number;
  height: number;
  background?: string;
  [key: string]: unknown;
}
interface SvgViewLike {
  artboard?: SvgArtboardLike;
  modes?: string[];
  style?: SvgStyleLike;
  strokeWeight?: unknown;
  colorMetric?: string;
  passOpacity?: Record<string, unknown>;
  overlays?: Record<string, unknown>;
  units?: unknown;
  [key: string]: unknown;
}
interface SvgLayerLike {
  visible?: boolean;
  modes?: string[];
  curves?: SvgCurveLike[];
  style?: SvgStyleLike | null;
  meshes?: unknown[];
  renderMeshes?: unknown[];
  bbox?: unknown;
  trace?: unknown;
  colorMetric?: string | null;
  [key: string]: unknown;
}
interface SvgAnimationLike {
  time: number;
  playing: boolean;
  timeline: { duration: number; loop: boolean; [key: string]: unknown };
}
interface SvgDocumentLike {
  name: string;
  activeLayer: number;
  animation: SvgAnimationLike;
  view: SvgViewLike;
  [key: string]: unknown;
}
interface SvgBuildOptions {
  meshes?: unknown[];
  bbox?: unknown;
  time?: number;
  onUnsupported?: ((name: string) => void) | null;
  prefix?: string;
}
interface GifFrameLike {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}
interface GifProgress {
  frame: number;
  total: number;
}
interface GifExportOptions {
  duration?: number;
  fps?: number;
  maxSize?: number;
  loop?: boolean;
  onProgress?: ((progress: GifProgress) => void) | null;
}
interface RendererSize {
  w: number;
  h: number;
}
interface ExportPort {
  getDocument(): SvgDocumentLike;
  getEvaluation(): unknown;
  rendererSize(): RendererSize;
  artboardDataURL(): string | null;
  saveCanvas(name: string): void;
  renderNow(): void;
  artboardImageData(maxSize: number): GifFrameLike | null;
  getFabricationReport(): FabricationReport | null;
  productPreviewCapture(): string | null;
  notify(message: string, kind?: string): void;
  setTime(time: number): void;
  serializeDocument(name: string, doc: unknown): string;
}
interface LegacyRendererLike {
  size?(): RendererSize;
  artboardDataURL?(): string | null;
  p?: { saveCanvas?(name: string, type: string): void };
  renderNow?(): void;
  artboardImageData?(maxSize: number): GifFrameLike | null;
}
interface LegacyExportInput {
  document?: SvgDocumentLike | null;
  evaluation?: unknown;
  renderer?: LegacyRendererLike | null;
  fabricationReport?: FabricationReport | null;
  productPreview?: { capture?(): string | null } | null;
  notify?(message: string, kind?: string): void;
  setTime?(time: number): void;
  presets?: { serialize?(name: string, doc: unknown): string } | null;
}

/**
 * Active features the SVG builder does not represent as vector primitives.
 * Used to warn instead of silently implying full render fidelity.
 */
export function unsupportedSvgFeatures(
  view: SvgViewLike = {},
  layers: ReadonlyArray<SvgLayerLike> | null = null,
): string[] {
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
  if (modes.has('signed-distance')) features.push('Signed Distance (raster-only)');
  // Blend is represented with CSS mix-blend-mode. It is supported by
  // browsers, but not by every SVG consumer.
  return [...new Set(features)];
}

export class Exporter {
  port: ExportPort;

  /** Explicit export port; the adapter never receives App. */
  constructor(port: unknown) {
    this.port = normalizeExportPort(port);
  }

  /* ——— Pure builder (DOM-free, unit-testable) ——— */

  static buildSVG(
    curves: ReadonlyArray<SvgCurveLike>,
    view: SvgViewLike = {},
    { w, h }: { w: number; h: number },
    document: SvgDocumentLike | null = null,
    layers: ReadonlyArray<SvgLayerLike> | null = null,
    options: SvgBuildOptions = {},
  ): string {
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

    const layerMarkup: string[] = [];
    const allCurves = source.flatMap((layer) => layer.curves ?? []);
    const traceMarkup: string[] = [];
    traceFillGroups(source).forEach((group, index) => {
      const ctx = new SvgContext(width, height, `svg-trace-${index}`);
      ctx.fillContours(group.curves, group.fill, group.bbox);
      const markup = ctx.toMarkup('    ');
      if (markup) {
        traceMarkup.push(
          `  <g class="svg-trace-fill" data-trace="${escapeAttr(group.group)}" fill-rule="evenodd">\n${markup}\n  </g>`,
        );
      }
    });
    for (let index = 0; index < source.length; index++) {
      const layer = source[index];
      const layerCurves = layer.curves ?? [];
      const meshes = layer.renderMeshes ?? layer.meshes ?? [];
      if (!layerCurves.length && !meshes.length) continue;
      const style = layer.style ?? fallbackStyle;
      const layerStyle = withoutTraceFill(style, layer.trace);
      const layerModes = Array.isArray(layer.modes) && layer.modes.length ? layer.modes : modes;
      const layerData = {
        curves: layerCurves,
        bbox: layer.bbox ?? bboxAll(layerCurves),
        meshes,
        analysis: analyzeAll(layerCurves),
        view: { ...view, style: layerStyle, colorMetric: layer.colorMetric ?? view.colorMetric },
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
        const ctx = new SvgContext(width, height, `${options.prefix ?? 'svg'}-${index}-${mode}`);
        try {
          const passView = {
            ...layerData.view,
            style: resolvePassStyle(mode, view as never, layerStyle),
          };
          RenderPasses.get(mode).draw(ctx, { ...layerData, view: passView } as never);
        } catch {
          omitted?.(RenderPasses.get(mode).name);
          continue;
        }
        const markup = ctx.toMarkup('      ');
        if (markup) {
          const opacity = Number(view.passOpacity?.[mode]);
          const opacityAttr = Number.isFinite(opacity) && opacity < 1 ? ` opacity="${fmt(opacity)}"` : '';
          const evenOdd = mode === 'stroke' && style.fill?.enabled ? ' fill-rule="evenodd"' : '';
          passes.push(`    <g class="svg-pass" data-pass="${escapeAttr(mode)}"${opacityAttr}${evenOdd}>\n${markup}\n    </g>`);
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

    const body = [...traceMarkup, ...layerMarkup, overlayMarkup].filter(Boolean).join('\n');
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
  buildSVGFromCurrent(): { svg: string; omitted: string[] } {
    const doc = this.port.getDocument();
    const artboard = doc.view.artboard;
    const w = artboard?.width ?? this.port.rendererSize().w;
    const h = artboard?.height ?? this.port.rendererSize().h;
    if (doc.view.layout === 'quad') return this.buildQuadSVGFromCurrent();
    const scene = buildRenderScene({
      evaluation: this.port.getEvaluation(),
      document: doc,
      view: doc.view,
    } as unknown as Parameters<typeof buildRenderScene>[0]);
    const layers = scene.layers as unknown as SvgLayerLike[];
    const curves = layers.flatMap((layer) => layer.curves ?? []) as SvgCurveLike[];
    const omitted = new Set(unsupportedSvgFeatures(doc.view, layers));
    const svg = Exporter.buildSVG(curves, doc.view, { w, h }, doc, layers, {
      time: doc.animation.time,
      onUnsupported: (name) => omitted.add(name),
    });
    return { svg, omitted: [...omitted] };
  }

  buildQuadSVGFromCurrent(): { svg: string; omitted: string[] } {
    return this.buildQuadExport((view, projection, prefix, onUnsupported) => {
      const scene = buildRenderScene({
        evaluation: this.port.getEvaluation(),
        document: this.port.getDocument(),
        view,
        projectionOverride: projection,
      } as unknown as Parameters<typeof buildRenderScene>[0]);
      return {
        scene,
        svg: Exporter.buildSVG(
          (scene.layers as unknown as SvgLayerLike[]).flatMap((layer) => layer.curves ?? []) as SvgCurveLike[],
          view,
          { w: this.port.getDocument().view.artboard?.width ?? 0, h: this.port.getDocument().view.artboard?.height ?? 0 },
          null,
          scene.layers as unknown as SvgLayerLike[],
          { time: this.port.getDocument().animation.time, prefix, onUnsupported },
        ),
      };
    }, true);
  }

  buildPlotterSVGFromCurrent(): { svg: string; omitted: string[] } {
    const doc = this.port.getDocument();
    const artboard = doc.view.artboard;
    const w = artboard?.width ?? this.port.rendererSize().w;
    const h = artboard?.height ?? this.port.rendererSize().h;
    if (doc.view.layout !== 'quad') {
      const scene = buildRenderScene({ evaluation: this.port.getEvaluation(), document: doc, view: doc.view } as unknown as Parameters<typeof buildRenderScene>[0]);
      return {
        svg: Exporter.buildPlotterSVG(
          (scene.layers as unknown as SvgLayerLike[]).flatMap((layer) => layer.curves ?? []) as SvgCurveLike[],
          doc.view,
          { w, h },
          doc,
          scene.layers as unknown as SvgLayerLike[],
        ),
        omitted: [],
      };
    }
    return this.buildQuadExport((view, projection, _prefix, _onUnsupported) => {
      const scene = buildRenderScene({ evaluation: this.port.getEvaluation(), document: doc, view, projectionOverride: projection } as unknown as Parameters<typeof buildRenderScene>[0]);
      return {
        scene,
        svg: Exporter.buildPlotterSVG(
          (scene.layers as unknown as SvgLayerLike[]).flatMap((layer) => layer.curves ?? []) as SvgCurveLike[],
          view,
          { w: artboard?.width ?? 0, h: artboard?.height ?? 0 },
          null,
          scene.layers as unknown as SvgLayerLike[],
        ),
      };
    }, false);
  }

  buildQuadExport(
    buildPanel: (view: SvgViewLike, projection: string, prefix: string, onUnsupported: (name: string) => void) => { scene: unknown; svg: string },
    includeBackground: boolean,
  ): { svg: string; omitted: string[] } {
    const doc = this.port.getDocument();
    const artboard = doc.view.artboard;
    const width = artboard?.width ?? this.port.rendererSize().w;
    const height = artboard?.height ?? this.port.rendererSize().h;
    const gap = Math.max(6, Math.round(Math.min(width, height) * 0.018));
    const panelWidth = Math.max(1, (width - gap * 3) / 2);
    const panelHeight = Math.max(1, (height - gap * 3) / 2);
    const panels: Array<[string, string]> = [
      ['3d', '3D'],
      ['xy', 'XY'],
      ['xz', 'XZ'],
      ['yz', 'YZ'],
    ];
    const omitted = new Set<string>();
    const nested: string[] = [];
    panels.forEach(([projection], index) => {
      const view = { ...doc.view, layout: 'single', projection };
      const panel = buildPanel(view, projection, `quad-${projection}`, (name) => omitted.add(name));
      const raw = panel.svg
        .replace(/^<\?xml[^>]*>\s*/, '')
        .replace(/<!--[\s\S]*?-->\s*/g, '');
      const open = raw.match(/^<svg[^>]*>/)?.[0];
      if (!open) return;
      const x = gap + (index % 2) * (panelWidth + gap);
      const y = gap + Math.floor(index / 2) * (panelHeight + gap);
      const tag = open
        .replace(/\swidth="[^"]*"/, '')
        .replace(/\sheight="[^"]*"/, '')
        .replace('<svg ', `<svg x="${fmt(x)}" y="${fmt(y)}" width="${fmt(panelWidth)}" height="${fmt(panelHeight)}" data-panel="${projection}" `);
      nested.push(tag + raw.slice(open.length));
    });
    const svg = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<!-- parametrica document: ${escapeComment(JSON.stringify({ app: APP_ID, ...doc }))} -->`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(-width / 2)} ${fmt(-height / 2)} ${fmt(width)} ${fmt(height)}" width="${fmt(width)}" height="${fmt(height)}" data-layout="quad" style="isolation:isolate">`,
      includeBackground
        ? `  <rect x="${fmt(-width / 2)}" y="${fmt(-height / 2)}" width="${fmt(width)}" height="${fmt(height)}" fill="${escapeAttr(artboard?.background ?? '#000000')}"/>`
        : '',
      ...nested.map((panel) => `  ${panel}`),
      '</svg>',
      '',
    ].filter(Boolean).join('\n');
    return { svg, omitted: [...omitted] };
  }

  static buildPlotterSVG(
    curves: ReadonlyArray<SvgCurveLike>,
    view: SvgViewLike = {},
    { w, h }: { w: number; h: number },
    document: SvgDocumentLike | null = null,
    layers: ReadonlyArray<SvgLayerLike> | null = null,
  ): string {
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
      const layerCurves = (Array.isArray(layer.curves) ? layer.curves : []) as SvgCurveLike[];
      const stroke = (layer.style ?? fallbackStyle).stroke ?? {};
      const d = layerCurves
        .filter((curve) => (curve.points?.length ?? 0) > 1)
        .map((curve) => {
          const points = curve.points ?? [];
          const first = points[0];
          if (!first) return '';
          let path = `M ${fmt(first.x)} ${fmt(first.y)}`;
          for (let i = 1; i < points.length; i++) {
            const point = points[i];
            if (!point) continue;
            path += ` L ${fmt(point.x)} ${fmt(point.y)}`;
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
    const doc = this.port.getDocument();
    const report = this.port.getFabricationReport() ?? buildFabricationReport({
      evaluation: this.port.getEvaluation(),
      layerIndex: doc.activeLayer ?? 0,
      units: doc.view.units ?? null,
      preparation: doc.view.fabrication ?? null,
    } as unknown as Parameters<typeof buildFabricationReport>[0]);
    if (!report.exportable || !report.source) {
      throw new Error(report.reason ?? 'No validated closed Mesh/Solid to export');
    }
    return exportBinarySTL(report.source.geometry as never, {
      units: doc.view.units ?? null,
      name: doc.name,
    });
  }

  build3MFFromCurrent() {
    const doc = this.port.getDocument();
    const report = this.port.getFabricationReport() ?? buildFabricationReport({
      evaluation: this.port.getEvaluation(),
      layerIndex: doc.activeLayer ?? 0,
      units: doc.view.units ?? null,
      preparation: doc.view.fabrication ?? null,
    } as unknown as Parameters<typeof buildFabricationReport>[0]);
    if (!report.exportable || !report.source) {
      throw new Error(report.reason ?? 'No validated closed Mesh/Solid to export');
    }
    const bodies = report.boolean || report.scope === 'single'
      ? [report.source.geometry]
      : report.candidates.filter((candidate) => candidate.exportable).map((candidate) => candidate.geometry);
    return export3MF(bodies as never, {
      units: doc.view.units ?? null,
      name: doc.name,
    });
  }

  exportSTL() {
    try {
      const result = this.buildSTLFromCurrent();
      downloadBytes(`parametrica-${timestamp()}.stl`, result.data, STL_MIME_TYPE);
      this.port.notify?.(`Exported STL · ${result.triangles} triangles · ${result.unit}`);
      return result;
    } catch (error) {
      this.port.notify?.(error instanceof Error ? error.message : String(error), 'error');
      return null;
    }
  }

  export3MF() {
    try {
      const result = this.build3MFFromCurrent();
      downloadBytes(`parametrica-${timestamp()}.3mf`, result.data, THREE_MF_MIME_TYPE);
      this.port.notify?.(`Exported 3MF · ${result.objects} objects · ${result.triangles} triangles · ${result.unit}`);
      return result;
    } catch (error) {
      this.port.notify?.(error instanceof Error ? error.message : String(error), 'error');
      return null;
    }
  }

  exportPlotterSVG(): void {
    const { svg } = this.buildPlotterSVGFromCurrent();
    downloadFile(`parametrica-plotter-${timestamp()}.svg`, svg, 'image/svg+xml');
  }

  exportSVG(): void {
    const { svg, omitted } = this.buildSVGFromCurrent();
    if (omitted.length) {
      this.port.notify?.(
        `SVG omits: ${omitted.join(', ')}. Use PNG for full fidelity.`,
        'info',
      );
    }
    downloadFile(`parametrica-${timestamp()}.svg`, svg, 'image/svg+xml');
  }

  exportPNG(): void {
    const dataUrl = this.port.artboardDataURL();
    if (!dataUrl) {
      this.port.saveCanvas(`parametrica-${timestamp()}`);
      return;
    }
    downloadDataURL(`parametrica-${timestamp()}.png`, dataUrl);
  }

  /**
   * Export the active WebGL/PBR product preview as a presentation PNG.
   * This is not a printability proof and does not alter geometry or reports.
   */
  exportProductPreviewPNG(): string | null {
    const dataUrl = this.port.productPreviewCapture();
    if (!dataUrl || !String(dataUrl).startsWith('data:image/png')) {
      this.port.notify?.('Switch to Product preview before exporting a product PNG.', 'error');
      return null;
    }
    const name = slug(this.port.getDocument()?.name) || 'parametrica';
    downloadDataURL(`${name}-product-${timestamp()}.png`, dataUrl);
    return dataUrl;
  }

  /**
   * Export the active timeline as one animated GIF. The frame plan comes from
   * the same duration/FPS contract as the PNG sequence; the playhead and
   * playback state are restored even when rendering fails.
   */
  async exportGIF({
    duration = this.port.getDocument().animation?.timeline?.duration ?? 6,
    fps = 12,
    maxSize = 360,
    loop = this.port.getDocument().animation?.timeline?.loop ?? true,
    onProgress = null,
  }: GifExportOptions = {}) {
    const { gifFrameTimes, encodeGIF } = await import('./gif.ts');
    const times = gifFrameTimes(duration, fps);
    if (typeof this.port.renderNow !== 'function' || typeof this.port.artboardImageData !== 'function') {
      throw new Error('Renderer is not ready');
    }
    const animation = this.port.getDocument().animation;
    const oldTime = animation.time;
    const oldPlaying = animation.playing;
    const frames: GifFrameLike[] = [];
    try {
      animation.playing = false;
      for (let index = 0; index < times.length; index++) {
        this.port.setTime(times[index] ?? 0);
        this.port.renderNow();
        const frame = this.port.artboardImageData(maxSize);
        if (!frame) throw new Error(`frame ${index + 1} could not be captured`);
        frames.push(frame);
        onProgress?.({ frame: index + 1, total: times.length });
        // Let the status line paint during longer exports.
        if ((index + 1) % 8 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const first = frames[0];
      if (!first) throw new Error('GIF export captured no frames');
      const bytes = encodeGIF(frames, { fps, loop });
      downloadBytes(`parametrica-${timestamp()}.gif`, bytes, 'image/gif');
      return {
        frames: frames.length,
        width: first.width,
        height: first.height,
        bytes: bytes.length,
      };
    } finally {
      animation.playing = oldPlaying;
      this.port.setTime(oldTime);
    }
  }

  exportJSON(): void {
    downloadFile(
      `parametrica-${timestamp()}.json`,
      this.port.serializeDocument(this.port.getDocument().name, this.port.getDocument()),
      'application/json',
    );
  }

  async copyJSON(): Promise<boolean> {
    const json = this.port.serializeDocument(this.port.getDocument().name, this.port.getDocument());
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Accept the explicit export port used by composition and the legacy plain
 * context used by unit fixtures. The App instance is never accepted.
 */
function normalizeExportPort(input: unknown): ExportPort {
  if (input && typeof (input as ExportPort).getDocument === 'function') return input as ExportPort;
  const legacy = (input ?? {}) as LegacyExportInput;
  const renderer = legacy.renderer ?? null;
  return {
    getDocument: () => (legacy.document ?? {}) as SvgDocumentLike,
    getEvaluation: () => legacy.evaluation ?? null,
    rendererSize: () => renderer?.size?.() ?? {
      w: legacy.document?.view?.artboard?.width ?? 0,
      h: legacy.document?.view?.artboard?.height ?? 0,
    },
    artboardDataURL: () => renderer?.artboardDataURL?.() ?? null,
    saveCanvas: (name: string) => renderer?.p?.saveCanvas?.(name, 'png'),
    renderNow: () => renderer?.renderNow?.(),
    artboardImageData: (maxSize: number) => renderer?.artboardImageData?.(maxSize) ?? null,
    getFabricationReport: () => legacy.fabricationReport ?? null,
    productPreviewCapture: () => legacy.productPreview?.capture?.() ?? null,
    notify: (message: string, kind?: string) => legacy.notify?.(message, kind),
    setTime: (time: number) => legacy.setTime?.(time),
    serializeDocument: (name: string, doc: unknown) => legacy.presets?.serialize?.(name, doc)
      ?? JSON.stringify({ name, ...(doc as Record<string, unknown>) }),
  };
}

const fmt = (n: unknown): number => Number(Number(n).toFixed(2));

function blendMode(value: unknown): string | null {
  return value === 'multiply' || value === 'screen' || value === 'difference'
    ? value
    : null;
}

function hasOverlays(overlays: Record<string, unknown> | null | undefined): boolean {
  return Boolean(overlays && Object.values(overlays).some(Boolean));
}

function escapeComment(text: string): string {
  return text.replace(/--/g, '—');
}

function escapeAttr(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function slug(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function downloadDataURL(filename: string, dataUrl: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadFile(filename: string, content: unknown, mimeType: string): void {
  const blob = new Blob([content as BlobPart], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadBytes(filename: string, bytes: unknown, mimeType: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
