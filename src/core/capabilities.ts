/** Declarative generator capabilities. */

export interface Capabilities {
  spatial: boolean;
  projection: string;
  supportsFit: boolean;
  supportsClosed: boolean;
  supportsAnimation: boolean;
  geometryKind?: string;
  [key: string]: unknown;
}
export interface CapabilityDefinition {
  capabilities?: Partial<Capabilities>;
  [key: string]: unknown;
}

export const DEFAULT_CAPABILITIES: Readonly<Capabilities> = Object.freeze({
  spatial: false,
  projection: '3d',
  supportsFit: false,
  supportsClosed: false,
  supportsAnimation: true,
});

export function capabilitiesOf(definition: CapabilityDefinition | null | undefined): Capabilities {
  return { ...DEFAULT_CAPABILITIES, ...(definition?.capabilities ?? {}) };
}

export function supportsSpatial(definition: CapabilityDefinition | null | undefined): boolean {
  return capabilitiesOf(definition).spatial === true;
}

export function supportsProjection(definition: CapabilityDefinition | null | undefined): boolean {
  return supportsSpatial(definition);
}
