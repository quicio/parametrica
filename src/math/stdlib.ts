/**
 * stdlib.ts — function & constant library for the expression engine.
 *
 * Everything the user can reference inside x(t), y(t), r(θ) and
 * parameter modulations. `createStdlib(seed)` returns a fresh scope
 * object per evaluation context so seeded noise stays deterministic.
 */

import { createNoise2D, createNoise1D } from './noise.ts';

type Rec = Record<string, unknown>;
type Fn = (...values: number[]) => number;

export const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  tau: Math.PI * 2,
  e: Math.E,
  phi: (1 + Math.sqrt(5)) / 2,
};

export const FUNCTIONS: Record<string, Fn> = {
  // trigonometry
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  // arithmetic
  abs: Math.abs, sign: Math.sign,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  fract: (x) => x - Math.floor(x),
  sqrt: Math.sqrt, cbrt: Math.cbrt,
  exp: Math.exp, log: Math.log, log2: Math.log2, log10: Math.log10,
  pow: Math.pow, hypot: Math.hypot,
  min: Math.min, max: Math.max,
  mod: (a, b) => ((a % b) + b) % b,
  // easing / shaping
  clamp: (x, lo, hi) => Math.min(hi, Math.max(lo, x)),
  lerp: (a, b, t) => a + (b - a) * t,
  step: (edge, x) => (x < edge ? 0 : 1),
  smoothstep: (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0 || 1e-12)));
    return t * t * (3 - 2 * t);
  },
  // waveform helpers
  saw: (x) => 2 * (x / (2 * Math.PI) - Math.floor(x / (2 * Math.PI) + 0.5)),
  tri: (x) => Math.asin(Math.sin(x)) / (Math.PI / 2),
  square: (x) => Math.sign(Math.sin(x)),
};

/**
 * @param seed evaluation seed (document seed)
 * @returns scope base
 */
export function createStdlib(seed = 1): Rec {
  const noise2 = createNoise2D(seed);
  const noise1 = createNoise1D(seed);
  return {
    ...CONSTANTS,
    ...FUNCTIONS,
    noise: (x: number, y = 0) => (y === 0 ? noise1(x) : noise2(x, y)),
    noise2: noise2,
  };
}
