/**
 * view/camera.js — pinhole camera state and projection.
 *
 * Camera orientation is a view concern. World geometry never depends on it.
 */

export const DEFAULT_CAMERA = Object.freeze({
  yaw: -Math.PI / 6,
  pitch: Math.PI / 9,
  fov: 320,
});

export function cameraFrom(view) {
  return view?.camera ?? DEFAULT_CAMERA;
}

/** Project one world point to screen space and normalized depth. */
export function project3D(x, y, z, cam, { depthFade = true, fadeStrength = 0.55 } = {}) {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const fov = cam.fov;
  const xp = x * cy + y * sy;
  const yp = -x * sy * cp + y * cy * cp + z * sp;
  const zp = x * sy * sp - y * cy * sp + z * cp;
  const denom = zp + fov;
  if (Math.abs(denom) < 1e-9) return null;
  const depth = Math.max(0, Math.min(1, (zp + fov) / (2 * fov)));
  return {
    x: (xp * fov) / denom,
    y: (yp * fov) / denom,
    depth,
    depthAlpha: depthFade ? 0.4 + fadeStrength * depth : 1,
  };
}
