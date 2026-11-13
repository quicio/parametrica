/**
 * OpticalCorrection.ts — optical balance over numerical symmetry.
 *
 * The human eye does not read geometric centre as visual centre, and a
 * numerically symmetric glyph can look top-heavy. This module applies
 * subtle, deliberate distortions to the semantic control points of the
 * master spline.
 *
 * Crucially it only ever touches the MASTER spline. The opposite side is
 * still produced exclusively by mirroring, so bilateral symmetry is never
 * broken — the corrections act along the vertical axis (waist height,
 * crossing drift) and on the mass distribution (bulge/arm width), which
 * mirrors losslessly.
 */

export interface SemanticPoint {
  x: number;
  y: number;
  role: string;
  [key: string]: unknown;
}

export class OpticalCorrection {
  /**
   * @param points semantic control points
   * @param amount 0..1
   * @param height glyph half-height, for scale-relative shifts
   * @returns adjusted points (new array, input untouched)
   */
  static apply(points: SemanticPoint[], amount: number, height: number): SemanticPoint[] {
    const out = points.map((p) => ({ ...p }));
    const oc = Number(amount);
    if (!Number.isFinite(oc) || oc <= 0) return out;

    const byRole: Record<string, SemanticPoint> = {};
    for (const p of out) byRole[p.role] = p;

    // The optical centre sits slightly above the geometric centre:
    // raise the waist so the glyph *reads* as centred.
    if (byRole.waist) byRole.waist.y -= oc * height * 0.018;
    if (byRole.innerTop) byRole.innerTop.y -= oc * height * 0.006;
    if (byRole.innerBottom) byRole.innerBottom.y -= oc * height * 0.006;

    // Upper mass reads heavier than lower mass: narrow the top bulge a
    // hair, widen the bottom, until the eye agrees they are equal.
    if (byRole.bulgeTop) byRole.bulgeTop.x *= 1 - 0.05 * oc;
    if (byRole.bulgeBottom) byRole.bulgeBottom.x *= 1 + 0.05 * oc;
    if (byRole.armTop) byRole.armTop.x *= 1 - 0.03 * oc;
    if (byRole.armBottom) byRole.armBottom.x *= 1 + 0.03 * oc;

    // Let the crossings breathe outward a fraction (x stays exactly 0 —
    // the crossing must remain on the mirror axis).
    if (byRole.crossTop) byRole.crossTop.y -= oc * height * 0.004;
    if (byRole.crossBottom) byRole.crossBottom.y += oc * height * 0.004;

    return out;
  }
}
