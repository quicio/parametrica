/**
 * harmonicOscillator.js — damped, coupled harmonic oscillators.
 *
 *   x(t) = A·e^(−λt)·sin(ωt + φ)
 *   y(t) = B·e^(−μt)·sin(νt + ψ + c·x(t))   ← phase-coupled to x
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { genId, postProcess, TAU } from './helpers.js';
import { sampleUniform, sampleAdaptive } from '../sampling/sampling.js';

Generators.register({
  id: 'harmonic-oscillator',
  name: 'Harmonic Oscillator',
  category: 'lab',
  params: {
    ampX: { label: 'Amplitude X', type: TYPE.NUMBER, min: 0.05, max: 4, step: 0.01, default: 1.2 },
    freqX: { label: 'Frequency X (ω)', type: TYPE.NUMBER, min: 0.1, max: 16, step: 0.05, default: 3 },
    phaseX: { label: 'Phase X (φ)', type: TYPE.NUMBER, min: 0, max: TAU, step: 0.01, default: 0 },
    dampX: { label: 'Damping X (λ)', type: TYPE.NUMBER, min: 0, max: 1, step: 0.005, default: 0.15 },
    ampY: { label: 'Amplitude Y', type: TYPE.NUMBER, min: 0.05, max: 4, step: 0.01, default: 1.2 },
    freqY: { label: 'Frequency Y (ν)', type: TYPE.NUMBER, min: 0.1, max: 16, step: 0.05, default: 4.5 },
    phaseY: { label: 'Phase Y (ψ)', type: TYPE.NUMBER, min: 0, max: TAU, step: 0.01, default: Math.PI / 2 },
    dampY: { label: 'Damping Y (μ)', type: TYPE.NUMBER, min: 0, max: 1, step: 0.005, default: 0.12 },
    coupling: { label: 'Coupling (c)', type: TYPE.NUMBER, min: -4, max: 4, step: 0.01, default: 0.6 },
    duration: { label: 'Duration (T)', type: TYPE.NUMBER, min: 1, max: 100, step: 0.5, default: 19 },
    size: { label: 'Fit Size', type: TYPE.NUMBER, min: 40, max: 800, step: 1, default: 340 },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 64, max: 8000, step: 1, default: 1000 },
    adaptive: { label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true },
  },

  domain: (p) => ({ t0: 0, t1: p.duration, closed: false }),

  sample(p) {
    const fn = (t) => {
      const x = p.ampX * Math.exp(-p.dampX * t) * Math.sin(p.freqX * t + p.phaseX);
      const y = p.ampY * Math.exp(-p.dampY * t) * Math.sin(p.freqY * t + p.phaseY + p.coupling * x);
      return { x, y };
    };
    const points = p.adaptive
      ? sampleAdaptive(fn, 0, p.duration, { minSteps: Math.min(384, p.samples), samples: p.samples })
      : sampleUniform(fn, 0, p.duration, p.samples);
    return postProcess(
      [{ id: genId('oscillator'), points, closed: false, meta: { source: 'harmonic-oscillator' } }],
      { fit: p.size },
    );
  },
});
