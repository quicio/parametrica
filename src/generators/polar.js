/**
 * polar.js — polar equations r(θ), converted to curves automatically.
 *
 *   r = cos(k·θ)   r = a + b·cos(θ)   r = e^(cos θ)   r = anything.
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { compileOrThrow, makeScope, postProcess, genId, TAU } from './helpers.js';
import { sampleUniform, sampleAdaptive } from '../sampling/sampling.js';

Generators.register({
  id: 'polar',
  name: 'Polar Equation',
  category: 'classic',
  params: {
    exprR: {
      label: 'r(θ)', type: TYPE.EXPRESSION,
      default: '2 + cos(5*theta)',
      doc: 'radius as a function of theta (and time).',
    },
    theta0: { label: 'θ min', type: TYPE.NUMBER, min: -200, max: 200, step: 0.01, default: 0 },
    turns: { label: 'Turns', type: TYPE.NUMBER, min: 1, max: 64, step: 1, default: 1 },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 32, max: 12000, step: 1, default: 900 },
    adaptive: { label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true },
    closed: { label: 'Closed', type: TYPE.BOOLEAN, default: true },
    fit: { label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340 },
  },

  domain: (p) => ({ t0: p.theta0, t1: p.theta0 + TAU * p.turns, closed: p.closed }),

  sample(params, ctx) {
    const fnR = compileOrThrow(params.exprR, 'r(θ)');
    const scope = makeScope(ctx);
    const t1 = params.theta0 + TAU * params.turns;
    const fn = (theta) => {
      scope.t = theta;
      scope.theta = theta;
      const r = fnR(scope);
      if (!Number.isFinite(r)) throw new Error(`non-finite radius at θ=${theta.toFixed(4)}`);
      return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
    };
    const points = params.adaptive
      ? sampleAdaptive(fn, params.theta0, t1, { minSteps: Math.min(256, params.samples), samples: params.samples })
      : sampleUniform(fn, params.theta0, t1, params.samples);
    const curve = { id: genId('polar'), points, closed: params.closed, meta: { source: 'polar' } };
    return postProcess([curve], params);
  },
});
