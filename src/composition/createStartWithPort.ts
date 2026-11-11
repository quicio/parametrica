/** Narrow surface for Start With. */

import type { App } from '../application/App.ts';
import { bindCall, bindMethod } from './portUtils.ts';
import type { PortRecord } from './portUtils.ts';

export const START_WITH_PORT = Object.freeze([
  'dialogs', 'setStartWithChoice', 'startWithPreview',
]);

export function createStartWithPort(app: App): PortRecord {
  return {
    get dialogs() { return app.dialogs; },
    setStartWithChoice: bindMethod(app, 'setStartWithChoice'),
    startWithPreview: bindMethod(app, 'startWithPreview'),
  };
}
