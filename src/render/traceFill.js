/**
 * render/traceFill.js — even-odd fill groups for image-derived layers.
 *
 * Traced holes live in separate Fourier layers, so filling each layer on its
 * own would paint the hole back in. Layers that share a trace group are
 * filled once as a single even-odd path.
 */

import { bboxAll } from '../sampling/sampling.js';

export function traceFillGroups(layers) {
  const groups = new Map();
  for (const layer of layers ?? []) {
    const trace = layer?.trace;
    if (!trace?.group) continue;
    let group = groups.get(trace.group);
    if (!group) {
      group = {
        group: trace.group,
        layers: [],
        curves: [],
        fill: null,
        depth: Infinity,
      };
      groups.set(trace.group, group);
    }
    group.layers.push(layer);
    group.curves.push(...(layer.curves ?? []));
    const depth = Number(trace.depth) || 0;
    if (layer.style?.fill?.enabled && depth < group.depth) {
      group.depth = depth;
      group.fill = layer.style.fill;
    }
  }
  return [...groups.values()]
    .filter((group) => group.fill && group.curves.length)
    .map((group) => ({ ...group, bbox: bboxAll(group.curves) }));
}

/** Keep the stroke but move the fill to the shared even-odd group. */
export function withoutTraceFill(style, trace) {
  if (!trace?.group || !style?.fill?.enabled) return style;
  return { ...style, fill: { ...style.fill, enabled: false } };
}
