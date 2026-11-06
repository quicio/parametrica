/**
 * orbit-camera.test.mjs — the 3D camera orbits the whole sphere.
 *
 * Regression for the previous turntable model, where the eye stayed below
 * the Z=0 plane and pitch only moved it toward the horizon. The camera now
 * orbits at radius fov around the origin with world +Z up.
 */

import { project3D, DEFAULT_CAMERA } from '../../src/view/camera.js';
import { orbitCamera } from '../../src/view/cameraController.js';
import { rayForArtboardPoint } from '../../src/interaction/ray.js';

const CAM = Object.freeze({ yaw: 0, pitch: 0, fov: 320 });

function rayRoundTrip(camera, point) {
  const projected = project3D(point.x, point.y, point.z, camera);
  if (!projected) return {
    visible: false,
  };
  const ray = rayForArtboardPoint({
    point: { x: projected.x, y: projected.y },
    transform: { projection: '3d', camera, frame: { scale: 1, tx: 0, ty: 0 } },
  });
  if (!ray) return { visible: true, error: Infinity };
  const ox = point.x - ray.origin.x;
  const oy = point.y - ray.origin.y;
  const oz = point.z - ray.origin.z;
  const t = ox * ray.direction.x + oy * ray.direction.y + oz * ray.direction.z;
  const cx = ray.origin.x + ray.direction.x * t;
  const cy = ray.origin.y + ray.direction.y * t;
  const cz = ray.origin.z + ray.direction.z * t;
  return {
    visible: true,
    error: Math.hypot(cx - point.x, cy - point.y, cz - point.z),
  };
}

export async function run(assert) {
  // At yaw = pitch = 0 the eye sits on +X and looks toward the origin:
  // +Y is screen-right, +Z is screen-up and +X is toward the viewer.
  const origin = project3D(0, 0, 0, CAM);
  const up = project3D(0, 0, 10, CAM);
  const right = project3D(0, 10, 0, CAM);
  const towardEye = project3D(10, 0, 0, CAM);
  assert(up.y < origin.y && Math.abs(up.x - origin.x) < 1e-9, 'orbit camera keeps +Z vertical on screen');
  assert(right.x > origin.x, 'orbit camera maps +Y to screen-right at yaw 0');
  assert(towardEye.depth < origin.depth, 'orbit camera places the eye on +X at yaw 0');

  // Yaw moves the eye all the way around the vertical axis.
  const flippedRight = project3D(0, 10, 0, { ...CAM, yaw: Math.PI });
  const flippedX = project3D(10, 0, 0, { ...CAM, yaw: Math.PI });
  assert(flippedRight.x < origin.x, 'yaw 180° mirrors the horizontal screen direction');
  assert(flippedX.depth > origin.depth, 'yaw 180° moves the eye to the opposite side');

  // Pitch raises the eye above the object and below it; it is not limited
  // to the horizon like the old model.
  const high = { ...CAM, pitch: 1.5 };
  const low = { ...CAM, pitch: -1.5 };
  const topHigh = project3D(0, 0, 200, high);
  const bottomHigh = project3D(0, 0, -200, high);
  const topLow = project3D(0, 0, 200, low);
  const bottomLow = project3D(0, 0, -200, low);
  assert(topHigh.depth < bottomHigh.depth, 'high pitch puts the top of the object closer than the bottom');
  assert(topLow.depth > bottomLow.depth, 'low pitch puts the bottom of the object closer than the top');

  // The picking ray must invert the projection for any orbit position.
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 150 },
    { x: 120, y: 0, z: 20 },
    { x: -40, y: 90, z: 60 },
    { x: 30, y: -80, z: -50 },
  ];
  let worst = 0;
  for (const yaw of [-Math.PI / 3, 0, 1.1, Math.PI]) {
    for (const pitch of [-1.2, -0.4, 0, 0.5, 1.3]) {
      for (const point of points) {
        const result = rayRoundTrip({ ...CAM, yaw, pitch }, point);
        if (!result.visible) continue;
        worst = Math.max(worst, result.error);
      }
    }
  }
  assert(worst < 1e-6, `picking rays invert the orbit projection (worst ${worst.toExponential(2)})`);

  // Dragging clamps pitch away from the poles and wraps yaw.
  const extreme = orbitCamera({ ...DEFAULT_CAMERA }, { yaw: 0, pitch: 0 }, 0, 10000);
  assert(extreme.pitch <= Math.PI / 2 - 0.05 + 1e-9, 'vertical drag clamps before the pole');
  const spun = orbitCamera({ ...DEFAULT_CAMERA }, { yaw: 0, pitch: 0 }, 10000, 0);
  assert(Math.abs(spun.yaw) <= Math.PI + 1e-9, 'horizontal drag wraps yaw into [-π, π]');
}
