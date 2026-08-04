/**
 * noise.js — deterministic seeded simplex noise (2D).
 *
 * All noise in Parametrica is seeded (spec G6): same seed ⇒ same field,
 * same form, every time. Implementation: Gustavson-style simplex with a
 * permutation table shuffled by mulberry32.
 */

/** Deterministic PRNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

/**
 * @param {number} seed
 * @returns {(x:number, y:number) => number} noise in [-1, 1]
 */
export function createNoise2D(seed = 1) {
  const rand = mulberry32((seed * 2654435761) >>> 0);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  return function noise2D(x, y) {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n = 0;
    n += corner(perm[ii + perm[jj]], x0, y0);
    n += corner(perm[ii + i1 + perm[jj + j1]], x1, y1);
    n += corner(perm[ii + 1 + perm[jj + 1]], x2, y2);
    return 70 * n; // normalized to ~[-1, 1]
  };

  function corner(hash, x, y) {
    let t = 0.5 - x * x - y * y;
    if (t < 0) return 0;
    const g = GRAD2[hash & 7];
    t *= t;
    return t * t * (g[0] * x + g[1] * y);
  }
}

/** 1D convenience wrapper: samples the 2D field along a horizontal line. */
export function createNoise1D(seed = 1) {
  const n2 = createNoise2D(seed);
  const offset = mulberry32((seed * 1597334677) >>> 0)() * 512;
  return (x) => n2(x, offset);
}
