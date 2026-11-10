/** Pluggable stage registries. */

import { TYPE } from './schema.ts';
import type { ParamSchema } from './schema.ts';
import type { Capabilities } from './capabilities.ts';

const PARAM_TYPES = new Set(Object.values(TYPE));

type StageFn = (...args: never[]) => unknown;

export interface StageDefinition {
  id: string;
  name: string;
  category?: string;
  params?: ParamSchema;
  capabilities?: Partial<Capabilities>;
  sample?: StageFn;
  generate?: StageFn;
  apply?: StageFn;
  draw?: StageFn;
  appliesTo?: StageFn;
  domain?: StageFn;
  space?: string;
  accepts?: string[];
  produces?: string[];
  group?: string;
  description?: string;
  internal?: boolean;
  advanced?: boolean;
  previewParams?: StageFn;
  syncParams?: StageFn;
  onExpressionChange?: StageFn;
  migrateParams?: StageFn;
  hooks?: Record<string, StageFn>;
  [key: string]: unknown;
}
export interface GeneratorDefinition extends StageDefinition {
  category: string;
  params: ParamSchema;
}
export interface OperatorDefinition extends StageDefinition {
  category: string;
  params: ParamSchema;
  apply: StageFn;
}
export interface RenderPassDefinition extends StageDefinition {
  draw: StageFn;
}

export class Registry<T extends StageDefinition = StageDefinition> {
  kind: string;
  map: Map<string, T>;

  constructor(kind: string) {
    this.kind = kind;
    this.map = new Map();
  }

  register(definition: T): T {
    validateDefinition(this.kind, definition);
    if (this.map.has(definition.id)) {
      throw new Error(`${this.kind}: duplicate id "${definition.id}"`);
    }
    const normalized = (this.kind === 'operator'
      ? { space: 'view', accepts: ['curve2d'], produces: ['curve2d'], ...definition }
      : definition) as T;
    this.map.set(normalized.id, Object.freeze(normalized) as T);
    return normalized;
  }

  get(id: string): T {
    const def = this.map.get(id);
    if (!def) throw new Error(`${this.kind}: unknown id "${id}"`);
    return def;
  }

  has(id: string): boolean {
    return this.map.has(id);
  }

  list(): T[] {
    return [...this.map.values()];
  }

  ids(): string[] {
    return [...this.map.keys()];
  }
}

function validateDefinition(kind: string, definition: unknown): void {
  if (!definition || typeof definition !== 'object') {
    throw new Error(`${kind}: definition must be an object`);
  }
  const def = definition as StageDefinition;
  const id = validateId(kind, def.id);
  const label = `${kind} "${id}"`;
  if (typeof def.name !== 'string' || !def.name.trim()) {
    throw new Error(`${label}: missing name`);
  }

  if (kind === 'generator' || kind === 'operator') {
    if (typeof def.category !== 'string' || !def.category.trim()) {
      throw new Error(`${label}: missing category`);
    }
    validateParams(label, def.params);
    if (kind === 'generator' && typeof def.sample !== 'function' && typeof def.generate !== 'function') {
      throw new Error(`${label}: missing sample(params, ctx) or generate(params, ctx)`);
    }
    if (kind === 'generator' && def.sample !== undefined && typeof def.sample !== 'function') {
      throw new Error(`${label}: sample must be a function`);
    }
    if (kind === 'generator' && def.generate !== undefined && typeof def.generate !== 'function') {
      throw new Error(`${label}: generate must be a function`);
    }
    if (kind === 'generator' && def.domain !== undefined && typeof def.domain !== 'function') {
      throw new Error(`${label}: domain must be a function`);
    }
    if (kind === 'operator' && typeof def.apply !== 'function') {
      throw new Error(`${label}: missing apply(curves, params, ctx)`);
    }
    if (kind === 'operator') validateOperatorSpace(label, def);
    validateCapabilities(label, def.capabilities);
    validateHooks(label, def);
  }

  if (kind === 'render-pass' && typeof def.draw !== 'function') {
    throw new Error(`${label}: missing draw(p, data)`);
  }
  if (kind === 'render-pass' && def.appliesTo !== undefined && typeof def.appliesTo !== 'function') {
    throw new Error(`${label}: appliesTo must be a function`);
  }
  if (kind === 'render-pass' && def.group !== undefined && typeof def.group !== 'string') {
    throw new Error(`${label}: group must be a string`);
  }
  if (kind === 'render-pass' && def.description !== undefined && typeof def.description !== 'string') {
    throw new Error(`${label}: description must be a string`);
  }
}

function validateId(kind: string, value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${kind}: definition needs an id`);
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error(`${kind} "${value}": id must be lowercase kebab-case`);
  }
  return value;
}

function validateParams(label: string, params: unknown): void {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error(`${label}: params must be an object`);
  }
  for (const [key, schema] of Object.entries(params as Record<string, unknown>)) {
    if (!schema || typeof schema !== 'object') {
      throw new Error(`${label}: param "${key}" must be a schema object`);
    }
    const entry = schema as { type?: unknown; options?: unknown[]; default?: unknown; advanced?: unknown };
    if (!PARAM_TYPES.has(entry.type as never)) {
      throw new Error(`${label}: param "${key}" has unknown type "${entry.type}"`);
    }
    if (entry.type === TYPE.SELECT) {
      if (!Array.isArray(entry.options) || !entry.options.length) {
        throw new Error(`${label}: select param "${key}" needs non-empty options`);
      }
      if (!entry.options.includes(entry.default)) {
        throw new Error(`${label}: select param "${key}" default is not an option`);
      }
    }
    if (entry.type === TYPE.EXPRESSION || entry.type === TYPE.SOURCE) {
      if (typeof entry.default !== 'string') {
        throw new Error(`${label}: ${entry.type} param "${key}" needs a string default`);
      }
    }
    if (entry.advanced !== undefined && typeof entry.advanced !== 'boolean') {
      throw new Error(`${label}: param "${key}" advanced must be boolean`);
    }
  }
}

function validateOperatorSpace(label: string, definition: StageDefinition): void {
  if (definition.space !== undefined && !['world', 'view'].includes(definition.space)) {
    throw new Error(`${label}: space must be "world" or "view"`);
  }
  for (const key of ['accepts', 'produces'] as const) {
    if (definition[key] !== undefined) {
      const kinds = definition[key];
      if (!Array.isArray(kinds) || !kinds.length) {
        throw new Error(`${label}: ${key} must be a non-empty array`);
      }
      for (const kind of kinds) {
        if (!['curve2d', 'curve3d', 'surface', 'mesh', 'solid'].includes(kind)) {
          throw new Error(`${label}: ${key} has unknown geometry kind "${kind}"`);
        }
      }
    }
  }
}

function validateCapabilities(label: string, capabilities: unknown): void {
  if (capabilities === undefined) return;
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
    throw new Error(`${label}: capabilities must be an object`);
  }
  const caps = capabilities as Record<string, unknown>;
  if (caps.spatial !== undefined && typeof caps.spatial !== 'boolean') {
    throw new Error(`${label}: capabilities.spatial must be boolean`);
  }
  if (caps.projection !== undefined && typeof caps.projection !== 'string') {
    throw new Error(`${label}: capabilities.projection must be a string`);
  }
  if (caps.geometryKind !== undefined && !['curve2d', 'curve3d', 'surface', 'mesh', 'solid'].includes(caps.geometryKind as string)) {
    throw new Error(`${label}: capabilities.geometryKind is not a known geometry kind`);
  }
}

function validateHooks(label: string, definition: StageDefinition): void {
  const hookNames = ['previewParams', 'syncParams', 'onExpressionChange', 'migrateParams'] as const;
  for (const name of hookNames) {
    if (definition[name] !== undefined && typeof definition[name] !== 'function') {
      throw new Error(`${label}: hook "${name}" must be a function`);
    }
  }
  if (definition.hooks !== undefined) {
    if (!definition.hooks || typeof definition.hooks !== 'object') {
      throw new Error(`${label}: hooks must be an object`);
    }
    for (const [name, fn] of Object.entries(definition.hooks)) {
      if (typeof fn !== 'function') throw new Error(`${label}: hook "${name}" must be a function`);
    }
  }
}

export const Generators: Registry<GeneratorDefinition> = new Registry('generator');
export const Operators: Registry<OperatorDefinition> = new Registry('operator');
export const RenderPasses: Registry<RenderPassDefinition> = new Registry('render-pass');
