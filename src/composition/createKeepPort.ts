/** Narrow surface for Keep/Timeline/Mutation. */

import type { App } from '../application/App.ts';
import { bindCall, bindMethod } from './portUtils.ts';
import type { PortRecord } from './portUtils.ts';

export const KEEP_PORT = Object.freeze([
  'activeLayer', 'activeLayerIsInstance', 'activeLayerLocked', 'document',
  'exporter', 'mutate', 'notify', 'rebuild', 'redo', 'rerollSeed', 'resetTime',
  'setSeed', 'setTime', 'timelineRecorder', 'undo',
]);

export function createKeepPort(app: App): PortRecord {
  const port: PortRecord = {
    get activeLayer() { return app.activeLayer; },
    activeLayerIsInstance: bindMethod(app, 'activeLayerIsInstance'),
    get activeLayerLocked() { return app.activeLayerLocked; },
    get document() { return app.document; },
    get exporter() { return app.exporter; },
    get timelineRecorder() { return app.timelineRecorder; },
    set timelineRecorder(value: unknown) { app.timelineRecorder = value as App['timelineRecorder']; },
  };
  for (const name of [
    'mutate', 'notify', 'rebuild', 'redo', 'rerollSeed', 'resetTime', 'setSeed',
    'setTime', 'undo',
  ]) port[name] = bindCall(app, name);
  return port;
}
