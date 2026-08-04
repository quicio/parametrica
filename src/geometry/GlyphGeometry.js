/**
 * GlyphGeometry.js — orchestrates the full glyph.
 *
 * Pipeline: params → MasterSpline → Mirror → validation.
 *
 * The glyph consists of exactly two Bézier chains:
 *   - master        (generated, left-biased, crosses the axis twice)
 *   - mirror        (pure reflection of master; never generated)
 *
 * Both chains and their sampled polylines are exposed for the renderer,
 * the exporter and the validator.
 */

import { MasterSpline } from './MasterSpline.js';
import { Mirror } from './Mirror.js';
import { validateGlyph } from './validate.js';

export class GlyphGeometry {
  constructor(params) {
    this.rebuild(params);
  }

  rebuild(params) {
    this.params = { ...params };
    this.master = new MasterSpline(params);
    this.mirrorSegments = Mirror.reflectSegments(this.master.segments);
    this.mirrorSamples = Mirror.reflectSamples(this.master.samples);
    this.validation = validateGlyph(this.master.samples, this.mirrorSamples);
    this.metrics = {
      ...this.master.metrics,
      crossings: this.validation.crossings,
    };
  }

  /** Admissibility probe used by the mutation engine. */
  static isValid(params) {
    try {
      const g = new GlyphGeometry(params);
      return g.validation.ok;
    } catch {
      return false;
    }
  }
}
