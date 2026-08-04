/**
 * params.js — single source of truth for the glyph parameter schema.
 *
 * Every consumer (GUI, mutation engine, preset sanitizer, validator)
 * derives its ranges and defaults from this table. No parameter exists
 * outside of this schema.
 */

export const PARAM_SCHEMA = {
  width: {
    label: 'Width', folder: 'Glyph', type: 'number',
    min: 40, max: 320, step: 1, default: 150,
    doc: 'Half-width of the glyph body at its widest bulge (px).',
  },
  height: {
    label: 'Height', folder: 'Glyph', type: 'number',
    min: 120, max: 560, step: 1, default: 360,
    doc: 'Half-height of the glyph body (px).',
  },
  crossTop: {
    label: 'Cross Top', folder: 'Glyph', type: 'number',
    min: 0.08, max: 0.92, step: 0.005, default: 0.42,
    doc: 'Vertical position of the upper axis crossing, as a fraction of height.',
  },
  crossBottom: {
    label: 'Cross Bottom', folder: 'Glyph', type: 'number',
    min: 0.08, max: 0.92, step: 0.005, default: 0.42,
    doc: 'Vertical position of the lower axis crossing, as a fraction of height.',
  },
  waist: {
    label: 'Waist', folder: 'Glyph', type: 'number',
    min: 0.02, max: 0.5, step: 0.005, default: 0.16,
    doc: 'Half-width of the narrow waist at the optical centre, as a fraction of width.',
  },
  innerOffset: {
    label: 'Inner Offset', folder: 'Glyph', type: 'number',
    min: -60, max: 60, step: 0.5, default: 0,
    doc: 'Pinches (+) or releases (−) the inner contour that shapes the vesica.',
  },
  tipSharpness: {
    label: 'Tip Sharpness', folder: 'Glyph', type: 'number',
    min: 0, max: 1, step: 0.01, default: 0.35,
    doc: '0 = open blunt arms, 1 = needle-sharp tips exiting the canvas.',
  },
  tension: {
    label: 'Tension', folder: 'Curve', type: 'number',
    min: 0, max: 0.9, step: 0.01, default: 0.25,
    doc: 'Catmull-Rom tangent scale. 0 = loose, 0.9 = taut (never sharp).',
  },
  opticalCorrection: {
    label: 'Optical Correction', folder: 'Curve', type: 'number',
    min: 0, max: 1, step: 0.01, default: 0.5,
    doc: 'Optical balance over numerical symmetry: raises the waist, rebalances mass.',
  },
  mirror: {
    label: 'Mirror', folder: 'Curve', type: 'boolean', default: true,
    doc: 'Toggle the mirrored half (inspection of the master spline).',
  },
  strokeWeight: {
    label: 'Stroke Weight', folder: 'Stroke', type: 'number',
    min: 0.5, max: 20, step: 0.1, default: 2,
    doc: 'Monoline weight in px.',
  },
};

export const PARAM_KEYS = Object.keys(PARAM_SCHEMA);

export const NUMERIC_KEYS = PARAM_KEYS.filter((k) => PARAM_SCHEMA[k].type === 'number');

/** Fresh parameter object populated with schema defaults. */
export function defaultParams() {
  const out = {};
  for (const key of PARAM_KEYS) out[key] = PARAM_SCHEMA[key].default;
  return out;
}

/** Clamp + snap a single value to its schema range/step. */
export function clampParam(key, value) {
  const s = PARAM_SCHEMA[key];
  if (!s) return value;
  if (s.type === 'boolean') return Boolean(value);
  let v = Number(value);
  if (!Number.isFinite(v)) v = s.default;
  v = Math.min(s.max, Math.max(s.min, v));
  v = Math.round(v / s.step) * s.step;
  return Number(v.toFixed(4));
}

/**
 * Produce a complete, valid parameter object from arbitrary input
 * (preset import, JSON share). Unknown keys dropped, missing keys defaulted,
 * out-of-range values clamped.
 */
export function sanitizeParams(input) {
  const out = defaultParams();
  if (!input || typeof input !== 'object') return out;
  for (const key of PARAM_KEYS) {
    if (key in input) out[key] = clampParam(key, input[key]);
  }
  return out;
}
