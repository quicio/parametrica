/**
 * composition/createRenderPort.js — the narrow renderer surface used by UI
 * panels that need a frame or coordinate-pin operation.
 */

export const RENDER_PORT = Object.freeze([
  'renderNow',
  'artboardDataURL',
  'currentCoordinateReadout',
  'setCoordinatePin',
  'clearCoordinatePin',
  'coordinatePinReadout',
  'thumbnailDataURL',
  'quadActive',
]);

export function createRenderPort(app) {
  return {
    renderNow: () => app.renderer?.renderNow?.(),
    artboardDataURL: () => app.renderer?.artboardDataURL?.() ?? null,
    currentCoordinateReadout: () => app.renderer?.currentCoordinateReadout?.() ?? null,
    setCoordinatePin: (readout) => app.renderer?.setCoordinatePin?.(readout) ?? false,
    clearCoordinatePin: () => app.renderer?.clearCoordinatePin?.(),
    coordinatePinReadout: () => app.renderer?.coordinatePinReadout?.() ?? null,
    thumbnailDataURL: (width, timeout) => app.renderer?.thumbnailDataURL?.(width, timeout) ?? null,
    get quadActive() { return app.renderer?.quadActive; },
  };
}
