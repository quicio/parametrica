/**
 * MasterSpline.js — the single source of the glyph.
 *
 * A glyph is never drawn. It is generated from ONE continuous master
 * spline that weaves across the vertical axis:
 *
 *   begins outside the canvas (upper left)
 *   →  bulges left, forming the upper arm
 *   →  CROSSES the vertical axis (crossTop), genuinely transversal
 *   →  arcs through a narrow waist on the RIGHT side
 *   →  CROSSES the axis again (crossBottom)
 *   →  bulges left, forming the lower arm
 *   →  exits the canvas (lower left).
 *
 * Mirrored, the two S-curves interlock: the crossings become true
 * X-intersections and the central almond (vesica piscis) emerges as
 * negative space between them — it is never constructed.
 * The opposite side exists only as a mirror image (see Mirror.js).
 *
 * Construction guarantees:
 *  - crossings sit exactly on x = 0 (interpolating spline),
 *  - control-point y is strictly monotone top → bottom (no loops),
 *  - tips always terminate outside the canvas (exitPad > 1),
 *  - centripetal Catmull-Rom ⇒ no cusps, no overshoot, C1 curvature.
 */

import { toBezier, sampleSegments } from './CatmullRom.js';
import { OpticalCorrection } from './OpticalCorrection.js';

const lerp = (a, b, t) => a + (b - a) * t;

export class MasterSpline {
  /**
   * @param {object} params  sanitized glyph parameters (see core/params.js)
   */
  constructor(params) {
    this.rebuild(params);
  }

  rebuild(params) {
    const H = params.height;
    const W = params.width;
    const ts = params.tipSharpness;

    // Axis crossings (exactly on x = 0).
    const y1 = -params.crossTop * H;
    const y2 = params.crossBottom * H;

    // Tips always exit beyond the canvas (exitPad ≥ 1.12).
    const exitPad = lerp(1.12, 1.35, ts);
    const tipX = Math.max(3, lerp(W * 0.72, W * 0.06, ts));
    const tipY = H * exitPad;

    // Arm sweep: sharper tips pull the arm lead toward the axis.
    const armX = lerp(W * 0.98, W * 0.5, ts);

    // Waist + inner almond contour, on the OPPOSITE side of the bulges:
    // the spline crosses the axis at y1, arcs right through the waist,
    // and crosses back at y2. innerOffset pinches the almond inward.
    const waistX = Math.max(2, params.waist * W - params.innerOffset);
    const innerX = Math.max(1.5, waistX * 0.82 - params.innerOffset * 0.6);

    // Outer bulges, midway between each crossing and its canvas edge.
    const bulgeTopY = y1 - (H + y1) * 0.5;
    const bulgeBottomY = y2 + (H - y2) * 0.5;

    let points = [
      { x: -tipX, y: -tipY, role: 'tipTop' },
      { x: -armX, y: lerp(bulgeTopY, -tipY, 0.55), role: 'armTop' },
      { x: -W, y: bulgeTopY, role: 'bulgeTop' },
      { x: 0, y: y1, role: 'crossTop' },
      { x: innerX, y: lerp(y1, 0, 0.5), role: 'innerTop' },
      { x: waistX, y: 0, role: 'waist' },
      { x: innerX, y: lerp(y2, 0, 0.5), role: 'innerBottom' },
      { x: 0, y: y2, role: 'crossBottom' },
      { x: -W, y: bulgeBottomY, role: 'bulgeBottom' },
      { x: -armX, y: lerp(bulgeBottomY, tipY, 0.55), role: 'armBottom' },
      { x: -tipX, y: tipY, role: 'tipBottom' },
    ];

    // Optical balance (master-side only; mirroring happens later).
    points = OpticalCorrection.apply(points, params.opticalCorrection, H);

    // Hard invariant: strictly monotone y from entry to exit ⇒ no loops.
    points = enforceMonotonicY(points, 0.75);

    this.controlPoints = points;
    this.segments = toBezier(points, { tension: params.tension });
    this.samples = sampleSegments(this.segments, 20);

    this.metrics = {
      crossTopY: points.find((p) => p.role === 'crossTop').y,
      crossBottomY: points.find((p) => p.role === 'crossBottom').y,
      waistX: Math.abs(points.find((p) => p.role === 'waist').x),
      width: W,
      height: H,
    };
  }
}

/**
 * Walk the control polygon and clamp each y to be at least `minGap`
 * below its predecessor. Protects extreme parameter combinations from
 * inverting the sweep (which would be the only way to fake a loop).
 */
function enforceMonotonicY(points, minGap) {
  const out = points.map((p) => ({ ...p }));
  for (let i = 1; i < out.length; i++) {
    if (out[i].y < out[i - 1].y + minGap) out[i].y = out[i - 1].y + minGap;
  }
  return out;
}
