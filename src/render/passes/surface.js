/**
 * render/passes/surface.js — projected mesh fill and wireframe.
 */

import { RenderPasses } from '../../core/registry.js';

RenderPasses.register({
  id: 'surface-wireframe',
  name: 'Surface Wireframe',
  group: 'surface',
  description: 'Projected mesh edges.',
  appliesTo({ meshes = [] }) {
    return Array.isArray(meshes) && meshes.length > 0;
  },
  draw(p, { meshes = [], view }) {
    if (!meshes.length) return;
    const style = view.style ?? {};
    const stroke = style.stroke ?? {};
    const rgb = hexToRgb(stroke.color, [255, 255, 255]);
    const alpha = Math.round(clamp01(stroke.opacity) * 160);
    p.noFill();
    p.stroke(rgb[0], rgb[1], rgb[2], alpha);
    p.strokeWeight(Number.isFinite(stroke.width) ? Math.max(0.4, stroke.width * 0.6) : 1);
    for (const mesh of meshes) {
      const seen = new Set();
      for (const face of mesh.faces) {
        for (let i = 0; i < face.length; i++) {
          const a = face[i];
          const b = face[(i + 1) % face.length];
          const key = a < b ? `${a}:${b}` : `${b}:${a}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const pa = mesh.vertices[a];
          const pb = mesh.vertices[b];
          if (!pa || !pb) continue;
          p.line(pa.x, pa.y, pb.x, pb.y);
        }
      }
    }
  },
});

RenderPasses.register({
  id: 'surface-fill',
  name: 'Surface Fill',
  group: 'surface',
  description: 'Painter-sorted mesh faces.',
  appliesTo({ meshes = [] }) {
    return Array.isArray(meshes) && meshes.length > 0;
  },
  draw(p, { meshes = [], view }) {
    if (!meshes.length) return;
    const style = view.style ?? {};
    const fill = style.fill ?? {};
    const stroke = style.stroke ?? {};
    const color = fill.enabled ? fill.color : stroke.color;
    const rgb = hexToRgb(color, [255, 255, 255]);
    const alpha = Math.round(clamp01(fill.enabled ? fill.opacity : Math.min(0.45, stroke.opacity ?? 0.45)) * 255);
    p.stroke(rgb[0], rgb[1], rgb[2], Math.min(alpha, 85));
    p.strokeWeight(0.4);
    for (const mesh of meshes) {
      const faces = mesh.faces.map((face) => {
        let depth = 0;
        let depthAlpha = 0;
        for (const index of face) {
          depth += mesh.vertices[index]?.depth ?? 0;
          depthAlpha += mesh.vertices[index]?.depthAlpha ?? 1;
        }
        return { face, depth: depth / face.length, depthAlpha: depthAlpha / face.length };
      }).sort((a, b) => a.depth - b.depth);
      for (const { face, depthAlpha } of faces) {
        p.fill(rgb[0], rgb[1], rgb[2], Math.round(alpha * clamp01(depthAlpha)));
        p.beginShape();
        for (const index of face) {
          const point = mesh.vertices[index];
          if (point) p.vertex(point.x, point.y);
        }
        p.endShape(p.CLOSE);
      }
    }
  },
});

function clamp01(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

function hexToRgb(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const hex = value.replace('#', '');
  if (hex.length === 3) {
    return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
  }
  if (hex.length === 6) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  return fallback;
}
