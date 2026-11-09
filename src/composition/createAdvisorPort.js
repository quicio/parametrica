/** composition/createAdvisorPort.js — narrow surface for the Advisor panel. */
export const ADVISOR_PORT = Object.freeze([
  'analyzeFigure', 'applySuggestion', 'document', 'evaluation', 'notebook',
  'suggestCandidate',
]);
export function createAdvisorPort(app) {
  const port = {
    get document() { return app.document; },
    get evaluation() { return app.evaluation; },
    get notebook() { return app.notebook; },
  };
  for (const name of [
    'analyzeFigure', 'applySuggestion', 'suggestCandidate',
  ]) port[name] = (...args) => app[name](...args);
  return port;
}
