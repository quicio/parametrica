/** Explicit surface the UI may use. */

import type { App } from '../application/App.ts';
import type { PortMethod, PortRecord } from './portUtils.ts';

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

export function createUiPort(app: App): PortRecord {
  const allowed = new Set<string>(UI_SURFACE);
  const bound = new Map<string, PortMethod>();
  return new Proxy({} as PortRecord, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (!allowed.has(prop)) {
        throw new Error(`UI port does not expose "${prop}"`);
      }
      const value = (app as unknown as PortRecord)[prop];
      if (typeof value !== 'function') return value;
      if (!bound.has(prop)) bound.set(prop, (value as PortMethod).bind(app));
      return bound.get(prop);
    },
    set(_target, prop, value) {
      if (typeof prop !== 'string' || !allowed.has(prop)) {
        throw new Error(`UI port cannot set "${String(prop)}"`);
      }
      (app as unknown as PortRecord)[prop] = value;
      return true;
    },
    has(_target, prop) {
      return typeof prop === 'string' && allowed.has(prop);
    },
  });
}
