/** Narrow application surface used by the Fabricate panel. */

import type { App } from '../application/App.ts';
import { bindCall, bindMethod } from './portUtils.ts';
import type { PortRecord } from './portUtils.ts';

export const FABRICATION_PORT = Object.freeze([
  'document',
  'exporter',
  'rebuild',
  'scheduleSessionSave',
  'setProductPreviewEnabled',
  'syncProductPreview',
]);

export function createFabricationPort(app: App): PortRecord {
  return {
    get document() { return app.document; },
    get exporter() { return app.exporter; },
    rebuild: bindMethod(app, 'rebuild'),
    scheduleSessionSave: () => app.scheduleSessionSave(),
    setProductPreviewEnabled: (enabled: unknown) => app.setProductPreviewEnabled(enabled as boolean),
    syncProductPreview: () => app.syncProductPreview(),
  };
}
