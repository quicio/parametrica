/** generators/helpers.ts — compatibility facade. */

let id = 0;
export const genId = (prefix: string): string => `${prefix}-${id++}`;

export { compileOrThrow, makeScope } from './context.ts';
export { composeCurves, registerMultiCurveGenerator } from './compose.ts';
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
