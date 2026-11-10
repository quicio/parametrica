/** Shared parameter references for lab features. */

import { Generators, Operators } from '../core/registry.ts';
import { TYPE } from '../core/schema.ts';
import type { ParamSchema, SchemaEntry } from '../core/schema.ts';
import type { LayerShape, OperatorStageShape } from '../core/documentTypes.ts';

export interface ParameterRef {
  stage: 'generator' | 'operator';
  index?: number;
  key: string;
  schema?: SchemaEntry;
}
export interface NumericParameterRef extends ParameterRef {
  schema: SchemaEntry;
}
export interface LabDocumentLike {
  generator?: { id?: string; params: Record<string, unknown>; mods?: Record<string, string> } | null;
  operators?: Array<{ id: string; params: Record<string, unknown>; mods?: Record<string, string> }>;
  [key: string]: unknown;
}

export function numericParameterRefs(document: LabDocumentLike): NumericParameterRef[] {
  const refs: NumericParameterRef[] = [];
  const generator = document.generator?.id && Generators.has(document.generator.id)
    ? Generators.get(document.generator.id)
    : null;
  for (const [key, schema] of Object.entries(generator?.params ?? {})) {
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

export function schemaForRef(document: LabDocumentLike, ref: ParameterRef): SchemaEntry | null {
  if (ref.stage === 'generator') {
    if (!document.generator?.id || !Generators.has(document.generator.id)) return null;
    return Generators.get(document.generator.id).params[ref.key] ?? null;
  }
  const op = document.operators?.[ref.index ?? -1];
  if (!op || !Operators.has(op.id)) return null;
  return Operators.get(op.id).params[ref.key] ?? null;
}

export function stageForRef(document: LabDocumentLike, ref: ParameterRef): { params: Record<string, unknown> } | null {
  if (ref.stage === 'generator') return document.generator ?? null;
  return document.operators?.[ref.index ?? -1] ?? null;
}

export function pathForRef(ref: ParameterRef): string {
  return ref.stage === 'generator'
    ? `generator.params.${ref.key}`
    : `operators[${ref.index}].params.${ref.key}`;
}

export function sameRef(a: ParameterRef | null | undefined, b: ParameterRef | null | undefined): boolean {
  return a?.stage === b?.stage && a?.key === b?.key && (a?.index ?? null) === (b?.index ?? null);
}

export function refKey(ref: ParameterRef): string {
  return pathForRef(ref);
}

export type { LayerShape, OperatorStageShape, ParamSchema };
