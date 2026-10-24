/**
 * attractors.js — strange attractor generators (multi-curve).
 *
 * Each attractor samples a chaotic dynamical system and emits the
 * trajectory as a single polyline (Curve). With `trajectories > 1`,
 * multiple starting points are sampled in parallel and each becomes
 * its own curve in the output Curve[] — letting a single document
 * produce the multi-component "exploded" compositions that emerge
 * from these systems.
 *
 * The 4 systems here are classics that produce visually distinct
 * families:
 *
 *   - lorenz  : the canonical butterfly-shaped attractor.
 *   - clifford: Pickover's algebraically simple iteration; produces
 *               richly varied filaments depending on its 4 parameters.
 *   - dejong  : Peter de Jong's map; sharp, often web-like structures.
 *   - aizawa  : torus attractor with three nested loops.
 *
 * Each generator shares a common params schema (samples, trajectories,
 * dt, skip, seed) so the panel is uniform across the four. The system
 * coefficients have their own defaults tuned for visually pleasing
 * output but expose the full mathematical range.
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { createNoise2D } from '../math/noise.js';
import { fitCurves } from '../sampling/sampling.js';
import { TAU } from './helpers.js';

/**
 * Shared attractor params. Each system adds its own coefficient params
 * on top of these. All numeric params are clamped to a generous but
 * finite range; wildly bad values would otherwise produce NaN cascades.
 */
const ATTRACTOR_BASE_PARAMS = {
  samples:     { label: 'Samples', type: TYPE.NUMBER, min: 100,    max: 30000, step: 100, default: 6000 },
  trajectories:{ label: 'Trajectories', type: TYPE.NUMBER, min: 1,   max: 24,    step: 1,   default: 1,
                 doc: 'Independent starting points. Each becomes its own curve.' },
  dt:          { label: 'Step Size', type: TYPE.NUMBER, min: 0.0001, max: 0.2,  step: 0.0001, default: 0.005 },
  skip:        { label: 'Skip (transient)', type: TYPE.NUMBER, min: 0, max: 20000, step: 50, default: 2000,
                 doc: 'Iterations discarded at the start (let the system settle on the attractor).' },
  seed:        { label: 'Seed', type: TYPE.NUMBER, min: 0, max: 9999, step: 1, default: 1,
                 doc: 'Different seeds pick different starting points for multi-trajectory mode.' },
  fit:         { label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 360,
                 doc: '0 = keep native scale.' },
};

/**
 * Clifford/De Jong are discrete maps (dt = 1 by definition); exposing a
 * Step Size slider for them would be inert, so those generators omit it.
 */
const DISCRETE_BASE_PARAMS = { ...ATTRACTOR_BASE_PARAMS };
delete DISCRETE_BASE_PARAMS.dt;

/* —————————— helpers —————————— */

/**
 * Generate `n` starting points in the unit square using a seeded
 * jittered grid so trajectories are visually distributed rather than
 * clumped.
 */
function startingPoints(n, seed, jitter = 0.4) {
  const noise = createNoise2D(seed);
  const pts = [];
  const cols = Math.ceil(Math.sqrt(n));
  const cell = 1 / cols;
  let k = 0;
  for (let r = 0; r < cols && k < n; r++) {
    for (let c = 0; c < cols && k < n; c++) {
      const jx = noise(r * 7.13, c * 3.27) * jitter;
      const jy = noise(r * 3.27, c * 7.13) * jitter;
      pts.push({
        x: (c + 0.5) * cell + jx * cell,
        y: (r + 0.5) * cell + jy * cell,
      });
      k++;
    }
  }
  return pts;
}

/**
 * Integrate a per-step update function `step(x, y) → {x, y}` (or for
 * 3D systems, `step(x, y, z) → {x, y, z}`) for `samples` iterations,
 * dropping the first `skip` iterations. Returns the polyline.
 */
function iterate({ step, x0, y0, z0, samples, skip, dims }) {
  let x = x0, y = y0, z = z0;
  const path = new Array(samples);
  let k = 0;
  const isValid = (xi, yi, zi) =>
    Number.isFinite(xi) && Number.isFinite(yi) && (dims === 2 || Number.isFinite(zi));
  for (let i = 0; i < skip; i++) {
    const next = step(x, y, z);
    if (dims === 2) { x = next.x; y = next.y; }
    else { x = next.x; y = next.y; z = next.z; }
    if (!isValid(x, y, z)) return []; // diverged
  }
  for (let i = 0; i < samples; i++) {
    const next = step(x, y, z);
    if (dims === 2) { x = next.x; y = next.y; }
    else { x = next.x; y = next.y; z = next.z; }
    if (!isValid(x, y, z)) return path.slice(0, k);
    path[k++] = { x, y };
  }
  return path.slice(0, k);
}

/** Common post-processing: optional fit. (Center happens once at the end.) */
function finalize(curves, fit) {
  if (fit > 0) return fitCurves(curves, fit);
  return curves;
}

/* —————————— 1. Lorenz attractor —————————— */

Generators.register({
  id: 'lorenz',
  name: 'Lorenz Attractor',
  category: 'attractor',
  params: {
    ...ATTRACTOR_BASE_PARAMS,
    sigma: { label: 'σ (sigma)', type: TYPE.NUMBER, min: 0.1, max: 30, step: 0.1, default: 10 },
    rho:   { label: 'ρ (rho)',   type: TYPE.NUMBER, min: 0.1, max: 60, step: 0.1, default: 28 },
    beta:  { label: 'β (beta)',  type: TYPE.NUMBER, min: 0.1, max: 10, step: 0.1, default: 8 / 3 },
    projection: {
      label: 'Projection', type: TYPE.SELECT,
      options: ['xy', 'xz', 'yz'],
      default: 'xy',
      doc: 'xy: front view. xz: top view. yz: side view.',
    },
  },

  domain: () => ({ t0: 0, t1: TAU, closed: false }),

  sample(params, _ctx) {
    const { samples, trajectories, dt, skip, seed, fit, sigma, rho, beta, projection } = params;
    const starts = startingPoints(trajectories, seed);
    const step = (x, y, z) => ({
      x: x + sigma * (y - x) * dt,
      y: y + (x * (rho - z) - y) * dt,
      z: z + (x * y - beta * z) * dt,
    });
    const proj = (p) => {
      if (projection === 'xz') return { x: p.x, y: -p.z };
      if (projection === 'yz') return { x: -p.z, y: p.y };
      return { x: p.x, y: p.y };
    };

    const curves = [];
    for (let i = 0; i < starts.length; i++) {
      // Classic Lorenz start: (0.1, 0, 0). Multiple trajectories start
      // from a tiny jitter around this canonical point so they fall onto
      // different regions of the same attractor.
      const s = starts[i];
      const sx = 0.1 + (s.x - 0.5) * 0.05;
      const sy = 0   + (s.y - 0.5) * 0.05;
      const sz = 0   + (s.x - 0.5) * 0.05;
      const raw = iterate({
        step, dims: 3,
        x0: sx, y0: sy, z0: sz,
        samples, skip, dt,
      });
      if (raw.length < 2) continue;
      const points = raw.map(proj);
      curves.push({
        id: `lorenz-${i}`,
        points,
        closed: false,
        meta: { source: 'lorenz', branch: i },
      });
    }
    return finalize(curves, fit);
  },
});

/* —————————— 2. Clifford attractor —————————— */

Generators.register({
  id: 'clifford',
  name: 'Clifford Attractor',
  category: 'attractor',
  params: {
    ...DISCRETE_BASE_PARAMS,
    a: { label: 'a', type: TYPE.NUMBER, min: -3, max: 3, step: 0.01, default: 1.5 },
    b: { label: 'b', type: TYPE.NUMBER, min: -3, max: 3, step: 0.01, default: -1.8 },
    c: { label: 'c', type: TYPE.NUMBER, min: -3, max: 3, step: 0.01, default: 1.6 },
    d: { label: 'd', type: TYPE.NUMBER, min: -3, max: 3, step: 0.01, default: 0.9 },
  },

  domain: () => ({ t0: 0, t1: TAU, closed: false }),

  sample(params, _ctx) {
    const { samples, trajectories, skip, seed, fit, a, b, c, d } = params;
    const starts = startingPoints(trajectories, seed);
    const step = (x, y) => ({
      x: Math.sin(a * y) + c * Math.cos(a * x),
      y: Math.sin(b * x) + d * Math.cos(b * y),
    });
    const curves = [];
    for (let i = 0; i < starts.length; i++) {
      const s = starts[i];
      const path = iterate({ step, dims: 2, x0: s.x, y0: s.y, samples, skip, dt: 1 });
      if (path.length < 2) continue;
      curves.push({
        id: `clifford-${i}`,
        points: path,
        closed: false,
        meta: { source: 'clifford', branch: i },
      });
    }
    return finalize(curves, fit);
  },
});

/* —————————— 3. De Jong attractor —————————— */

Generators.register({
  id: 'dejong',
  name: 'De Jong Attractor',
  category: 'attractor',
  params: {
    ...DISCRETE_BASE_PARAMS,
    a: { label: 'a', type: TYPE.NUMBER, min: -5, max: 5, step: 0.01, default: -2.0 },
    b: { label: 'b', type: TYPE.NUMBER, min: -5, max: 5, step: 0.01, default: -2.0 },
    c: { label: 'c', type: TYPE.NUMBER, min: -5, max: 5, step: 0.01, default: 1.2 },
    d: { label: 'd', type: TYPE.NUMBER, min: -5, max: 5, step: 0.01, default: 0.2 },
  },

  domain: () => ({ t0: 0, t1: TAU, closed: false }),

  sample(params, _ctx) {
    const { samples, trajectories, skip, seed, fit, a, b, c, d } = params;
    const starts = startingPoints(trajectories, seed);
    const step = (x, y) => ({
      x: Math.sin(a * y) - Math.cos(b * x),
      y: Math.sin(c * x) - Math.cos(d * y),
    });
    const curves = [];
    for (let i = 0; i < starts.length; i++) {
      const s = starts[i];
      const path = iterate({ step, dims: 2, x0: s.x * 4, y0: s.y * 4, samples, skip, dt: 1 });
      if (path.length < 2) continue;
      curves.push({
        id: `dejong-${i}`,
        points: path,
        closed: false,
        meta: { source: 'dejong', branch: i },
      });
    }
    return finalize(curves, fit);
  },
});

/* —————————— 4. Aizawa attractor —————————— */

Generators.register({
  id: 'aizawa',
  name: 'Aizawa Attractor',
  category: 'attractor',
  params: {
    ...ATTRACTOR_BASE_PARAMS,
    a: { label: 'a', type: TYPE.NUMBER, min: 0.05, max: 1.5, step: 0.01, default: 0.95 },
    b: { label: 'b', type: TYPE.NUMBER, min: 0.05, max: 1.0, step: 0.01, default: 0.7 },
    c: { label: 'c', type: TYPE.NUMBER, min: 0.05, max: 1.0, step: 0.01, default: 0.6 },
    d: { label: 'd', type: TYPE.NUMBER, min: 0.5, max: 5,   step: 0.01, default: 3.5 },
    e: { label: 'e', type: TYPE.NUMBER, min: 0.05, max: 1.0, step: 0.01, default: 0.25 },
    f: { label: 'f', type: TYPE.NUMBER, min: 0.05, max: 1.0, step: 0.01, default: 0.1 },
  },

  domain: () => ({ t0: 0, t1: TAU, closed: false }),

  sample(params, _ctx) {
    const { samples, trajectories, dt, skip, seed, fit, a, b, c, d, e, f } = params;
    const starts = startingPoints(trajectories, seed);
    const step = (x, y, z) => {
      const dx = (z - b) * x - d * y;
      const dy = d * x + (z - b) * y;
      const dz = c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x;
      return { x: x + dx * dt, y: y + dy * dt, z: z + dz * dt };
    };
    // Aizawa projection: scale x,y up by 8× because the attractor lives
    // in x,y ∈ [-0.4, 0.4] — too narrow for a clean canvas. We also skip
    // z since XY shows the toroidal loops most clearly.
    const projA = (p) => ({ x: p.x * 8, y: p.y * 8 });

    const curves = [];
    for (let i = 0; i < starts.length; i++) {
      const s = starts[i];
      // Aizawa basin: tiny jitter around the canonical start (0.01, 0.01, 0.4).
      // The system is sensitive — large offsets from the basin cause
      // divergence during the skip transient.
      const raw = iterate({
        step, dims: 3,
        x0: 0.01 + (s.x - 0.5) * 0.02,
        y0: 0.01 + (s.y - 0.5) * 0.02,
        z0: 0.40 + (s.x - 0.5) * 0.04,
        samples, skip, dt,
      });
      if (raw.length < 2) continue;
      const points = raw.map(projA);
      curves.push({
        id: `aizawa-${i}`,
        points,
        closed: false,
        meta: { source: 'aizawa', branch: i },
      });
    }
    return finalize(curves, fit);
  },
});

/* —————————— Attractor preset helpers —————————— */
// (built-in presets are registered in src/presets/builtins.js using
// createDocument('lorenz' | 'clifford' | 'dejong' | 'aizawa').)
