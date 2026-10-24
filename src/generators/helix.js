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

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { sampleAdaptive, sampleUniform } from '../sampling/sampling.js';
import { cameraFrom, genId, postProcess, project3D, TAU } from './helpers.js';

const MAX_STRANDS = 2;

Generators.register({
  id: 'helix',
  name: 'Helix (generalized)',
  category: '3d',
  params: {
    theta0: {
      label: 'Start θ', type: TYPE.NUMBER,
      min: -TAU, max: TAU, step: 0.05, default: 0,
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
    samples: {
      label: 'Samples', type: TYPE.NUMBER,
      min: 64, max: 8000, step: 1, default: 1800,
    },
    adaptive: {
      label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true,
    },
    closed: {
      label: 'Closed', type: TYPE.BOOLEAN, default: false,
    },
    fit: {
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

  sample(params, ctx) {
    const {
      theta0, turns, r, p: pitch, a, k, phi, theta, b, m, psi,
      strands, samples, adaptive, closed, fit,
    } = params;
    const t0 = theta0;
    const t1 = theta0 + TAU * turns;
    const count = Math.max(2, Math.floor(samples));
    const cam = cameraFrom(ctx.document?.view);
    const strandCount = Math.max(1, Math.min(MAX_STRANDS, Math.round(strands)));
    const curves = [];

    for (let strand = 0; strand < strandCount; strand++) {
      const phase = phi + strand * Math.PI;
      const twist = theta + strand * Math.PI;
      const pointAt = (t) => {
        const radius = r + a * Math.cos(k * t + phase);
        const x = radius * Math.cos(t + twist);
        const y = radius * Math.sin(t + twist);
        const z = pitch * t + b * Math.sin(m * t + psi);
        const projected = project3D(x, y, z, cam);
        if (!projected) throw new Error(`Camera plane reached at t=${t.toFixed(4)}`);
        return {
          x: projected.x,
          y: projected.y,
          x3: x,
          y3: y,
          h3: z,
          depth: projected.depth,
          depthAlpha: projected.depthAlpha,
        };
      };
      const points = adaptive
        ? sampleAdaptive(pointAt, t0, t1, {
          minSteps: Math.min(256, count),
          samples: count,
        })
        : sampleUniform(pointAt, t0, t1, count);
      if (points.length < 2) continue;
      curves.push({
        id: genId('helix'),
        points,
        closed: Boolean(closed),
        meta: { source: 'helix', strand, true3D: true },
      });
    }

    return postProcess(curves, { fit, center: true });
  },
});
