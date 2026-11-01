/**
 * parametric.js — arbitrary parametric equations x(t), y(t).
 *
 * The heart of the laboratory: the user writes mathematics, the engine
 * samples, normalizes, centers and generates geometry.
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { compileOrThrow, makeScope, sampleParametric, postProcess, genId, TAU } from './helpers.js';

Generators.register({
  id: 'parametric',
  name: 'Parametric Equations',
  category: 'classic',
  params: {
    exprX: {
      label: 'x(t)', type: TYPE.EXPRESSION,
      default: 'sin(3*t) + 0.25*sin(11*t)',
      doc: 'x as a function of t (and time).',
    },
    exprY: {
      label: 'y(t)', type: TYPE.EXPRESSION,
      default: 'cos(2*t) - 0.4*cos(7*t)',
      doc: 'y as a function of t (and time).',
    },
    t0: { advanced: true, label: 't min', type: TYPE.NUMBER, min: -2 * TAU, max: 2 * TAU, step: 0.05, snap: false, default: 0,
           hardMin: -10000, hardMax: 10000,
           doc: 'Start of the parameter domain. The slider covers ±2π; type any value up to ±10000 by hand for long or non-periodic curves.' },
    t1: { advanced: true, label: 't max', type: TYPE.NUMBER, min: 0, max: 4 * TAU, step: 0.05, snap: false, default: TAU,
           hardMin: 0, hardMax: 10000,
           doc: 'End of the parameter domain. The slider covers 0..4π; type any value up to 10000 by hand. Increase Samples for long or high-frequency curves.' },
    samples: { advanced: true, label: 'Samples', type: TYPE.NUMBER, min: 32, max: 8000, hardMax: 50000, step: 1, default: 700,
               doc: 'Resolution of the polyline. The slider covers up to 8000; type up to 50000 by hand for very high-frequency curves.' },
    adaptive: { advanced: true, label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true },
    closed: { advanced: true, label: 'Closed', type: TYPE.BOOLEAN, default: true },
    fit: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340, doc: '0 = keep native scale' },
  },

  domain: (p) => ({ t0: p.t0, t1: p.t1, closed: p.closed }),

  sample(params, ctx) {
    const fnX = compileOrThrow(params.exprX, 'x(t)', 'exprX');
    const fnY = compileOrThrow(params.exprY, 'y(t)', 'exprY');
    const scope = makeScope(ctx);
    const points = sampleParametric(fnX, fnY, { ...params, scope });
    const curve = { id: genId('parametric'), points, closed: params.closed, meta: { source: 'parametric' } };
    return postProcess([curve], params);
  },
});
