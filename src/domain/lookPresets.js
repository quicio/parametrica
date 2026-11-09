/**
 * render/lookPresets.js — named visual starting points for Look.
 *
 * Presets are view-level recipes: render passes, overlays, color metric and
 * guides. They never touch geometry, style, units, camera or fabrication.
 */

import { OVERLAYS } from '../domain/overlays.js';

export const LOOK_PRESETS = Object.freeze([
  {
    id: 'line',
    name: 'Line',
    description: 'Primary stroke only.',
    requires: null,
    modes: ['stroke'],
    overlays: {},
    colorMetric: 'auto',
    guides: true,
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Stroke, samples, tangents and normals.',
    requires: null,
    modes: ['stroke', 'points', 'tangents', 'normals'],
    overlays: { inflections: true, samplePoints: true, ruler: true, bbox: true },
    colorMetric: 'auto',
    guides: true,
  },
  {
    id: 'surface',
    name: 'Surface',
    description: 'Surface fill plus projected wireframe.',
    requires: 'surface',
    modes: ['stroke', 'surface-wireframe', 'surface-fill'],
    overlays: {},
    colorMetric: 'auto',
    guides: false,
  },
  {
    id: 'gradient',
    name: 'Gradient',
    description: 'Color ramp by height.',
    requires: null,
    modes: ['gradient-wireframe'],
    overlays: {},
    colorMetric: 'height',
    guides: false,
  },
  {
    id: 'diagnostic',
    name: 'Diagnostic',
    description: 'Curvature, topology and inflection marks.',
    requires: null,
    modes: ['stroke', 'curvature', 'topology'],
    overlays: { inflections: true, bbox: true },
    colorMetric: 'curvature',
    guides: true,
  },
  {
    id: 'field',
    name: 'Field',
    description: 'Signed-distance bands.',
    requires: null,
    modes: ['signed-distance'],
    overlays: {},
    colorMetric: 'auto',
    guides: false,
  },
  {
    id: 'epicycles',
    name: 'Epicycles',
    description: 'Fourier rotating-vector chain.',
    requires: 'fourier',
    modes: ['stroke', 'epicycles'],
    overlays: {},
    colorMetric: 'auto',
    guides: true,
  },
]);

export const DEFAULT_LOOK_PRESET = 'line';

export function getLookPreset(id) {
  return LOOK_PRESETS.find((preset) => preset.id === id) ?? null;
}

/**
 * Resolve availability from active-layer context. The caller supplies boolean
 * facts; presets never inspect the document themselves.
 */
export function lookPresetAvailability(preset, context = {}) {
  if (!preset?.requires) return { available: true, reason: null };
  if (preset.requires === 'surface') {
    return context.hasSurface
      ? { available: true, reason: null }
      : { available: false, reason: 'Requires surface or mesh geometry' };
  }
  if (preset.requires === 'fourier') {
    return context.generatorId === 'fourier'
      ? { available: true, reason: null }
      : { available: false, reason: 'Requires the Fourier generator' };
  }
  if (preset.requires === 'closed') {
    return context.hasClosedCurves
      ? { available: true, reason: null }
      : { available: false, reason: 'Requires at least one closed curve' };
  }
  return { available: false, reason: 'Unsupported preset requirement' };
}

/** Build the view fields a preset should write. */
export function resolveLookPreset(preset) {
  return {
    modes: [...preset.modes],
    overlays: Object.fromEntries(OVERLAYS.map((overlay) => [
      overlay.id,
      Boolean(preset.overlays?.[overlay.id]),
    ])),
    colorMetric: preset.colorMetric ?? 'auto',
    guides: preset.guides !== false,
  };
}

/** Does the current view match a preset exactly? */
export function lookPresetMatchesView(preset, view = {}) {
  if (!preset) return false;
  const resolved = resolveLookPreset(preset);
  const modes = Array.isArray(view.modes) ? [...new Set(view.modes)] : [];
  const sameModes = modes.length === resolved.modes.length
    && [...modes].sort().join('|') === [...resolved.modes].sort().join('|');
  if (!sameModes) return false;
  const overlays = view.overlays ?? {};
  const sameOverlays = OVERLAYS.every((overlay) => (
    Boolean(overlays[overlay.id]) === Boolean(resolved.overlays[overlay.id])
  ));
  if (!sameOverlays) return false;
  if ((view.colorMetric ?? 'auto') !== resolved.colorMetric) return false;
  return Boolean(view.guides) === resolved.guides;
}


/** Apply a user-authored look to a view without touching geometry. */
export function applyUserLookToView(view, look) {
  if (!view || !look) return false;
  view.modes = [...look.modes];
  view.overlays = { ...look.overlays };
  view.colorMetric = look.colorMetric;
  view.guides = look.guides;
  view.passOpacity = { ...(look.passOpacity ?? {}) };
  return true;
}
