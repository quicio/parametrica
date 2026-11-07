/**
 * manufacturing-profile.test.mjs — profile sanitization and evidence report.
 */

import {
  MANUFACTURING_PRESETS,
  buildManufacturingReport,
  manufacturingPreset,
  sanitizeManufacturingProfile,
} from '../../src/geometry/manufacturingProfile.js';

const UNITS = { world: 'mm', mmPerWorldUnit: 1 };
const PRINT = {
  overhangRatio: 0.03,
  overhangAreaMm2: 12,
  bedContactAreaMm2: 100,
  totalAreaMm2: 500,
  status: 'ok',
  warnings: [],
};
const LATTICE = {
  minStrutDiameter: 3.5,
  minJointDiameter: 4.5,
  openingGauge: { minWidth: 6.8, method: 'capsule-sampled' },
  openingTargetWidth: 6,
};
const BBOX = { width: 175, height: 200, depth: 175 };

export async function run(assert) {
  const defaults = sanitizeManufacturingProfile(null);
  assert(defaults.process === 'fdm' && defaults.gating === 'warn', 'manufacturing profile resolves FDM/warn defaults');
  assert(defaults.minStrut === 1.2 && defaults.minOpeningWidth === 2, 'manufacturing defaults are explicit');

  const clamped = sanitizeManufacturingProfile({
    process: 'resin',
    minWall: -1,
    minStrut: 99,
    minOpeningWidth: 99,
    overhangAngle: 120,
    bedTolerance: 9,
    gating: 'block',
  });
  assert(clamped.process === 'resin', 'process survives sanitization');
  assert(clamped.minWall === 0.2 && clamped.minStrut === 20, 'manufacturing minima clamp');
  assert(clamped.overhangAngle === 89 && clamped.bedTolerance === 5, 'manufacturing angle and bed tolerance clamp');
  assert(clamped.gating === 'block', 'gating survives sanitization');
  assert(manufacturingPreset('resin').nozzle === 0.05, 'process presets expose provisional nozzle values');
  assert(MANUFACTURING_PRESETS.custom.process === 'custom', 'custom preset exists');

  const verified = sanitizeManufacturingProfile({
    ...defaults,
    verification: { slicer: 'Orca 2.2', material: 'PLA', result: 'pass', notes: '0.2 mm layers' },
  });
  assert(verified.verification.slicer === 'Orca 2.2', 'slicer verification survives sanitization');
  assert(verified.verification.result === 'pass', 'slicer result survives sanitization');

  const pass = buildManufacturingReport({
    profile: defaults,
    printability: PRINT,
    lattice: LATTICE,
    units: UNITS,
    bbox: BBOX,
  });
  assert(pass.overall === 'pass', 'healthy profile reports pass');
  assert(pass.exportAllowed === true, 'warn mode allows export');
  const sourceById = Object.fromEntries(pass.checks.map((check) => [check.id, check.source]));
  assert(sourceById.strut === 'declared', 'strut is declared by the lattice source');
  assert(sourceById.opening === 'measured', 'opening is measured on the final solid');
  assert(sourceById.overhang === 'measured' && sourceById.bed === 'measured', 'overhang and bed are measured');
  assert(sourceById.wall === 'unavailable', 'wall thickness is unavailable, not invented');
  assert(pass.checks.find((check) => check.id === 'wall').severity === 'unknown', 'unavailable wall is unknown');

  const verifiedReport = buildManufacturingReport({
    profile: verified,
    printability: PRINT,
    lattice: LATTICE,
    units: UNITS,
    bbox: BBOX,
  });
  assert(verifiedReport.verifiedBySlicer === true, 'manual slicer verification is reported');
  assert(verifiedReport.verification.material === 'PLA', 'verification material is reported');

  const failProfile = sanitizeManufacturingProfile({
    ...defaults,
    minStrut: 9,
    gating: 'block',
  });
  const fail = buildManufacturingReport({
    profile: failProfile,
    printability: { ...PRINT, overhangRatio: 0.4 },
    lattice: LATTICE,
    units: UNITS,
    bbox: BBOX,
  });
  assert(fail.overall === 'fail', 'failed checks report fail');
  assert(fail.exportAllowed === false, 'block mode blocks failed manufacturing checks');
  assert(fail.exportReason?.includes('Minimum strut'), 'block reason names the failed check');

  const warnProfile = sanitizeManufacturingProfile({ ...failProfile, gating: 'warn' });
  const warn = buildManufacturingReport({
    profile: warnProfile,
    printability: { ...PRINT, overhangRatio: 0.4 },
    lattice: LATTICE,
    units: UNITS,
    bbox: BBOX,
  });
  assert(warn.overall === 'fail' && warn.exportAllowed === true, 'warn mode reports failure but allows export');
}
