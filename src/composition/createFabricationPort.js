/**
 * composition/createFabricationPort.js — the narrow application surface used
 * by the Fabricate panel.
 *
 * The panel owns UI state; it does not need the whole App object.
 */

export const FABRICATION_PORT = Object.freeze([
  'document',
  'exporter',
  'rebuild',
  'scheduleSessionSave',
  'setProductPreviewEnabled',
  'syncProductPreview',
]);

export function createFabricationPort(app) {
  return {
    get document() { return app.document; },
    get exporter() { return app.exporter; },
    rebuild: (...args) => app.rebuild(...args),
    scheduleSessionSave: () => app.scheduleSessionSave(),
    setProductPreviewEnabled: (enabled) => app.setProductPreviewEnabled(enabled),
    syncProductPreview: () => app.syncProductPreview(),
  };
}
