/**
 * lissajous.js — x = sin(a·t + δ), y = sin(b·t).
 */

import { Generators } from '../core/registry.ts';
import { TYPE } from '../core/schema.ts';
import type { GeneratorDefinition } from '../core/registry.ts';

interface LissajousParams {
  [key: string]: unknown;
  a: number;
  b: number;
  delta: number;
  ampX: number;
  ampY: number;
  size: number;
  samples: number;
  adaptive: boolean;
}
import { genId, postProcess, isClosedPolyline, lissajousTurns, TAU } from './helpers.js';
import { sampleUniform, sampleAdaptive } from '../sampling/sampling.js';

Generators.register(({
  id: 'lissajous',
  name: 'Lissajous',
  category: 'classic',
  params: {
    a: { label: 'Frequency X (a)', type: TYPE.NUMBER, min: 0.25, max: 16, step: 0.25, default: 3 },
    b: { label: 'Frequency Y (b)', type: TYPE.NUMBER, min: 0.25, max: 16, step: 0.25, default: 5 },
    delta: { label: 'Phase δ', type: TYPE.NUMBER, min: 0, max: TAU, step: 0.01, default: Math.PI / 2 },
    ampX: { label: 'Amplitude X', type: TYPE.NUMBER, min: 0.05, max: 2, step: 0.01, default: 1 },
    ampY: { label: 'Amplitude Y', type: TYPE.NUMBER, min: 0.05, max: 2, step: 0.01, default: 1 },
    size: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 40, max: 800, step: 1, default: 340 },
    samples: { advanced: true, label: 'Samples', type: TYPE.NUMBER, min: 64, max: 8000, step: 1, default: 900 },
    adaptive: { advanced: true, label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true },
  },

  domain: (p: LissajousParams) => ({ t0: 0, t1: TAU * lissajousTurns(p.a, p.b), closed: true }),

  sample(p: LissajousParams): unknown[] {
    const turns = lissajousTurns(p.a, p.b);
    const t1 = TAU * turns;
    const fn = (t: number) => ({ x: p.ampX * Math.sin(p.a * t + p.delta), y: p.ampY * Math.sin(p.b * t) });
    const points = p.adaptive
      ? sampleAdaptive(fn, 0, t1, {
        minSteps: Math.min(768, p.samples),
        samples: p.samples,
        maxDepth: 8,
      })
      : sampleUniform(fn, 0, t1, p.samples);
    return postProcess([{
      id: genId('lissajous'), points, closed: isClosedPolyline(points), meta: { source: 'lissajous', turns },
    }], { fit: p.size });
  },
}) as unknown as GeneratorDefinition);
