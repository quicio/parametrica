/** composition/createKeepPort.js — narrow surface for Keep/Timeline/Mutation. */
export const KEEP_PORT = Object.freeze([
  'activeLayer', 'activeLayerIsInstance', 'activeLayerLocked', 'document',
  'exporter', 'mutate', 'notify', 'rebuild', 'redo', 'rerollSeed', 'resetTime',
  'setSeed', 'setTime', 'timelineRecorder', 'undo',
]);
export function createKeepPort(app) {
  const port = {
    get activeLayer() { return app.activeLayer; },
    activeLayerIsInstance: (...args) => app.activeLayerIsInstance(...args),
    get activeLayerLocked() { return app.activeLayerLocked; },
    get document() { return app.document; },
    get exporter() { return app.exporter; },
    get timelineRecorder() { return app.timelineRecorder; },
    set timelineRecorder(value) { app.timelineRecorder = value; },
  };
  for (const name of [
    'mutate', 'notify', 'rebuild', 'redo', 'rerollSeed', 'resetTime', 'setSeed',
    'setTime', 'undo',
  ]) port[name] = (...args) => app[name](...args);
  return port;
}
