/**
 * render/passes/surface.js — projected mesh fill and wireframe.
 */

import { RenderPasses } from '../../core/registry.js';
import { applyFill, fillGradientEnabled, setFillDepth } from '../fill.js';

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
  draw(p, { meshes = [], view, bbox }) {
    if (!meshes.length) return;
    const style = view.style ?? {};
    const fill = style.fill ?? {};
    const stroke = style.stroke ?? {};
    const gradient = fillGradientEnabled(fill);
    const color = fill.enabled ? fill.color : stroke.color;
    const rgb = hexToRgb(color, [255, 255, 255]);
    const alpha = Math.round(clamp01(fill.enabled ? fill.opacity : Math.min(0.45, stroke.opacity ?? 0.45)) * 255);
    p.stroke(rgb[0], rgb[1], rgb[2], Math.min(alpha, 85));
    p.strokeWeight(0.4);
    if (gradient) applyFill(p, fill, bbox, 1);
    for (const mesh of meshes) {
      const faces = [];
      for (const face of mesh.faces) {
        let depth = 0;
        let depthAlpha = 0;
        let visible = true;
        for (const index of face) {
          const point = mesh.vertices[index];
          if (!point) {
            visible = false;
            break;
          }
          depth += point.depth ?? 0;
          depthAlpha += point.depthAlpha ?? 1;
        }
        if (visible) {
          faces.push({ face, depth: depth / face.length, depthAlpha: depthAlpha / face.length });
        }
      }
      faces.sort((a, b) => a.depth - b.depth);
      for (const { face, depthAlpha } of faces) {
        if (gradient) {
          setFillDepth(p, depthAlpha);
        } else {
          p.fill(rgb[0], rgb[1], rgb[2], Math.round(alpha * clamp01(depthAlpha)));
        }
        p.beginShape();
        for (const index of face) {
          const point = mesh.vertices[index];
          p.vertex(point.x, point.y);
        }
        p.endShape(p.CLOSE);
      }
      if (gradient) setFillDepth(p, 1);
    }
  },
});

/**
 * Lattice preview fill — one batched path per depth band.
 *
 * The prepared lattice has ~100k faces. Drawing each face with its own
 * beginShape/endShape costs most of a second. Batching by depth keeps the
 * painter order and the through-holes while cutting the path count to a few
 * dozen, which makes the solid preview usable for inspection.
 */
RenderPasses.register({
  id: 'lattice-preview',
  name: 'Lattice Preview',
  group: 'surface',
  internal: true,
  description: 'Depth-banded solid preview for dense lattice meshes.',
  appliesTo({ meshes = [] }) {
    return Array.isArray(meshes) && meshes.length > 0;
  },
  draw(p, { meshes = [], view }) {
    if (!meshes.length) return;
    const style = view.style ?? {};
    const fill = style.fill ?? {};
    const stroke = style.stroke ?? {};
    const rgb = hexToRgb(fill.enabled ? fill.color : stroke.color, [255, 255, 255]);
    const alpha = Math.round(clamp01(fill.enabled ? fill.opacity : Math.min(0.9, stroke.opacity ?? 0.9)) * 255);
    p.noStroke();
    const bands = 48;
    for (const mesh of meshes) {
      const faces = [];
      let minDepth = Infinity;
      let maxDepth = -Infinity;
      for (const face of mesh.faces) {
        let depth = 0;
        let visible = true;
        for (const index of face) {
          const point = mesh.vertices[index];
          if (!point) {
            visible = false;
            break;
          }
          depth += point.depth ?? 0;
        }
        if (!visible) continue;
        const value = depth / face.length;
        minDepth = Math.min(minDepth, value);
        maxDepth = Math.max(maxDepth, value);
        faces.push({ face, depth: value });
      }
      if (!faces.length) continue;
      faces.sort((a, b) => a.depth - b.depth);
      const span = Math.max(1e-9, maxDepth - minDepth);
      let cursor = 0;
      for (let band = 0; band < bands && cursor < faces.length; band++) {
        const limit = band === bands - 1
          ? maxDepth + 1
          : minDepth + (span * (band + 1)) / bands;
        const slice = [];
        while (cursor < faces.length && faces[cursor].depth <= limit) {
          slice.push(faces[cursor]);
          cursor += 1;
        }
        if (!slice.length) continue;
        const depthAlpha = clamp01(0.4 + 0.55 * ((minDepth + (span * (band + 0.5)) / bands)));
        p.fill(rgb[0], rgb[1], rgb[2], Math.round(alpha * depthAlpha));
        p.beginShape(p.TRIANGLES);
        for (const { face } of slice) {
          for (const index of face) {
            const point = mesh.vertices[index];
            if (point) p.vertex(point.x, point.y);
          }
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
