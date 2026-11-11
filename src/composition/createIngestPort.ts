/** Narrow surface for the Image panel. */

import type { App } from '../application/App.ts';
import { bindMethod } from './portUtils.ts';
import type { PortRecord } from './portUtils.ts';

export const INGEST_PORT = Object.freeze([
  'adoptDocument', 'imageInput', 'imageUnderlay', 'notify',
]);

export function createIngestPort(app: App): PortRecord {
  return {
    adoptDocument: bindMethod(app, 'adoptDocument'),
    get imageInput() { return app.imageInput; },
    set imageInput(value: unknown) { app.imageInput = value as App['imageInput']; },
    get imageUnderlay() { return app.imageUnderlay; },
    set imageUnderlay(value: unknown) { app.imageUnderlay = value as App['imageUnderlay']; },
    notify: (message: unknown, kind: unknown) => app.notify(String(message), kind as string | undefined),
  };
}
