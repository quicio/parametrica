/**
 * fourier.js — Fourier synthesis laboratory (spec §7).
 *
 *   x(t) = Σ  aᵢ·cos(fᵢ·t + φᵢ)·cos(rotᵢ) + oxᵢ·aᵢ
 *   y(t) = Σ  aᵢ·sin(fᵢ·t + φᵢ)·sin(rotᵢ) + oyᵢ·aᵢ
 *
 * Every harmonic carries frequency, amplitude, phase, rotation and
 * offset. With rot = 0 a harmonic lives purely in X; rot = π/2 purely
 * in Y; in between it traces elliptical epicycles. The user sculpts
 * curves by adding harmonics.
 */

import { Generators } from '../core/registry.ts';
import { TYPE } from '../core/schema.ts';
import type { GeneratorDefinition } from '../core/registry.ts';

interface FourierParams {
  [key: string]: unknown;
  harmonicsX: Array<{ freq: number; amp: number; phase: number; rot: number; ox: number; oy: number }>;
  harmonicsY: Array<{ freq: number; amp: number; phase: number; rot: number; ox: number; oy: number }>;
  samples: number;
  size: number;
}
import { genId, postProcess, isClosedPolyline, TAU } from './helpers.ts';
import { sampleUniform } from '../sampling/sampling.ts';

const DEFAULT_X = [
  { freq: 1, amp: 1, phase: 0, rot: 0, ox: 0, oy: 0 },
  { freq: 3, amp: 0.35, phase: Math.PI / 2, rot: 0, ox: 0, oy: 0 },
];
const DEFAULT_Y = [
  { freq: 2, amp: 0.9, phase: 0, rot: Math.PI / 2, ox: 0, oy: 0 },
];

Generators.register(({
  id: 'fourier',
  name: 'Fourier Synthesis',
  category: 'lab',
  params: {
    harmonicsX: { label: 'x(t) harmonics', type: TYPE.HARMONICS, default: DEFAULT_X },
    harmonicsY: { label: 'y(t) harmonics', type: TYPE.HARMONICS, default: DEFAULT_Y },
    samples: { advanced: true, label: 'Samples', type: TYPE.NUMBER, min: 64, max: 8000, step: 1, default: 900 },
    size: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 40, max: 800, step: 1, default: 340 },
  },

  domain: () => ({ t0: 0, t1: TAU, closed: true }),

  sample(p: FourierParams): unknown[] {
    const terms = [...p.harmonicsX, ...p.harmonicsY];
    const points = sampleUniform((t: number) => {
      let x = 0;
      let y = 0;
      for (const h of terms) {
        const w = h.freq * t + h.phase;
        x += h.amp * (Math.cos(w) * Math.cos(h.rot) + h.ox);
        y += h.amp * (Math.sin(w) * Math.sin(h.rot) + h.oy);
      }
      return { x, y };
    }, 0, TAU, p.samples);
    const curve = {
      id: genId('fourier'), points, closed: isClosedPolyline(points),
      meta: { source: 'fourier', harmonics: terms },
    };
    return postProcess([curve], { fit: p.size });
  },
}) as unknown as GeneratorDefinition);
