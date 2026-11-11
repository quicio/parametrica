/** Narrow surface for Look sections. */

import type { App } from '../application/App.ts';
import { bindCall } from './portUtils.ts';
import type { PortRecord } from './portUtils.ts';

export const LOOK_PORT = Object.freeze([
  'activeLayer', 'activeLayerLocked', 'applyLookPreset', 'dialogs', 'document',
  'evaluation', 'isParametricsVisible', 'isSeamsVisible',
  'isSurfaceInspectorEnabled', 'isUVDomainVisible', 'lookStore', 'notify',
  'rebuild', 'resetCamera', 'saveUserLook', 'setParametricsVisible',
  'setSeamsVisible', 'setSurfaceInspectorEnabled', 'setUVDomainVisible',
]);

export function createLookPort(app: App): PortRecord {
  const port: PortRecord = {
    get activeLayer() { return app.activeLayer; },
    get activeLayerLocked() { return app.activeLayerLocked; },
    get dialogs() { return app.dialogs; },
    get document() { return app.document; },
    get evaluation() { return app.evaluation; },
    get lookStore() { return app.lookStore; },
  };
  for (const name of [
    'applyLookPreset', 'isParametricsVisible', 'isSeamsVisible',
    'isSurfaceInspectorEnabled', 'isUVDomainVisible', 'notify', 'rebuild',
    'resetCamera', 'saveUserLook', 'setParametricsVisible', 'setSeamsVisible',
    'setSurfaceInspectorEnabled', 'setUVDomainVisible',
  ]) port[name] = bindCall(app, name);
  return port;
}
