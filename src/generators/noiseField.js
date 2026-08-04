/**
 * noiseField.js — integral curve through a seeded simplex flow field.
 *
 * The curve walks the field: heading(t+1) = heading + curl·noise(x·s, y·s).
 * Deterministic under the document seed (spec G6).
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { createNoise2D } from '../math/noise.js';
import { genId, postProcess, TAU } from './helpers.js';

Generators.register({
  id: 'noise-field',
  name: 'Noise Field',
  category: 'lab',
  params: {
    seed: { label: 'Seed', type: TYPE.NUMBER, min: 1, max: 9999, step: 1, default: 7 },
    scale: { label: 'Field Scale', type: TYPE.NUMBER, min: 0.001, max: 0.05, step: 0.0005, default: 0.006 },
    curl: { label: 'Curl', type: TYPE.NUMBER, min: 0.1, max: 6, step: 0.05, default: 1.6 },
    stepSize: { label: 'Step Size', type: TYPE.NUMBER, min: 0.5, max: 12, step: 0.1, default: 2.6 },
    steps: { label: 'Steps', type: TYPE.NUMBER, min: 50, max: 6000, step: 10, default: 1400 },
    startAngle: { label: 'Start Angle', type: TYPE.NUMBER, min: 0, max: TAU, step: 0.01, default: 0 },
    walkers: { label: 'Walkers', type: TYPE.NUMBER, min: 1, max: 12, step: 1, default: 1 },
    size: { label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 0 },
  },

  domain: () => ({ t0: 0, t1: 1, closed: false }),

  sample(p) {
    const noise = createNoise2D(p.seed);
    const curves = [];
    for (let w = 0; w < p.walkers; w++) {
      let x = 0;
      let y = 0;
      let heading = p.startAngle + (w * TAU) / p.walkers;
      const points = [{ x, y }];
      for (let i = 1; i < p.steps; i++) {
        heading += p.curl * noise(x * p.scale, y * p.scale);
        x += Math.cos(heading) * p.stepSize;
        y += Math.sin(heading) * p.stepSize;
        points.push({ x, y });
      }
      curves.push({ id: genId('noise'), points, closed: false, meta: { source: 'noise-field' } });
    }
    return postProcess(curves, { fit: p.size, center: true });
  },
});
