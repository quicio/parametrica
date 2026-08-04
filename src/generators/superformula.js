/**
 * superformula.js — Johan Gielis' superformula.
 *
 *   r(θ) = ( |cos(m·θ/4)/a|^n2 + |sin(m·θ/4)/b|^n3 )^(−1/n1)
 *
 * One equation, thousands of glyph families.
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { genId, TAU } from './helpers.js';
import { sampleAdaptive } from '../sampling/sampling.js';

const EPS = 1e-9;

Generators.register({
  id: 'superformula',
  name: 'Superformula',
  category: 'classic',
  params: {
    m: { label: 'Symmetry (m)', type: TYPE.NUMBER, min: 0, max: 24, step: 0.25, default: 6 },
    n1: { label: 'n1', type: TYPE.NUMBER, min: 0.05, max: 20, step: 0.01, default: 0.9 },
    n2: { label: 'n2', type: TYPE.NUMBER, min: 0.05, max: 20, step: 0.01, default: 1.2 },
    n3: { label: 'n3', type: TYPE.NUMBER, min: 0.05, max: 20, step: 0.01, default: 1.2 },
    a: { label: 'a', type: TYPE.NUMBER, min: 0.1, max: 4, step: 0.01, default: 1 },
    b: { label: 'b', type: TYPE.NUMBER, min: 0.1, max: 4, step: 0.01, default: 1 },
    radius: { label: 'Radius', type: TYPE.NUMBER, min: 20, max: 600, step: 1, default: 280 },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 64, max: 12000, step: 1, default: 1000 },
  },

  domain: () => ({ t0: 0, t1: TAU, closed: true }),

  sample(p) {
    const points = sampleAdaptive(
      (theta) => {
        const term1 = Math.pow(Math.abs(Math.cos((p.m * theta) / 4) / p.a), p.n2);
        const term2 = Math.pow(Math.abs(Math.sin((p.m * theta) / 4) / p.b), p.n3);
        const r = p.radius * Math.pow(Math.max(term1 + term2, EPS), -1 / p.n1);
        return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      },
      0, TAU, { minSteps: Math.min(384, p.samples) },
    );
    return [{ id: genId('superformula'), points, closed: true, meta: { source: 'superformula' } }];
  },
});
