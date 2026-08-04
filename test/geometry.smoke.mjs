/**
 * geometry.smoke.mjs — invariant verification for the Glyph Lab core.
 *
 * The geometry modules are pure mathematics (no DOM, no p5), so the full
 * pipeline can be verified in Node:
 *
 *   1. default params produce a valid glyph,
 *   2. random params across the ENTIRE schema range produce valid glyphs
 *      (exactly 2 on-axis crossings, zero self-intersections, finite),
 *   3. mutations always preserve validity,
 *   4. preset sanitize/serialize/parse round-trips,
 *   5. the SVG builder emits clean, finite Bézier path data,
 *   6. tips always terminate outside the canvas extent.
 *
 * Run: npm test
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  PARAM_SCHEMA,
  NUMERIC_KEYS,
  defaultParams,
  sanitizeParams,
  clampParam,
} from '../src/core/params.js';
import { GlyphGeometry } from '../src/geometry/GlyphGeometry.js';
import { MutationEngine } from '../src/engine/MutationEngine.js';
import { PresetManager } from '../src/engine/PresetManager.js';
import { Exporter } from '../src/export/Exporter.js';

let failures = 0;
let checks = 0;

function assert(condition, message) {
  checks++;
  if (!condition) {
    failures++;
    console.error(`  ✗ ${message}`);
  }
}

function randomParams(rng) {
  const params = defaultParams();
  for (const key of NUMERIC_KEYS) {
    const s = PARAM_SCHEMA[key];
    params[key] = clampParam(key, s.min + rng() * (s.max - s.min));
  }
  params.mirror = true;
  return params;
}

// Deterministic PRNG (mulberry32) for reproducible runs.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ——— 1. Defaults ——— */
console.log('1. default glyph');
{
  const g = new GlyphGeometry(defaultParams());
  assert(g.validation.ok, `defaults must be valid (${g.validation.reason})`);
  assert(g.master.segments.length === 10, `expected 10 Bézier segments, got ${g.master.segments.length}`);
  assert(g.validation.crossings.length === 2, 'expected exactly 2 crossings');
  for (const c of g.validation.crossings) {
    assert(Math.abs(c.x) <= 3, `crossing off axis: x=${c.x.toFixed(3)}`);
  }
  // Crossings must straddle the centre.
  const ys = g.validation.crossings.map((c) => c.y).sort((a, b) => a - b);
  assert(ys[0] < 0 && ys[1] > 0, `crossings must straddle centre, got ${ys}`);
}

/* ——— 2. Exhaustive random sweep ——— */
console.log('2. random parameter sweep (600 samples, full ranges)');
{
  const rng = mulberry32(0x51f3ab);
  let invalid = 0;
  for (let i = 0; i < 600; i++) {
    const params = randomParams(rng);
    const g = new GlyphGeometry(params);
    if (!g.validation.ok) {
      invalid++;
      if (invalid <= 5) {
        console.error(`    invalid #${i}: ${g.validation.reason}`, JSON.stringify(params));
      }
    }
  }
  assert(invalid === 0, `${invalid}/600 random parameter sets were invalid`);
}

/* ——— 3. Mutation preserves validity ——— */
console.log('3. mutation engine (250 mutations, chained)');
{
  const rng = mulberry32(0xc0ffee);
  const mutator = new MutationEngine({ rng });
  let params = defaultParams();
  for (let i = 0; i < 250; i++) {
    const next = mutator.mutate(params);
    const g = new GlyphGeometry(next);
    assert(g.validation.ok, `mutation ${i} invalid: ${g.validation.reason}`);
    params = next; // chain mutations to wander the space
  }
}

/* ——— 4. Presets ——— */
console.log('4. preset manager');
{
  const pm = new PresetManager(null);
  const params = defaultParams();
  params.width = 222;
  const json = pm.serialize('Round Trip', params);
  const { name, params: parsed } = pm.parse(json);
  assert(name === 'Round Trip', 'preset name round-trip');
  assert(JSON.stringify(parsed) === JSON.stringify(sanitizeParams(params)), 'preset params round-trip');

  // Hostile input: out-of-range + junk keys + wrong types.
  const hostile = pm.parse('{"params":{"width":99999,"height":"abc","waist":-5,"hack":true,"mirror":0}}');
  assert(hostile.params.width === PARAM_SCHEMA.width.max, 'width clamped to max');
  assert(hostile.params.height === PARAM_SCHEMA.height.default, 'bad height defaulted');
  assert(hostile.params.waist === PARAM_SCHEMA.waist.min, 'waist clamped to min');
  assert(!('hack' in hostile.params), 'unknown key dropped');
  assert(hostile.params.mirror === false, 'boolean coerced');

  // Built-ins present and valid.
  assert(pm.names().length >= 4, 'built-in presets listed');
  for (const n of pm.names()) {
    assert(GlyphGeometry.isValid(pm.get(n)), `built-in "${n}" must be valid`);
  }
  assert(pm.delete('Vesica Prime') === false, 'built-ins are immutable');
}

/* ——— 5. SVG builder ——— */
console.log('5. svg export');
{
  const g = new GlyphGeometry(defaultParams());
  const svg = Exporter.buildSVG(g, g.params, { w: 1200, h: 900 });
  assert(svg.includes('<svg'), 'svg root present');
  assert(svg.includes('fill="#000000"'), 'black background rect');
  assert(svg.includes('stroke="#ffffff"'), 'white stroke');
  const cCommands = (svg.match(/ C /g) || []).length;
  assert(cCommands === 20, `expected 20 cubic segments (2×10), got ${cCommands}`);
  const numbers = svg.match(/-?\d+\.?\d*/g).map(Number);
  assert(numbers.every(Number.isFinite), 'all SVG numbers finite');
  assert((svg.match(/-->/g) || []).length === 1, 'XML comment safely escaped');

  // Master-only export when mirror is off.
  const soloParams = { ...g.params, mirror: false };
  const solo = Exporter.buildSVG(g, soloParams, { w: 1200, h: 900 });
  assert((solo.match(/ C /g) || []).length === 10, 'mirror=false exports master only');
}

/* ——— 6. Structural guarantees ——— */
console.log('6. structural guarantees across sweep');
{
  const rng = mulberry32(0xbeef);
  for (let i = 0; i < 200; i++) {
    const params = randomParams(rng);
    const g = new GlyphGeometry(params);
    const pts = g.master.controlPoints;

    // Tips outside the canvas extent (glyph half-height).
    assert(Math.abs(pts[0].y) > params.height, `entry inside canvas (${params.height})`);
    assert(Math.abs(pts[pts.length - 1].y) > params.height, 'exit inside canvas');

    // Control polygon strictly monotone in y (loop impossibility).
    let monotone = true;
    for (let k = 1; k < pts.length; k++) {
      if (pts[k].y < pts[k - 1].y) monotone = false;
    }
    assert(monotone, 'control polygon y must be strictly monotone');

    // Crossings exactly on the axis in the control polygon.
    assert(pts.find((p) => p.role === 'crossTop').x === 0, 'crossTop x ≠ 0');
    assert(pts.find((p) => p.role === 'crossBottom').x === 0, 'crossBottom x ≠ 0');

    // Perfect bilateral symmetry: mirror samples are exact reflections.
    const m = g.master.samples[100];
    const r = g.mirrorSamples[100];
    assert(Math.abs(m.x + r.x) < 1e-9 && Math.abs(m.y - r.y) < 1e-9, 'mirror asymmetry');
  }
}

/* ——— Snapshot SVGs for visual inspection ——— */
{
  const outDir = process.env.GLYPH_SNAPSHOT_DIR;
  if (outDir) {
    mkdirSync(outDir, { recursive: true });
    const pm = new PresetManager(null);
    for (const name of pm.names()) {
      const params = pm.get(name);
      const g = new GlyphGeometry(params);
      const svg = Exporter.buildSVG(g, params, { w: 900, h: 1100 });
      writeFileSync(join(outDir, `${name.replace(/\s+/g, '-').toLowerCase()}.svg`), svg);
    }
    console.log(`   snapshots written to ${outDir}`);
  }
}

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
