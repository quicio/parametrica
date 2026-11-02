/**
 * registry.js — pluggable stage registries (spec G3).
 *
 * Generators, operators and render passes self-register from their own
 * modules. The engine only ever talks to these registries, so new modules
 * plug in without touching the core.
 *
 * Registration validates the definition contract immediately: a broken stage
 * fails at load time with the offending id and field instead of failing later
 * inside the render loop.
 */

import { TYPE } from './schema.js';

const PARAM_TYPES = new Set(Object.values(TYPE));

export class Registry {
  constructor(kind) {
    this.kind = kind;
    this.map = new Map();
  }

  register(definition) {
    validateDefinition(this.kind, definition);
    if (this.map.has(definition.id)) {
      throw new Error(`${this.kind}: duplicate id "${definition.id}"`);
    }
    const normalized = this.kind === 'operator'
      ? { space: 'view', accepts: ['curve2d'], produces: ['curve2d'], ...definition }
      : definition;
    this.map.set(normalized.id, Object.freeze(normalized));
    return normalized;
  }

  get(id) {
    const def = this.map.get(id);
    if (!def) throw new Error(`${this.kind}: unknown id "${id}"`);
    return def;
  }

  has(id) {
    return this.map.has(id);
  }

  list() {
    return [...this.map.values()];
  }

  ids() {
    return [...this.map.keys()];
  }
}

function validateDefinition(kind, definition) {
  if (!definition || typeof definition !== 'object') {
    throw new Error(`${kind}: definition must be an object`);
  }
  const id = validateId(kind, definition.id);
  const label = `${kind} "${id}"`;
  if (typeof definition.name !== 'string' || !definition.name.trim()) {
    throw new Error(`${label}: missing name`);
  }

  if (kind === 'generator' || kind === 'operator') {
    if (typeof definition.category !== 'string' || !definition.category.trim()) {
      throw new Error(`${label}: missing category`);
    }
    validateParams(label, definition.params);
    if (kind === 'generator' && typeof definition.sample !== 'function' && typeof definition.generate !== 'function') {
      throw new Error(`${label}: missing sample(params, ctx) or generate(params, ctx)`);
    }
    if (kind === 'generator' && definition.sample !== undefined && typeof definition.sample !== 'function') {
      throw new Error(`${label}: sample must be a function`);
    }
    if (kind === 'generator' && definition.generate !== undefined && typeof definition.generate !== 'function') {
      throw new Error(`${label}: generate must be a function`);
    }
    if (kind === 'generator' && definition.domain !== undefined && typeof definition.domain !== 'function') {
      throw new Error(`${label}: domain must be a function`);
    }
    if (kind === 'operator' && typeof definition.apply !== 'function') {
      throw new Error(`${label}: missing apply(curves, params, ctx)`);
    }
    if (kind === 'operator') validateOperatorSpace(label, definition);
    validateCapabilities(label, definition.capabilities);
    validateHooks(label, definition);
  }

  if (kind === 'render-pass' && typeof definition.draw !== 'function') {
    throw new Error(`${label}: missing draw(p, data)`);
  }
  if (kind === 'render-pass' && definition.appliesTo !== undefined && typeof definition.appliesTo !== 'function') {
    throw new Error(`${label}: appliesTo must be a function`);
  }
  if (kind === 'render-pass' && definition.group !== undefined && typeof definition.group !== 'string') {
    throw new Error(`${label}: group must be a string`);
  }
  if (kind === 'render-pass' && definition.description !== undefined && typeof definition.description !== 'string') {
    throw new Error(`${label}: description must be a string`);
  }
}

function validateId(kind, value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${kind}: definition needs an id`);
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error(`${kind} "${value}": id must be lowercase kebab-case`);
  }
  return value;
}

function validateParams(label, params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error(`${label}: params must be an object`);
  }
  for (const [key, schema] of Object.entries(params)) {
    if (!schema || typeof schema !== 'object') {
      throw new Error(`${label}: param "${key}" must be a schema object`);
    }
    if (!PARAM_TYPES.has(schema.type)) {
      throw new Error(`${label}: param "${key}" has unknown type "${schema.type}"`);
    }
    if (schema.type === TYPE.SELECT) {
      if (!Array.isArray(schema.options) || !schema.options.length) {
        throw new Error(`${label}: select param "${key}" needs non-empty options`);
      }
      if (!schema.options.includes(schema.default)) {
        throw new Error(`${label}: select param "${key}" default is not an option`);
      }
    }
    if (schema.type === TYPE.EXPRESSION || schema.type === TYPE.SOURCE) {
      if (typeof schema.default !== 'string') {
        throw new Error(`${label}: ${schema.type} param "${key}" needs a string default`);
      }
    }
    if (schema.advanced !== undefined && typeof schema.advanced !== 'boolean') {
      throw new Error(`${label}: param "${key}" advanced must be boolean`);
    }
  }
}

function validateOperatorSpace(label, definition) {
  if (definition.space !== undefined && !['world', 'view'].includes(definition.space)) {
    throw new Error(`${label}: space must be "world" or "view"`);
  }
  for (const key of ['accepts', 'produces']) {
    if (definition[key] !== undefined) {
      if (!Array.isArray(definition[key]) || !definition[key].length) {
        throw new Error(`${label}: ${key} must be a non-empty array`);
      }
      for (const kind of definition[key]) {
        if (!['curve2d', 'curve3d', 'surface', 'mesh', 'solid'].includes(kind)) {
          throw new Error(`${label}: ${key} has unknown geometry kind "${kind}"`);
        }
      }
    }
  }
}

function validateCapabilities(label, capabilities) {
  if (capabilities === undefined) return;
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
    throw new Error(`${label}: capabilities must be an object`);
  }
  if (capabilities.spatial !== undefined && typeof capabilities.spatial !== 'boolean') {
    throw new Error(`${label}: capabilities.spatial must be boolean`);
  }
  if (capabilities.projection !== undefined && typeof capabilities.projection !== 'string') {
    throw new Error(`${label}: capabilities.projection must be a string`);
  }
  if (capabilities.geometryKind !== undefined && !['curve2d', 'curve3d', 'surface', 'mesh', 'solid'].includes(capabilities.geometryKind)) {
    throw new Error(`${label}: capabilities.geometryKind is not a known geometry kind`);
  }
}

function validateHooks(label, definition) {
  const hookNames = ['previewParams', 'syncParams', 'onExpressionChange', 'migrateParams'];
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

export const Generators = new Registry('generator');
export const Operators = new Registry('operator');
export const RenderPasses = new Registry('render-pass');
