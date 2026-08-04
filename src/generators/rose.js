/**
 * rose.js — rhodonea curves: r = cos(k·θ), k = n/d.
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { genId, TAU } from './helpers.js';
import { sampleAdaptive } from '../sampling/sampling.js';

Generators.register({
  id: 'rose',
  name: 'Rose Curve',
  category: 'classic',
  params: {
    n: { label: 'Petals (n)', type: TYPE.NUMBER, min: 1, max: 16, step: 1, default: 7 },
    d: { label: 'Density (d)', type: TYPE.NUMBER, min: 1, max: 9, step: 1, default: 3 },
    radius: { label: 'Radius', type: TYPE.NUMBER, min: 20, max: 600, step: 1, default: 300 },
    phase: { label: 'Phase', type: TYPE.NUMBER, min: 0, max: TAU, step: 0.01, default: 0 },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 64, max: 12000, step: 1, default: 1200 },
  },

  domain: (p) => ({ t0: 0, t1: TAU * p.d, closed: true }),

  sample(p) {
    const k = p.n / p.d;
    const points = sampleAdaptive(
      (theta) => {
        const r = p.radius * Math.cos(k * theta + p.phase);
        return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      },
      0, TAU * p.d, { minSteps: Math.min(384, p.samples) },
    );
    return [{ id: genId('rose'), points, closed: true, meta: { source: 'rose' } }];
  },
});
