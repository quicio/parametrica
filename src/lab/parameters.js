/**
 * parameters.js — shared parameter references for lab features.
 *
 * A ParameterRef is { stage: 'generator' | 'operator', index?: number,
 * key: string }. These helpers keep sensitivity and exploration aligned.
 */

import { Generators, Operators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';

export function numericParameterRefs(document) {
  const refs = [];
  const generator = Generators.get(document.generator.id);
  for (const [key, schema] of Object.entries(generator.params)) {
    if (schema.type === TYPE.NUMBER) refs.push({ stage: 'generator', key, schema });
  }
  (document.operators ?? []).forEach((op, index) => {
    if (!Operators.has(op.id)) return;
    const def = Operators.get(op.id);
    for (const [key, schema] of Object.entries(def.params)) {
      if (schema.type === TYPE.NUMBER) refs.push({ stage: 'operator', index, key, schema });
    }
  });
  return refs;
}

export function schemaForRef(document, ref) {
  if (ref.stage === 'generator') {
    return Generators.get(document.generator.id).params[ref.key] ?? null;
  }
  const op = document.operators?.[ref.index];
  if (!op || !Operators.has(op.id)) return null;
  return Operators.get(op.id).params[ref.key] ?? null;
}

export function stageForRef(document, ref) {
  if (ref.stage === 'generator') return document.generator;
  return document.operators?.[ref.index] ?? null;
}

export function pathForRef(ref) {
  return ref.stage === 'generator'
    ? `generator.params.${ref.key}`
    : `operators[${ref.index}].params.${ref.key}`;
}

export function sameRef(a, b) {
  return a?.stage === b?.stage && a?.key === b?.key && (a?.index ?? null) === (b?.index ?? null);
}

export function refKey(ref) {
  return pathForRef(ref);
}
