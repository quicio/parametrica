/** Narrow surface used by the preset browser. */

import type { App } from '../application/App.ts';
import { bindMethod } from './portUtils.ts';
import type { PortRecord } from './portUtils.ts';

export const PRESET_PORT = Object.freeze([
  'applyPreset', 'controls', 'document', 'notify', 'openImportDialog', 'presets',
]);

export function createPresetPort(app: App): PortRecord {
  return {
    applyPreset: bindMethod(app, 'applyPreset'),
    get controls() { return app.controls; },
    get document() { return app.document; },
    notify: (message: unknown, kind: unknown) => app.notify(String(message), kind as string | undefined),
    openImportDialog: () => app.openImportDialog(),
    get presets() { return app.presets; },
  };
}
