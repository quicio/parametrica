/**
 * core/fillGradient.js — pure fill-gradient contract and bbox resolution.
 *
 * The gradient belongs to a layer's fill. Linear gradients span the layer
 * bbox along an angle; radial gradients use a normalized bbox center/radius.
 */

export const FILL_GRADIENT_TYPES = Object.freeze(['linear', 'radial']);
export const FILL_GRADIENT_COLORS = 4;
export const DEFAULT_FILL_GRADIENT = Object.freeze({
  enabled: false,
  type: 'linear',
  angle: 0,
  centerX: 0.5,
  centerY: 0.5,
  radius: 0.75,
  colors: Object.freeze(['#ffffff', '#000000']),
});

const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function createDefaultFillGradient() {
  return {
    enabled: false,
    type: 'linear',
    angle: 0,
    centerX: 0.5,
    centerY: 0.5,
    radius: 0.75,
    colors: [...DEFAULT_FILL_GRADIENT.colors],
  };
}

export function sanitizeFillGradient(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const colors = Array.isArray(source.colors)
    ? source.colors.filter((color) => typeof color === 'string' && COLOR_RE.test(color)).slice(0, FILL_GRADIENT_COLORS)
    : [];
  return {
    enabled: source.enabled === true,
    type: FILL_GRADIENT_TYPES.includes(source.type) ? source.type : DEFAULT_FILL_GRADIENT.type,
    angle: clamp(Number(source.angle), 0, 360, DEFAULT_FILL_GRADIENT.angle),
    centerX: clamp(Number(source.centerX), 0, 1, DEFAULT_FILL_GRADIENT.centerX),
    centerY: clamp(Number(source.centerY), 0, 1, DEFAULT_FILL_GRADIENT.centerY),
    radius: clamp(Number(source.radius), 0.05, 3, DEFAULT_FILL_GRADIENT.radius),
    colors: colors.length >= 2 ? colors : [...DEFAULT_FILL_GRADIENT.colors],
  };
}

/**
 * Resolve a gradient against a layer bbox. Returned coordinates are in the
 * same projected/artboard space as the pass geometry.
 */
export function resolveFillGradient(gradient, bbox) {
  const g = sanitizeFillGradient(gradient);
  const width = Math.max(1e-6, Number(bbox?.width) || 0);
  const height = Math.max(1e-6, Number(bbox?.height) || 0);
  const minX = Number.isFinite(bbox?.minX) ? bbox.minX : -width / 2;
  const minY = Number.isFinite(bbox?.minY) ? bbox.minY : -height / 2;
  const stops = g.colors.map((color, index) => ({
    offset: g.colors.length === 1 ? 0 : index / (g.colors.length - 1),
    color,
  }));
  if (g.type === 'radial') {
    return {
      type: 'radial',
      cx: minX + g.centerX * width,
      cy: minY + g.centerY * height,
      r: Math.max(1e-6, g.radius * Math.max(width, height)),
      stops,
    };
  }
  const angle = (g.angle * Math.PI) / 180;
  const half = Math.max(
    1e-6,
    (Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle))) / 2,
  );
  const dx = Math.cos(angle) * half;
  const dy = Math.sin(angle) * half;
  const cx = minX + width / 2;
  const cy = minY + height / 2;
  return {
    type: 'linear',
    x1: cx - dx,
    y1: cy - dy,
    x2: cx + dx,
    y2: cy + dy,
    stops,
  };
}

function clamp(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
