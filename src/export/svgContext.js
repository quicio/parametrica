/**
 * export/svgContext.js — a tiny p5-like recorder that emits SVG markup.
 *
 * Render passes and overlays already contain the visual truth of the canvas.
 * Feeding them this recorder keeps SVG fidelity in one place instead of
 * duplicating every pass as a separate exporter.
 */

export class SvgUnsupportedError extends Error {}

const CLOSE = 'close';
const LINES = 'lines';

import { resolveFillGradient } from '../core/fillGradient.js';

export class SvgContext {
  constructor(width, height, prefix = 'svg') {
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
    this.textSize = 12;
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

  push() {
    this.stack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      weight: this.weight,
      cap: this.cap,
      join: this.join,
      textSize: this.textSize,
    });
    return this;
  }

  pop() {
    const state = this.stack.pop();
    if (!state) return this;
    this.fillStyle = state.fillStyle;
    this.strokeStyle = state.strokeStyle;
    this.weight = state.weight;
    this.cap = state.cap;
    this.join = state.join;
    this.textSize = state.textSize;
    return this;
  }

  noFill() {
    this.fillStyle = null;
    return this;
  }

  noStroke() {
    this.strokeStyle = null;
    return this;
  }

  fill(...args) {
    this.fillStyle = colorArgs(args);
    return this;
  }

  /** Fill with a resolved linear/radial gradient, emitted as SVG defs. */
  fillGradient(gradient, bbox, opacity = 1) {
    const spec = resolveFillGradient(gradient, bbox);
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
  fillDepth(depth) {
    if (!this.fillStyle?.baseOpacity) return this;
    this.fillStyle.opacity = this.fillStyle.baseOpacity * clamp01(depth);
    return this;
  }

  stroke(...args) {
    this.strokeStyle = colorArgs(args);
    return this;
  }

  strokeWeight(value) {
    this.weight = Math.max(0, Number(value) || 0);
    return this;
  }

  strokeCap(value) {
    this.cap = value;
    return this;
  }

  strokeJoin(value) {
    this.join = value;
    return this;
  }

  textSize(value) {
    this.textSize = Math.max(1, Number(value) || 1);
    return this;
  }

  beginShape(kind = null) {
    this.shape = { kind, points: [], lineBuffer: [], style: this.snapshot() };
    return this;
  }

  vertex(x, y) {
    if (!this.shape) return this;
    const point = { x: Number(x) || 0, y: Number(y) || 0 };
    if (this.shape.kind === LINES) {
      this.shape.lineBuffer.push(point);
      if (this.shape.lineBuffer.length === 2) {
        this.emitLine(this.shape.lineBuffer[0], this.shape.lineBuffer[1], this.snapshot());
        this.shape.lineBuffer = [];
      }
      return this;
    }
    this.shape.points.push(point);
    return this;
  }

  endShape(mode = null) {
    const shape = this.shape;
    this.shape = null;
    if (!shape || shape.kind === LINES || shape.points.length < 2) return this;
    const closed = mode === CLOSE || shape.closed === true;
    let d = `M ${fmt(shape.points[0].x)} ${fmt(shape.points[0].y)}`;
    for (let i = 1; i < shape.points.length; i++) {
      d += ` L ${fmt(shape.points[i].x)} ${fmt(shape.points[i].y)}`;
    }
    if (closed) d += ' Z';
    this.elements.push(element('path', {
      d,
      ...this.paintAttrs(shape.style),
    }));
    return this;
  }

  line(x1, y1, x2, y2) {
    this.emitLine({ x: x1, y: y1 }, { x: x2, y: y2 }, this.snapshot());
    return this;
  }

  point(x, y) {
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

  circle(x, y, diameter) {
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

  square(x, y, size) {
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

  rect(x, y, width, height) {
    this.elements.push(element('rect', {
      x: fmt(x),
      y: fmt(y),
      width: fmt(width),
      height: fmt(height),
      ...this.paintAttrs(this.snapshot()),
    }));
    return this;
  }

  text(value, x, y) {
    const fill = this.fillStyle ?? this.strokeStyle;
    this.elements.push(element('text', {
      x: fmt(x),
      y: fmt(y),
      'font-family': 'monospace',
      'font-size': fmt(this.textSize),
      fill: fill?.color ?? '#ffffff',
      'fill-opacity': fmt(fill?.opacity ?? 1),
    }, escapeText(value)));
    return this;
  }

  image() {
    throw new SvgUnsupportedError('raster image');
  }

  createImage() {
    throw new SvgUnsupportedError('raster image');
  }

  toMarkup(indent = '    ') {
    const defs = this.defs.length
      ? `${indent}<defs>\n${this.defs.map((item) => `${indent}  ${item}`).join('\n')}\n${indent}</defs>\n`
      : '';
    return defs + this.elements.map((item) => `${indent}${item}`).join('\n');
  }

  emitLine(a, b, style) {
    if (!style.strokeStyle) return;
    this.elements.push(element('line', {
      x1: fmt(a.x),
      y1: fmt(a.y),
      x2: fmt(b.x),
      y2: fmt(b.y),
      ...this.paintAttrs(style),
    }));
  }

  snapshot() {
    return {
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      weight: this.weight,
      cap: this.cap,
      join: this.join,
    };
  }

  paintAttrs(style) {
    const fill = style.fillStyle;
    const stroke = style.strokeStyle;
    const attrs = {
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

function gradientMarkup(spec, id) {
  const stops = spec.stops.map((stop) => (
    `<stop offset="${fmt(stop.offset)}" stop-color="${escapeAttr(stop.color)}"/>`
  )).join('');
  if (spec.type === 'radial') {
    return `<radialGradient id="${escapeAttr(id)}" gradientUnits="userSpaceOnUse" cx="${fmt(spec.cx)}" cy="${fmt(spec.cy)}" r="${fmt(spec.r)}" fx="${fmt(spec.cx)}" fy="${fmt(spec.cy)}">${stops}</radialGradient>`;
  }
  return `<linearGradient id="${escapeAttr(id)}" gradientUnits="userSpaceOnUse" x1="${fmt(spec.x1)}" y1="${fmt(spec.y1)}" x2="${fmt(spec.x2)}" y2="${fmt(spec.y2)}">${stops}</linearGradient>`;
}

function clamp01(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

function colorArgs(args) {
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

function alpha(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n / 255)) : 1;
}

function clampByte(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : 0;
}

function rgbToHex(r, g, b) {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(Number(n.toFixed(2))) : '0';
}

function element(name, attrs, text = null) {
  const body = Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
    .join(' ');
  return text === null
    ? `<${name} ${body}/>`
    : `<${name} ${body}>${text}</${name}>`;
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
