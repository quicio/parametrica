/** Pure coordinate metadata for viewport panels. */

import { millimetresPerUnit } from '../domain/units.ts';
import type { ProjectionId, ViewTransform } from './transform.ts';

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

export interface Axis {
  id: string;
  label: string;
  sign: number;
}
export interface ProjectionAxes {
  horizontal: Axis;
  vertical: Axis;
  depth: Axis;
}
export interface CoordinateSettings {
  enabled: boolean;
  grid: boolean;
  cursor: boolean;
  step: number | null;
  unitDisplay: string;
}
export interface UnitInfo {
  factor: number;
  suffix: string;
  physical: boolean;
}
export interface NullableWorldPoint {
  x: number | null;
  y: number | null;
  z: number | null;
}
export interface ArtboardPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}
export interface PanelSize {
  w: number;
  h: number;
}
export interface DescriptorFrame {
  scale: number;
  tx: number;
  ty: number;
}
export interface CoordinateRanges {
  horizontal: [number, number];
  vertical: [number, number];
}
export interface ViewportDescriptor {
  projection: string;
  orthographic: boolean;
  axes: ProjectionAxes | null;
  origin: ArtboardPoint | null;
  frame: DescriptorFrame | null;
  scale: number | null;
  units: UnitInfo;
  panelSize: PanelSize | null;
  ranges: CoordinateRanges | null;
}
export interface CoordinateTick {
  value: number;
  position: number;
  label: null;
}
export interface TickAxis {
  step: number;
  ticks: CoordinateTick[];
}
export interface CoordinateTicks {
  axes: ProjectionAxes;
  units: UnitInfo;
  horizontal: TickAxis;
  vertical: TickAxis;
  panelSize: PanelSize;
}
export interface PanelLayout {
  projection: string;
  label: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
}
export interface LocalPoint {
  x: number;
  y: number;
}

export const PROJECTION_AXES: Readonly<Record<string, ProjectionAxes>> = Object.freeze({
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

export function createCoordinates(raw: unknown = {}): CoordinateSettings {
  return { ...DEFAULT_COORDINATES, ...(raw && typeof raw === 'object' ? raw as Partial<CoordinateSettings> : {}) } as CoordinateSettings;
}

export function sanitizeCoordinates(raw: unknown): CoordinateSettings {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    enabled: Boolean(source.enabled),
    grid: source.grid !== false,
    cursor: Boolean(source.cursor),
    step: positiveOrNull(source.step),
    unitDisplay: COORDINATE_UNIT_DISPLAYS.includes(source.unitDisplay as string)
      ? source.unitDisplay as string
      : 'auto',
  };
}

export function isOrthographicProjection(projection: string): boolean {
  return projection === 'xy' || projection === 'xz' || projection === 'yz';
}

export function projectionAxes(projection: string): ProjectionAxes | null {
  return PROJECTION_AXES[projection] ?? null;
}

/**
 * Resolve how coordinate values are displayed. `world` keeps canonical world
 * units; `physical` uses mm only when a finite world scale exists.
 */
export function coordinateUnitInfo(units: unknown, display = 'auto'): UnitInfo {
  const physical = millimetresPerUnit(units, 'world');
  if (physical === null) return { factor: 1, suffix: '', physical: false };
  if (display === 'world') return { factor: 1, suffix: '', physical: true };
  return { factor: physical, suffix: 'mm', physical: true };
}

export function formatCoordinate(value: unknown, unitInfo: { factor?: unknown; suffix?: string } = { factor: 1, suffix: '' }): string {
  if (!Number.isFinite(value)) return '—';
  const scaled = Number(value) * (Number(unitInfo.factor) || 1);
  const abs = Math.abs(scaled);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return scaled.toFixed(digits);
}

export function formatCoordinateReadout(world: NullableWorldPoint | null | undefined, unitInfo: UnitInfo | null | undefined): string {
  if (!world) return 'x — · y — · z —';
  const values = (['x', 'y', 'z'] as const)
    .map((axis) => `${axis} ${world[axis] === null ? '—' : formatCoordinate(world[axis], unitInfo ?? { factor: 1, suffix: '' })}`)
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
}: {
  projection?: string;
  transform?: ViewTransform | null;
  units?: unknown;
  unitDisplay?: string;
  panelSize?: PanelSize | null;
} = {}): ViewportDescriptor {
  const axes = projectionAxes(projection);
  const frame = transform?.frame
    ? {
      scale: Number(transform.frame.scale),
      tx: Number(transform.frame.tx),
      ty: Number(transform.frame.ty),
    }
    : null;
  const descriptor: ViewportDescriptor = {
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
export function worldFromArtboardPoint({
  point,
  descriptor,
}: {
  point: ArtboardPoint | null | undefined;
  descriptor: ViewportDescriptor | null | undefined;
}): NullableWorldPoint | null {
  if (!point || !descriptor?.axes || !descriptor.frame) return null;
  const { frame, axes } = descriptor;
  if (!Number.isFinite(frame.scale) || frame.scale <= 0) return null;
  const projectedX = (Number(point.x) - frame.tx) / frame.scale;
  const projectedY = (Number(point.y) - frame.ty) / frame.scale;
  if (!Number.isFinite(projectedX) || !Number.isFinite(projectedY)) return null;
  const world: NullableWorldPoint = { x: null, y: null, z: null };
  world[axes.horizontal.id as 'x' | 'y' | 'z'] = projectedX * axes.horizontal.sign;
  world[axes.vertical.id as 'x' | 'y' | 'z'] = projectedY * axes.vertical.sign;
  return world;
}

export function coordinateRanges(descriptor: ViewportDescriptor | null | undefined): CoordinateRanges | null {
  const size = descriptor?.panelSize;
  if (!size || !descriptor?.axes) return null;
  const halfW = Math.abs(size.w) / 2;
  const halfH = Math.abs(size.h) / 2;
  const values = ([
    worldFromArtboardPoint({ descriptor, point: { x: -halfW, y: -halfH } }),
    worldFromArtboardPoint({ descriptor, point: { x: halfW, y: -halfH } }),
    worldFromArtboardPoint({ descriptor, point: { x: -halfW, y: halfH } }),
    worldFromArtboardPoint({ descriptor, point: { x: halfW, y: halfH } }),
  ] as Array<NullableWorldPoint | null>).filter((value): value is NullableWorldPoint => Boolean(value));
  if (!values.length) return null;
  const horizontal = values
    .map((world) => world[descriptor.axes?.horizontal.id as 'x' | 'y' | 'z'])
    .filter((value): value is number => typeof value === 'number');
  const vertical = values
    .map((world) => world[descriptor.axes?.vertical.id as 'x' | 'y' | 'z'])
    .filter((value): value is number => typeof value === 'number');
  if (!horizontal.length || !vertical.length) return null;
  return {
    horizontal: [Math.min(...horizontal), Math.max(...horizontal)],
    vertical: [Math.min(...vertical), Math.max(...vertical)],
  };
}

export function niceStep(span: unknown, targetCount = 6): number {
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
}: {
  descriptor?: ViewportDescriptor | null;
  panelSize?: PanelSize | null;
  step?: unknown;
  pixelsPerArtboardUnit?: unknown;
  targetSpacing?: number;
} = {}): CoordinateTicks | null {
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

function tickAxis({
  range,
  axis,
  frame,
  scale,
  orientation,
  step,
}: {
  range: [number, number] | null | undefined;
  axis: Axis;
  frame: DescriptorFrame | null;
  scale: number;
  orientation: 'horizontal' | 'vertical';
  step: number;
}): TickAxis {
  const ticks: CoordinateTick[] = [];
  if (!range || !frame || !Number.isFinite(range[0]) || !Number.isFinite(range[1]) || !Number.isFinite(step) || step <= 0) {
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
export function quadPanelLayout(artboardWidth: unknown, artboardHeight: unknown, gap: unknown = null): PanelLayout[] {
  const w = Number(artboardWidth);
  const h = Number(artboardHeight);
  const split = Number.isFinite(Number(gap))
    ? Math.max(0, Number(gap))
    : Math.max(8, Math.min(w, h) * 0.025);
  const panelW = (w - split) / 2;
  const panelH = (h - split) / 2;
  const centers: Array<Omit<PanelLayout, 'w' | 'h'>> = [
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

export function panelAtPoint(panels: ReadonlyArray<PanelLayout> | null | undefined, point: LocalPoint | null | undefined): PanelLayout | null {
  if (!point || !Array.isArray(panels)) return null;
  for (const panel of panels) {
    if (
      Math.abs(point.x - panel.cx) <= panel.w / 2
      && Math.abs(point.y - panel.cy) <= panel.h / 2
    ) return panel;
  }
  return null;
}

export function localPointInPanel(point: LocalPoint | null | undefined, panel: PanelLayout | null | undefined): LocalPoint | null {
  if (!point || !panel) return null;
  return { x: point.x - panel.cx, y: point.y - panel.cy };
}

function positiveOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export type { ProjectionId };
