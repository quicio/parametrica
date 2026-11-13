/** Explicit coordinate spaces and the single world→artboard transform. */

import { bbox } from '../sampling/sampling.js';
import { cameraFrom, project3D } from './camera.ts';
import type { CameraState, Projected3D } from './camera.ts';

export const SPACE = Object.freeze({
  PARAMETER: 'parameter',
  WORLD: 'world',
  ARTBOARD: 'artboard',
  MIXED: 'mixed',
  DEVICE: 'device',
});

export const FRAME_MODES = Object.freeze(['composition', 'scene', 'world']);
export const FRAME_ANCHORS = Object.freeze(['bbox', 'world-origin']);

export const DEFAULT_FRAME = Object.freeze({
  // scene: one frame for every spatial layer (preserves relative positions).
  // composition: one frame per layer (legacy artistic composition).
  // world: fixed scale anchored at the world origin.
  mode: 'scene',
  anchor: 'bbox',
  fit: null,
  scale: null,
});

const EPS = 1e-9;

export type ProjectionId = '3d' | 'xy' | 'xz' | 'yz';
export type FrameMode = typeof FRAME_MODES[number];
export type FrameAnchor = typeof FRAME_ANCHORS[number];

export interface Frame {
  mode: string;
  anchor: string;
  fit: number | null;
  scale: number | null;
}
export interface ViewPoint {
  x: number;
  y: number;
  z?: number;
  [key: string]: unknown;
}
export interface BoundsLike {
  width: number;
  height: number;
  cx: number;
  cy: number;
  [key: string]: unknown;
}
export interface ProjectedViewPoint extends Projected3D {
  visible: boolean;
  [key: string]: unknown;
}
export interface ResolvedFrame {
  mode: string;
  anchor: 'bbox' | 'world-origin';
  fit: number;
  scale: number;
  tx: number;
  ty: number;
  bounds: BoundsLike | null;
}
export interface ArtboardRectLike {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
}
export interface ViewTransform {
  space: string;
  projection: string;
  camera: CameraState;
  frame: ResolvedFrame;
  artboard: unknown;
  project(point: ViewPoint): ProjectedViewPoint | null;
  applyFrame<T extends ViewPoint>(point: T | null | undefined): (T & { space: string }) | null;
  toArtboard<T extends ViewPoint>(point: T): (T & { space: string }) | null;
  toDevice(point: ViewPoint | null | undefined, artboardRect: ArtboardRectLike | null | undefined): { x: number; y: number } | null;
}
export interface ProjectPointOptions {
  depthFade?: boolean;
  fadeStrength?: number;
}

export function createFrame(raw: unknown = {}): Frame {
  return { ...DEFAULT_FRAME, ...(raw && typeof raw === 'object' ? raw as Partial<Frame> : {}) } as Frame;
}

/** Normalize a persisted or partial frame. Unknown values fall back safely. */
export function sanitizeFrame(raw: unknown, fallback: Frame = DEFAULT_FRAME): Frame {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const mode = FRAME_MODES.includes(source.mode as FrameMode) ? source.mode as FrameMode : fallback.mode;
  const anchor = FRAME_ANCHORS.includes(source.anchor as FrameAnchor)
    ? source.anchor as FrameAnchor
    : (mode === 'world' ? 'world-origin' : fallback.anchor);
  return {
    mode,
    anchor,
    fit: nonNegativeOrNull(source.fit),
    scale: positiveOrNull(source.scale),
  };
}

function nonNegativeOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function positiveOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/**
 * Pull the camera back far enough that ordinary scene geometry stays in front
 * of it. The document camera orbits at radius fov, which is also its distance
 * to the projection plane. One effective camera is resolved per scene/layer
 * and is shared by curves, meshes, references and picking.
 */
export function resolveEffectiveCamera(
  camera: CameraState | null | undefined,
  pointLists: ReadonlyArray<ReadonlyArray<{ x?: unknown; y?: unknown; z?: unknown }>> = [],
): CameraState {
  const cam = camera ?? cameraFrom(null);
  let radius = 0;
  for (const points of pointLists) {
    for (const point of points ?? []) {
      const x = Number(point?.x);
      const y = Number(point?.y);
      const z = Number(point?.z);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const distance = Math.hypot(x, y, Number.isFinite(z) ? z : 0);
      if (distance > radius) radius = distance;
    }
  }
  const minimum = radius * 1.1;
  return cam.fov >= minimum ? cam : { ...cam, fov: minimum };
}

/** Project one world point to view space. Returns null behind the near plane. */
export function projectPointToView<T extends ViewPoint>(
  point: T,
  projection: ProjectionId = '3d',
  camera: CameraState | null = null,
  options: ProjectPointOptions = {},
): (ProjectedViewPoint & T) | null {
  if (projection === '3d') {
    const projected = project3D(point.x, point.y, Number(point.z ?? 0), camera ?? cameraFrom(null), options);
    return projected ? { ...point, ...projected, visible: true } : null;
  }
  const x = point.x;
  const y = point.y;
  const z = Number(point.z ?? 0);
  let px = x;
  let py = -y;
  if (projection === 'xz') {
    px = x;
    py = -z;
  } else if (projection === 'yz') {
    px = -y;
    py = -z;
  }
  return { ...point, x: px, y: py, depth: 0, depthAlpha: 1, visible: true };
}

export function projectPointsToView<T extends ViewPoint>(
  points: ReadonlyArray<T> | null | undefined,
  projection: ProjectionId,
  camera: CameraState | null,
  options: ProjectPointOptions = {},
): Array<ProjectedViewPoint & T> {
  const out: Array<ProjectedViewPoint & T> = [];
  for (const point of points ?? []) {
    const projected = projectPointToView(point, projection, camera, options);
    if (projected) out.push(projected);
  }
  return out;
}

export function boundsOfProjectedPoints(
  points: ReadonlyArray<{ x?: number; y?: number } | null | undefined> | null | undefined,
): BoundsLike | null {
  const visible = (points ?? []).filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!visible.length) return null;
  return bbox(visible as Array<{ x: number; y: number }>) as BoundsLike;
}

/**
 * Resolve the frame scale and translation from projected bounds.
 *
 * fit > 0 matches the legacy behavior: scale the largest bbox side to `fit`
 * artboard units and center the bbox. fit = 0 keeps native projected units
 * but still centers the bbox unless the anchor is the world origin.
 */
export function resolveFrame({
  bounds = null,
  mode = 'composition',
  anchor = 'bbox',
  fit = null,
  scale = null,
  projectedOrigin = { x: 0, y: 0 },
}: {
  bounds?: BoundsLike | null;
  mode?: string | undefined;
  anchor?: string | undefined;
  fit?: number | null | undefined;
  scale?: number | null | undefined;
  projectedOrigin?: { x: number; y: number } | null | undefined;
} = {}): ResolvedFrame {
  const fitSize = Number(fit);
  const hasFit = Number.isFinite(fitSize) && fitSize > 0;
  const box = bounds;
  const degenerate = !box || Math.hypot(box.width, box.height) < EPS;

  let resolvedScale = 1;
  if (hasFit) {
    if (!degenerate && box) {
      resolvedScale = fitSize / Math.max(box.width, box.height, EPS);
    }
  } else {
    const candidate = Number(scale);
    if (Number.isFinite(candidate) && candidate > 0) resolvedScale = candidate;
  }

  const useOrigin = mode === 'world' || anchor === 'world-origin';
  let tx = 0;
  let ty = 0;
  if (useOrigin) {
    tx = -(projectedOrigin?.x ?? 0) * resolvedScale;
    ty = -(projectedOrigin?.y ?? 0) * resolvedScale;
  } else if (box && !degenerate) {
    tx = -box.cx * resolvedScale;
    ty = -box.cy * resolvedScale;
  }

  return {
    mode,
    anchor: useOrigin ? 'world-origin' : 'bbox',
    fit: hasFit ? fitSize : 0,
    scale: resolvedScale,
    tx,
    ty,
    bounds: box,
  };
}

/**
 * Create the immutable mapping W→A for one scene or one composition layer.
 * Callers project geometry with `projectPointToView`/`applyFrame` to avoid
 * projecting each point twice.
 */
export function createViewTransform({
  projection = '3d',
  camera = null,
  frame = DEFAULT_FRAME,
  artboard = null,
  bounds = null,
  projectedOrigin = null,
  depthFade = true,
  depthStrength = 0.55,
}: {
  projection?: ProjectionId;
  camera?: CameraState | null;
  frame?: Frame | Partial<Frame>;
  artboard?: unknown;
  bounds?: BoundsLike | null;
  projectedOrigin?: { x: number; y: number } | null;
  depthFade?: boolean;
  depthStrength?: number;
} = {}): ViewTransform {
  const effectiveCamera = camera ?? cameraFrom(null);
  const origin = projectedOrigin
    ?? projectPointToView({ x: 0, y: 0, z: 0 }, projection, effectiveCamera, { depthFade, fadeStrength: depthStrength })
    ?? { x: 0, y: 0 };
  const resolved = resolveFrame({
    bounds,
    mode: frame.mode,
    anchor: frame.anchor,
    fit: frame.fit,
    scale: frame.scale,
    projectedOrigin: origin,
  });

  return {
    space: SPACE.WORLD,
    projection,
    camera: effectiveCamera,
    frame: resolved,
    artboard,
    project(point: ViewPoint) {
      return projectPointToView(point, projection, effectiveCamera, { depthFade, fadeStrength: depthStrength });
    },
    applyFrame<T extends ViewPoint>(point: T | null | undefined): (T & { space: string }) | null {
      if (!point) return null;
      return {
        ...point,
        x: point.x * resolved.scale + resolved.tx,
        y: point.y * resolved.scale + resolved.ty,
        space: SPACE.ARTBOARD,
      };
    },
    toArtboard<T extends ViewPoint>(point: T): (T & { space: string }) | null {
      return this.applyFrame(this.project(point) as T | null);
    },
    toDevice(point: ViewPoint | null | undefined, artboardRect: ArtboardRectLike | null | undefined) {
      if (!point || !artboardRect) return null;
      return {
        x: artboardRect.x + artboardRect.w / 2 + point.x * artboardRect.scale,
        y: artboardRect.y + artboardRect.h / 2 + point.y * artboardRect.scale,
      };
    },
  };
}
