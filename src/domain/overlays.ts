/** Overlay ids and labels. Pure data; rendering lives in viz/overlays.js. */

export interface OverlayDefinition {
  id: string;
  name: string;
}

export const OVERLAYS: readonly OverlayDefinition[] = Object.freeze([
  { id: 'inflections', name: 'Inflection Points' },
  { id: 'samplePoints', name: 'Sampled Points' },
  { id: 'ruler', name: 'Arc-Length Ruler' },
  { id: 'bbox', name: 'Bounding Box' },
]);
