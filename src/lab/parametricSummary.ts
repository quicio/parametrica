/** Pure, minimal shape-property summary. */

import { Generators, Operators } from '../core/registry.ts';
import { isInstanceLayer, sourceLayerFor } from '../core/layers.ts';
import type { DocumentShape, LayerShape } from '../core/documentTypes.ts';

export interface SummaryParam {
  key: string;
  label: string;
  value: string;
  advanced: boolean;
}
export interface SummaryOperator {
  id: string;
  name: string;
}
export interface ParametricSummary {
  layerIndex: number;
  layerName: string;
  instance: boolean;
  sourceLayerName: string | null;
  generatorName: string;
  seed: number;
  params: SummaryParam[];
  operators: SummaryOperator[];
}
export interface SummaryDocumentLike {
  activeLayer?: number;
  seed?: number;
  layers: LayerShape[];
  [key: string]: unknown;
}

export function buildParametricSummary(
  document: SummaryDocumentLike | null | undefined,
  layerIndex: number = document?.activeLayer ?? 0,
): ParametricSummary | null {
  const layers = document?.layers ?? [];
  const layer = layers[layerIndex];
  if (!layer) return null;
  const instance = isInstanceLayer(layer);
  const sourceLayer = instance ? sourceLayerFor(document as never, layer) as LayerShape | null : null;
  const generatorOwner = instance ? sourceLayer : layer;
  const generator = generatorOwner?.generator;
  const definition = generator?.id && Generators.has(generator.id)
    ? Generators.get(generator.id)
    : null;
  const params: SummaryParam[] = [];
  if (definition) {
    for (const [key, schema] of Object.entries(definition.params)) {
      params.push({
        key,
        label: schema.label ?? key,
        value: formatParametricValue(generator?.params?.[key]),
        advanced: Boolean(schema.advanced),
      });
    }
  }
  const operators: SummaryOperator[] = (layer.operators ?? [])
    .filter((operator) => operator.enabled !== false)
    .map((operator) => ({
      id: operator.id,
      name: Operators.get(operator.id)?.name ?? operator.id,
    }));
  return {
    layerIndex,
    layerName: layer.name ?? `Layer ${layerIndex + 1}`,
    instance,
    sourceLayerName: sourceLayer?.name ?? null,
    generatorName: instance
      ? `Instance ← ${definition?.name ?? sourceLayer?.name ?? 'missing source'}`
      : (definition?.name ?? generator?.id ?? 'Generator'),
    seed: (generatorOwner as LayerShape | null)?.seed ?? document?.seed ?? 1,
    params,
    operators,
  };
}

export function formatParametricValue(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (value && typeof value === 'object' && typeof (value as { expr?: unknown }).expr === 'string') {
    return truncate(`ƒ ${(value as { expr: string }).expr}`);
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';
    return String(Number(value.toFixed(4)));
  }
  if (typeof value === 'string') return truncate(value);
  if (value == null) return '—';
  return truncate(String(value));
}

function truncate(value: unknown, max = 34): string {
  const text = String(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export type { DocumentShape };
