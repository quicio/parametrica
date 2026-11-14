/**
 * evolution.js — user-guided generation of forms.
 *
 * The user is the fitness function. Parents are notebook documents; children
 * are numeric crossovers plus occasional structural operator changes. Every
 * child is sanitised and fully evaluated before it is offered. Nothing is
 * kept automatically.
 */

import { clampNumber, schemaDefaults, TYPE } from '../core/schema.ts';
import { sanitizeDocument, attachLayerAliases } from '../core/document.ts';
import { Operators } from '../core/registry.ts';
import { evaluateDocument } from '../core/engine.ts';
import { mulberry32 } from '../math/noise.ts';
import type { DocumentShape, OperatorStageShape } from '../core/documentTypes.ts';
import type { OperatorDefinition } from '../core/registry.ts';
import type { ParameterRef } from './parameters.ts';
import {
  numericParameterRefs,
  pathForRef,
  schemaForRef,
  stageForRef,
} from './parameters.ts';

export const EVOLUTION_VERSION = 1;
export const MAX_PARENTS = 4;
export const MIN_PARENTS = 2;
export const MAX_CHILDREN = 12;
export const MAX_STRUCTURAL_CHANGES = 3;
export const MAX_OPERATORS = 6;

export interface StructuralChange {
  op: string;
  index: number;
  operatorId: string;
}
export interface CrossoverEntry {
  path: string;
  from: unknown;
  to: unknown;
}
export interface EvolutionChild {
  id: string;
  index: number;
  name: string;
  generation: number;
  parents: string[];
  primaryParentId: string | null;
  baseIndex: number;
  seed: number;
  document: DocumentShape;
  crossover: CrossoverEntry[];
  structuralChanges: StructuralChange[];
}
export interface GenerationResult {
  version: number;
  seed: number;
  generation: number;
  parentIds: string[];
  children: EvolutionChild[];
  rejected: number;
  attempts: number;
}
export interface GenerationOptions {
  count?: number;
  seed?: number;
  generation?: number;
  parentIds?: unknown[];
  structuralRate?: number;
  mutationRate?: number;
  mutationAmount?: number;
  maxAttempts?: number;
  maxStructuralChanges?: number;
  validate?: (document: DocumentShape) => boolean;
}
interface BuildOptions {
  generation: number;
  parentIds: string[];
  index: number;
  seed: number;
  structuralRate: number;
  mutationRate: number;
  mutationAmount: number;
  structuralBudget: number;
}

/**
 * Breed one generation. Deterministic for a given (parents, seed, options).
 * @returns {{version:number,seed:number,generation:number,parentIds:string[],
 *   children:Array,rejected:number,attempts:number}}
 */
export function createGeneration(parents: unknown, {
  count = 6,
  seed = 1,
  generation = 1,
  parentIds = [],
  structuralRate = 0.35,
  mutationRate = 0.6,
  mutationAmount = 0.06,
  maxAttempts = 3,
  maxStructuralChanges = MAX_STRUCTURAL_CHANGES,
  validate = isChildValid,
}: GenerationOptions = {}): GenerationResult {
  const documents = normalizeParents(parents);
  if (documents.length < MIN_PARENTS || documents.length > MAX_PARENTS) {
    throw new Error(`Select ${MIN_PARENTS}–${MAX_PARENTS} parents`);
  }
  const n = clampInt(count, 1, MAX_CHILDREN);
  const attemptsPerChild = clampInt(maxAttempts, 1, 6);
  const structureRate = clampNumberValue(structuralRate, 0, 1);
  const mutateRate = clampNumberValue(mutationRate, 0, 1);
  const mutateAmount = clampNumberValue(mutationAmount, 0, 0.5);
  const changeBudget = clampInt(maxStructuralChanges, 1, MAX_STRUCTURAL_CHANGES);
  const gen = clampInt(generation, 0, 1_000_000);
  const ids = parentIds
    .map((id) => (typeof id === 'string' && id ? id : null))
    .filter((id): id is string => typeof id === 'string' && Boolean(id))
    .slice(0, MAX_PARENTS);
  const random = mulberry32((seed >>> 0) || 1);
  const children = [];
  let rejected = 0;
  let attempts = 0;

  for (let i = 0; i < n; i++) {
    let child = null;
    for (let attempt = 0; attempt < attemptsPerChild; attempt++) {
      attempts += 1;
      const candidate = buildChild(documents, random, {
        generation: gen,
        parentIds: ids,
        index: i,
        seed,
        structuralRate: structureRate,
        mutationRate: mutateRate,
        mutationAmount: mutateAmount,
        structuralBudget: changeBudget,
      });
      if (validate(candidate.document)) {
        child = candidate;
        break;
      }
    }
    if (child) children.push(child);
    else rejected += 1;
  }

  return {
    version: EVOLUTION_VERSION,
    seed,
    generation: gen,
    parentIds: ids,
    children,
    rejected,
    attempts,
  };
}

function buildChild(documents: DocumentShape[], random: () => number, options: BuildOptions): EvolutionChild {
  const baseIndex = Math.floor(random() * documents.length);
  const base = documents[baseIndex]!;
  const document = attachLayerAliases(structuredClone(base));
  const refs = numericParameterRefs(base);
  const crossover = [];

  for (const ref of refs) {
    const schema = schemaForRef(base, ref);
    if (!schema || schema.type !== TYPE.NUMBER) continue;
    const values = [];
    for (const parent of documents) {
      if (!compatibleRef(parent, base, ref)) continue;
      const stage = stageForRef(parent, ref);
      const value = Number(stage?.params?.[ref.key]);
      if (Number.isFinite(value)) values.push(value);
    }
    if (!values.length) continue;
    const value = values.length >= 2
      ? Math.min(...values) + random() * (Math.max(...values) - Math.min(...values))
      : values[0];
    const stage = stageForRef(document, ref);
    if (!stage) continue;
    stage.params[ref.key] = clampNumber(schema, value);
    crossover.push({
      path: pathForRef(ref),
      from: values.length >= 2 ? [Math.min(...values), Math.max(...values)] : values[0],
      to: stage.params[ref.key],
    });
  }

  // Seeded mutation keeps a generation from collapsing onto the exact
  // midpoint of its parents. At most a few numeric parameters move.
  if (options.mutationRate > 0 && random() < options.mutationRate) {
    const moves = 1 + Math.floor(random() * 2);
    for (let i = 0; i < moves; i++) {
      const ref = refs[Math.floor(random() * refs.length)];
      if (!ref) break;
      const schema = schemaForRef(document, ref);
      const stage = stageForRef(document, ref);
      if (!schema || !stage) continue;
      const current = Number(stage.params[ref.key]);
      if (!Number.isFinite(current)) continue;
      const range = (schema.max ?? 1) - (schema.min ?? 0);
      const next = current + gaussian(random) * range * options.mutationAmount;
      stage.params[ref.key] = clampNumber(schema, next);
    }
  }

  const structuralChanges = [];
  if (options.structuralRate > 0 && random() < options.structuralRate) {
    const desired = 1 + Math.floor(random() * options.structuralBudget);
    for (let i = 0; i < desired; i++) {
      const change = structuralChange(document, random);
      if (change) structuralChanges.push(change);
    }
  }

  const sanitized = sanitizeDocument(document) ?? document;
  attachLayerAliases(sanitized);
  return {
    id: `child-${options.generation}-${options.seed}-${options.index}`,
    index: options.index,
    name: `G${options.generation} · child ${options.index + 1}`,
    generation: options.generation,
    parents: options.parentIds.slice(),
    primaryParentId: options.parentIds[baseIndex] ?? null,
    baseIndex,
    seed: options.seed,
    document: sanitized,
    crossover,
    structuralChanges,
  };
}

function structuralChange(document: DocumentShape, random: () => number): StructuralChange | null {
  const ops = document.operators ?? (document.operators = []);
  const actions = [];
  if (ops.length < MAX_OPERATORS) actions.push('add');
  if (ops.length > 0) actions.push('remove');
  if (ops.length > 1) actions.push('swap');
  if (!actions.length) return null;
  const action = actions[Math.floor(random() * actions.length)];

  if (action === 'add') {
    const definitions = Operators.list();
    if (!definitions.length) return null;
    const definition = definitions[Math.floor(random() * definitions.length)]!;
    const index = Math.floor(random() * (ops.length + 1));
    ops.splice(index, 0, {
      id: definition.id,
      enabled: true,
      params: schemaDefaults(definition.params),
      mods: {},
    });
    return { op: 'add', index, operatorId: definition.id };
  }
  if (action === 'remove') {
    const index = Math.floor(random() * ops.length);
    const [removed] = ops.splice(index, 1);
    return { op: 'remove', index, operatorId: removed?.id ?? '' };
  }
  const index = Math.floor(random() * (ops.length - 1));
  const left = ops[index]!;
  const right = ops[index + 1]!;
  ops[index] = right;
  ops[index + 1] = left;
  return { op: 'swap', index, operatorId: `${right.id} ↔ ${left.id}` };
}

function compatibleRef(parent: DocumentShape, base: DocumentShape, ref: ParameterRef): boolean {
  if (parent === base) return true;
  if (ref.stage === 'generator') {
    return parent.generator?.id === base.generator?.id;
  }
  const index = ref.index ?? 0;
  return parent.operators?.[index]?.id === base.operators?.[index]?.id;
}

function normalizeParents(parents: unknown): DocumentShape[] {
  if (!Array.isArray(parents)) return [];
  return parents
    .slice(0, MAX_PARENTS + 1)
    .map((parent) => {
      const document = sanitizeDocument(structuredClone(parent));
      return document ? attachLayerAliases(document) : null;
    })
    .filter((entry): entry is DocumentShape => Boolean(entry));
}

/** Full-evaluation probe. Invalid children are never offered. */
export function isChildValid(document: DocumentShape): boolean {
  try {
    const evaluation = evaluateDocument(document, { time: 0 });
    if (evaluation.errors.length || !evaluation.curves.length) return false;
    if (evaluation.stats.pointCount < 24 || evaluation.stats.pointCount > 200_000) return false;
    const diagonal = evaluation.bbox?.diagonal;
    if (!Number.isFinite(diagonal) || (diagonal as number) < 8) return false;
    return true;
  } catch {
    return false;
  }
}

/** Next generation number from notebook checkpoints. */
export function nextGeneration(checkpoints: unknown): number {
  let max = 0;
  if (!Array.isArray(checkpoints)) return 1;
  for (const cp of checkpoints as Array<Record<string, unknown>>) {
    const value = Number(cp?.generation);
    if (Number.isFinite(value)) max = Math.max(max, Math.floor(value));
  }
  return max + 1;
}

/** Human-readable structural summary for the UI. */
export function describeStructuralChange(change: StructuralChange | null | undefined): string {
  if (!change) return '';
  if (change.op === 'add') return `+${change.operatorId}`;
  if (change.op === 'remove') return `−${change.operatorId}`;
  if (change.op === 'swap') return `↔ ${change.operatorId}`;
  return change.op;
}

function gaussian(random: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clampInt(value: unknown, lo: number, hi: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function clampNumberValue(value: unknown, lo: number, hi: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
