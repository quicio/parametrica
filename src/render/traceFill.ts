/** Even-odd fill groups for image-derived layers. */

import { bboxAll } from '../sampling/sampling.js';

interface Vec2 { x: number; y: number; [key: string]: unknown }
interface FillLike {
  enabled?: boolean;
  [key: string]: unknown;
}
interface StyleLike {
  fill?: FillLike;
  [key: string]: unknown;
}
interface TraceLike {
  group?: string;
  depth?: unknown;
  [key: string]: unknown;
}
interface LayerLike {
  trace?: TraceLike;
  curves?: unknown[];
  style?: StyleLike;
  [key: string]: unknown;
}
interface TraceGroup {
  group: string;
  layers: LayerLike[];
  curves: unknown[];
  fill: FillLike | null;
  depth: number;
}

export interface BoundsLike {
  width?: unknown;
  height?: unknown;
  minX?: unknown;
  minY?: unknown;
  cx?: unknown;
  cy?: unknown;
  [key: string]: unknown;
}

export interface TraceFillGroup extends TraceGroup {
  bbox: BoundsLike;
}

export function traceFillGroups(layers: ReadonlyArray<LayerLike> | null | undefined): TraceFillGroup[] {
  const groups = new Map<string, TraceGroup>();
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
export function withoutTraceFill<T extends StyleLike | null | undefined>(style: T, trace: TraceLike | null | undefined): T {
  if (!trace?.group || !style?.fill?.enabled) return style;
  return { ...style, fill: { ...style.fill, enabled: false } } as T;
}
