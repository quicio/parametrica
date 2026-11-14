/**
 * parametric3D.js — 3D parametric curves projected to 2D.
 *
 * The engine and renderer are 2D, but parametric surfaces like a helix,
 * torus, or cone are fundamentally 3D. This generator lets the user
 * write x3d(t), y3d(t), z3d(t) and projects the resulting point cloud
 * to screen-space via a fixed-pivot yaw + pitch + FOV camera.
 *
 * Camera model (orbit around the world Z axis):
 *   yaw   : azimuth around Z; moves the eye around the object.
 *   pitch : elevation above the XY plane; may rise or fall past it.
 *   fov   : orbit radius and lens length. Larger fov ≈ telephoto
 *           (less perspective); smaller fov ≈ wide-angle.
 *
 * The camera orbits the origin:
 *
 *   eye     = fov·(cos p·cos y, cos p·sin y, sin p)
 *   right   = (−sin y, cos y, 0)
 *   up      = (−sin p·cos y, −sin p·sin y, cos p)
 *   forward = (−cos p·cos y, −cos p·sin y, −sin p)
 *   // pinhole: project onto the plane at forward·p + fov = fov
 *   X = (right·p · fov) / (forward·p + fov)
 *   Y = (up·p    · fov) / (forward·p + fov)
 *
 * The +fov offset prevents division-by-zero at the eye, and the world's
 * +Z axis always reads as vertical on screen.
 *
 * Per-point depth is computed during sampling and attached to each
 * point's meta (`.depth`, `.depthAlpha`) so the renderer can fade the
 * stroke by depth — closer curves read brighter, farther ones dimmer.
 */

import { Generators } from '../core/registry.ts';
import { TYPE } from '../core/schema.ts';
import type { GeneratorDefinition } from '../core/registry.ts';
import type { GeneratorContext } from './context.ts';

interface Parametric3DParams {
  [key: string]: unknown;
  exprX: string; exprY: string; exprZ: string;
  t0: number; t1: number; samples: number;
  depthOcclusion: boolean; depthAttenuation: number; fit: number;
}
import { cameraFrom, compileOrThrow, genId, makeScope, TAU } from './helpers.ts';
import { createCurve3D } from '../geometry/contracts.ts';
import { projectWorldCurves } from '../view/projection.ts';


Generators.register(({
  id: 'parametric-3d',
  name: 'Parametric 3D (projected)',
  category: '3d',
  capabilities: { spatial: true, projection: '3d', geometryKind: 'curve3d', supportsFit: true, supportsClosed: true },
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
    t0: { advanced: true, label: 't min', type: TYPE.NUMBER, min: -2 * TAU, max: 2 * TAU, step: 0.05, snap: false, default: 0,
             doc: 'Start of the parameter domain. Range ±2π; type larger values by hand.' },
    t1: { advanced: true, label: 't max', type: TYPE.NUMBER, min: 0, max: 4 * TAU, step: 0.05, snap: false, default: TAU * 3,
             doc: 'End of the parameter domain. Range 0..4π; type larger values by hand.' },
    samples: { advanced: true, label: 'Samples', type: TYPE.NUMBER, min: 32, max: 8000, step: 1, default: 600 },

    // yaw/pitch/fov used to live as generator params; they moved to
    // document.view.camera so they can be driven by canvas drag and
    // shared across generators. The sample() function falls back to
    // a built-in isometric if view.camera is absent (only happens for
    // malformed documents — sanitized docs always have it).

    depthOcclusion: { advanced: true, 
      label: 'Depth Fade', type: TYPE.BOOLEAN,
      default: true,
      doc: 'Modulate stroke alpha by depth so closer curves read brighter.',
    },
    depthAttenuation: { advanced: true, 
      label: 'Fade Strength', type: TYPE.NUMBER,
      min: 0, max: 1, step: 0.01,
      default: 0.55,
    },
    fit: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340,
           doc: '0 = keep native scale.' },
  },

  domain: (p: Parametric3DParams) => ({ t0: p.t0, t1: p.t1, closed: false }),

  generate(params: Parametric3DParams, ctx: GeneratorContext): unknown[] {
    const fnX = compileOrThrow(params.exprX, 'x(t)', 'exprX');
    const fnY = compileOrThrow(params.exprY, 'y(t)', 'exprY');
    const fnZ = compileOrThrow(params.exprZ, 'z(t)', 'exprZ');
    const scope = makeScope(ctx);
    const { t0, t1, samples } = params;
    const n = Math.max(2, Math.floor(samples));
    const points = [];
    for (let i = 0; i < n; i++) {
      const t = t0 + ((t1 - t0) * i) / (n - 1);
      scope.t = t;
      scope.theta = t;
      const x = fnX(scope);
      const y = fnY(scope);
      const z = fnZ(scope);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      points.push({ x, y, z });
    }
    if (points.length < 2) return [];
    return [createCurve3D({
      id: genId('parametric-3d'),
      points,
      closed: false,
      meta: { source: 'parametric-3d' },
    })];
  },

  sample(params: Parametric3DParams, ctx: GeneratorContext): unknown[] {
    const geometry = (this as unknown as { generate(p: Parametric3DParams, c: GeneratorContext): unknown[] }).generate(params, ctx);
    return projectWorldCurves(geometry as never, {
      camera: cameraFrom((ctx.document as { view?: never } | undefined)?.view ?? null),
      projection: '3d',
      fit: params.fit,
      depthFade: params.depthOcclusion,
      depthStrength: params.depthAttenuation,
    });
  },

}) as unknown as GeneratorDefinition);
