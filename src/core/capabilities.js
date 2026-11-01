/**
 * core/capabilities.js — declarative generator capabilities.
 *
 * Capabilities replace generator-id checks in core and shared UI. They are
 * intentionally coarse: they describe what a stage can do, never how its
 * mathematics works.
 */

export const DEFAULT_CAPABILITIES = Object.freeze({
  spatial: false,
  projection: '3d',
  supportsFit: false,
  supportsClosed: false,
  supportsAnimation: true,
});

export function capabilitiesOf(definition) {
  return { ...DEFAULT_CAPABILITIES, ...(definition?.capabilities ?? {}) };
}

export function supportsSpatial(definition) {
  return capabilitiesOf(definition).spatial === true;
}

export function supportsProjection(definition) {
  return supportsSpatial(definition);
}
