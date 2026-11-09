/**
 * core/units.js — optional physical units for world and artboard space.
 *
 * Physical units are metadata. Canonical world geometry, tessellation,
 * SurfaceMapping, frames and bounding boxes are never rescaled. Consumers such
 * as the plotter and fabrication exporters apply an explicit conversion at the
 * boundary, and only when a finite positive factor is declared.
 */

export const PHYSICAL_UNIT_SYSTEMS = Object.freeze(['unitless', 'mm', 'cm']);
export const DEFAULT_UNITS = Object.freeze({
  world: 'unitless',
  mmPerWorldUnit: null,
  artboard: 'unitless',
  mmPerArtboardUnit: null,
});

export function createDefaultUnits() {
  return { ...DEFAULT_UNITS };
}

export function sanitizeUnits(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return createDefaultUnits();
  return {
    world: sanitizeUnitSystem(raw.world),
    mmPerWorldUnit: sanitizeFactor(raw.world, raw.mmPerWorldUnit),
    artboard: sanitizeUnitSystem(raw.artboard),
    mmPerArtboardUnit: sanitizeFactor(raw.artboard, raw.mmPerArtboardUnit),
  };
}

function sanitizeUnitSystem(value) {
  return PHYSICAL_UNIT_SYSTEMS.includes(value) ? value : 'unitless';
}

function sanitizeFactor(system, value) {
  if (system === 'unitless') return null;
  const factor = Number(value);
  return Number.isFinite(factor) && factor > 0 ? factor : null;
}

export function validateUnits(units, scope = null) {
  if (!units || typeof units !== 'object') return { ok: false, errors: ['units metadata is missing'] };
  const errors = [];
  const systems = scope ? [scope] : ['world', 'artboard'];
  for (const name of systems) {
    const system = units[name];
    if (!PHYSICAL_UNIT_SYSTEMS.includes(system)) {
      errors.push(`${name} unit system is invalid`);
      continue;
    }
    if (system === 'unitless') continue;
    const key = name === 'world' ? 'mmPerWorldUnit' : 'mmPerArtboardUnit';
    const factor = units[key];
    if (!Number.isFinite(factor) || factor <= 0) {
      errors.push(`${name} units require a finite positive ${key}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function isPhysicalUnits(units, scope = 'world') {
  return units?.[scope] !== undefined && units[scope] !== 'unitless'
    && Number.isFinite(units?.[scope === 'world' ? 'mmPerWorldUnit' : 'mmPerArtboardUnit']);
}

export function millimetresPerUnit(units, scope = 'world') {
  if (!isPhysicalUnits(units, scope)) return null;
  const factor = scope === 'world' ? units.mmPerWorldUnit : units.mmPerArtboardUnit;
  return Number.isFinite(factor) && factor > 0 ? factor : null;
}

export function toMillimetres(value, units, scope = 'world') {
  const factor = millimetresPerUnit(units, scope);
  if (factor === null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number * factor;
}

export function worldToMillimetres(value, units) {
  return toMillimetres(value, units, 'world');
}

export function artboardToMillimetres(value, units) {
  return toMillimetres(value, units, 'artboard');
}

export function bboxToMillimetres(bbox, units) {
  const factor = millimetresPerUnit(units, 'world');
  if (factor === null || !bbox) return null;
  return {
    width: Number.isFinite(bbox.width) ? bbox.width * factor : null,
    height: Number.isFinite(bbox.height) ? bbox.height * factor : null,
    depth: Number.isFinite(bbox.depth) ? bbox.depth * factor : null,
    unit: 'mm',
  };
}

export function formatPhysicalLength(value, unit = 'mm') {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 1 : abs >= 10 ? 2 : 3;
  return `${value.toFixed(digits)} ${unit}`;
}
