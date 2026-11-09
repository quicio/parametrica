/** Optional physical units for world and artboard space. */

export type UnitSystem = 'unitless' | 'mm' | 'cm';
export type UnitScope = 'world' | 'artboard';

export interface Units {
  world: UnitSystem;
  mmPerWorldUnit: number | null;
  artboard: UnitSystem;
  mmPerArtboardUnit: number | null;
}

export interface BBoxLike {
  width?: unknown;
  height?: unknown;
  depth?: unknown;
}

export const PHYSICAL_UNIT_SYSTEMS: readonly UnitSystem[] = Object.freeze(['unitless', 'mm', 'cm']);
export const DEFAULT_UNITS: Readonly<Units> = Object.freeze({
  world: 'unitless',
  mmPerWorldUnit: null,
  artboard: 'unitless',
  mmPerArtboardUnit: null,
});

export function createDefaultUnits(): Units {
  return { ...DEFAULT_UNITS };
}

export function sanitizeUnits(raw: unknown): Units {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return createDefaultUnits();
  const source = raw as Record<string, unknown>;
  const world = sanitizeUnitSystem(source.world);
  const artboard = sanitizeUnitSystem(source.artboard);
  return {
    world,
    mmPerWorldUnit: sanitizeFactor(world, source.mmPerWorldUnit),
    artboard,
    mmPerArtboardUnit: sanitizeFactor(artboard, source.mmPerArtboardUnit),
  };
}

function sanitizeUnitSystem(value: unknown): UnitSystem {
  return PHYSICAL_UNIT_SYSTEMS.includes(value as UnitSystem) ? value as UnitSystem : 'unitless';
}

function sanitizeFactor(system: UnitSystem, value: unknown): number | null {
  if (system === 'unitless') return null;
  const factor = Number(value);
  return Number.isFinite(factor) && factor > 0 ? factor : null;
}

export function validateUnits(units: unknown, scope: UnitScope | null = null): { ok: boolean; errors: string[] } {
  if (!units || typeof units !== 'object') return { ok: false, errors: ['units metadata is missing'] };
  const source = units as Record<string, unknown>;
  const errors: string[] = [];
  const systems: UnitScope[] = scope ? [scope] : ['world', 'artboard'];
  for (const name of systems) {
    const system = source[name];
    if (!PHYSICAL_UNIT_SYSTEMS.includes(system as UnitSystem)) {
      errors.push(`${name} unit system is invalid`);
      continue;
    }
    if (system === 'unitless') continue;
    const key = name === 'world' ? 'mmPerWorldUnit' : 'mmPerArtboardUnit';
    const factor = source[key];
    if (!Number.isFinite(factor) || Number(factor) <= 0) {
      errors.push(`${name} units require a finite positive ${key}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function isPhysicalUnits(units: unknown, scope: UnitScope = 'world'): boolean {
  if (!units || typeof units !== 'object') return false;
  const source = units as Record<string, unknown>;
  const key = scope === 'world' ? 'mmPerWorldUnit' : 'mmPerArtboardUnit';
  return source[scope] !== undefined && source[scope] !== 'unitless'
    && Number.isFinite(source[key]);
}

export function millimetresPerUnit(units: unknown, scope: UnitScope = 'world'): number | null {
  if (!isPhysicalUnits(units, scope)) return null;
  const source = units as Record<string, unknown>;
  const factor = source[scope === 'world' ? 'mmPerWorldUnit' : 'mmPerArtboardUnit'];
  return Number.isFinite(factor) && Number(factor) > 0 ? Number(factor) : null;
}

export function toMillimetres(value: unknown, units: unknown, scope: UnitScope = 'world'): number | null {
  const factor = millimetresPerUnit(units, scope);
  if (factor === null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number * factor;
}

export function worldToMillimetres(value: unknown, units: unknown): number | null {
  return toMillimetres(value, units, 'world');
}

export function artboardToMillimetres(value: unknown, units: unknown): number | null {
  return toMillimetres(value, units, 'artboard');
}

export function bboxToMillimetres(
  bbox: BBoxLike | null | undefined,
  units: unknown,
): { width: number | null; height: number | null; depth: number | null; unit: 'mm' } | null {
  const factor = millimetresPerUnit(units, 'world');
  if (factor === null || !bbox) return null;
  const scale = (value: unknown) => (Number.isFinite(value) ? Number(value) * factor : null);
  return {
    width: scale(bbox.width),
    height: scale(bbox.height),
    depth: scale(bbox.depth),
    unit: 'mm',
  };
}

export function formatPhysicalLength(value: unknown, unit = 'mm'): string {
  if (!Number.isFinite(value)) return '—';
  const number = Number(value);
  const abs = Math.abs(number);
  const digits = abs >= 100 ? 1 : abs >= 10 ? 2 : 3;
  return `${number.toFixed(digits)} ${unit}`;
}
