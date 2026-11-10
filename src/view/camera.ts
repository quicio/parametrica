/** Orbit camera state and projection. */

export interface CameraState {
  yaw: number;
  pitch: number;
  fov: number;
}

export interface CameraView {
  camera?: CameraState;
  [key: string]: unknown;
}

export interface Projected3D {
  x: number;
  y: number;
  depth: number;
  depthAlpha: number;
}

export const DEFAULT_CAMERA: Readonly<CameraState> = Object.freeze({
  yaw: -Math.PI / 6,
  pitch: 0.6,
  fov: 320,
});

export function cameraFrom(view: CameraView | null | undefined): CameraState {
  return view?.camera ?? DEFAULT_CAMERA;
}

/**
 * Keep a sliver of geometry between the camera and the projection plane.
 * Without it, points just behind the camera divide by a negative depth and
 * flip across the screen, producing long radial "spark" artifacts.
 */
const NEAR_PLANE_RATIO = 0.01;

export interface Project3DOptions {
  depthFade?: boolean;
  fadeStrength?: number;
}

/** Project one world point to screen space and normalized depth. */
export function project3D(
  x: number,
  y: number,
  z: number,
  cam: CameraState,
  { depthFade = true, fadeStrength = 0.55 }: Project3DOptions = {},
): Projected3D | null {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const fov = cam.fov;
  // Camera-space basis (right, up, forward) dotted with the world point.
  // The eye is the origin of camera space; +Z is world up.
  const xp = -sy * x + cy * y;
  const yp = -sp * cy * x - sp * sy * y + cp * z;
  const zp = -cp * cy * x - cp * sy * y - sp * z;
  const denom = zp + fov;
  const near = Math.max(1e-9, Math.abs(fov) * NEAR_PLANE_RATIO);
  if (denom <= near) return null;
  const depth = Math.max(0, Math.min(1, denom / (2 * fov)));
  return {
    x: (xp * fov) / denom,
    // Canvas Y grows downward, so the camera "up" axis is negated.
    y: (-yp * fov) / denom,
    depth,
    depthAlpha: depthFade ? 0.4 + fadeStrength * depth : 1,
  };
}
