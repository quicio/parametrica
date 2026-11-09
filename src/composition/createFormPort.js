/** composition/createFormPort.js — narrow surface for Form sections. */
export const FORM_PORT = Object.freeze([
  'activeLayer', 'activeLayerIsInstance', 'activeLayerLocked', 'addInstanceLayer',
  'addLayer', 'addOperator', 'controls', 'document', 'duplicateLayer', 'moveLayer',
  'moveOperator', 'newDocument', 'rebuild', 'removeLayer', 'removeOperator',
  'setActiveLayer', 'setGenerator', 'setInstanceSource', 'setLayerLocked',
  'setLayerVisible', 'setOperatorEnabled',
]);
export function createFormPort(app) {
  const port = {
    get activeLayer() { return app.activeLayer; },
    activeLayerIsInstance: (...args) => app.activeLayerIsInstance(...args),
    get activeLayerLocked() { return app.activeLayerLocked; },
    get controls() { return app.controls; },
    get document() { return app.document; },
  };
  for (const name of [
    'addInstanceLayer', 'addLayer', 'addOperator', 'duplicateLayer', 'moveLayer',
    'moveOperator', 'newDocument', 'rebuild', 'removeLayer', 'removeOperator',
    'setActiveLayer', 'setGenerator', 'setInstanceSource', 'setLayerLocked',
    'setLayerVisible', 'setOperatorEnabled',
  ]) port[name] = (...args) => app[name](...args);
  return port;
}
