/** Narrow surface used by Analysis, Explore and Evolution panels. */

import type { App } from '../application/App.ts';
import { bindCall, bindMethod } from './portUtils.ts';
import type { PortRecord } from './portUtils.ts';

export const LAB_PORT = Object.freeze([
  'adoptCandidate', 'analyzeFigure', 'controls', 'document', 'exploreSeed',
  'notebook', 'saveCheckpoint',
]);

export function createLabPort(app: App): PortRecord {
  return {
    adoptCandidate: bindMethod(app, 'adoptCandidate'),
    analyzeFigure: bindCall(app, 'analyzeFigure'),
    get controls() { return app.controls; },
    get document() { return app.document; },
    get exploreSeed() { return app.exploreSeed; },
    set exploreSeed(value: unknown) { app.exploreSeed = Number(value) || 1; },
    get notebook() { return app.notebook; },
    saveCheckpoint: bindMethod(app, 'saveCheckpoint'),
  };
}
