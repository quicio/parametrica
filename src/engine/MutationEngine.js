/**
 * MutationEngine.js — constrained stochastic exploration.
 *
 * "Mutate" perturbs every numeric parameter with gaussian noise, then
 * submits the candidate to full geometric validation. A mutation is only
 * accepted if the resulting glyph preserves:
 *
 *   - perfect bilateral symmetry   (guaranteed structurally by Mirror)
 *   - continuous curvature         (guaranteed by centripetal Catmull-Rom)
 *   - a single master spline       (structural)
 *   - exactly two axis crossings   (validated)
 *   - zero self-intersections      (validated)
 *   - balanced negative space      (validated: crossings on-axis)
 *
 * Invalid candidates are discarded and re-rolled; the current glyph is
 * never replaced by something inadmissible.
 */

import { NUMERIC_KEYS, PARAM_SCHEMA, clampParam } from '../core/params.js';
import { GlyphGeometry } from '../geometry/GlyphGeometry.js';

export class MutationEngine {
  /**
   * @param {{amount?: number, maxAttempts?: number, rng?: Function}} opts
   *   amount       perturbation strength as a fraction of each param's range
   *   maxAttempts  re-roll budget before falling back to the input params
   *   rng          injectable for deterministic tests
   */
  constructor({ amount = 0.16, maxAttempts = 60, rng = Math.random } = {}) {
    this.amount = amount;
    this.maxAttempts = maxAttempts;
    this.rng = rng;
  }

  /**
   * @param {object} current  valid params
   * @returns {object} mutated, validated params (or a copy of `current`)
   */
  mutate(current) {
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      const candidate = { ...current };
      for (const key of NUMERIC_KEYS) {
        const s = PARAM_SCHEMA[key];
        const range = s.max - s.min;
        candidate[key] = clampParam(key, current[key] + this.gaussian() * range * this.amount);
      }
      // Structural flags are never mutated.
      candidate.mirror = current.mirror;

      if (GlyphGeometry.isValid(candidate)) return candidate;
    }
    return { ...current };
  }

  /** Standard normal via Box–Muller. */
  gaussian() {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.rng();
    while (v === 0) v = this.rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}
