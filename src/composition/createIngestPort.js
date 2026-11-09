/** composition/createIngestPort.js — narrow surface for the Image panel. */
export const INGEST_PORT = Object.freeze([
  'adoptDocument', 'imageInput', 'imageUnderlay', 'notify',
]);
export function createIngestPort(app) {
  return {
    adoptDocument: (...args) => app.adoptDocument(...args),
    get imageInput() { return app.imageInput; },
    set imageInput(value) { app.imageInput = value; },
    get imageUnderlay() { return app.imageUnderlay; },
    set imageUnderlay(value) { app.imageUnderlay = value; },
    notify: (message, kind) => app.notify(message, kind),
  };
}
