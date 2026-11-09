/**
 * composition/createPresetPort.js — the narrow application surface used by the
 * preset browser and preset save/delete controls.
 */

export const PRESET_PORT = Object.freeze([
  'applyPreset',
  'controls',
  'document',
  'notify',
  'openImportDialog',
  'presets',
]);

export function createPresetPort(app) {
  return {
    applyPreset: (...args) => app.applyPreset(...args),
    get controls() { return app.controls; },
    get document() { return app.document; },
    notify: (message, kind) => app.notify(message, kind),
    openImportDialog: () => app.openImportDialog(),
    get presets() { return app.presets; },
  };
}
