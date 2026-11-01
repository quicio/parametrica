/**
 * math/periods.js — closing periods for structured parametric families.
 */

export const TAU = Math.PI * 2;

export function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Smallest denominator q such that `value ≈ p/q` within tolerance.
 * Returns 0 when the value is not rational at this resolution.
 */
export function rationalDenominator(value, { maxDenominator = 64, tolerance = 1e-7 } = {}) {
  const x = Math.abs(Number(value));
  if (!Number.isFinite(x)) return 0;
  if (x < tolerance) return 0;
  for (let d = 1; d <= maxDenominator; d++) {
    const p = Math.round(x * d);
    if (p === 0) continue;
    if (Math.abs(x - p / d) <= tolerance * Math.max(1, x)) return d;
  }
  return 0;
}

/** Number of 2π turns after which a trochoid closes. */
export function trochoidTurns(R, r, mode = 'hypo', { maxTurns = 128 } = {}) {
  const wheel = Math.abs(Number(r));
  if (!Number.isFinite(wheel) || wheel < 1e-9) return 1;
  const ring = Math.abs(Number(R));
  const ratio = (mode === 'epi' ? ring + wheel : ring - wheel) / wheel;
  const denominator = rationalDenominator(ratio, { maxDenominator: maxTurns });
  return Math.min(maxTurns, denominator || 1);
}

/** Common 2π turn count for sin(a·t + δ), sin(b·t). */
export function lissajousTurns(a, b, { maxTurns = 64 } = {}) {
  const da = rationalDenominator(a, { maxDenominator: maxTurns });
  const db = rationalDenominator(b, { maxDenominator: maxTurns });
  if (!da || !db) return 1;
  return Math.min(maxTurns, lcm(da, db));
}

/** 2π turn count for a rose r = cos((n/d)·θ + phase). */
export function roseTurns(n, d = 1, { maxTurns = 64 } = {}) {
  const numer = Math.round(Math.abs(Number(n)) || 1);
  const denom = Math.round(Math.abs(Number(d)) || 1);
  return Math.min(maxTurns, denom / gcd(numer, denom));
}
