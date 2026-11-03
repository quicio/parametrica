/**
 * interaction/ray.js — pure cursor → artboard → world ray math and triangle
 * intersection. No DOM, renderer or picking state lives here.
 */

const EPS = 1e-9;
const DET_REL_EPS = 1e-10;
const MIN_DET_SCALE = 1e-30;

/**
 * Invert the canvas→artboard half of P5Adapter.artboardRect().
 * `canvasPoint` is in CSS canvas pixels, matching p5 mouseX/mouseY.
 */
export function artboardPointFromCanvas(canvasPoint, artboardRect) {
  const x = Number(canvasPoint?.x);
  const y = Number(canvasPoint?.y);
  const scale = Number(artboardRect?.scale);
  const left = Number(artboardRect?.x);
  const top = Number(artboardRect?.y);
  const width = Number(artboardRect?.w);
  const height = Number(artboardRect?.h);
  if (![x, y, scale, left, top, width, height].every(Number.isFinite) || scale <= 0) return null;
  return {
    x: (x - left - width / 2) / scale,
    y: (y - top - height / 2) / scale,
  };
}

/**
 * Build a world ray for an artboard-space cursor point using the same
 * ViewTransform that produced the scene. The returned direction is unit
 * length, so intersection `t` is a world distance.
 */
export function rayForArtboardPoint({ point, transform, worldBBox = null } = {}) {
  if (!point || !transform?.frame) return null;
  const scale = Number(transform.frame.scale);
  if (!Number.isFinite(scale) || scale <= 0) return null;
  const sx = (Number(point.x) - transform.frame.tx) / scale;
  const sy = (Number(point.y) - transform.frame.ty) / scale;
  if (!Number.isFinite(sx) || !Number.isFinite(sy)) return null;

  if (transform.projection === '3d') {
    const camera = transform.camera;
    const fov = Number(camera?.fov);
    if (!camera || !Number.isFinite(fov) || fov <= 0) return null;
    const cy = Math.cos(camera.yaw);
    const syw = Math.sin(camera.yaw);
    const cp = Math.cos(camera.pitch);
    const sp = Math.sin(camera.pitch);
    // Inverse of project3D's rotation. Camera eye is at (0,0,-fov) in
    // camera space; the projection plane is z = 0.
    const direction = normalize({
      x: cy * sx - syw * cp * sy + syw * sp * fov,
      y: syw * sx + cy * cp * sy - cy * sp * fov,
      z: sp * sy + cp * fov,
    });
    if (!direction) return null;
    return {
      kind: 'perspective',
      projection: '3d',
      origin: {
        x: -fov * syw * sp,
        y: fov * cy * sp,
        z: -fov * cp,
      },
      direction,
      artboardPoint: { x: point.x, y: point.y },
    };
  }

  const box = orthoBounds(worldBBox);
  if (!box) return null;
  const margin = Math.max(1, box.diagonal * 0.01);
  if (transform.projection === 'xy') {
    return {
      kind: 'orthographic',
      projection: 'xy',
      orthoAxis: 'z',
      origin: { x: sx, y: -sy, z: box.maxZ + margin },
      direction: { x: 0, y: 0, z: -1 },
      artboardPoint: { x: point.x, y: point.y },
    };
  }
  if (transform.projection === 'xz') {
    return {
      kind: 'orthographic',
      projection: 'xz',
      orthoAxis: 'y',
      origin: { x: sx, y: box.maxY + margin, z: -sy },
      direction: { x: 0, y: -1, z: 0 },
      artboardPoint: { x: point.x, y: point.y },
    };
  }
  if (transform.projection === 'yz') {
    return {
      kind: 'orthographic',
      projection: 'yz',
      orthoAxis: 'x',
      origin: { x: box.maxX + margin, y: -sx, z: -sy },
      direction: { x: -1, y: 0, z: 0 },
      artboardPoint: { x: point.x, y: point.y },
    };
  }
  return null;
}

/**
 * Double-sided Möller–Trumbore. Returns world ray parameter and barycentric
 * weights ordered as [a, b, c]. Degenerate triangles are ignored.
 */
export function intersectRayTriangle(ray, a, b, c) {
  if (!ray?.origin || !ray?.direction || !a || !b || !c) return null;
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const h = cross(ray.direction, e2);
  const det = dot(e1, h);
  const edgeScale = Math.max(
    MIN_DET_SCALE,
    Math.hypot(e1.x, e1.y, e1.z) * Math.hypot(e2.x, e2.y, e2.z),
  );
  if (!Number.isFinite(det) || Math.abs(det) <= DET_REL_EPS * edgeScale) return null;
  const inv = 1 / det;
  const s = sub(ray.origin, a);
  const u = inv * dot(s, h);
  if (u < -EPS || u > 1 + EPS) return null;
  const q = cross(s, e1);
  const v = inv * dot(ray.direction, q);
  if (v < -EPS || u + v > 1 + EPS) return null;
  const t = inv * dot(e2, q);
  if (!Number.isFinite(t) || t <= 0) return null;
  return {
    t,
    barycentric: {
      a: 1 - u - v,
      b: u,
      c: v,
    },
  };
}

/** Signed depth along the dropped axis, using the implied +axis eye. */
export function orthoDepthForPoint(point, projection) {
  if (projection === 'xy') return { axis: 'z', sign: -1, value: -point.z };
  if (projection === 'xz') return { axis: 'y', sign: -1, value: -point.y };
  if (projection === 'yz') return { axis: 'x', sign: -1, value: -point.x };
  return null;
}

export function pointOnRay(ray, t) {
  return {
    x: ray.origin.x + ray.direction.x * t,
    y: ray.origin.y + ray.direction.y * t,
    z: ray.origin.z + ray.direction.z * t,
  };
}

function orthoBounds(bounds) {
  if (!bounds) return null;
  const values = [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, bounds.minZ, bounds.maxZ];
  if (!values.every(Number.isFinite)) return null;
  const diagonal = Number(bounds.diagonal);
  return {
    maxX: Number(bounds.maxX),
    maxY: Number(bounds.maxY),
    maxZ: Number(bounds.maxZ),
    diagonal: Number.isFinite(diagonal) && diagonal > 0 ? diagonal : 1,
  };
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (!Number.isFinite(length) || length <= EPS) return null;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
