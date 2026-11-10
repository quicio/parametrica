/** A tiny p5-like recorder that emits SVG markup. */

import { resolveFillGradient } from '../core/fillGradient.js';

export class SvgUnsupportedError extends Error {}

const CLOSE = 'close';
const LINES = 'lines';

interface Vec2 {
  x: number;
  y: number;
}

interface ColorStyle {
  color: string;
  opacity: number;
  baseOpacity?: number;
}

interface Snapshot {
  fillStyle: ColorStyle | null;
  strokeStyle: ColorStyle | null;
  weight: number;
  cap: string;
  join: string;
  textSize?: number;
}

interface ShapeState extends Omit<Snapshot, 'textSize'> {
  kind: string | null;
  points: Vec2[];
  lineBuffer: Vec2[];
  style: Snapshot;
  closed?: boolean;
}

interface GradientStop {
  offset: number;
  color: string;
}

interface GradientSpec {
  type: string;
  stops: GradientStop[];
  cx?: number;
  cy?: number;
  r?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

interface FillLike {
  enabled?: boolean;
  color?: string;
  opacity?: number;
  gradient?: unknown;
}

interface CurveLike {
  points?: Array<{ x: number; y: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface BBoxLike {
  width?: unknown;
  height?: unknown;
  minX?: unknown;
  minY?: unknown;
}

type AttrValue = unknown;
type Attrs = Record<string, AttrValue>;

export class SvgContext {
  width: number;
  height: number;
  elements: string[];
  defs: string[];
  gradientPrefix: string;
  gradientCounter: number;
  gradientCache: Map<string, string>;
  fillStyle: ColorStyle | null;
  strokeStyle: ColorStyle | null;
  weight: number;
  cap: string;
  join: string;
  textSizeValue: number;
  shape: ShapeState | null;
  stack: Snapshot[];
  CLOSE: string;
  LINES: string;
  ROUND: string;
  BUTT: string;
  SQUARE: string;
  MITER: string;
  BEVEL: string;

  constructor(width: number, height: number, prefix = 'svg') {
    this.width = width;
    this.height = height;
    this.elements = [];
    this.defs = [];
    this.gradientPrefix = prefix;
    this.gradientCounter = 0;
    this.gradientCache = new Map();
    this.fillStyle = null;
    this.strokeStyle = { color: '#ffffff', opacity: 1 };
    this.weight = 1;
    this.cap = 'round';
    this.join = 'round';
    this.textSizeValue = 12;
    this.shape = null;
    this.stack = [];

    // p5 constants used by the current passes.
    this.CLOSE = CLOSE;
    this.LINES = LINES;
    this.ROUND = 'round';
    this.BUTT = 'butt';
    this.SQUARE = 'square';
    this.MITER = 'miter';
    this.BEVEL = 'bevel';
  }

  push(): this {
    this.stack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      weight: this.weight,
      cap: this.cap,
      join: this.join,
      textSize: this.textSizeValue,
    });
    return this;
  }

  pop(): this {
    const state = this.stack.pop();
    if (!state) return this;
    this.fillStyle = state.fillStyle;
    this.strokeStyle = state.strokeStyle;
    this.weight = state.weight;
    this.cap = state.cap;
    this.join = state.join;
    this.textSizeValue = state.textSize ?? this.textSizeValue;
    return this;
  }

  noFill(): this {
    this.fillStyle = null;
    return this;
  }

  noStroke(): this {
    this.strokeStyle = null;
    return this;
  }

  fill(...args: unknown[]): this {
    this.fillStyle = colorArgs(args);
    return this;
  }

  /**
   * Emit every closed contour as subpaths of one path with the even-odd rule.
   * This is what makes a traced ring a ring in SVG instead of a solid disc.
   */
  fillContours(curves: unknown, fill: FillLike | null | undefined, bbox: BBoxLike | null): boolean {
    if (!fill?.enabled || !Array.isArray(curves) || !curves.length) {
      this.noFill();
      return false;
    }
    if ((fill.gradient as { enabled?: boolean } | undefined)?.enabled) {
      this.fillGradient(fill.gradient, bbox, fill.opacity ?? 1);
    } else {
      this.fillStyle = {
        color: fill.color ?? '#ffffff',
        opacity: clamp01(fill.opacity),
      };
    }
    const parts: string[] = [];
    for (const curve of curves as CurveLike[]) {
      const points = curve?.points ?? [];
      if (points.length < 2) continue;
      const first = points[0];
      if (!first) continue;
      let d = `M ${fmt(first.x)} ${fmt(first.y)}`;
      for (let i = 1; i < points.length; i++) {
        const point = points[i];
        if (!point) continue;
        d += ` L ${fmt(point.x)} ${fmt(point.y)}`;
      }
      parts.push(`${d} Z`);
    }
    if (!parts.length) return false;
    const style = { ...this.snapshot(), strokeStyle: null };
    this.elements.push(element('path', {
      d: parts.join(' '),
      'fill-rule': 'evenodd',
      ...this.paintAttrs(style),
    }));
    return true;
  }

  /** Fill with a resolved linear/radial gradient, emitted as SVG defs. */
  fillGradient(gradient: unknown, bbox: BBoxLike | null, opacity = 1): this {
    const spec = resolveFillGradient(gradient, bbox) as unknown as GradientSpec;
    const key = JSON.stringify(spec);
    let id = this.gradientCache.get(key);
    if (!id) {
      id = `${this.gradientPrefix}-grad-${this.gradientCounter++}`;
      this.gradientCache.set(key, id);
      this.defs.push(gradientMarkup(spec, id));
    }
    this.fillStyle = {
      color: `url(#${id})`,
      opacity: clamp01(opacity),
      baseOpacity: clamp01(opacity),
    };
    return this;
  }

  /** Multiply the current gradient fill by a per-face depth alpha. */
  fillDepth(depth: number): this {
    if (!this.fillStyle?.baseOpacity) return this;
    this.fillStyle.opacity = this.fillStyle.baseOpacity * clamp01(depth);
    return this;
  }

  stroke(...args: unknown[]): this {
    this.strokeStyle = colorArgs(args);
    return this;
  }

  strokeWeight(value: unknown): this {
    this.weight = Math.max(0, Number(value) || 0);
    return this;
  }

  strokeCap(value: string): this {
    this.cap = value;
    return this;
  }

  strokeJoin(value: string): this {
    this.join = value;
    return this;
  }

  textSize(value: unknown): this {
    this.textSizeValue = Math.max(1, Number(value) || 1);
    return this;
  }

  beginShape(kind: string | null = null): this {
    this.shape = {
      kind,
      points: [],
      lineBuffer: [],
      style: this.snapshot(),
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      weight: this.weight,
      cap: this.cap,
      join: this.join,
    };
    return this;
  }

  vertex(x: unknown, y: unknown): this {
    if (!this.shape) return this;
    const point = { x: Number(x) || 0, y: Number(y) || 0 };
    if (this.shape.kind === LINES) {
      this.shape.lineBuffer.push(point);
      if (this.shape.lineBuffer.length === 2) {
        const a = this.shape.lineBuffer[0];
        const b = this.shape.lineBuffer[1];
        if (a && b) this.emitLine(a, b, this.snapshot());
        this.shape.lineBuffer = [];
      }
      return this;
    }
    this.shape.points.push(point);
    return this;
  }

  endShape(mode: string | null = null): this {
    const shape = this.shape;
    this.shape = null;
    if (!shape || shape.kind === LINES || shape.points.length < 2) return this;
    const closed = mode === CLOSE || shape.closed === true;
    const first = shape.points[0];
    if (!first) return this;
    let d = `M ${fmt(first.x)} ${fmt(first.y)}`;
    for (let i = 1; i < shape.points.length; i++) {
      const point = shape.points[i];
      if (!point) continue;
      d += ` L ${fmt(point.x)} ${fmt(point.y)}`;
    }
    if (closed) d += ' Z';
    this.elements.push(element('path', {
      d,
      ...this.paintAttrs(shape.style),
    }));
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number): this {
    this.emitLine({ x: x1, y: y1 }, { x: x2, y: y2 }, this.snapshot());
    return this;
  }

  point(x: unknown, y: unknown): this {
    const stroke = this.strokeStyle;
    if (!stroke) return this;
    const radius = Math.max(0.2, this.weight / 2);
    this.elements.push(element('circle', {
      cx: fmt(x),
      cy: fmt(y),
      r: fmt(radius),
      fill: stroke.color,
      'fill-opacity': fmt(stroke.opacity),
      stroke: 'none',
    }));
    return this;
  }

  circle(x: unknown, y: unknown, diameter: unknown): this {
    const radius = Number(diameter) / 2;
    if (!Number.isFinite(radius) || radius <= 0) return this;
    this.elements.push(element('circle', {
      cx: fmt(x),
      cy: fmt(y),
      r: fmt(radius),
      ...this.paintAttrs(this.snapshot()),
    }));
    return this;
  }

  square(x: unknown, y: unknown, size: unknown): this {
    const side = Number(size);
    if (!Number.isFinite(side) || side <= 0) return this;
    this.elements.push(element('rect', {
      x: fmt(x),
      y: fmt(y),
      width: fmt(side),
      height: fmt(side),
      ...this.paintAttrs(this.snapshot()),
    }));
    return this;
  }

  rect(x: unknown, y: unknown, width: unknown, height: unknown): this {
    this.elements.push(element('rect', {
      x: fmt(x),
      y: fmt(y),
      width: fmt(width),
      height: fmt(height),
      ...this.paintAttrs(this.snapshot()),
    }));
    return this;
  }

  text(value: unknown, x: unknown, y: unknown): this {
    const fill = this.fillStyle ?? this.strokeStyle;
    this.elements.push(element('text', {
      x: fmt(x),
      y: fmt(y),
      'font-family': 'monospace',
      'font-size': fmt(this.textSizeValue),
      fill: fill?.color ?? '#ffffff',
      'fill-opacity': fmt(fill?.opacity ?? 1),
    }, escapeText(value)));
    return this;
  }

  image(): never {
    throw new SvgUnsupportedError('raster image');
  }

  createImage(): never {
    throw new SvgUnsupportedError('raster image');
  }

  toMarkup(indent = '    '): string {
    const defs = this.defs.length
      ? `${indent}<defs>\n${this.defs.map((item) => `${indent}  ${item}`).join('\n')}\n${indent}</defs>\n`
      : '';
    return defs + this.elements.map((item) => `${indent}${item}`).join('\n');
  }

  emitLine(a: Vec2, b: Vec2, style: Snapshot): void {
    if (!style.strokeStyle) return;
    this.elements.push(element('line', {
      x1: fmt(a.x),
      y1: fmt(a.y),
      x2: fmt(b.x),
      y2: fmt(b.y),
      ...this.paintAttrs(style),
    }));
  }

  snapshot(): Snapshot {
    return {
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      weight: this.weight,
      cap: this.cap,
      join: this.join,
      textSize: this.textSizeValue,
    };
  }

  paintAttrs(style: Snapshot): Attrs {
    const fill = style.fillStyle;
    const stroke = style.strokeStyle;
    const attrs: Attrs = {
      fill: fill ? fill.color : 'none',
    };
    if (fill) attrs['fill-opacity'] = fmt(fill.opacity);
    if (stroke) {
      attrs.stroke = stroke.color;
      attrs['stroke-opacity'] = fmt(stroke.opacity);
      attrs['stroke-width'] = fmt(style.weight);
      attrs['stroke-linecap'] = style.cap;
      attrs['stroke-linejoin'] = style.join;
    } else {
      attrs.stroke = 'none';
    }
    return attrs;
  }
}

function gradientMarkup(spec: GradientSpec, id: string): string {
  const stops = spec.stops.map((stop) => (
    `<stop offset="${fmt(stop.offset)}" stop-color="${escapeAttr(stop.color)}"/>`
  )).join('');
  if (spec.type === 'radial') {
    return `<radialGradient id="${escapeAttr(id)}" gradientUnits="userSpaceOnUse" cx="${fmt(spec.cx)}" cy="${fmt(spec.cy)}" r="${fmt(spec.r)}" fx="${fmt(spec.cx)}" fy="${fmt(spec.cy)}">${stops}</radialGradient>`;
  }
  return `<linearGradient id="${escapeAttr(id)}" gradientUnits="userSpaceOnUse" x1="${fmt(spec.x1)}" y1="${fmt(spec.y1)}" x2="${fmt(spec.x2)}" y2="${fmt(spec.y2)}">${stops}</linearGradient>`;
}

function clamp01(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

function colorArgs(args: unknown[]): ColorStyle {
  if (!args.length) return { color: '#ffffff', opacity: 1 };
  if (typeof args[0] === 'string') return { color: args[0], opacity: 1 };
  if (args.length === 1) {
    const gray = clampByte(args[0]);
    return { color: rgbToHex(gray, gray, gray), opacity: 1 };
  }
  if (args.length === 2) {
    const gray = clampByte(args[0]);
    return { color: rgbToHex(gray, gray, gray), opacity: alpha(args[1]) };
  }
  const [r, g, b] = args;
  return {
    color: rgbToHex(clampByte(r), clampByte(g), clampByte(b)),
    opacity: args.length > 3 ? alpha(args[3]) : 1,
  };
}

function alpha(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n / 255)) : 1;
}

function clampByte(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : 0;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function fmt(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? String(Number(n.toFixed(2))) : '0';
}

function element(name: string, attrs: Attrs, text: string | null = null): string {
  const body = Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
    .join(' ');
  return text === null
    ? `<${name} ${body}/>`
    : `<${name} ${body}>${text}</${name}>`;
}

function escapeAttr(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeText(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
