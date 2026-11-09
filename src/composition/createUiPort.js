/**
 * composition/createUiPort.js — the explicit surface the UI may use.
 *
 * This is a transitional controller port, not the final view-model split. It
 * removes the UI's runtime dependency on the concrete App object and makes any
 * new UI→application dependency a deliberate edit to this list.
 */

export const UI_SURFACE = Object.freeze([
  'activeLayer',
  'applyUserLook',
  'deleteUserLook',
  'dialogs',
  'document',
  'evaluation',
  'isParametricsVisible',
  'isSeamsVisible',
  'isSurfaceInspectorEnabled',
  'isUVDomainVisible',
  'lookPresetState',
  'lookStore',
  'productPreviewActive',
  'rebuild',
  'renameLayer',
  'setActiveLayer',
  'setFabricationPreview',
  'setLayerVisible',
  'syncProductPreview',
]);

export function createUiPort(app) {
  const allowed = new Set(UI_SURFACE);
  const bound = new Map();
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (!allowed.has(prop)) {
        throw new Error(`UI port does not expose "${prop}"`);
      }
      const value = app[prop];
      if (typeof value !== 'function') return value;
      if (!bound.has(prop)) bound.set(prop, value.bind(app));
      return bound.get(prop);
    },
    set(_target, prop, value) {
      if (typeof prop !== 'string' || !allowed.has(prop)) {
        throw new Error(`UI port cannot set "${String(prop)}"`);
      }
      app[prop] = value;
      return true;
    },
    has(_target, prop) {
      return typeof prop === 'string' && allowed.has(prop);
    },
  });
}
