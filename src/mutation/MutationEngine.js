/**
 * MutationEngine.js — v2: mutation in parameter space (spec §13).
 *
 *  - numeric params: gaussian perturbation, schema-clamped;
 *  - expression params: numeric literals inside the source are perturbed
 *    (equation-space mutation, syntax always preserved);
 *  - harmonic tables: perturb / add / remove harmonics;
 *  - operator params: same numeric treatment.
 *
 * Never mutates pixels. Never mutates paths. Only equations & parameters.
 * Every candidate is validated by full evaluation; invalid → re-rolled.
 */

import { Generators, Operators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { sanitizeValue } from '../core/schema.js';
import { sanitizeDocument } from '../core/document.js';
import { evaluateDocument } from '../core/engine.js';
import { perturbLiterals } from '../math/expression.js';

export class MutationEngine {
  constructor({ amount = 0.16, maxAttempts = 40, rng = Math.random } = {}) {
    this.amount = amount;
    this.maxAttempts = maxAttempts;
    this.rng = rng;
  }

  /** @returns {object} a NEW, validated GlyphDocument (or a clone of input) */
  mutate(document) {
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      const candidate = this.#perturb(document);
      if (MutationEngine.isValid(candidate)) return candidate;
    }
    return structuredClone(document);
  }

  #perturb(document) {
    const doc = structuredClone(document);
    this.#perturbStageParams(doc.generator, Generators.get(doc.generator.id).params);

    for (const op of doc.operators) {
      if (!Operators.has(op.id)) continue;
      this.#perturbStageParams(op, Operators.get(op.id).params, 0.5); // gentler on operators
    }

    // fourier tables: perturb rows, occasionally add/remove
    for (const key of ['harmonicsX', 'harmonicsY']) {
      const rows = doc.generator.params[key];
      if (!Array.isArray(rows)) continue;
      for (const h of rows) {
        h.amp = clampNum(h.amp * (1 + this.gaussian() * this.amount), -16, 16);
        h.phase = clampNum(h.phase + this.gaussian() * 0.4, -64, 64);
        h.freq = clampNum(h.freq + this.gaussian() * 0.3, -64, 64);
        h.rot = clampNum(h.rot + this.gaussian() * 0.15, -Math.PI * 2, Math.PI * 2);
      }
      if (this.rng() < 0.15 && rows.length < 12) {
        rows.push({
          freq: Math.max(1, Math.round(this.rng() * 9)),
          amp: 0.05 + this.rng() * 0.3,
          phase: this.rng() * Math.PI * 2,
          rot: key === 'harmonicsY' ? Math.PI / 2 : 0,
          ox: 0, oy: 0,
        });
      }
      if (this.rng() < 0.1 && rows.length > 1) {
        rows.splice(Math.floor(this.rng() * rows.length), 1);
      }
    }

    // occasionally re-roll the seed: jump to a new region of the space
    if (this.rng() < 0.08) doc.seed = Math.floor(this.rng() * 9999) + 1;

    return sanitizeDocument(doc) ?? structuredClone(document);
  }

  #perturbStageParams(stage, schema, scale = 1) {
    for (const [key, s] of Object.entries(schema)) {
      const value = stage.params[key];
      if (s.type === TYPE.NUMBER && typeof value === 'number') {
        const range = (s.max ?? 1) - (s.min ?? 0);
        stage.params[key] = sanitizeValue(s, value + this.gaussian() * range * this.amount * scale);
      } else if ((s.type === TYPE.EXPRESSION || s.type === TYPE.SOURCE) && typeof value === 'string') {
        stage.params[key] = perturbLiterals(value, () => this.gaussian(), this.amount * scale);
      }
    }
  }

  /** Full evaluation probe: finite, non-degenerate, within budget. */
  static isValid(document) {
    try {
      const { curves, errors, stats, bbox } = evaluateDocument(document, { time: 0 });
      if (errors.length) return false;
      if (!curves.length) return false;
      if (stats.pointCount < 24 || stats.pointCount > 200_000) return false;
      if (!Number.isFinite(bbox.diagonal) || bbox.diagonal < 8) return false;
      return true;
    } catch {
      return false;
    }
  }

  gaussian() {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.rng();
    while (v === 0) v = this.rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

function clampNum(v, lo, hi) {
  return Math.min(hi, Math.max(lo, Number(v.toFixed?.(5) ?? v)));
}
