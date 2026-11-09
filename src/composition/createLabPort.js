/**
 * composition/createLabPort.js — the narrow application surface used by the
 * Analysis, Explore and Evolution panels.
 */

export const LAB_PORT = Object.freeze([
  'adoptCandidate',
  'analyzeFigure',
  'controls',
  'document',
  'exploreSeed',
  'notebook',
  'saveCheckpoint',
]);

export function createLabPort(app) {
  return {
    adoptCandidate: (...args) => app.adoptCandidate(...args),
    analyzeFigure: (...args) => app.analyzeFigure(...args),
    get controls() { return app.controls; },
    get document() { return app.document; },
    get exploreSeed() { return app.exploreSeed; },
    set exploreSeed(value) { app.exploreSeed = value; },
    get notebook() { return app.notebook; },
    saveCheckpoint: (...args) => app.saveCheckpoint(...args),
  };
}
