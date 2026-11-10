/**
 * view/transform.js — explicit coordinate spaces and the single world→artboard
 * transform used by the engine, scene builder, canvas and exporters.
 *
 *   P (parameter/domain) --generator--> W (world)
 *   W --camera/orthographic--> V (view/clip)
 *   V --frame--> A (artboard)
 *   A --renderer--> D (device pixels)
 *
 * The transform never mutates geometry. Framing is presentation: it is
 * resolved here, not inside generators. Non-spatial 2D generators keep their
 * legacy contract and emit artboard-space curves directly; spatial generators
 * emit world geometry and are always framed by this module.
 */

import { bbox } from '../sampling/sampling.js';
import { cameraFrom, project3D } from './camera.ts';

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

export function createFrame(raw = {}) {
  return { ...DEFAULT_FRAME, ...(raw && typeof raw === 'object' ? raw : {}) };
}

/** Normalize a persisted or partial frame. Unknown values fall back safely. */
export function sanitizeFrame(raw, fallback = DEFAULT_FRAME) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const mode = FRAME_MODES.includes(source.mode) ? source.mode : fallback.mode;
  const anchor = FRAME_ANCHORS.includes(source.anchor)
    ? source.anchor
    : (mode === 'world' ? 'world-origin' : fallback.anchor);
  return {
    mode,
    anchor,
    fit: nonNegativeOrNull(source.fit),
    scale: positiveOrNull(source.scale),
  };
}

function nonNegativeOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function positiveOrNull(value) {
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
export function resolveEffectiveCamera(camera, pointLists = []) {
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
export function projectPointToView(point, projection = '3d', camera = null, options = {}) {
  if (projection === '3d') {
    const projected = project3D(point.x, point.y, point.z, camera ?? cameraFrom(null), options);
    return projected ? { ...projected, visible: true } : null;
  }
  const x = point.x;
  const y = point.y;
  const z = point.z;
  let px = x;
  let py = -y;
  if (projection === 'xz') {
    px = x;
    py = -z;
  } else if (projection === 'yz') {
    px = -y;
    py = -z;
  }
  return { x: px, y: py, depth: 0, depthAlpha: 1, visible: true };
}

export function projectPointsToView(points, projection, camera, options = {}) {
  const out = [];
  for (const point of points ?? []) {
    const projected = projectPointToView(point, projection, camera, options);
    if (projected) out.push(projected);
  }
  return out;
}

export function boundsOfProjectedPoints(points) {
  const visible = (points ?? []).filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!visible.length) return null;
  return bbox(visible);
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
} = {}) {
  const fitSize = Number(fit);
  const hasFit = Number.isFinite(fitSize) && fitSize > 0;
  const box = bounds;
  const degenerate = !box || Math.hypot(box.width, box.height) < EPS;

  let resolvedScale = 1;
  if (hasFit) {
    if (!degenerate) {
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
} = {}) {
  const effectiveCamera = camera ?? cameraFrom(null);
  const origin = projectedOrigin
    ?? projectPointToView({ x: 0, y: 0, z: 0 }, projection, effectiveCamera, { depthFade, depthStrength })
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
    project(point) {
      return projectPointToView(point, projection, effectiveCamera, { depthFade, depthStrength });
    },
    applyFrame(point) {
      if (!point) return null;
      return {
        ...point,
        x: point.x * resolved.scale + resolved.tx,
        y: point.y * resolved.scale + resolved.ty,
        space: SPACE.ARTBOARD,
      };
    },
    toArtboard(point) {
      return this.applyFrame(this.project(point));
    },
    toDevice(point, artboardRect) {
      if (!point || !artboardRect) return null;
      return {
        x: artboardRect.x + artboardRect.w / 2 + point.x * artboardRect.scale,
        y: artboardRect.y + artboardRect.h / 2 + point.y * artboardRect.scale,
      };
    },
  };
}
