/**
 * composition/createNotebookPort.js — the narrow application surface used by
 * the Notebook panel.
 */

export const NOTEBOOK_PORT = Object.freeze([
  'controls',
  'dialogs',
  'document',
  'importNotebook',
  'notebook',
  'notebookWorkspace',
  'restoreCheckpoint',
  'saveCheckpoint',
]);

export function createNotebookPort(app) {
  return {
    get controls() { return app.controls; },
    get dialogs() { return app.dialogs; },
    get document() { return app.document; },
    importNotebook: (...args) => app.importNotebook(...args),
    get notebook() { return app.notebook; },
    get notebookWorkspace() { return app.notebookWorkspace; },
    restoreCheckpoint: (...args) => app.restoreCheckpoint(...args),
    saveCheckpoint: (...args) => app.saveCheckpoint(...args),
  };
}
