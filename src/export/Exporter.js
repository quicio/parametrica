/**
 * Exporter.js — SVG / PNG / JSON output.
 *
 * SVG: mathematically clean paths. The exact cubic Bézier segments
 * produced by the Catmull-Rom conversion are written as `C` commands —
 * no polyline approximation, rounded to 2 decimals. The full parameter
 * set is embedded as an XML comment so an SVG is itself a preset.
 *
 * PNG: the live p5 canvas (already HiDPI via pixelDensity).
 *
 * JSON: the canonical preset document from PresetManager.
 */

export class Exporter {
  /** @param {object} app */
  constructor(app) {
    this.app = app;
  }

  /* ——— Pure builders (DOM-free, unit-testable) ——— */

  /**
   * @param {object} geometry  GlyphGeometry instance
   * @param {object} params    glyph params (strokeWeight, mirror)
   * @param {{w:number,h:number}} size  view surface in px
   * @returns {string} SVG document
   */
  static buildSVG(geometry, params, { w, h }) {
    const subPaths = [pathData(geometry.master.segments)];
    if (params.mirror) subPaths.push(pathData(geometry.mirrorSegments));

    const meta = escapeComment(
      JSON.stringify({ app: 'glyph-lab', version: 1, params: geometry.params }),
    );

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<!-- glyph-lab preset: ${meta} -->`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(-w / 2)} ${fmt(-h / 2)} ${fmt(w)} ${fmt(h)}" width="${fmt(w)}" height="${fmt(h)}">`,
      `  <rect x="${fmt(-w / 2)}" y="${fmt(-h / 2)}" width="${fmt(w)}" height="${fmt(h)}" fill="#000000"/>`,
      `  <path d="${subPaths.join(' ')}" fill="none" stroke="#ffffff" stroke-width="${fmt(params.strokeWeight)}" stroke-linecap="round" stroke-linejoin="round"/>`,
      '</svg>',
      '',
    ].join('\n');
  }

  /* ——— Browser-bound export actions ——— */

  exportSVG() {
    const { w, h } = this.app.renderer.size();
    const svg = Exporter.buildSVG(this.app.geometry, this.app.params, { w, h });
    downloadFile(`glyph-lab-${timestamp()}.svg`, svg, 'image/svg+xml');
  }

  exportPNG() {
    this.app.renderer.p.saveCanvas(`glyph-lab-${timestamp()}`, 'png');
  }

  exportJSON() {
    const json = this.app.presets.serialize('untitled', this.app.params);
    downloadFile(`glyph-lab-${timestamp()}.json`, json, 'application/json');
  }

  async copyJSON() {
    const json = this.app.presets.serialize('untitled', this.app.params);
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch {
      // Clipboard API blocked (permissions / non-secure context).
      return false;
    }
  }
}

/* ——— helpers ——— */

const fmt = (n) => Number(Number(n).toFixed(2));

/** Compact, clean path data from Bézier segments. */
function pathData(segments) {
  let d = `M ${fmt(segments[0].p0.x)} ${fmt(segments[0].p0.y)}`;
  for (const s of segments) {
    d += ` C ${fmt(s.p1.x)} ${fmt(s.p1.y)} ${fmt(s.p2.x)} ${fmt(s.p2.y)} ${fmt(s.p3.x)} ${fmt(s.p3.y)}`;
  }
  return d;
}

/** Keep the embedded JSON from accidentally closing the XML comment. */
function escapeComment(text) {
  return text.replace(/--/g, '—');
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
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
