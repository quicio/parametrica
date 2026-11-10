/**
 * ui/params/ParamRegistry.js — parameter type registry.
 *
 * A parameter type owns its sanitation-facing UI behavior: whether it has a
 * lil-gui control, whether it can be time-modulated, and how its control is
 * bound. Adding color, vector or file parameters means registering a type,
 * not editing Controls or OperatorStack.
 */

import { TYPE } from '../../core/schema.ts';

const types = new Map();

export const ParamTypes = {
  register(definition) {
    if (!definition?.id) throw new Error('ParamTypes: definition needs an id');
    if (types.has(definition.id)) throw new Error(`ParamTypes: duplicate id "${definition.id}"`);
    types.set(definition.id, Object.freeze(definition));
    return definition;
  },
  get(id) {
    return types.get(id) ?? null;
  },
  has(id) {
    return types.has(id);
  },
  list() {
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
    const ctrl = gui.add(stage.params, key, schema.options)
      .name(schema.label ?? key)
      .onChange(() => rebuild(key));
    attachDoc(ctrl, schema);
    return ctrl;
  },
});

for (const id of [TYPE.EXPRESSION, TYPE.SOURCE, TYPE.HARMONICS]) {
  ParamTypes.register({ id, bindable: false, modulatable: false, custom: true });
}

export function bindParamType(context) {
  const type = ParamTypes.get(context.schema?.type);
  if (!type?.bind) return null;
  return type.bind(context);
}

export function isBindable(schema) {
  return ParamTypes.get(schema?.type)?.bindable === true;
}

export function isModulatable(schema) {
  return ParamTypes.get(schema?.type)?.modulatable === true;
}

export function isExpression(schema) {
  return schema?.type === TYPE.EXPRESSION || schema?.type === TYPE.SOURCE;
}

function attachDoc(controller, schema) {
  if (!controller?.domElement || !schema?.doc) return;
  controller.domElement.title = schema.doc;
  controller.domElement.setAttribute('aria-description', schema.doc);
}

/**
 * lil-gui clamps typed values to the slider's min/max. Some parameters
 * intentionally have a narrow slider for precision but accept larger typed
 * values, so widen only the clamping step while leaving the slider untouched.
 */
export function applyHardBounds(controller, schema) {
  if (schema?.snap === false) {
    controller._snap = (value) => value;
  }
  const lo = typeof schema?.hardMin === 'number' ? schema.hardMin : null;
  const hi = typeof schema?.hardMax === 'number' ? schema.hardMax : null;
  if (lo === null && hi === null) return;
  controller._clamp = (value) => {
    let v = Number(value);
    if (!Number.isFinite(v)) return v;
    if (lo !== null) v = Math.max(lo, v);
    if (hi !== null) v = Math.min(hi, v);
    return v;
  };
}
