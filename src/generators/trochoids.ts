/**
 * trochoids.js — hypotrochoid, epitrochoid, spirograph.
 *
 *   hypotrochoid: wheel rolling INSIDE a ring
 *   epitrochoid:  wheel rolling OUTSIDE a ring
 *   spirograph:   two trochoids composed (mixed sum)
 *
 * The number of turns needed to close the curve is derived from the
 * gear ratio r/gcd(R, r) so curves close exactly.
 */

import { Generators } from '../core/registry.ts';
import { TYPE } from '../core/schema.ts';
import type { GeneratorDefinition } from '../core/registry.ts';

interface TrochoidParams {
  [key: string]: unknown;
  R: number; r: number; d: number; rotations: number; samples: number; adaptive: boolean; fit: number;
}
interface SpiroParams {
  [key: string]: unknown;
  R1: number; r1: number; d1: number; mode1: string; R2: number; r2: number; d2: number; mode2: string;
  mix: number; rotations: number; samples: number; adaptive: boolean; fit: number;
}
interface SampleOptions { samples: number; adaptive: boolean }
import { genId, isClosedPolyline, postProcess, trochoidTurns, TAU } from './helpers.js';
import { sampleUniform, sampleAdaptive } from '../sampling/sampling.js';

/** Manual rotations override the mathematically derived period. */
function turnsFor(p: TrochoidParams, mode: string): number {
  const manual = Math.round(Number(p.rotations) || 0);
  return manual > 0 ? manual : trochoidTurns(p.R, p.r, mode);
}

/** Sample a trochoid with the uniform/adaptive contract. */
function sampleTrochoid(fn: (t: number) => { x: number; y: number }, t1: number, p: SampleOptions): { x: number; y: number }[] {
  const samples = Math.max(2, Math.floor(p.samples));
  return p.adaptive
    ? sampleAdaptive(fn, 0, t1, {
      minSteps: Math.min(768, samples),
      samples,
      maxDepth: 8,
    })
    : sampleUniform(fn, 0, t1, samples);
}

export function hypotrochoidPoint(R: number, r: number, d: number, t: number): { x: number; y: number } {
  const q = (R - r) / r;
  return {
    x: (R - r) * Math.cos(t) + d * Math.cos(q * t),
    y: (R - r) * Math.sin(t) - d * Math.sin(q * t),
  };
}

export function epitrochoidPoint(R: number, r: number, d: number, t: number): { x: number; y: number } {
  const q = (R + r) / r;
  return {
    x: (R + r) * Math.cos(t) - d * Math.cos(q * t),
    y: (R + r) * Math.sin(t) - d * Math.sin(q * t),
  };
}

Generators.register(({
  id: 'hypotrochoid',
  name: 'Hypotrochoid',
  category: 'classic',
  params: {
    R: { label: 'Ring Radius (R)', type: TYPE.NUMBER, min: 20, max: 500, step: 1, default: 210 },
    r: { label: 'Wheel Radius (r)', type: TYPE.NUMBER, min: 5, max: 300, step: 1, default: 70 },
    d: { label: 'Pen Distance (d)', type: TYPE.NUMBER, min: 0, max: 400, step: 1, default: 140 },
    rotations: { label: 'Rotations (0 = auto)', type: TYPE.NUMBER, min: 0, max: 128, step: 1, default: 0,
                 doc: '0 derives the exact closing period from R and r. A manual value can leave the curve open on purpose.' },
    samples: { advanced: true, label: 'Samples', type: TYPE.NUMBER, min: 128, max: 12000, step: 1, default: 1400 },
    adaptive: { advanced: true, label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true },
    fit: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340, doc: '0 = keep native scale' },
  },
  domain: (p: TrochoidParams) => ({ t0: 0, t1: TAU * turnsFor(p, 'hypo'), closed: true }),
  sample(p: TrochoidParams): unknown[] {
    const turns = turnsFor(p, 'hypo');
    const points = sampleTrochoid((t) => hypotrochoidPoint(p.R, p.r, p.d, t), TAU * turns, p);
    return postProcess([{
      id: genId('hypotrochoid'), points, closed: isClosedPolyline(points), meta: { source: 'hypotrochoid' },
    }], p);
  },
}) as unknown as GeneratorDefinition);

Generators.register(({
  id: 'epitrochoid',
  name: 'Epitrochoid',
  category: 'classic',
  params: {
    R: { label: 'Ring Radius (R)', type: TYPE.NUMBER, min: 20, max: 500, step: 1, default: 150 },
    r: { label: 'Wheel Radius (r)', type: TYPE.NUMBER, min: 5, max: 300, step: 1, default: 50 },
    d: { label: 'Pen Distance (d)', type: TYPE.NUMBER, min: 0, max: 400, step: 1, default: 90 },
    rotations: { label: 'Rotations (0 = auto)', type: TYPE.NUMBER, min: 0, max: 128, step: 1, default: 0,
                 doc: '0 derives the exact closing period from R and r. A manual value can leave the curve open on purpose.' },
    samples: { advanced: true, label: 'Samples', type: TYPE.NUMBER, min: 128, max: 12000, step: 1, default: 1200 },
    adaptive: { advanced: true, label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true },
    fit: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340, doc: '0 = keep native scale' },
  },
  domain: (p: TrochoidParams) => ({ t0: 0, t1: TAU * turnsFor(p, 'epi'), closed: true }),
  sample(p: TrochoidParams): unknown[] {
    const turns = turnsFor(p, 'epi');
    const points = sampleTrochoid((t) => epitrochoidPoint(p.R, p.r, p.d, t), TAU * turns, p);
    return postProcess([{
      id: genId('epitrochoid'), points, closed: isClosedPolyline(points), meta: { source: 'epitrochoid' },
    }], p);
  },
}) as unknown as GeneratorDefinition);

Generators.register(({
  id: 'spirograph',
  name: 'Spirograph (Composed)',
  category: 'classic',
  params: {
    R1: { label: 'R1', type: TYPE.NUMBER, min: 20, max: 400, step: 1, default: 250 },
    r1: { label: 'r1', type: TYPE.NUMBER, min: 5, max: 250, step: 1, default: 90 },
    d1: { label: 'd1', type: TYPE.NUMBER, min: 0, max: 300, step: 1, default: 130 },
    mode1: { label: 'Wheel 1', type: TYPE.SELECT, options: ['hypo', 'epi'], default: 'hypo' },
    R2: { label: 'R2', type: TYPE.NUMBER, min: 10, max: 300, step: 1, default: 150 },
    r2: { label: 'r2', type: TYPE.NUMBER, min: 5, max: 200, step: 1, default: 45 },
    d2: { label: 'd2', type: TYPE.NUMBER, min: 0, max: 250, step: 1, default: 80 },
    mode2: { label: 'Wheel 2', type: TYPE.SELECT, options: ['hypo', 'epi'], default: 'epi' },
    mix: { label: 'Mix', type: TYPE.NUMBER, min: 0, max: 1, step: 0.01, default: 0.45 },
    rotations: { label: 'Rotations (0 = auto)', type: TYPE.NUMBER, min: 0, max: 128, step: 1, default: 0,
                 doc: '0 derives the smallest common period of both wheels.' },
    samples: { advanced: true, label: 'Samples', type: TYPE.NUMBER, min: 128, max: 12000, step: 1, default: 1400 },
    adaptive: { advanced: true, label: 'Adaptive Sampling', type: TYPE.BOOLEAN, default: true },
    fit: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340, doc: '0 = keep native scale' },
  },
  domain: (p: SpiroParams) => ({ t0: 0, t1: TAU * spiroTurns(p), closed: true }),
  sample(p: SpiroParams): unknown[] {
    const turns = spiroTurns(p);
    const fn1 = p.mode1 === 'epi' ? epitrochoidPoint : hypotrochoidPoint;
    const fn2 = p.mode2 === 'epi' ? epitrochoidPoint : hypotrochoidPoint;
    const points = sampleTrochoid(
      (t: number) => {
        const a = fn1(p.R1, p.r1, p.d1, t);
        const b = fn2(p.R2, p.r2, p.d2, t);
        return { x: a.x * (1 - p.mix) + b.x * p.mix, y: a.y * (1 - p.mix) + b.y * p.mix };
      },
      TAU * turns, p,
    );
    return postProcess([{
      id: genId('spirograph'), points, closed: isClosedPolyline(points), meta: { source: 'spirograph' },
    }], p);
  },
}) as unknown as GeneratorDefinition);

function spiroTurns(p: SpiroParams): number {
  const manual = Math.round(Number(p.rotations) || 0);
  if (manual > 0) return manual;
  return Math.max(
    trochoidTurns(p.R1, p.r1, p.mode1 === 'epi' ? 'epi' : 'hypo'),
    trochoidTurns(p.R2, p.r2, p.mode2 === 'epi' ? 'epi' : 'hypo'),
  );
}
