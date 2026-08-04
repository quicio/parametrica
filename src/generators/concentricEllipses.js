/**
 * concentricEllipses.js — N concentric (or radially offset) ellipses.
 *
 * Pure multi-curve generator: each ellipse is a separate Curve, the
 * whole family shares a common center. Demonstrates the `Curve[]`
 * capability of the engine and gives the user a starting point for
 * vesica-piscis-style compositions where two ellipses cross.
 *
 * The classic "vesica piscis" is two circles of equal radius whose
 * centers are offset by exactly one radius — the lens where they
 * overlap is the eponymous figure. This generator produces N such
 * circles (or ellipses) with adjustable offset, count, and size.
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { composeCurves, makeScope, postProcess, TAU } from './helpers.js';

Generators.register({
  id: 'concentric-ellipses',
  name: 'Concentric Ellipses',
  category: 'multi',
  params: {
    count:     { label: 'Count', type: TYPE.NUMBER, min: 1, max: 24, step: 1, default: 2,
                 doc: 'Number of ellipses in the family.' },
    rx:        { label: 'Radius X', type: TYPE.NUMBER, min: 1, max: 400, step: 1, default: 120 },
    ry:        { label: 'Radius Y', type: TYPE.NUMBER, min: 1, max: 400, step: 1, default: 280 },
    offset:    { label: 'Offset', type: TYPE.NUMBER, min: 0, max: 300, step: 1, default: 120,
                 doc: 'Spacing between adjacent ellipses along X.' },
    spread:    {
      label: 'Spread', type: TYPE.SELECT,
      options: ['pair', 'chain', 'centered'],
      default: 'pair',
      doc: 'pair: ellipses mirror around x=0 (vesica). chain: each offset right. centered: all share one center.',
    },
    samples:   { label: 'Samples', type: TYPE.NUMBER, min: 32, max: 8000, step: 1, default: 500 },
    closed:    { label: 'Closed', type: TYPE.BOOLEAN, default: true },
    fit:       { label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340,
                 doc: '0 = keep native scale.' },
  },

  domain: (p) => ({ t0: 0, t1: TAU, closed: p.closed }),

  sample(params, ctx) {
    const { count, rx, ry, offset, spread, samples, closed, fit } = params;
    const scope = makeScope(ctx);

    // Compute center x for each ellipse based on spread mode.
    const centers = (() => {
      const out = [];
      if (spread === 'centered') {
        for (let i = 0; i < count; i++) out.push(0);
      } else if (spread === 'pair') {
        // Mirror pairs around x=0: -((n-1)/2)..+(n-1)/2 * offset.
        // For count=2 the centers are -offset/2, +offset/2 (vesica piscis).
        const half = (count - 1) / 2;
        for (let i = 0; i < count; i++) out.push((i - half) * offset);
      } else {
        // chain: 0, offset, 2*offset, ...
        for (let i = 0; i < count; i++) out.push(i * offset);
      }
      return out;
    })();

    const curves = composeCurves(
      (i) => {
        const cx = centers[i];
        const pts = new Array(samples);
        for (let k = 0; k < samples; k++) {
          const t = TAU * k / Math.max(1, samples - 1);
          pts[k] = { x: cx + rx * Math.cos(t), y: ry * Math.sin(t) };
        }
        return pts;
      },
      { count, t0: 0, t1: TAU, closed, source: 'concentric-ellipses', scope },
    );

    return postProcess(curves, { fit, center: true });
  },
});
