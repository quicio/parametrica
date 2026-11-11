/** Narrow renderer surface used by UI panels. */

import type { App } from '../application/App.ts';
import type { PortRecord } from './portUtils.ts';

export const RENDER_PORT = Object.freeze([
  'renderNow', 'artboardDataURL', 'currentCoordinateReadout', 'setCoordinatePin',
  'clearCoordinatePin', 'coordinatePinReadout', 'thumbnailDataURL', 'quadActive',
]);

export function createRenderPort(app: App): PortRecord {
  return {
    renderNow: () => app.renderer?.renderNow?.() ?? null,
    artboardDataURL: () => app.renderer?.artboardDataURL?.() ?? null,
    currentCoordinateReadout: () => app.renderer?.currentCoordinateReadout?.() ?? null,
    setCoordinatePin: (readout: unknown) => app.renderer?.setCoordinatePin?.(readout) ?? false,
    clearCoordinatePin: () => app.renderer?.clearCoordinatePin?.(),
    coordinatePinReadout: () => app.renderer?.coordinatePinReadout?.() ?? null,
    thumbnailDataURL: (width: unknown, timeout: unknown) => app.renderer?.thumbnailDataURL?.(width as number, timeout as number) ?? null,
    get quadActive() { return app.renderer?.quadActive; },
  };
}
