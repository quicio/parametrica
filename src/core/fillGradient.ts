/** Pure fill-gradient contract and bbox resolution. */

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

export interface FillGradient {
  enabled: boolean;
  type: string;
  angle: number;
  centerX: number;
  centerY: number;
  radius: number;
  colors: string[];
}
export interface GradientStop {
  offset: number;
  color: string;
}
export interface LinearGradientSpec {
  type: 'linear';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: GradientStop[];
}
export interface RadialGradientSpec {
  type: 'radial';
  cx: number;
  cy: number;
  r: number;
  stops: GradientStop[];
}
export type ResolvedFillGradient = LinearGradientSpec | RadialGradientSpec;
export interface GradientBBox {
  width?: unknown;
  height?: unknown;
  minX?: unknown;
  minY?: unknown;
}

export function createDefaultFillGradient(): FillGradient {
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

export function sanitizeFillGradient(raw: unknown): FillGradient {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const colors = Array.isArray(source.colors)
    ? source.colors.filter((color): color is string => typeof color === 'string' && COLOR_RE.test(color)).slice(0, FILL_GRADIENT_COLORS)
    : [];
  return {
    enabled: source.enabled === true,
    type: FILL_GRADIENT_TYPES.includes(source.type as string) ? source.type as string : DEFAULT_FILL_GRADIENT.type,
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
export function resolveFillGradient(gradient: unknown, bbox: GradientBBox | null | undefined): ResolvedFillGradient {
  const g = sanitizeFillGradient(gradient);
  const width = Math.max(1e-6, Number(bbox?.width) || 0);
  const height = Math.max(1e-6, Number(bbox?.height) || 0);
  const minXRaw = bbox?.minX;
  const minYRaw = bbox?.minY;
  const minX = Number.isFinite(minXRaw) ? Number(minXRaw) : -width / 2;
  const minY = Number.isFinite(minYRaw) ? Number(minYRaw) : -height / 2;
  const stops: GradientStop[] = g.colors.map((color, index) => ({
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

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
