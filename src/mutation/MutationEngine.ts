/** Mutation in parameter space. */

import { Generators, Operators } from '../core/registry.ts';
import { TYPE, sanitizeValue } from '../core/schema.ts';
import { sanitizeDocument, attachLayerAliases } from '../core/document.js';
import { evaluateDocument } from '../core/engine.js';
import { perturbLiterals } from '../math/expression.js';

export interface ParamSchema {
  type?: string;
  min?: number;
  max?: number;
  [key: string]: unknown;
}
export interface StageLike {
  params: Record<string, unknown>;
  [key: string]: unknown;
}
export interface GeneratorStageLike extends StageLike {
  id: string;
}
export interface DocumentLike {
  seed: number;
  generator: GeneratorStageLike;
  operators: Array<StageLike & { id: string }>;
  [key: string]: unknown;
}
export interface MutationOptions {
  amount?: number;
  maxAttempts?: number;
  rng?: () => number;
}
interface HarmonicRow {
  amp: number;
  phase: number;
  freq: number;
  rot: number;
  ox?: number;
  oy?: number;
  [key: string]: unknown;
}

export class MutationEngine {
  amount: number;
  maxAttempts: number;
  rng: () => number;

  constructor({ amount = 0.16, maxAttempts = 40, rng = Math.random }: MutationOptions = {}) {
    this.amount = amount;
    this.maxAttempts = maxAttempts;
    this.rng = rng;
  }

  /** @returns a NEW, validated document (or a clone of the input) */
  mutate(document: DocumentLike): DocumentLike {
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      const candidate = this.#perturb(document);
      if (MutationEngine.isValid(candidate)) return candidate;
    }
    return attachLayerAliases(structuredClone(document)) as DocumentLike;
  }

  #perturb(document: DocumentLike): DocumentLike {
    const doc = attachLayerAliases(structuredClone(document)) as DocumentLike;
    this.#perturbStageParams(doc.generator, Generators.get(doc.generator.id).params as Record<string, ParamSchema>);

    for (const op of doc.operators) {
      if (!Operators.has(op.id)) continue;
      this.#perturbStageParams(op, Operators.get(op.id).params as Record<string, ParamSchema>, 0.5); // gentler on operators
    }

    // fourier tables: perturb rows, occasionally add/remove
    for (const key of ['harmonicsX', 'harmonicsY']) {
      const rows = doc.generator.params[key];
      if (!Array.isArray(rows)) continue;
      const harmonics = rows as HarmonicRow[];
      for (const h of harmonics) {
        h.amp = clampNum(h.amp * (1 + this.gaussian() * this.amount), -16, 16);
        h.phase = clampNum(h.phase + this.gaussian() * 0.4, -64, 64);
        h.freq = clampNum(h.freq + this.gaussian() * 0.3, -64, 64);
        h.rot = clampNum(h.rot + this.gaussian() * 0.15, -Math.PI * 2, Math.PI * 2);
      }
      if (this.rng() < 0.15 && harmonics.length < 12) {
        harmonics.push({
          freq: Math.max(1, Math.round(this.rng() * 9)),
          amp: 0.05 + this.rng() * 0.3,
          phase: this.rng() * Math.PI * 2,
          rot: key === 'harmonicsY' ? Math.PI / 2 : 0,
          ox: 0, oy: 0,
        });
      }
      if (this.rng() < 0.1 && harmonics.length > 1) {
        harmonics.splice(Math.floor(this.rng() * harmonics.length), 1);
      }
    }

    // occasionally re-roll the seed: jump to a new region of the space
    if (this.rng() < 0.08) doc.seed = Math.floor(this.rng() * 9999) + 1;

    return (sanitizeDocument(doc) ?? attachLayerAliases(structuredClone(document))) as DocumentLike;
  }

  #perturbStageParams(stage: StageLike, schema: Record<string, ParamSchema>, scale = 1): void {
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
  static isValid(document: DocumentLike): boolean {
    try {
      const { curves, errors, stats, bbox } = evaluateDocument(document, { time: 0 }) as {
        curves: unknown[];
        errors: unknown[];
        stats: { pointCount: number };
        bbox: { diagonal: number };
      };
      if (errors.length) return false;
      if (!curves.length) return false;
      if (stats.pointCount < 24 || stats.pointCount > 200_000) return false;
      if (!Number.isFinite(bbox.diagonal) || bbox.diagonal < 8) return false;
      return true;
    } catch {
      return false;
    }
  }

  gaussian(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.rng();
    while (v === 0) v = this.rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

function clampNum(v: unknown, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Number(Number(v).toFixed(5))));
}
