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
    t0: { label: 't min', type: TYPE.NUMBER, min: -2 * TAU, max: 2 * TAU, step: 0.05, default: 0,
           doc: 'Start of the parameter domain. Range ±2π: the default sits centered, and any drag off-center changes the visible curve (a ±4π range made every stop a multiple of the 2π period — the curve looked identical no matter where the slider was). Type larger values by hand.' },
    t1: { label: 't max', type: TYPE.NUMBER, min: 0, max: 4 * TAU, step: 0.05, default: TAU,
           doc: 'End of the parameter domain. Range 0..4π (0 to 2 full periods past the start). Type larger values by hand.' },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 32, max: 8000, step: 1, default: 700 },
    adaptive: { label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true },
    closed: { label: 'Closed', type: TYPE.BOOLEAN, default: true },
    fit: { label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340, doc: '0 = keep native scale' },
  },

  domain: (p) => ({ t0: p.t0, t1: p.t1, closed: p.closed }),

  sample(params, ctx) {
    const fnX = compileOrThrow(params.exprX, 'x(t)');
    const fnY = compileOrThrow(params.exprY, 'y(t)');
    const scope = makeScope(ctx);
    const points = sampleParametric(fnX, fnY, { ...params, scope });
    const curve = { id: genId('parametric'), points, closed: params.closed, meta: { source: 'parametric' } };
    return postProcess([curve], params);
  },
});
