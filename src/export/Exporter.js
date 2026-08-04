/**
 * Exporter.js — SVG / PNG / JSON from evaluated curves.
 *
 * SVG: one clean <path> per curve (M + L + Z for closed), coordinates
 * rounded to 2 decimals, black field, white monoline, the full
 * Parametrica document embedded as an XML comment — every SVG is a preset.
 */

import { APP_ID } from '../core/document.js';

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
  static buildSVG(curves, view, { w, h }, document = null) {
    const paths = curves
      .filter((c) => c.points.length > 1)
      .map((c) => {
        const pts = c.points;
        let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
        for (let i = 1; i < pts.length; i++) d += ` L ${fmt(pts[i].x)} ${fmt(pts[i].y)}`;
        if (c.closed) d += ' Z';
        return d;
      });

    const meta = document
      ? `<!-- parametrica document: ${escapeComment(JSON.stringify({ app: APP_ID, ...document }))} -->\n`
      : '';

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      meta +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(-w / 2)} ${fmt(-h / 2)} ${fmt(w)} ${fmt(h)}" width="${fmt(w)}" height="${fmt(h)}">`,
      `  <rect x="${fmt(-w / 2)}" y="${fmt(-h / 2)}" width="${fmt(w)}" height="${fmt(h)}" fill="#000000"/>`,
      `  <path d="${paths.join(' ')}" fill="none" stroke="#ffffff" stroke-width="${fmt(view.strokeWeight)}" stroke-linecap="round" stroke-linejoin="round"/>`,
      '</svg>',
      '',
    ].join('\n');
  }

  /* ——— Browser-bound actions ——— */

  exportSVG() {
    const { w, h } = this.app.renderer.size();
    const svg = Exporter.buildSVG(this.app.evaluation.curves, this.app.document.view, { w, h }, this.app.document);
    downloadFile(`parametrica-${timestamp()}.svg`, svg, 'image/svg+xml');
  }

  exportPNG() {
    this.app.renderer.p.saveCanvas(`parametrica-${timestamp()}`, 'png');
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
