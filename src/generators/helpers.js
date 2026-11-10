/**
 * generators/helpers.js — compatibility facade.
 *
 * New code should import from the responsibility-specific modules:
 *   math/periods.js, sampling/parametric.js, view/camera.js,
 *   generators/context.js and generators/compose.js.
 */

let id = 0;
export const genId = (prefix) => `${prefix}-${id++}`;

export { compileOrThrow, makeScope } from './context.js';
export { composeCurves, registerMultiCurveGenerator } from './compose.js';
export {
  sampleParametric,
  postProcess,
  isClosedPolyline,
} from '../sampling/parametric.ts';
export {
  TAU,
  gcd,
  lcm,
  rationalDenominator,
  trochoidTurns,
  lissajousTurns,
  roseTurns,
} from '../math/periods.ts';
export { cameraFrom, project3D } from '../view/camera.ts';
