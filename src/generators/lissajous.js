/**
 * lissajous.js — x = sin(a·t + δ), y = sin(b·t).
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { genId, postProcess, isClosedPolyline, TAU } from './helpers.js';
import { sampleUniform, sampleAdaptive } from '../sampling/sampling.js';

Generators.register({
  id: 'lissajous',
  name: 'Lissajous',
  category: 'classic',
  params: {
    a: { label: 'Frequency X (a)', type: TYPE.NUMBER, min: 0.25, max: 16, step: 0.25, default: 3 },
    b: { label: 'Frequency Y (b)', type: TYPE.NUMBER, min: 0.25, max: 16, step: 0.25, default: 5 },
    delta: { label: 'Phase δ', type: TYPE.NUMBER, min: 0, max: TAU, step: 0.01, default: Math.PI / 2 },
    ampX: { label: 'Amplitude X', type: TYPE.NUMBER, min: 0.05, max: 2, step: 0.01, default: 1 },
    ampY: { label: 'Amplitude Y', type: TYPE.NUMBER, min: 0.05, max: 2, step: 0.01, default: 1 },
    size: { label: 'Fit Size', type: TYPE.NUMBER, min: 40, max: 800, step: 1, default: 340 },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 64, max: 8000, step: 1, default: 900 },
    adaptive: { label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true },
  },

  domain: () => ({ t0: 0, t1: TAU, closed: true }),

  sample(p) {
    const fn = (t) => ({ x: p.ampX * Math.sin(p.a * t + p.delta), y: p.ampY * Math.sin(p.b * t) });
    const points = p.adaptive
      ? sampleAdaptive(fn, 0, TAU, { minSteps: Math.min(256, p.samples), samples: p.samples })
      : sampleUniform(fn, 0, TAU, p.samples);
    return postProcess([{
      id: genId('lissajous'), points, closed: isClosedPolyline(points), meta: { source: 'lissajous' },
    }], { fit: p.size });
  },
});
