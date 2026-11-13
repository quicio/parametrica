/**
 * ui/params/ParamRegistry.ts — parameter type registry.
 *
 * A parameter type owns its sanitation-facing UI behavior: whether it has a
 * lil-gui control, whether it can be time-modulated, and how its control is
 * bound. Adding color, vector or file parameters means registering a type,
 * not editing Controls or OperatorStack.
 */

import { TYPE } from '../../core/schema.ts';
import type { SchemaEntry } from '../../core/schema.ts';
import type GUI from 'lil-gui';
import type { Controller } from 'lil-gui';

export interface StageLike {
  params: Record<string, unknown>;
  mods: Record<string, unknown>;
}

export interface BindContext {
  gui: GUI;
  key: string;
  schema: SchemaEntry;
  stage: StageLike;
  rebuild: (key: string) => void;
}

export interface ParamDefinition {
  id: string;
  bindable?: boolean;
  modulatable?: boolean;
  custom?: boolean;
  bind?: (context: BindContext) => Controller;
}

const types = new Map<string, ParamDefinition>();

export const ParamTypes = {
  register(definition: ParamDefinition): ParamDefinition {
    if (!definition?.id) throw new Error('ParamTypes: definition needs an id');
    if (types.has(definition.id)) throw new Error(`ParamTypes: duplicate id "${definition.id}"`);
    types.set(definition.id, Object.freeze(definition));
    return definition;
  },
  get(id: string | undefined): ParamDefinition | null {
    if (id === undefined) return null;
    return types.get(id) ?? null;
  },
  has(id: string): boolean {
    return types.has(id);
  },
  list(): ParamDefinition[] {
    return [...types.values()];
  },
};

ParamTypes.register({
  id: TYPE.NUMBER,
  bindable: true,
  modulatable: true,
  bind({ gui, key, schema, stage, rebuild }) {
    const ctrl = gui.add(stage.params, key, schema.min, schema.max, schema.step)
      .name(schema.label ?? key)
      .onChange(() => rebuild(key));
    attachDoc(ctrl, schema);
    applyHardBounds(ctrl, schema);
    return ctrl;
  },
});

ParamTypes.register({
  id: TYPE.BOOLEAN,
  bindable: true,
  modulatable: false,
  bind({ gui, key, schema, stage, rebuild }) {
    const ctrl = gui.add(stage.params, key)
      .name(schema.label ?? key)
      .onChange(() => rebuild(key));
    attachDoc(ctrl, schema);
    return ctrl;
  },
});

ParamTypes.register({
  id: TYPE.SELECT,
  bindable: true,
  modulatable: false,
  bind({ gui, key, schema, stage, rebuild }) {
    const ctrl = gui.add(stage.params, key, schema.options as unknown[])
      .name(schema.label ?? key)
      .onChange(() => rebuild(key));
    attachDoc(ctrl, schema);
    return ctrl;
  },
});

for (const id of [TYPE.EXPRESSION, TYPE.SOURCE, TYPE.HARMONICS]) {
  ParamTypes.register({ id, bindable: false, modulatable: false, custom: true });
}

export function bindParamType(context: BindContext): Controller | null {
  const type = ParamTypes.get(context.schema?.type as string | undefined);
  if (!type?.bind) return null;
  return type.bind(context);
}

export function isBindable(schema: SchemaEntry | null | undefined): boolean {
  return ParamTypes.get(schema?.type as string | undefined)?.bindable === true;
}

export function isModulatable(schema: SchemaEntry | null | undefined): boolean {
  return ParamTypes.get(schema?.type as string | undefined)?.modulatable === true;
}

export function isExpression(schema: SchemaEntry | null | undefined): boolean {
  return schema?.type === TYPE.EXPRESSION || schema?.type === TYPE.SOURCE;
}

function attachDoc(controller: Controller, schema: SchemaEntry): void {
  if (!controller?.domElement || !schema?.doc) return;
  controller.domElement.title = schema.doc;
  controller.domElement.setAttribute('aria-description', schema.doc);
}

/**
 * lil-gui clamps typed values to the slider's min/max. Some parameters
 * intentionally have a narrow slider for precision but accept larger typed
 * values, so widen only the clamping step while leaving the slider untouched.
 */
type MutableController = Controller & {
  _snap?: (value: number) => number;
  _clamp?: (value: unknown) => number;
};

export function applyHardBounds(controller: MutableController, schema: SchemaEntry): void {
  if (schema?.snap === false) {
    controller._snap = (value: number): number => value;
  }
  const lo = typeof schema?.hardMin === 'number' ? schema.hardMin : null;
  const hi = typeof schema?.hardMax === 'number' ? schema.hardMax : null;
  if (lo === null && hi === null) return;
  controller._clamp = (value: unknown): number => {
    let v = Number(value);
    if (!Number.isFinite(v)) return v;
    if (lo !== null) v = Math.max(lo, v);
    if (hi !== null) v = Math.min(hi, v);
    return v;
  };
}
