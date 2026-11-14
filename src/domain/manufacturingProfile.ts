/** Serializable manufacturing profile and evidence-based report. */

import { millimetresPerUnit } from './units.ts';

export type ManufacturingProcess = 'fdm' | 'resin' | 'custom';
export type ManufacturingGating = 'warn' | 'block';
export type ManufacturingSeverity = 'ok' | 'warn' | 'fail' | 'unknown';
export type ManufacturingSource = 'measured' | 'declared' | 'estimated' | 'unavailable';
export type VerificationResult = 'unverified' | 'pass' | 'fail';

export interface ManufacturingPreset {
  process: ManufacturingProcess;
  nozzle: number | null;
  minWall: number;
  minStrut: number;
  minOpeningWidth: number;
  overhangAngle: number;
  bedTolerance: number;
  gating: ManufacturingGating;
  orientation: 'current';
  units: 'mm';
}

export interface ManufacturingVerification {
  slicer: string;
  material: string;
  result: VerificationResult;
  notes: string;
}

export interface ManufacturingProfile extends ManufacturingPreset {
  version: 1;
  verification: ManufacturingVerification;
}

export interface ManufacturingCheck {
  id: string;
  label: string;
  value: number | null;
  unit?: string;
  limit: number | null;
  source: ManufacturingSource;
  severity: ManufacturingSeverity;
  detail: string;
}

export interface ManufacturingReport {
  profile: ManufacturingProfile;
  profileId: ManufacturingProcess;
  process: ManufacturingProcess;
  gating: ManufacturingGating;
  overall: 'pass' | 'warn' | 'fail' | 'unknown';
  checks: ManufacturingCheck[];
  exportAllowed: boolean;
  exportReason: string | null;
  verifiedBySlicer: boolean;
  verification: ManufacturingVerification;
}

interface PrintabilityLike {
  overhangRatio?: unknown;
  bedContactAreaMm2?: unknown;
  [key: string]: unknown;
}

interface LatticeLike {
  minStrutDiameter?: unknown;
  radius?: unknown;
  minJointDiameter?: unknown;
  minOpeningWidth?: unknown;
  openingGauge?: { minWidth?: unknown };
  [key: string]: unknown;
}

interface BBoxLike {
  width?: unknown;
  [key: string]: unknown;
}

export interface WallThicknessLike {
  available?: unknown;
  minMm?: unknown;
  p05Mm?: unknown;
  medianMm?: unknown;
  samples?: unknown;
  triangles?: unknown;
  reason?: unknown;
}

export const MANUFACTURING_PROCESSES: readonly ManufacturingProcess[] = Object.freeze(['fdm', 'resin', 'custom']);
export const MANUFACTURING_GATING: readonly ManufacturingGating[] = Object.freeze(['warn', 'block']);

const presets: Record<ManufacturingProcess, ManufacturingPreset> = {
  fdm: {
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
  },
  resin: {
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
  },
  custom: {
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
  },
};

export const MANUFACTURING_PRESETS: Readonly<Record<ManufacturingProcess, ManufacturingPreset>> = Object.freeze(presets);
export const DEFAULT_MANUFACTURING_PROFILE: ManufacturingPreset = MANUFACTURING_PRESETS.fdm;

export function sanitizeManufacturingProfile(raw: unknown): ManufacturingProfile {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const process = MANUFACTURING_PROCESSES.includes(source.process as ManufacturingProcess)
    ? source.process as ManufacturingProcess
    : 'fdm';
  const preset = MANUFACTURING_PRESETS[process] ?? MANUFACTURING_PRESETS.fdm;
  const verificationSource = source.verification && typeof source.verification === 'object'
    ? source.verification as Record<string, unknown>
    : {};
  const nozzle = source.nozzle === null
    ? null
    : clampNumber(source.nozzle, 0.01, 2, preset.nozzle ?? 0.4);
  const result = verificationSource.result;
  return {
    version: 1,
    process,
    nozzle,
    minWall: clampNumber(source.minWall, 0.2, 20, preset.minWall),
    minStrut: clampNumber(source.minStrut, 0.2, 20, preset.minStrut),
    minOpeningWidth: clampNumber(source.minOpeningWidth, 0, 50, preset.minOpeningWidth),
    overhangAngle: clampNumber(source.overhangAngle, 0, 89, preset.overhangAngle),
    bedTolerance: clampNumber(source.bedTolerance, 0, 5, preset.bedTolerance),
    gating: MANUFACTURING_GATING.includes(source.gating as ManufacturingGating)
      ? source.gating as ManufacturingGating
      : preset.gating,
    orientation: 'current',
    units: 'mm',
    verification: {
      slicer: typeof verificationSource.slicer === 'string' ? verificationSource.slicer.slice(0, 80) : '',
      material: typeof verificationSource.material === 'string' ? verificationSource.material.slice(0, 80) : '',
      result: ['unverified', 'pass', 'fail'].includes(result as string)
        ? result as VerificationResult
        : 'unverified',
      notes: typeof verificationSource.notes === 'string' ? verificationSource.notes.slice(0, 240) : '',
    },
  };
}

export function manufacturingPreset(process: unknown): ManufacturingProfile {
  const id = MANUFACTURING_PROCESSES.includes(process as ManufacturingProcess)
    ? process as ManufacturingProcess
    : 'custom';
  return sanitizeManufacturingProfile(MANUFACTURING_PRESETS[id]);
}

export function buildManufacturingReport({
  profile = null,
  printability = null,
  lattice = null,
  units = null,
  bbox = null,
  wall = null,
}: {
  profile?: unknown;
  printability?: PrintabilityLike | null;
  lattice?: LatticeLike | null;
  units?: unknown;
  bbox?: BBoxLike | null;
  wall?: WallThicknessLike | null;
} = {}): ManufacturingReport {
  const resolved = sanitizeManufacturingProfile(profile);
  const scale = millimetresPerUnit(units, 'world') ?? 1;
  const checks: ManufacturingCheck[] = [];
  const toMm = (value: unknown): number | null => {
    const number = Number(value);
    return Number.isFinite(number) ? number * scale : null;
  };
  const add = (check: ManufacturingCheck): void => {
    checks.push({ unit: 'mm', ...check });
  };

  const strut = toMm(lattice?.minStrutDiameter ?? (Number(lattice?.radius) * 2));
  add(lengthCheck('strut', 'Minimum strut', strut, resolved.minStrut, 'declared'));
  const joint = toMm(lattice?.minJointDiameter);
  add(lengthCheck('joint', 'Minimum joint', joint, resolved.minStrut, 'declared'));
  const opening = toMm(lattice?.openingGauge?.minWidth ?? lattice?.minOpeningWidth);
  add(lengthCheck('opening', 'Minimum opening', opening, resolved.minOpeningWidth, 'measured'));
  add(wallCheck(wall, resolved.minWall));
  add(overhangCheck(printability));
  add(bedCheck(printability));
  add(envelopeCheck(bbox, units));

  const failed = checks.filter((check) => check.severity === 'fail');
  const warnings = checks.filter((check) => check.severity === 'warn');
  const ok = checks.filter((check) => check.severity === 'ok');
  const overall: ManufacturingReport['overall'] = failed.length
    ? 'fail'
    : warnings.length
      ? 'warn'
      : ok.length
        ? 'pass'
        : 'unknown';
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

function lengthCheck(
  id: string,
  label: string,
  value: number | null,
  limit: number,
  source: ManufacturingSource,
): ManufacturingCheck {
  if (value === null || !Number.isFinite(value)) {
    return {
      id,
      label,
      value: null,
      unit: 'mm',
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
    unit: 'mm',
    limit,
    source,
    severity: value + 1e-6 < limit ? 'fail' : 'ok',
    detail: `${value.toFixed(2)} mm vs ${limit.toFixed(2)} mm`,
  };
}

function wallCheck(wall: WallThicknessLike | null, limit: number): ManufacturingCheck {
  const min = Number(wall?.minMm);
  if (wall?.available !== true || !Number.isFinite(min)) {
    const reason = typeof wall?.reason === 'string' && wall.reason
      ? wall.reason
      : 'No mesh-based wall-thickness estimate is available';
    return {
      id: 'wall',
      label: 'Minimum wall',
      value: null,
      unit: 'mm',
      limit,
      source: 'unavailable',
      severity: 'unknown',
      detail: reason,
    };
  }
  const p05 = Number(wall.p05Mm);
  const median = Number(wall.medianMm);
  const samples = Number(wall.samples);
  const robust = Number.isFinite(p05) ? p05 : min;
  const evidence = [
    'estimated',
    Number.isFinite(samples) ? `${samples} samples` : null,
    `p5 ${robust.toFixed(2)} mm`,
    `min ${min.toFixed(2)} mm`,
    Number.isFinite(median) ? `median ${median.toFixed(2)} mm` : null,
  ].filter(Boolean).join(' · ');
  return {
    id: 'wall',
    label: 'Wall thickness',
    value: robust,
    unit: 'mm',
    limit,
    source: 'estimated',
    severity: robust + 1e-6 < limit ? 'fail' : 'ok',
    detail: evidence,
  };
}

function overhangCheck(printability: PrintabilityLike | null): ManufacturingCheck {
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

function bedCheck(printability: PrintabilityLike | null): ManufacturingCheck {
  const area = Number(printability?.bedContactAreaMm2);
  if (!Number.isFinite(area)) {
    return {
      id: 'bed',
      label: 'Bed contact',
      value: null,
      unit: 'mm²',
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

function envelopeCheck(bbox: BBoxLike | null, units: unknown): ManufacturingCheck {
  if (!bbox) {
    return {
      id: 'envelope',
      label: 'Envelope',
      value: null,
      unit: 'mm',
      limit: null,
      source: 'unavailable',
      severity: 'unknown',
      detail: 'Envelope is unavailable',
    };
  }
  const physical = Number(bbox.width) * (millimetresPerUnit(units, 'world') ?? 1);
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

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
