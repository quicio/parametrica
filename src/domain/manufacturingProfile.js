/**
 * geometry/manufacturingProfile.js — serializable manufacturing profile and
 * evidence-based report.
 *
 * The profile is a view-level fabrication assumption. It does not slice, and it
 * never upgrades a heuristic into a measured value.
 */

import { millimetresPerUnit } from './units.ts';

export const MANUFACTURING_PROCESSES = Object.freeze(['fdm', 'resin', 'custom']);
export const MANUFACTURING_GATING = Object.freeze(['warn', 'block']);

export const MANUFACTURING_PRESETS = Object.freeze({
  fdm: Object.freeze({
    process: 'fdm',
    nozzle: 0.4,
    minWall: 1.2,
    minStrut: 1.2,
    minOpeningWidth: 2,
    overhangAngle: 50,
    bedTolerance: 0.2,
    gating: 'warn',
    orientation: 'current',
    units: 'mm',
  }),
  resin: Object.freeze({
    process: 'resin',
    nozzle: 0.05,
    minWall: 0.8,
    minStrut: 0.8,
    minOpeningWidth: 1,
    overhangAngle: 45,
    bedTolerance: 0.1,
    gating: 'warn',
    orientation: 'current',
    units: 'mm',
  }),
  custom: Object.freeze({
    process: 'custom',
    nozzle: null,
    minWall: 1.2,
    minStrut: 1.2,
    minOpeningWidth: 2,
    overhangAngle: 50,
    bedTolerance: 0.2,
    gating: 'warn',
    orientation: 'current',
    units: 'mm',
  }),
});

export const DEFAULT_MANUFACTURING_PROFILE = MANUFACTURING_PRESETS.fdm;

export function sanitizeManufacturingProfile(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const process = MANUFACTURING_PROCESSES.includes(source.process) ? source.process : 'fdm';
  const preset = MANUFACTURING_PRESETS[process] ?? MANUFACTURING_PRESETS.fdm;
  const verification = source.verification && typeof source.verification === 'object'
    ? source.verification
    : {};
  const nozzle = source.nozzle === null ? null : clampNumber(source.nozzle, 0.01, 2, preset.nozzle);
  return {
    version: 1,
    process,
    nozzle,
    minWall: clampNumber(source.minWall, 0.2, 20, preset.minWall),
    minStrut: clampNumber(source.minStrut, 0.2, 20, preset.minStrut),
    minOpeningWidth: clampNumber(source.minOpeningWidth, 0, 50, preset.minOpeningWidth),
    overhangAngle: clampNumber(source.overhangAngle, 0, 89, preset.overhangAngle),
    bedTolerance: clampNumber(source.bedTolerance, 0, 5, preset.bedTolerance),
    gating: MANUFACTURING_GATING.includes(source.gating) ? source.gating : preset.gating,
    orientation: 'current',
    units: 'mm',
    verification: {
      slicer: typeof verification.slicer === 'string' ? verification.slicer.slice(0, 80) : '',
      material: typeof verification.material === 'string' ? verification.material.slice(0, 80) : '',
      result: ['unverified', 'pass', 'fail'].includes(verification.result)
        ? verification.result
        : 'unverified',
      notes: typeof verification.notes === 'string' ? verification.notes.slice(0, 240) : '',
    },
  };
}

export function manufacturingPreset(process) {
  return sanitizeManufacturingProfile(MANUFACTURING_PRESETS[process] ?? MANUFACTURING_PRESETS.custom);
}

export function buildManufacturingReport({
  profile = null,
  printability = null,
  lattice = null,
  units = null,
  bbox = null,
} = {}) {
  const resolved = sanitizeManufacturingProfile(profile);
  const scale = millimetresPerUnit(units, 'world') ?? 1;
  const checks = [];
  const toMm = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number * scale : null;
  };
  const add = (check) => {
    checks.push({
      value: null,
      unit: 'mm',
      limit: null,
      source: 'unavailable',
      severity: 'unknown',
      detail: '',
      ...check,
    });
  };

  const strut = toMm(lattice?.minStrutDiameter ?? (Number(lattice?.radius) * 2));
  add(lengthCheck('strut', 'Minimum strut', strut, resolved.minStrut, 'declared'));
  const joint = toMm(lattice?.minJointDiameter);
  add(lengthCheck('joint', 'Minimum joint', joint, resolved.minStrut, 'declared'));
  const opening = toMm(lattice?.openingGauge?.minWidth ?? lattice?.minOpeningWidth);
  add(lengthCheck('opening', 'Minimum opening', opening, resolved.minOpeningWidth, 'measured'));
  add(wallCheck(resolved.minWall));
  add(overhangCheck(printability));
  add(bedCheck(printability));
  add(envelopeCheck(bbox, units));

  const failed = checks.filter((check) => check.severity === 'fail');
  const warnings = checks.filter((check) => check.severity === 'warn');
  const ok = checks.filter((check) => check.severity === 'ok');
  const overall = failed.length ? 'fail' : warnings.length ? 'warn' : ok.length ? 'pass' : 'unknown';
  const blocked = resolved.gating === 'block' && failed.length > 0;
  return {
    profile: resolved,
    profileId: resolved.process,
    process: resolved.process,
    gating: resolved.gating,
    overall,
    checks,
    exportAllowed: !blocked,
    exportReason: blocked ? `Manufacturing block: ${failed.map((check) => check.label).join(', ')}` : null,
    verifiedBySlicer: resolved.verification.result === 'pass',
    verification: resolved.verification,
  };
}

function lengthCheck(id, label, value, limit, source) {
  if (value === null || !Number.isFinite(value)) {
    return {
      id,
      label,
      value: null,
      limit,
      source: 'unavailable',
      severity: 'unknown',
      detail: `${label} is not available for this source`,
    };
  }
  return {
    id,
    label,
    value,
    limit,
    source,
    severity: value + 1e-6 < limit ? 'fail' : 'ok',
    detail: `${value.toFixed(2)} mm vs ${limit.toFixed(2)} mm`,
  };
}

function wallCheck(limit) {
  return {
    id: 'wall',
    label: 'Minimum wall',
    value: null,
    limit,
    source: 'unavailable',
    severity: 'unknown',
    detail: 'No mesh-based wall-thickness estimator in this slice',
  };
}

function overhangCheck(printability) {
  const ratio = Number(printability?.overhangRatio);
  if (!Number.isFinite(ratio)) {
    return {
      id: 'overhang',
      label: 'Overhang',
      value: null,
      limit: null,
      source: 'unavailable',
      severity: 'unknown',
      detail: 'Overhang is unavailable',
    };
  }
  return {
    id: 'overhang',
    label: 'Overhang',
    value: ratio * 100,
    unit: '%',
    limit: 12,
    source: 'measured',
    severity: ratio > 0.12 ? 'warn' : 'ok',
    detail: `${Math.round(ratio * 100)}% overhang`,
  };
}

function bedCheck(printability) {
  const area = Number(printability?.bedContactAreaMm2);
  if (!Number.isFinite(area)) {
    return {
      id: 'bed',
      label: 'Bed contact',
      value: null,
      limit: 0,
      source: 'unavailable',
      severity: 'unknown',
      detail: 'Bed contact is unavailable',
    };
  }
  return {
    id: 'bed',
    label: 'Bed contact',
    value: area,
    unit: 'mm²',
    limit: 0,
    source: 'measured',
    severity: area <= 0 ? 'warn' : 'ok',
    detail: `${area.toFixed(1)} mm²`,
  };
}

function envelopeCheck(bbox, units) {
  if (!bbox) {
    return {
      id: 'envelope',
      label: 'Envelope',
      value: null,
      limit: null,
      source: 'unavailable',
      severity: 'unknown',
      detail: 'Envelope is unavailable',
    };
  }
  const physical = bbox.width * (millimetresPerUnit(units, 'world') ?? 1);
  return {
    id: 'envelope',
    label: 'Envelope',
    value: physical,
    unit: 'mm',
    limit: null,
    source: 'measured',
    severity: 'ok',
    detail: `${physical.toFixed(1)} mm wide`,
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
