/**
 * offline.js — deterministic, rule-based advisor.
 *
 * No network, no model. The advisor explains parameter/descriptor changes and
 * proposes schema-valid experiments. Every suggestion is a hypothesis and is
 * validated before it reaches the UI.
 */

import { clampNumber, TYPE } from '../core/schema.js';
import { sanitizeDocument, attachLayerAliases } from '../core/document.js';
import { Generators, Operators } from '../core/registry.js';

export const ADVISOR_VERSION = 1;

const NUMBER_RE = /^(?:generator\.params\.([A-Za-z0-9_]+)|operators\[(\d+)\]\.params\.([A-Za-z0-9_]+))$/;

/** Resolve a suggestion path against the active layer. */
export function resolvePath(document, path) {
  if (!document || typeof path !== 'string') return null;
  const match = NUMBER_RE.exec(path);
  if (!match) return null;
  const layer = document.layers?.[document.activeLayer ?? 0] ?? document;
  if (match[1]) {
    const key = match[1];
    const schema = schemaFor(layer.generator.id, key, false);
    if (!schema) return null;
    return { stage: layer.generator, schema, key, path };
  }
  const index = Number(match[2]);
  const key = match[3];
  const op = layer.operators?.[index];
  if (!op) return null;
  const schema = schemaFor(op.id, key, true);
  if (!schema) return null;
  return { stage: op, schema, key, path };
}

function schemaFor(id, key, operator) {
  const def = operator ? Operators.get(id) : Generators.get(id);
  return def?.params?.[key] ?? null;
}

/**
 * Validate one suggestion and return its clamped/typed target value.
 * @returns {{ok:boolean, reason?:string, suggestion?:object, value?:any}}
 */
export function validateSuggestion(document, suggestion) {
  const resolved = resolvePath(document, suggestion?.path);
  if (!resolved) return { ok: false, reason: `Unknown parameter path: ${suggestion?.path ?? '—'}` };
  const { schema, stage, key } = resolved;
  const current = stage.params?.[key];
  if (schema.type === TYPE.NUMBER) {
    const to = Number(suggestion.to);
    if (!Number.isFinite(to)) return { ok: false, reason: 'Suggestion value is not finite' };
    const value = clampNumber(schema, to);
    if (!Number.isFinite(value)) return { ok: false, reason: 'Suggestion could not be clamped' };
    return {
      ok: true,
      value,
      suggestion: {
        ...suggestion,
        path: resolved.path,
        from: current,
        to: value,
        clamped: Math.abs(value - to) > 1e-9,
      },
    };
  }
  if (schema.type === TYPE.SELECT) {
    if (!schema.options?.includes(suggestion.to)) {
      return { ok: false, reason: `Invalid option for ${resolved.path}` };
    }
    return { ok: true, value: suggestion.to, suggestion: { ...suggestion, path: resolved.path, from: current } };
  }
  if (schema.type === TYPE.BOOLEAN) {
    return { ok: true, value: Boolean(suggestion.to), suggestion: { ...suggestion, path: resolved.path, from: current } };
  }
  return { ok: false, reason: `Unsupported parameter type for ${resolved.path}` };
}

/** Return a new document with the suggestion applied, or null if invalid. */
export function applySuggestionToDocument(document, suggestion) {
  const validated = validateSuggestion(document, suggestion);
  if (!validated.ok) return null;
  const candidate = sanitizeDocument(structuredClone(document));
  if (!candidate) return null;
  const resolved = resolvePath(candidate, validated.suggestion.path);
  if (!resolved) return null;
  resolved.stage.params[resolved.key] = validated.value;
  return attachLayerAliases(candidate);
}

/**
 * Build a deterministic advisor response.
 * @param {{current:object, previous?:object, parameterDiff?:Array, descriptorDiff?:Array, sensitivity?:object, document?:object}} input
 */
export function adviseOffline(input = {}) {
  const current = input.current ?? {};
  const previous = input.previous ?? null;
  const parameterDiff = input.parameterDiff ?? [];
  const descriptorDiff = input.descriptorDiff ?? [];
  const document = input.document ?? null;

  const summary = buildSummary(current, previous, parameterDiff, descriptorDiff);
  const changes = parameterDiff.slice(0, 8).map((entry) => ({
    path: entry.path,
    from: entry.from,
    to: entry.to,
    reading: describeChange(entry),
  }));
  const suggestions = document
    ? buildSuggestions(document, current)
    : [];

  return {
    version: ADVISOR_VERSION,
    summary,
    changes,
    suggestions,
    caveats: suggestions.length
      ? ['Suggestions are deterministic hypotheses, not aesthetic verdicts.']
      : ['No applicable rule fired for this figure.'],
  };
}

function buildSummary(current, previous, parameterDiff, descriptorDiff) {
  if (!previous) {
    return `Current figure: ${current.curveCount ?? 0} curves, ${current.symmetry?.folds ?? 1}-fold symmetry ` +
      `(${format(current.symmetry?.score, 2)}), curvature entropy ${format(current.curvature?.entropy, 2)}, ` +
      `${current.crossings ?? 0} crossings.`;
  }
  const pCount = parameterDiff.length;
  const dCount = descriptorDiff.length;
  const top = parameterDiff.slice(0, 3).map((entry) => `${shortPath(entry.path)} ${format(entry.from)}→${format(entry.to)}`);
  return `Compared with the previous form: ${pCount} parameter change${pCount === 1 ? '' : 's'}, ` +
    `${dCount} descriptor change${dCount === 1 ? '' : 's'}.` +
    (top.length ? ` Main moves: ${top.join('; ')}.` : '');
}

function describeChange(entry) {
  return `${shortPath(entry.path)}: ${format(entry.from)} → ${format(entry.to)}`;
}

function buildSuggestions(document, current) {
  const refs = numericRefs(document);
  const suggestions = [];
  const seen = new Set();

  const add = (keyNames, direction, kind, rationale, effect, confidence = 0.65) => {
    const ref = refs.find((candidate) => keyNames.includes(candidate.key));
    if (!ref || seen.has(ref.path)) return;
    const schema = ref.schema;
    if (schema.type !== TYPE.NUMBER) return;
    const from = Number(ref.stage.params[ref.key]);
    if (!Number.isFinite(from)) return;
    const range = (schema.max ?? 1) - (schema.min ?? 0);
    const magnitude = Math.max(Number(schema.step) || 0, range * 0.08);
    const to = clampNumber(schema, from + magnitude * direction);
    if (!Number.isFinite(to) || Math.abs(to - from) < 1e-9) return;
    const suggestion = {
      id: `suggest-${suggestions.length + 1}`,
      path: ref.path,
      from,
      to,
      rationale,
      expectedEffect: effect,
      confidence,
      kind,
    };
    const validated = validateSuggestion(document, suggestion);
    if (!validated.ok) return;
    seen.add(ref.path);
    suggestions.push(validated.suggestion);
  };

  const symmetry = current.symmetry?.score ?? 1;
  if (symmetry < 0.6) {
    add(['phase', 'phaseX', 'phaseY', 'delta', 'theta'], 1, 'subtle',
      'The figure has low rotational symmetry.', 'Shift the phase to reveal a new alignment.', 0.6);
  } else if (symmetry > 0.92) {
    add(['rotate', 'angle'], 1, 'wild',
      'The figure is highly symmetric and visually static.', 'Break the symmetry with a small rotation.', 0.55);
    add(['ringScale', 'scale'], -1, 'subtle',
      'High symmetry can flatten the hierarchy.', 'Reduce the ring/scale step to create a focal core.', 0.55);
  }

  const crossings = current.crossings ?? 0;
  if (crossings > 20) {
    add(['count', 'rings', 'folds', 'cols', 'rows'], -1, 'structural',
      'There are many crossings; density may be hiding the form.', 'Reduce repetition to clarify the composition.', 0.6);
    add(['ringScale', 'scale'], -1, 'subtle',
      'Nested copies are overlapping heavily.', 'Tighten the scale step to remove overlap.', 0.5);
  } else if (crossings < 2 && (current.coverage ?? 0) < 0.2) {
    add(['count', 'rings', 'folds', 'cols', 'rows'], 1, 'structural',
      'The figure is sparse and could gain structure.', 'Increase repetition to build a richer field.', 0.55);
  }

  const entropy = current.curvature?.entropy ?? 0;
  if (entropy > 0.8) {
    add(['strength', 'iterations'], 1, 'subtle',
      'Curvature is visually noisy.', 'Smooth the geometry to reveal the underlying flow.', 0.55);
    add(['radius', 'size'], -1, 'subtle',
      'A smaller scale can make the high curvature read more clearly.', 'Reduce the scale slightly.', 0.45);
  } else if (entropy < 0.35 && suggestions.length < 3) {
    add(['radius', 'size'], 1, 'subtle',
      'The curvature profile is very regular.', 'Scale up to give the form more presence.', 0.4);
  }

  if (suggestions.length < 3) {
    const ref = refs.find((candidate) => !seen.has(candidate.path));
    if (ref) {
      const schema = ref.schema;
      const range = (schema.max ?? 1) - (schema.min ?? 0);
      const from = Number(ref.stage.params[ref.key]);
      const to = clampNumber(schema, from + Math.max(Number(schema.step) || 0, range * 0.05));
      if (Number.isFinite(to) && Math.abs(to - from) > 1e-9) {
        const suggestion = {
          id: `suggest-${suggestions.length + 1}`,
          path: ref.path,
          from,
          to,
          rationale: 'A small deterministic perturbation to explore nearby.',
          expectedEffect: 'Gently shifts the current family without changing its structure.',
          confidence: 0.35,
          kind: 'subtle',
        };
        const validated = validateSuggestion(document, suggestion);
        if (validated.ok) suggestions.push(validated.suggestion);
      }
    }
  }

  return suggestions.slice(0, 5);
}

function numericRefs(document) {
  const refs = [];
  const layer = document.layers?.[document.activeLayer ?? 0] ?? document;
  for (const [key, schema] of Object.entries(Generators.get(layer.generator.id).params ?? {})) {
    if (schema.type !== TYPE.NUMBER) continue;
    refs.push({ path: `generator.params.${key}`, key, schema, stage: layer.generator });
  }
  (layer.operators ?? []).forEach((op, index) => {
    for (const [key, schema] of Object.entries(Operators.get(op.id).params ?? {})) {
      if (schema.type !== TYPE.NUMBER) continue;
      refs.push({ path: `operators[${index}].params.${key}`, key, schema, stage: op });
    }
  });
  return refs;
}

function shortPath(path) {
  return path
    .replace('generator.params.', 'gen.')
    .replace(/operators\[(\d+)\]\.params\./, 'op[$1].');
}

function format(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return Number(value).toFixed(digits);
}
