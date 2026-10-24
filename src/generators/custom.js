/**
 * custom.js — free multi-line user programs.
 *
 * The user writes a program with intermediate variables; each sample
 * evaluates the program and reads `x` and `y` (or `r`, interpreted as
 * polar with θ = t) from the resulting scope.
 *
 *   k = 3
 *   x = sin(k*t) + 0.25*sin(11*t)
 *   y = cos(2*t) - 0.4*cos(7*t)
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { compileOrThrow, makeScope, postProcess, genId, TAU } from './helpers.js';
import { sampleUniform, sampleAdaptive } from '../sampling/sampling.js';

Generators.register({
  id: 'custom',
  name: 'Custom Equations',
  category: 'lab',
  params: {
    source: {
      label: 'Program', type: TYPE.SOURCE,
      default: 'k = 3\nx = sin(k*t) + 0.25*sin(11*t)\ny = cos(2*t) - 0.4*cos(7*t)',
      doc: 'Multi-line program. Must assign x and y (or r for polar).',
    },
    t0: { label: 't min', type: TYPE.NUMBER, min: -200, max: 200, step: 0.01, default: 0 },
    t1: { label: 't max', type: TYPE.NUMBER, min: -200, max: 200, step: 0.01, default: TAU },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 32, max: 8000, step: 1, default: 700 },
    adaptive: { label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true },
    closed: { label: 'Closed', type: TYPE.BOOLEAN, default: true },
    fit: { label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340 },
  },

  domain: (p) => ({ t0: p.t0, t1: p.t1, closed: p.closed }),

  sample(params, ctx) {
    const program = compileOrThrow(params.source, 'program', 'source');
    const scope = makeScope(ctx);
    const fn = (t) => {
      scope.t = t;
      scope.theta = t;
      scope.x = undefined;
      scope.y = undefined;
      scope.r = undefined;
      program(scope);
      if (typeof scope.x === 'number' && typeof scope.y === 'number') {
        if (!Number.isFinite(scope.x) || !Number.isFinite(scope.y)) {
          throw new Error(`non-finite point at t=${t.toFixed(4)}`);
        }
        return { x: scope.x, y: scope.y };
      }
      if (typeof scope.r === 'number') {
        return { x: scope.r * Math.cos(t), y: scope.r * Math.sin(t) };
      }
      throw new Error('program must assign x and y (or r)');
    };
    const points = params.adaptive
      ? sampleAdaptive(fn, params.t0, params.t1, { minSteps: Math.min(256, params.samples), samples: params.samples })
      : sampleUniform(fn, params.t0, params.t1, params.samples);
    const curve = { id: genId('custom'), points, closed: params.closed, meta: { source: 'custom' } };
    return postProcess([curve], params);
  },
});
