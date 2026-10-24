/**
 * projection.js — render-time orthographic views.
 *
 * The engine always evaluates and stores the full 3D curve. Switching
 * between the camera view and Alzado/Planta/Perfil is therefore a pure
 * projection of the existing points, never a re-evaluation.
 */

import { centerCurves, fitCurves } from '../sampling/sampling.js';

/**
 * @param {Array} curves
 * @param {'3d'|'xy'|'xz'|'yz'} projection
 * @param {{fit?:number}} options  fit semantics match the 3D generator: 0 = center only
 * @returns {Array} projected copies (or the input array in 3D mode)
 */
export function projectCurves(curves, projection = '3d', { fit = 0 } = {}) {
  if (!Array.isArray(curves) || projection === '3d') return curves;
  const projected = curves.map((curve) => ({
    ...curve,
    points: curve.points.map((point) => projectPoint(point, projection)),
  }));
  return fit > 0 ? fitCurves(projected, fit) : centerCurves(projected);
}

export function projectPoint(point, projection) {
  const x3 = Number.isFinite(point.x3) ? point.x3 : point.x;
  const y3 = Number.isFinite(point.y3) ? point.y3 : point.y;
  const z = Number.isFinite(point.h3) ? point.h3 : 0;
  let x = x3;
  let y = -y3;
  if (projection === 'xz') {
    x = x3;
    y = -z;
  } else if (projection === 'yz') {
    x = -y3;
    y = -z;
  }
  return {
    ...point,
    x,
    y,
    // An orthographic view has no camera depth; keep the geometry legible
    // instead of reusing the 3D fade.
    depthAlpha: 1,
  };
}

/** Height/radial value used by the gradient pass for the active view. */
export function gradientAxisValue(point, projection) {
  if (projection === 'xy') {
    const x3 = Number.isFinite(point.x3) ? point.x3 : point.x;
    const y3 = Number.isFinite(point.y3) ? point.y3 : point.y;
    return Math.hypot(x3, y3);
  }
  if (Number.isFinite(point.h3)) return point.h3;
  return point.y;
}
