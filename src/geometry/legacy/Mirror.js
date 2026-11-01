/**
 * Mirror.js — the only source of right-side geometry.
 *
 * No independent right-side geometry may exist anywhere in the system.
 * The opposite side of the glyph is produced exclusively by reflecting
 * the master spline across the vertical axis (x → −x).
 *
 * Because the master spline's two crossings lie exactly on x = 0, the
 * master and its reflection meet precisely at those points — the figure
 * closes itself and the vesica piscis emerges as negative space.
 */

const reflectPoint = (p) => ({ ...p, x: -p.x });

export class Mirror {
  /** Reflect a chain of cubic Bézier segments across the vertical axis. */
  static reflectSegments(segments) {
    return segments.map((s) => ({
      p0: reflectPoint(s.p0),
      p1: reflectPoint(s.p1),
      p2: reflectPoint(s.p2),
      p3: reflectPoint(s.p3),
    }));
  }

  /** Reflect a sampled polyline across the vertical axis. */
  static reflectSamples(samples) {
    return samples.map(reflectPoint);
  }
}
