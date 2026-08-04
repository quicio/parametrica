/**
 * bilateralSpline.js — the v1 engine, preserved as a generator.
 *
 * The original Glyph Lab mathematics (single master spline weaving
 * across the axis + pure mirror reflection ⇒ emergent vesica piscis)
 * lives on inside Parametrica. v1 presets migrate here unchanged.
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { MasterSpline } from '../geometry/MasterSpline.js';
import { Mirror } from '../geometry/Mirror.js';
import { sampleSegments } from '../geometry/CatmullRom.js';
import { genId } from './helpers.js';

Generators.register({
  id: 'bilateral-spline',
  name: 'Bilateral Spline (v1)',
  category: 'spline',
  params: {
    width: { label: 'Width', type: TYPE.NUMBER, min: 40, max: 320, step: 1, default: 150 },
    height: { label: 'Height', type: TYPE.NUMBER, min: 120, max: 560, step: 1, default: 360 },
    crossTop: { label: 'Cross Top', type: TYPE.NUMBER, min: 0.08, max: 0.92, step: 0.005, default: 0.42 },
    crossBottom: { label: 'Cross Bottom', type: TYPE.NUMBER, min: 0.08, max: 0.92, step: 0.005, default: 0.42 },
    waist: { label: 'Waist', type: TYPE.NUMBER, min: 0.02, max: 0.5, step: 0.005, default: 0.16 },
    innerOffset: { label: 'Inner Offset', type: TYPE.NUMBER, min: -60, max: 60, step: 0.5, default: 0 },
    tipSharpness: { label: 'Tip Sharpness', type: TYPE.NUMBER, min: 0, max: 1, step: 0.01, default: 0.35 },
    tension: { label: 'Tension', type: TYPE.NUMBER, min: 0, max: 0.9, step: 0.01, default: 0.25 },
    opticalCorrection: { label: 'Optical Correction', type: TYPE.NUMBER, min: 0, max: 1, step: 0.01, default: 0.5 },
    mirror: { label: 'Mirror', type: TYPE.BOOLEAN, default: true },
    samplesPer: { label: 'Samples / Segment', type: TYPE.NUMBER, min: 4, max: 64, step: 1, default: 20 },
  },

  domain: () => ({ t0: 0, t1: 1, closed: false }),

  sample(p) {
    const spline = new MasterSpline(p);
    const masterPoints = sampleSegments(spline.segments, p.samplesPer);
    const curves = [{
      id: genId('bilateral-master'),
      points: masterPoints,
      closed: false,
      meta: { source: 'bilateral-spline', controlPoints: spline.controlPoints },
    }];
    if (p.mirror) {
      curves.push({
        id: genId('bilateral-mirror'),
        points: Mirror.reflectSamples(masterPoints),
        closed: false,
        meta: { source: 'bilateral-spline' },
      });
    }
    return curves;
  },
});
