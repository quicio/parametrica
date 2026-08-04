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

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { genId, TAU } from './helpers.js';
import { sampleAdaptive } from '../sampling/sampling.js';

function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function turnsFor(R, r) {
  const Ri = Math.max(1, Math.round(R));
  const ri = Math.max(1, Math.round(r));
  return Math.min(64, ri / gcd(Ri, ri));
}

export function hypotrochoidPoint(R, r, d, t) {
  const q = (R - r) / r;
  return {
    x: (R - r) * Math.cos(t) + d * Math.cos(q * t),
    y: (R - r) * Math.sin(t) - d * Math.sin(q * t),
  };
}

export function epitrochoidPoint(R, r, d, t) {
  const q = (R + r) / r;
  return {
    x: (R + r) * Math.cos(t) - d * Math.cos(q * t),
    y: (R + r) * Math.sin(t) - d * Math.sin(q * t),
  };
}

Generators.register({
  id: 'hypotrochoid',
  name: 'Hypotrochoid',
  category: 'classic',
  params: {
    R: { label: 'Ring Radius (R)', type: TYPE.NUMBER, min: 20, max: 500, step: 1, default: 210 },
    r: { label: 'Wheel Radius (r)', type: TYPE.NUMBER, min: 5, max: 300, step: 1, default: 70 },
    d: { label: 'Pen Distance (d)', type: TYPE.NUMBER, min: 0, max: 400, step: 1, default: 140 },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 128, max: 12000, step: 1, default: 1400 },
  },
  domain: (p) => ({ t0: 0, t1: TAU * turnsFor(p.R, p.r), closed: true }),
  sample(p) {
    const turns = turnsFor(p.R, p.r);
    const points = sampleAdaptive(
      (t) => hypotrochoidPoint(p.R, p.r, p.d, t),
      0, TAU * turns, { minSteps: Math.min(384, p.samples) },
    );
    return [{ id: genId('hypotrochoid'), points, closed: true, meta: { source: 'hypotrochoid' } }];
  },
});

Generators.register({
  id: 'epitrochoid',
  name: 'Epitrochoid',
  category: 'classic',
  params: {
    R: { label: 'Ring Radius (R)', type: TYPE.NUMBER, min: 20, max: 500, step: 1, default: 150 },
    r: { label: 'Wheel Radius (r)', type: TYPE.NUMBER, min: 5, max: 300, step: 1, default: 50 },
    d: { label: 'Pen Distance (d)', type: TYPE.NUMBER, min: 0, max: 400, step: 1, default: 90 },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 128, max: 12000, step: 1, default: 1200 },
  },
  domain: (p) => ({ t0: 0, t1: TAU * turnsFor(p.R, p.r), closed: true }),
  sample(p) {
    const turns = turnsFor(p.R, p.r);
    const points = sampleAdaptive(
      (t) => epitrochoidPoint(p.R, p.r, p.d, t),
      0, TAU * turns, { minSteps: Math.min(384, p.samples) },
    );
    return [{ id: genId('epitrochoid'), points, closed: true, meta: { source: 'epitrochoid' } }];
  },
});

Generators.register({
  id: 'spirograph',
  name: 'Spirograph (Composed)',
  category: 'classic',
  params: {
    R1: { label: 'R1', type: TYPE.NUMBER, min: 20, max: 400, step: 1, default: 180 },
    r1: { label: 'r1', type: TYPE.NUMBER, min: 5, max: 250, step: 1, default: 60 },
    d1: { label: 'd1', type: TYPE.NUMBER, min: 0, max: 300, step: 1, default: 120 },
    mode1: { label: 'Wheel 1', type: TYPE.SELECT, options: ['hypo', 'epi'], default: 'hypo' },
    R2: { label: 'R2', type: TYPE.NUMBER, min: 10, max: 300, step: 1, default: 90 },
    r2: { label: 'r2', type: TYPE.NUMBER, min: 5, max: 200, step: 1, default: 30 },
    d2: { label: 'd2', type: TYPE.NUMBER, min: 0, max: 250, step: 1, default: 60 },
    mode2: { label: 'Wheel 2', type: TYPE.SELECT, options: ['hypo', 'epi'], default: 'epi' },
    mix: { label: 'Mix', type: TYPE.NUMBER, min: 0, max: 1, step: 0.01, default: 0.5 },
    samples: { label: 'Samples', type: TYPE.NUMBER, min: 128, max: 12000, step: 1, default: 1400 },
  },
  domain: (p) => ({ t0: 0, t1: TAU * Math.max(turnsFor(p.R1, p.r1), turnsFor(p.R2, p.r2)), closed: true }),
  sample(p) {
    const turns = Math.max(turnsFor(p.R1, p.r1), turnsFor(p.R2, p.r2));
    const fn1 = p.mode1 === 'epi' ? epitrochoidPoint : hypotrochoidPoint;
    const fn2 = p.mode2 === 'epi' ? epitrochoidPoint : hypotrochoidPoint;
    const points = sampleAdaptive(
      (t) => {
        const a = fn1(p.R1, p.r1, p.d1, t);
        const b = fn2(p.R2, p.r2, p.d2, t);
        return { x: a.x * (1 - p.mix) + b.x * p.mix, y: a.y * (1 - p.mix) + b.y * p.mix };
      },
      0, TAU * turns, { minSteps: Math.min(384, p.samples) },
    );
    return [{ id: genId('spirograph'), points, closed: true, meta: { source: 'spirograph' } }];
  },
});
