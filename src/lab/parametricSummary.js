/**
 * lab/parametricSummary.js — pure, minimal shape-property summary.
 *
 * The UI overlay is presentation only; this module turns the active layer's
 * generator schema and operator stack into stable rows.
 */

import { Generators, Operators } from '../core/registry.js';

export function buildParametricSummary(document, layerIndex = document?.activeLayer ?? 0) {
  const layers = document?.layers ?? [];
  const layer = layers[layerIndex];
  if (!layer) return null;
  const definition = Generators.has(layer.generator.id) ? Generators.get(layer.generator.id) : null;
  const params = [];
  if (definition) {
    for (const [key, schema] of Object.entries(definition.params)) {
      params.push({
        key,
        label: schema.label ?? key,
        value: formatParametricValue(layer.generator.params?.[key]),
        advanced: Boolean(schema.advanced),
      });
    }
  }
  const operators = (layer.operators ?? [])
    .filter((operator) => operator.enabled !== false)
    .map((operator) => ({
      id: operator.id,
      name: Operators.get(operator.id)?.name ?? operator.id,
    }));
  return {
    layerIndex,
    layerName: layer.name ?? `Layer ${layerIndex + 1}`,
    generatorName: definition?.name ?? layer.generator.id,
    seed: layer.seed ?? document?.seed ?? 1,
    params,
    operators,
  };
}

export function formatParametricValue(value) {
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (value && typeof value === 'object' && typeof value.expr === 'string') {
    return truncate(`ƒ ${value.expr}`);
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

function truncate(value, max = 34) {
  const text = String(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
