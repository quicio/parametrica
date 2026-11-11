/** Narrow surface for the Advisor panel. */

import type { App } from '../application/App.ts';
import { bindCall } from './portUtils.ts';
import type { PortRecord } from './portUtils.ts';

export const ADVISOR_PORT = Object.freeze([
  'analyzeFigure', 'applySuggestion', 'document', 'evaluation', 'notebook',
  'suggestCandidate',
]);

export function createAdvisorPort(app: App): PortRecord {
  const port: PortRecord = {
    get document() { return app.document; },
    get evaluation() { return app.evaluation; },
    get notebook() { return app.notebook; },
  };
  for (const name of ['analyzeFigure', 'applySuggestion', 'suggestCandidate']) {
    port[name] = bindCall(app, name);
  }
  return port;
}
