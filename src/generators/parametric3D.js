/**
 * parametric3D.js — 3D parametric curves projected to 2D.
 *
 * The engine and renderer are 2D, but parametric surfaces like a helix,
 * torus, or cone are fundamentally 3D. This generator lets the user
 * write x3d(t), y3d(t), z3d(t) and projects the resulting point cloud
 * to screen-space via a fixed-pivot yaw + pitch + FOV camera.
 *
 * Camera model (right-handed, looking down +Z toward origin):
 *   yaw   : rotation around the world Z axis (turntable).
 *   pitch : rotation around the camera's X axis (tilt up/down).
 *   fov   : "lens length" — the distance from camera to projection
 *           plane. Larger fov ≈ telephoto (less perspective); smaller
 *           fov ≈ wide-angle (more dramatic depth).
 *
 * The projection is a pinhole camera:
 *
 *   // rotate world by yaw then pitch
 *   x' =  x·cos(yaw) + y·sin(yaw)
 *   y' = -x·sin(yaw)·cos(pitch) + y·cos(yaw)·cos(pitch) + z·sin(pitch)
 *   z' =  x·sin(yaw)·sin(pitch) - y·cos(yaw)·sin(pitch) + z·cos(pitch)
 *   // pinhole: project onto plane at z' = fov
 *   X =  (x' · fov) / (z' + fov)
 *   Y =  (y' · fov) / (z' + fov)
 *
 * The +fov offset on z' prevents division-by-zero when points are at
 * the camera plane.
 *
 * Per-point depth is computed during sampling and attached to each
 * point's meta (`.depth`, `.depthAlpha`) so the renderer can fade the
 * stroke by depth — closer curves read brighter, farther ones dimmer.
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { compileOrThrow, makeScope, postProcess, TAU } from './helpers.js';

const EPS = 1e-9;

Generators.register({
  id: 'parametric-3d',
  name: 'Parametric 3D (projected)',
  category: '3d',
  params: {
    exprX: {
      label: 'x(t)', type: TYPE.EXPRESSION,
      default: 'cos(t)',
      doc: '3D x-coordinate as a function of t.',
    },
    exprY: {
      label: 'y(t)', type: TYPE.EXPRESSION,
      default: 'sin(t)',
      doc: '3D y-coordinate as a function of t.',
    },
    exprZ: {
      label: 'z(t)', type: TYPE.EXPRESSION,
      default: '0.2*t',
      doc: '3D z-coordinate as a function of t.',
    },
    t0:    { label: 't min', type: TYPE.NUMBER, min: -2 * TAU, max: 2 * TAU, step: 0.05, default: 0,
             doc: 'Start of the parameter domain. Range ±2π; type larger values by hand.' },
    t1:    { label: 't max', type: TYPE.NUMBER, min: 0, max: 4 * TAU, step: 0.05, default: TAU * 3,
             doc: 'End of the parameter domain. Range 0..4π; type larger values by hand.' },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 32, max: 8000, step: 1, default: 600 },

    // yaw/pitch/fov used to live as generator params; they moved to
    // document.view.camera so they can be driven by canvas drag and
    // shared across generators. The sample() function falls back to
    // a built-in isometric if view.camera is absent (only happens for
    // malformed documents — sanitized docs always have it).

    depthOcclusion: {
      label: 'Depth Fade', type: TYPE.BOOLEAN,
      default: true,
      doc: 'Modulate stroke alpha by depth so closer curves read brighter.',
    },
    depthAttenuation: {
      label: 'Fade Strength', type: TYPE.NUMBER,
      min: 0, max: 1, step: 0.01,
      default: 0.55,
    },
    fit: { label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340,
           doc: '0 = keep native scale.' },
  },

  domain: (p) => ({ t0: p.t0, t1: p.t1, closed: false }),

  sample(params, ctx) {
    const fnX = compileOrThrow(params.exprX, 'x(t)', 'exprX');
    const fnY = compileOrThrow(params.exprY, 'y(t)', 'exprY');
    const fnZ = compileOrThrow(params.exprZ, 'z(t)', 'exprZ');

    // Camera state lives on the document (view.camera) so it persists
    // with presets and is shared across generators. If absent (malformed
    // document) we fall back to the classic isometric defaults.
    const cam = ctx.document?.view?.camera ?? {
      yaw: -Math.PI / 6, pitch: Math.PI / 9, fov: 320,
    };
    const cy = Math.cos(cam.yaw);
    const sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch);
    const sp = Math.sin(cam.pitch);
    const fov = cam.fov;
    const depthFade = params.depthOcclusion;
    const fadeK = params.depthAttenuation;

    const scope = makeScope(ctx);
    const { t0, t1, samples } = params;

    /**
     * Uniform sampling with per-point depth. We re-derive (X, Y) for
     * each t (no caching) because depth has to be computed at the
     * same time as the projected coordinates.
     */
    const n = Math.max(2, Math.floor(samples));
    const points = new Array(n);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const t = t0 + ((t1 - t0) * i) / (n - 1);
      scope.t = t;
      scope.theta = t;
      const x = fnX(scope);
      const y = fnY(scope);
      const z = fnZ(scope);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      // Rotate: yaw around Z, then pitch around X (camera frame).
      const xp =  x * cy + y * sy;
      const yp = -x * sy * cp + y * cy * cp + z * sp;
      const zp =  x * sy * sp - y * cy * sp + z * cp;
      const denom = zp + fov;
      if (Math.abs(denom) < EPS) continue;
      const X = (xp * fov) / denom;
      const Y = (yp * fov) / denom;
      // Normalized depth: 0 = far, 1 = near.
      const depth = Math.max(0, Math.min(1, (zp + fov) / (2 * fov)));
      points[k++] = {
        x: X,
        y: Y,
        depth,
        depthAlpha: depthFade ? 0.4 + fadeK * depth : 1,
      };
    }
    if (k < 2) return [];
    points.length = k;

    const curve = {
      id: `parametric-3d-${Date.now()}`,
      points,
      closed: false,
      meta: { source: 'parametric-3d' },
    };
    return postProcess([curve], params);
  },
});
