/** Optional per-pass color/width overrides. */

export type PassId = string;
export type PassProperty = 'color' | 'width';

export interface PassAppearance {
  color: boolean;
  width: boolean;
}

export interface PassOverride {
  color?: string;
  width?: number;
}

export type PassStyleMap = Record<string, PassOverride>;

export interface StrokeStyle {
  color?: string;
  width?: number;
  [key: string]: unknown;
}

export interface LayerStyle {
  stroke?: StrokeStyle;
  [key: string]: unknown;
}

export interface PassView {
  style?: LayerStyle;
  passStyle?: PassStyleMap;
  [key: string]: unknown;
}

const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const PASS_APPEARANCE: Readonly<Record<string, PassAppearance>> = Object.freeze({
  stroke: Object.freeze({ color: true, width: true }),
  points: Object.freeze({ color: true, width: false }),
  wireframe: Object.freeze({ color: true, width: false }),
  'gradient-wireframe': Object.freeze({ color: false, width: true }),
  'surface-wireframe': Object.freeze({ color: true, width: true }),
  'surface-fill': Object.freeze({ color: true, width: false }),
});

export function passSupports(passId: string, key: PassProperty): boolean {
  return Boolean(PASS_APPEARANCE[passId]?.[key]);
}

export function sanitizePassStyle(raw: unknown): PassStyleMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: PassStyleMap = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!PASS_APPEARANCE[id] || !value || typeof value !== 'object' || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    const clean: PassOverride = {};
    if (passSupports(id, 'color') && typeof entry.color === 'string' && COLOR_RE.test(entry.color)) {
      clean.color = entry.color;
    }
    if (passSupports(id, 'width')) {
      const width = Number(entry.width);
      if (Number.isFinite(width)) clean.width = Math.max(0.1, Math.min(40, width));
    }
    if (Object.keys(clean).length) out[id] = clean;
  }
  return out;
}

export function resolvePassStyle(passId: string, view: PassView | null | undefined, baseStyle?: LayerStyle): LayerStyle {
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
