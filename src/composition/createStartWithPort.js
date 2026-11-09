/** composition/createStartWithPort.js — narrow surface for Start With. */
export const START_WITH_PORT = Object.freeze([
  'dialogs', 'setStartWithChoice', 'startWithPreview',
]);
export function createStartWithPort(app) {
  return {
    get dialogs() { return app.dialogs; },
    setStartWithChoice: (...args) => app.setStartWithChoice(...args),
    startWithPreview: (...args) => app.startWithPreview(...args),
  };
}
