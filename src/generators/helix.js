/**
 * helix.js — generalized parametric helix.
 *
 *   x(t) = (r + a·cos(k·t + φ)) · cos(t + θ)
 *   y(t) = (r + a·cos(k·t + φ)) · sin(t + θ)
 *   z(t) = p·t + b·sin(m·t + ψ)
 *
 * `a = 0, b = 0, θ = 0` reduces to the classic circular helix. A second
 * strand (strands = 2) is interleaved by π in both the radial phase and the
 * angular position, producing a true double helix.
 *
 * The generator shares the document camera with parametric-3d and stores the
 * true world coordinates (`x3`, `y3`, `h3`) plus depth metadata so the
 * renderer can offer orthographic views without re-evaluating geometry.
 */

import { Generators } from '../core/registry.ts';
import { TYPE } from '../core/schema.ts';
import { sampleAdaptive, sampleUniform } from '../sampling/sampling.js';
import { cameraFrom, genId, TAU } from './helpers.js';
import { createCurve3D } from '../geometry/contracts.js';
import { projectWorldCurves } from '../view/projection.ts';

const MAX_STRANDS = 2;

Generators.register({
  id: 'helix',
  name: 'Helix (generalized)',
  category: '3d',
  capabilities: { spatial: true, projection: '3d', geometryKind: 'curve3d', supportsFit: true, supportsClosed: true },
  params: {
    theta0: { advanced: true, 
      label: 'Start θ', type: TYPE.NUMBER,
      min: -TAU, max: TAU, step: 0.05, snap: false, default: 0,
      doc: 'Parameter at the start of the curve.',
    },
    turns: {
      label: 'Turns', type: TYPE.NUMBER,
      min: 0.25, max: 24, step: 0.25, default: 6,
      doc: 'Number of full revolutions. The domain spans 2π·turns.',
    },
    r: {
      label: 'Radius', type: TYPE.NUMBER,
      min: 0, max: 400, step: 1, default: 120,
      doc: 'Base radius of the helix.',
    },
    p: {
      label: 'Pitch', type: TYPE.NUMBER,
      min: -100, max: 100, step: 0.5, default: 30,
      doc: 'Linear height per radian: z = p·t.',
    },
    a: {
      label: 'Radial Mod', type: TYPE.NUMBER,
      min: 0, max: 200, step: 1, default: 0,
      doc: 'Amplitude of the radial modulation.',
    },
    k: {
      label: 'Radial Freq', type: TYPE.NUMBER,
      min: 0, max: 24, step: 0.5, default: 3,
      doc: 'Radial lobes per revolution.',
    },
    phi: {
      label: 'Radial Phase', type: TYPE.NUMBER,
      min: -TAU, max: TAU, step: 0.05, default: 0,
      doc: 'Phase of the radial modulation.',
    },
    theta: {
      label: 'Torsion', type: TYPE.NUMBER,
      min: -TAU, max: TAU, step: 0.05, default: 0,
      doc: 'Rotates the whole helix around the z axis.',
    },
    b: {
      label: 'Pitch Ripple', type: TYPE.NUMBER,
      min: 0, max: 200, step: 1, default: 0,
      doc: 'Amplitude of the sinusoidal height ripple.',
    },
    m: {
      label: 'Ripple Freq', type: TYPE.NUMBER,
      min: 0, max: 24, step: 0.5, default: 2,
      doc: 'Frequency of the height ripple.',
    },
    psi: {
      label: 'Ripple Phase', type: TYPE.NUMBER,
      min: -TAU, max: TAU, step: 0.05, default: 0,
      doc: 'Phase of the height ripple.',
    },
    strands: {
      label: 'Strands', type: TYPE.NUMBER,
      min: 1, max: MAX_STRANDS, step: 1, default: 1,
      doc: '2 interleaves a second helix at half a turn.',
    },
    samples: { advanced: true, 
      label: 'Samples', type: TYPE.NUMBER,
      min: 64, max: 8000, step: 1, default: 1800,
    },
    adaptive: { advanced: true, 
      label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true,
    },
    closed: { advanced: true, 
      label: 'Closed', type: TYPE.BOOLEAN, default: false,
    },
    fit: { advanced: true, 
      label: 'Fit Size', type: TYPE.NUMBER,
      min: 0, max: 800, step: 1, default: 340,
      doc: '0 = keep native scale.',
    },
  },

  domain: (p) => ({
    t0: p.theta0,
    t1: p.theta0 + TAU * Math.max(0.25, p.turns),
    closed: Boolean(p.closed),
  }),

  generate(params) {
    const {
      theta0, turns, r, p: pitch, a, k, phi, theta, b, m, psi,
      strands, samples, adaptive, closed,
    } = params;
    const t0 = theta0;
    const t1 = theta0 + TAU * turns;
    const count = Math.max(2, Math.floor(samples));
    const strandCount = Math.max(1, Math.min(MAX_STRANDS, Math.round(strands)));
    const curves = [];

    for (let strand = 0; strand < strandCount; strand++) {
      const phase = phi + strand * Math.PI;
      const twist = theta + strand * Math.PI;
      const pointAt = (t) => {
        const radius = r + a * Math.cos(k * t + phase);
        return {
          x: radius * Math.cos(t + twist),
          y: radius * Math.sin(t + twist),
          z: pitch * t + b * Math.sin(m * t + psi),
        };
      };
      const points = adaptive
        ? sampleAdaptive(pointAt, t0, t1, { minSteps: Math.min(256, count), samples: count })
        : sampleUniform(pointAt, t0, t1, count);
      if (points.length < 2) continue;
      curves.push(createCurve3D({
        id: genId('helix'),
        points,
        closed: Boolean(closed),
        meta: { source: 'helix', strand, true3D: true },
      }));
    }
    return curves;
  },

  sample(params, ctx) {
    const geometry = this.generate(params, ctx);
    const camera = cameraFrom(ctx.document?.view);
    return projectWorldCurves(geometry, {
      camera,
      projection: '3d',
      fit: params.fit,
      depthFade: params.depthOcclusion ?? true,
      depthStrength: params.depthAttenuation ?? 0.55,
    });
  },
});
