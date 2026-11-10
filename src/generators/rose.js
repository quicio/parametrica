/**
 * rose.js — rhodonea curves: r = cos(k·θ), k = n/d.
 */

import { Generators } from '../core/registry.ts';
import { TYPE } from '../core/schema.ts';
import { genId, isClosedPolyline, postProcess, roseTurns, TAU } from './helpers.js';
import { sampleUniform, sampleAdaptive } from '../sampling/sampling.js';

Generators.register({
  id: 'rose',
  name: 'Rose Curve',
  category: 'classic',
  params: {
    n: { label: 'Petals (n)', type: TYPE.NUMBER, min: 1, max: 16, step: 1, default: 7 },
    d: { label: 'Density (d)', type: TYPE.NUMBER, min: 1, max: 9, step: 1, default: 3 },
    radius: { label: 'Radius', type: TYPE.NUMBER, min: 20, max: 600, step: 1, default: 300 },
    phase: { label: 'Phase', type: TYPE.NUMBER, min: 0, max: TAU, step: 0.01, default: 0 },
    samples: { advanced: true, label: 'Samples', type: TYPE.NUMBER, min: 64, max: 12000, step: 1, default: 1200 },
    adaptive: { advanced: true, label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true },
    fit: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340, doc: '0 = keep native scale' },
  },

  domain: (p) => ({ t0: 0, t1: TAU * roseTurns(p.n, p.d), closed: true }),

  sample(p) {
    const turns = roseTurns(p.n, p.d);
    const t1 = TAU * turns;
    const k = p.n / p.d;
    const fn = (theta) => {
      const r = p.radius * Math.cos(k * theta + p.phase);
      return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
    };
    const points = p.adaptive
      ? sampleAdaptive(fn, 0, t1, {
        minSteps: Math.min(768, p.samples),
        samples: p.samples,
        maxDepth: 8,
      })
      : sampleUniform(fn, 0, t1, p.samples);
    return postProcess([{
      id: genId('rose'), points, closed: isClosedPolyline(points), meta: { source: 'rose', turns },
    }], p);
  },
});
