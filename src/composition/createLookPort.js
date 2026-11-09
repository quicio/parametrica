/** composition/createLookPort.js — narrow surface for Look sections. */
export const LOOK_PORT = Object.freeze([
  'activeLayer', 'activeLayerLocked', 'applyLookPreset', 'dialogs', 'document',
  'evaluation', 'isParametricsVisible', 'isSeamsVisible',
  'isSurfaceInspectorEnabled', 'isUVDomainVisible', 'lookStore', 'notify',
  'rebuild', 'resetCamera', 'saveUserLook', 'setParametricsVisible',
  'setSeamsVisible', 'setSurfaceInspectorEnabled', 'setUVDomainVisible',
]);
export function createLookPort(app) {
  const port = {
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
  ]) port[name] = (...args) => app[name](...args);
  return port;
}
