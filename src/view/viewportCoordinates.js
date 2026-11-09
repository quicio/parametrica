/**
 * view/viewportCoordinates.js — pure coordinate metadata for viewport panels.
 *
 * A panel descriptor maps screen/artboard axes to canonical world axes. The
 * coordinate overlay uses it to draw truthful ticks and to read the two
 * in-plane coordinates under the cursor. The dropped axis is never inferred.
 */

import { millimetresPerUnit } from '../domain/units.js';

export const COORDINATE_UNIT_DISPLAYS = Object.freeze(['auto', 'world', 'physical']);
export const DEFAULT_COORDINATES = Object.freeze({
  enabled: false,
  grid: true,
  cursor: false,
  step: null,
  unitDisplay: 'auto',
});

const X = Object.freeze({ id: 'x', label: 'X' });
const Y = Object.freeze({ id: 'y', label: 'Y' });
const Z = Object.freeze({ id: 'z', label: 'Z' });

export const PROJECTION_AXES = Object.freeze({
  xy: Object.freeze({
    horizontal: Object.freeze({ ...X, sign: 1 }),
    vertical: Object.freeze({ ...Y, sign: -1 }),
    depth: Object.freeze({ ...Z, sign: 0 }),
  }),
  xz: Object.freeze({
    horizontal: Object.freeze({ ...X, sign: 1 }),
    vertical: Object.freeze({ ...Z, sign: -1 }),
    depth: Object.freeze({ ...Y, sign: 0 }),
  }),
  yz: Object.freeze({
    horizontal: Object.freeze({ ...Y, sign: -1 }),
    vertical: Object.freeze({ ...Z, sign: -1 }),
    depth: Object.freeze({ ...X, sign: 0 }),
  }),
});

export function createCoordinates(raw = {}) {
  return { ...DEFAULT_COORDINATES, ...(raw && typeof raw === 'object' ? raw : {}) };
}

export function sanitizeCoordinates(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    enabled: Boolean(source.enabled),
    grid: source.grid !== false,
    cursor: Boolean(source.cursor),
    step: positiveOrNull(source.step),
    unitDisplay: COORDINATE_UNIT_DISPLAYS.includes(source.unitDisplay)
      ? source.unitDisplay
      : 'auto',
  };
}

export function isOrthographicProjection(projection) {
  return projection === 'xy' || projection === 'xz' || projection === 'yz';
}

export function projectionAxes(projection) {
  return PROJECTION_AXES[projection] ?? null;
}

/**
 * Resolve how coordinate values are displayed. `world` keeps canonical world
 * units; `physical` uses mm only when a finite world scale exists.
 */
export function coordinateUnitInfo(units, display = 'auto') {
  const physical = millimetresPerUnit(units, 'world');
  if (physical === null) return { factor: 1, suffix: '', physical: false };
  if (display === 'world') return { factor: 1, suffix: '', physical: true };
  return { factor: physical, suffix: 'mm', physical: true };
}

export function formatCoordinate(value, unitInfo = { factor: 1, suffix: '' }) {
  if (!Number.isFinite(value)) return '—';
  const scaled = value * (Number(unitInfo.factor) || 1);
  const abs = Math.abs(scaled);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return scaled.toFixed(digits);
}

export function formatCoordinateReadout(world, unitInfo) {
  if (!world) return 'x — · y — · z —';
  const values = ['x', 'y', 'z']
    .map((axis) => `${axis} ${world[axis] === null ? '—' : formatCoordinate(world[axis], unitInfo)}`)
    .join(' · ');
  const suffix = unitInfo?.suffix ? ` ${unitInfo.suffix}` : '';
  return `${values}${suffix}`;
}

/**
 * Build the per-panel descriptor shared by Canvas, Quad and tests.
 *
 * `panelSize` is expressed in local artboard units (the coordinate system used
 * inside the panel after its own scaling).
 */
export function buildViewportDescriptor({
  projection = '3d',
  transform = null,
  units = null,
  unitDisplay = 'auto',
  panelSize = null,
} = {}) {
  const axes = projectionAxes(projection);
  const frame = transform?.frame
    ? {
      scale: Number(transform.frame.scale),
      tx: Number(transform.frame.tx),
      ty: Number(transform.frame.ty),
    }
    : null;
  const descriptor = {
    projection,
    orthographic: Boolean(axes),
    axes: axes ?? null,
    origin: null,
    frame,
    scale: frame && Number.isFinite(frame.scale) && frame.scale > 0 ? frame.scale : null,
    units: coordinateUnitInfo(units, unitDisplay),
    panelSize: panelSize ? { w: Number(panelSize.w), h: Number(panelSize.h) } : null,
    ranges: null,
  };
  if (transform && frame) {
    descriptor.origin = transform.toArtboard({ x: 0, y: 0, z: 0 });
    if (axes && descriptor.panelSize && descriptor.scale !== null) {
      descriptor.ranges = coordinateRanges(descriptor);
    }
  }
  return descriptor;
}

/**
 * Invert an orthographic transform for a local artboard point. The dropped
 * world axis remains null.
 */
export function worldFromArtboardPoint({ point, descriptor }) {
  if (!point || !descriptor?.axes || !descriptor.frame) return null;
  const { frame, axes } = descriptor;
  if (!Number.isFinite(frame.scale) || frame.scale <= 0) return null;
  const projectedX = (Number(point.x) - frame.tx) / frame.scale;
  const projectedY = (Number(point.y) - frame.ty) / frame.scale;
  if (!Number.isFinite(projectedX) || !Number.isFinite(projectedY)) return null;
  const world = { x: null, y: null, z: null };
  world[axes.horizontal.id] = projectedX * axes.horizontal.sign;
  world[axes.vertical.id] = projectedY * axes.vertical.sign;
  return world;
}

export function coordinateRanges(descriptor) {
  const size = descriptor?.panelSize;
  if (!size || !descriptor.axes) return null;
  const halfW = Math.abs(size.w) / 2;
  const halfH = Math.abs(size.h) / 2;
  const values = [
    worldFromArtboardPoint({ descriptor, point: { x: -halfW, y: -halfH } }),
    worldFromArtboardPoint({ descriptor, point: { x: halfW, y: -halfH } }),
    worldFromArtboardPoint({ descriptor, point: { x: -halfW, y: halfH } }),
    worldFromArtboardPoint({ descriptor, point: { x: halfW, y: halfH } }),
  ].filter(Boolean);
  if (!values.length) return null;
  const horizontal = values.map((world) => world[descriptor.axes.horizontal.id]);
  const vertical = values.map((world) => world[descriptor.axes.vertical.id]);
  return {
    horizontal: [Math.min(...horizontal), Math.max(...horizontal)],
    vertical: [Math.min(...vertical), Math.max(...vertical)],
  };
}

export function niceStep(span, targetCount = 6) {
  const safeSpan = Math.abs(Number(span));
  if (!Number.isFinite(safeSpan) || safeSpan <= 0) return 1;
  const count = Math.max(1, Number(targetCount) || 6);
  const rough = safeSpan / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * power;
}

/**
 * Generate world-space ticks and their local artboard positions.
 * Automatic spacing targets a stable pixel distance; manual steps win when
 * finite and positive.
 */
export function buildCoordinateTicks({
  descriptor,
  panelSize = descriptor?.panelSize,
  step = null,
  pixelsPerArtboardUnit = 1,
  targetSpacing = 56,
} = {}) {
  if (!descriptor?.axes || !descriptor.ranges || !descriptor.scale) return null;
  const size = panelSize ?? descriptor.panelSize;
  if (!size) return null;
  const pixels = Number(pixelsPerArtboardUnit);
  const safePixels = Number.isFinite(pixels) && pixels > 0 ? pixels : 1;
  const horizontalCount = Math.max(2, Math.floor((Math.abs(size.w) * safePixels) / targetSpacing));
  const verticalCount = Math.max(2, Math.floor((Math.abs(size.h) * safePixels) / targetSpacing));
  const horizontal = tickAxis({
    range: descriptor.ranges.horizontal,
    axis: descriptor.axes.horizontal,
    frame: descriptor.frame,
    scale: descriptor.scale,
    orientation: 'horizontal',
    step: positiveOrNull(step) ?? niceStep(descriptor.ranges.horizontal[1] - descriptor.ranges.horizontal[0], horizontalCount),
  });
  const vertical = tickAxis({
    range: descriptor.ranges.vertical,
    axis: descriptor.axes.vertical,
    frame: descriptor.frame,
    scale: descriptor.scale,
    orientation: 'vertical',
    step: positiveOrNull(step) ?? niceStep(descriptor.ranges.vertical[1] - descriptor.ranges.vertical[0], verticalCount),
  });
  return {
    axes: descriptor.axes,
    units: descriptor.units,
    horizontal,
    vertical,
    panelSize: { w: size.w, h: size.h },
  };
}

function tickAxis({ range, axis, frame, scale, orientation, step }) {
  const ticks = [];
  if (!range || !Number.isFinite(range[0]) || !Number.isFinite(range[1]) || !Number.isFinite(step) || step <= 0) {
    return { step, ticks };
  }
  const start = Math.ceil((range[0] - step * 1e-9) / step) * step;
  const end = Math.floor((range[1] + step * 1e-9) / step) * step;
  const maxTicks = 240;
  for (let value = start, i = 0; value <= end + step * 1e-9 && i < maxTicks; value += step, i++) {
    const position = axis.sign * value * scale + (orientation === 'horizontal' ? frame.tx : frame.ty);
    ticks.push({
      value: Math.abs(value) < step * 1e-9 ? 0 : value,
      position,
      label: null,
    });
  }
  return { step, ticks };
}

/** Shared Quad panel layout in local artboard units. */
export function quadPanelLayout(artboardWidth, artboardHeight, gap = null) {
  const w = Number(artboardWidth);
  const h = Number(artboardHeight);
  const split = Number.isFinite(Number(gap))
    ? Math.max(0, Number(gap))
    : Math.max(8, Math.min(w, h) * 0.025);
  const panelW = (w - split) / 2;
  const panelH = (h - split) / 2;
  const centers = [
    { projection: '3d', label: '3D', cx: -w / 2 + panelW / 2, cy: -h / 2 + panelH / 2 },
    { projection: 'xy', label: 'XY · Planta', cx: split / 2 + panelW / 2, cy: -h / 2 + panelH / 2 },
    { projection: 'xz', label: 'XZ · Alzado', cx: -w / 2 + panelW / 2, cy: split / 2 + panelH / 2 },
    { projection: 'yz', label: 'YZ · Perfil', cx: split / 2 + panelW / 2, cy: split / 2 + panelH / 2 },
  ];
  return centers.map((panel) => ({
    ...panel,
    w: panelW,
    h: panelH,
  }));
}

export function panelAtPoint(panels, point) {
  if (!point || !Array.isArray(panels)) return null;
  for (const panel of panels) {
    if (
      Math.abs(point.x - panel.cx) <= panel.w / 2
      && Math.abs(point.y - panel.cy) <= panel.h / 2
    ) return panel;
  }
  return null;
}

export function localPointInPanel(point, panel) {
  if (!point || !panel) return null;
  return { x: point.x - panel.cx, y: point.y - panel.cy };
}

function positiveOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
