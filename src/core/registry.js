/**
 * registry.js — pluggable stage registries (spec G3).
 *
 * Generators, operators and render passes self-register from their own
 * modules. The engine only ever talks to these registries, so new
 * modules plug in without touching the core.
 */

export class Registry {
  constructor(kind) {
    this.kind = kind;
    this.map = new Map();
  }

  register(definition) {
    if (!definition?.id) throw new Error(`${this.kind}: definition needs an id`);
    if (this.map.has(definition.id)) {
      throw new Error(`${this.kind}: duplicate id "${definition.id}"`);
    }
    this.map.set(definition.id, Object.freeze(definition));
    return definition;
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

export const Generators = new Registry('generator');
export const Operators = new Registry('operator');
export const RenderPasses = new Registry('render-pass');
