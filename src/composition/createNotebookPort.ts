/** Narrow surface used by the Notebook panel. */

import type { App } from '../application/App.ts';
import { bindCall, bindMethod } from './portUtils.ts';
import type { PortRecord } from './portUtils.ts';

export const NOTEBOOK_PORT = Object.freeze([
  'controls', 'dialogs', 'document', 'importNotebook', 'notebook',
  'notebookWorkspace', 'restoreCheckpoint', 'saveCheckpoint',
]);

export function createNotebookPort(app: App): PortRecord {
  return {
    get controls() { return app.controls; },
    get dialogs() { return app.dialogs; },
    get document() { return app.document; },
    importNotebook: bindMethod(app, 'importNotebook'),
    get notebook() { return app.notebook; },
    get notebookWorkspace() { return app.notebookWorkspace; },
    restoreCheckpoint: bindMethod(app, 'restoreCheckpoint'),
    saveCheckpoint: bindCall(app, 'saveCheckpoint'),
  };
}
