/** Narrow surface for Form sections. */

import type { App } from '../application/App.ts';
import { bindCall, bindMethod } from './portUtils.ts';
import type { PortRecord } from './portUtils.ts';

export const FORM_PORT = Object.freeze([
  'activeLayer', 'activeLayerIsInstance', 'activeLayerLocked', 'addInstanceLayer',
  'addLayer', 'addOperator', 'controls', 'document', 'duplicateLayer', 'moveLayer',
  'moveOperator', 'newDocument', 'rebuild', 'removeLayer', 'removeOperator',
  'setActiveLayer', 'setGenerator', 'setInstanceSource', 'setLayerLocked',
  'setLayerVisible', 'setOperatorEnabled',
]);

export function createFormPort(app: App): PortRecord {
  const port: PortRecord = {
    get activeLayer() { return app.activeLayer; },
    activeLayerIsInstance: bindMethod(app, 'activeLayerIsInstance'),
    get activeLayerLocked() { return app.activeLayerLocked; },
    get controls() { return app.controls; },
    get document() { return app.document; },
  };
  for (const name of [
    'addInstanceLayer', 'addLayer', 'addOperator', 'duplicateLayer', 'moveLayer',
    'moveOperator', 'newDocument', 'rebuild', 'removeLayer', 'removeOperator',
    'setActiveLayer', 'setGenerator', 'setInstanceSource', 'setLayerLocked',
    'setLayerVisible', 'setOperatorEnabled',
  ]) port[name] = bindCall(app, name);
  return port;
}
