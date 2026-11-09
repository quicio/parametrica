/**
 * render/passStyle.js — optional per-pass color/width overrides.
 *
 * A pass only receives overrides it actually supports. Defaults always inherit
 * the layer style, so existing documents render unchanged.
 */

const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const PASS_APPEARANCE = Object.freeze({
  stroke: Object.freeze({ color: true, width: true }),
  points: Object.freeze({ color: true, width: false }),
  wireframe: Object.freeze({ color: true, width: false }),
  'gradient-wireframe': Object.freeze({ color: false, width: true }),
  'surface-wireframe': Object.freeze({ color: true, width: true }),
  'surface-fill': Object.freeze({ color: true, width: false }),
});

export function passSupports(passId, key) {
  return Boolean(PASS_APPEARANCE[passId]?.[key]);
}

export function sanitizePassStyle(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!PASS_APPEARANCE[id] || !value || typeof value !== 'object') continue;
    const entry = {};
    if (passSupports(id, 'color') && typeof value.color === 'string' && COLOR_RE.test(value.color)) {
      entry.color = value.color;
    }
    if (passSupports(id, 'width')) {
      const width = Number(value.width);
      if (Number.isFinite(width)) entry.width = Math.max(0.1, Math.min(40, width));
    }
    if (Object.keys(entry).length) out[id] = entry;
  }
  return out;
}

export function resolvePassStyle(passId, view, baseStyle) {
  const style = baseStyle ?? view?.style ?? {};
  const override = view?.passStyle?.[passId];
  if (!override) return style;
  const stroke = style.stroke ?? {};
  return {
    ...style,
    stroke: {
      ...stroke,
      ...(passSupports(passId, 'color') && override.color ? { color: override.color } : {}),
      ...(passSupports(passId, 'width') && Number.isFinite(override.width) ? { width: override.width } : {}),
    },
  };
}
