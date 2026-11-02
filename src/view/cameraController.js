/**
 * view/cameraController.js — pure camera state transitions.
 */

const TAU = Math.PI * 2;
// The camera sits at the origin and fov is its distance to the projection
// plane. Below ~10 the camera can enter ordinary scene geometry, which makes
// the view collapse into clipped radial lines. Keep a usable wide-angle limit.
export const MIN_CAMERA_FOV = 10;
export const MAX_CAMERA_FOV = 2000;

export function wrapPi(angle) {
  let a = angle;
  while (a > Math.PI) a -= TAU;
  while (a <= -Math.PI) a += TAU;
  return a;
}

export function clamp(value, lo, hi) {
  if (!Number.isFinite(value)) return lo;
  return Math.min(hi, Math.max(lo, value));
}

export function orbitCamera(camera, start, dx, dy) {
  return {
    ...camera,
    yaw: wrapPi(start.yaw - dx * (Math.PI / 180)),
    pitch: clamp(start.pitch + dy * (Math.PI / 180), -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05),
  };
}

export function zoomCamera(camera, delta) {
  const factor = delta > 0 ? 1.08 : 1 / 1.08;
  return { ...camera, fov: clamp(camera.fov * factor, MIN_CAMERA_FOV, MAX_CAMERA_FOV) };
}
