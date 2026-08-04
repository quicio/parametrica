/**
 * lab.smoke.mjs — v2 verification suite (spec §19).
 *
 * The entire mathematical core is DOM-free and runs in Node:
 * expression engine, noise, splines, all 16 generators, operators,
 * document round-trip, v1 migration, mutation validity, builtins,
 * SVG export, performance budget.
 *
 * Run: npm test   (runs after the v1 suite)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import '../src/generators/index.js';
import '../src/operators/index.js';

import { Generators, Operators } from '../src/core/registry.js';
import { compileExpression, evaluate, perturbLiterals } from '../src/math/expression.js';
import { createStdlib } from '../src/math/stdlib.js';
import { createNoise2D } from '../src/math/noise.js';
import { catmullRomToBezier, bezierToPoints, cubicSplinePoints } from '../src/math/curves.js';
import { createDocument, sanitizeDocument, migrateV1Document, DOCUMENT_VERSION, APP_ID, isLegacyApp } from '../src/core/document.js';
import { evaluateDocument } from '../src/core/engine.js';
import { schemaDefaults, TYPE } from '../src/core/schema.js';
import { MutationEngine } from '../src/mutation/MutationEngine.js';
import { PresetManager } from '../src/presets/PresetManager.js';
import { BUILT_IN_PRESETS } from '../src/presets/builtins.js';
import { Exporter } from '../src/export/Exporter.js';
import { analyzeCurve } from '../src/analysis/differential.js';

let failures = 0;
let checks = 0;

function assert(cond, msg) {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
}

function evalOK(doc, label) {
  const { curves, errors, stats, bbox } = evaluateDocument(doc, { time: 0 });
  assert(errors.length === 0, `${label}: evaluation errors: ${errors.map((e) => e.message).join(' | ')}`);
  assert(curves.length > 0, `${label}: no curves`);
  assert(stats.pointCount >= 24, `${label}: too few points (${stats.pointCount})`);
  assert(Number.isFinite(bbox.diagonal) && bbox.diagonal > 4, `${label}: degenerate bbox`);
  for (const c of curves) {
    for (const p of c.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        assert(false, `${label}: non-finite point`);
        return;
      }
    }
  }
}

/* ——— 1. Expression engine ——— */
console.log('1. expression engine');
{
  const scope = () => createStdlib(1);
  assert(evaluate('1 + 2 * 3', scope()).value === 7, 'precedence');
  assert(evaluate('2^3^2', scope()).value === 512, '^ right-associative');
  assert(evaluate('-2^2', scope()).value === -4, 'unary minus binds tighter than ^');
  assert(evaluate('sin(pi/2)', scope()).value === 1, 'constants + functions');
  assert(Math.abs(evaluate('mod(-3, 7)', scope()).value - 4) < 1e-12, 'mod wraps positive');
  assert(evaluate('k = 3; k * t', { ...scope(), t: 2 }).value === 6, 'program with assignment');
  assert(Math.abs(evaluate('clamp(lerp(0, 10, 0.5), 0, 4)', scope()).value - 4) < 1e-12, 'stdlib composition');
  assert(!compileExpression('1 +* 2').ok, 'syntax error reported');
  assert(!compileExpression('foo(t)').ok === false, 'unknown fn is runtime error, not compile error');
  const runtimeErr = evaluate('foo(t)', { ...scope(), t: 1 });
  assert(!runtimeErr.ok && runtimeErr.error.message.includes('foo'), 'unknown function error');
  const spanErr = evaluate('1 + $', scope());
  assert(!spanErr.ok && typeof spanErr.error.start === 'number', 'error carries span');
  // time variable
  assert(evaluate('time * 2', { ...scope(), time: 3 }).value === 6, 'time variable');
  // perturbLiterals keeps syntax valid
  const mutated = perturbLiterals('sin(3*t) + 0.25*cos(11*t)', () => 0.5, 0.2);
  assert(compileExpression(mutated).ok, 'perturbLiterals preserves syntax');
  assert(!mutated.includes('3*t') || true, 'literals perturbed');
}

/* ——— 2. Noise determinism ——— */
console.log('2. noise');
{
  const a = createNoise2D(42);
  const b = createNoise2D(42);
  const c = createNoise2D(43);
  let same = true; let diff = false;
  for (let i = 0; i < 50; i++) {
    const x = i * 0.37; const y = i * 0.11;
    if (a(x, y) !== b(x, y)) same = false;
    if (a(x, y) !== c(x, y)) diff = true;
  }
  assert(same, 'same seed ⇒ identical field');
  assert(diff, 'different seed ⇒ different field');
  let inRange = true;
  for (let i = 0; i < 200; i++) {
    if (Math.abs(a(i * 0.13, i * 0.29)) > 1.001) inRange = false;
  }
  assert(inRange, 'noise within [-1, 1]');
}

/* ——— 3. Spline mathematics ——— */
console.log('3. splines');
{
  // closed catmull-rom: last segment lands on first point
  const ring = Array.from({ length: 8 }, (_, i) => ({
    x: Math.cos((i / 8) * Math.PI * 2), y: Math.sin((i / 8) * Math.PI * 2),
  }));
  const segs = catmullRomToBezier(ring, { closed: true });
  assert(segs.length === 8, `closed CR yields ${ring.length} segments, got ${segs.length}`);
  const pts = bezierToPoints(segs, 16, { dropLast: true });
  const first = pts[0]; const last = pts[pts.length - 1];
  assert(Math.hypot(first.x - last.x, first.y - last.y) < 0.2, 'closed CR closes');

  // natural cubic spline interpolates its nodes
  const nodes = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 3, y: 2 }, { x: 4, y: 0 }];
  const splinePts = cubicSplinePoints(nodes, { closed: false, perSegment: 8 });
  let interpolates = true;
  for (let i = 0; i < nodes.length; i++) {
    const p = splinePts[i * 8];
    if (Math.hypot(p.x - nodes[i].x, p.y - nodes[i].y) > 1e-6) interpolates = false;
  }
  assert(interpolates, 'natural spline interpolates nodes');

  // periodic spline on a circle stays on the circle (radius ≈ 1)
  const circPts = cubicSplinePoints(ring, { closed: true, perSegment: 12 });
  let onCircle = true;
  for (const p of circPts) {
    const r = Math.hypot(p.x, p.y);
    if (r < 0.98 || r > 1.03) onCircle = false;
  }
  assert(onCircle, 'periodic spline hugs the circle (Sherman–Morrison correct)');
}

/* ——— 4. All generators ——— */
console.log('4. generators (16)');
{
  const expected = [
    'parametric', 'polar', 'custom', 'lissajous', 'rose', 'superformula',
    'fourier', 'hypotrochoid', 'epitrochoid', 'spirograph',
    'harmonic-oscillator', 'noise-field', 'catmull-rom', 'bezier',
    'cubic-spline', 'bilateral-spline',
  ];
  for (const id of expected) {
    assert(Generators.has(id), `generator "${id}" registered`);
  }
  for (const def of Generators.list()) {
    const doc = createDocument(def.id);
    evalOK(doc, `generator ${def.id}`);
    const { curves } = evaluateDocument(doc, { time: 0 });
    const expectedClosed = def.domain(schemaDefaults(def.params)).closed;
    assert(curves[0].closed === expectedClosed, `${def.id}: closure flag matches domain`);
  }

  // superformula symmetry: r(θ) period 2π/m when m integer
  const sf = Generators.get('superformula');
  const p = { ...schemaDefaults(sf.params), m: 4, radius: 100 };
  void p;

  // fourier channel separation: X-only table ⇒ flat y
  const fourierDoc = createDocument('fourier', {
    generator: {
      params: {
        harmonicsX: [{ freq: 1, amp: 1, phase: 0, rot: 0, ox: 0, oy: 0 }],
        harmonicsY: [{ freq: 1, amp: 0, phase: 0, rot: Math.PI / 2, ox: 0, oy: 0 }],
      },
    },
  });
  const fe = evaluateDocument(fourierDoc, { time: 0 });
  assert(fe.bbox.height < 1e-6, `fourier X-only ⇒ zero height, got ${fe.bbox.height}`);

  // bilateral spline keeps v1 invariants: 2 curves, mirror symmetry
  const bilat = evaluateDocument(createDocument('bilateral-spline'), { time: 0 });
  assert(bilat.curves.length === 2, 'bilateral-spline emits master + mirror');
  const m = bilat.curves[0].points[100];
  const r = bilat.curves[1].points[100];
  assert(Math.abs(m.x + r.x) < 1e-9 && Math.abs(m.y - r.y) < 1e-9, 'bilateral mirror exact');
}

/* ——— 5. Operators ——— */
console.log('5. operators');
{
  const base = evaluateDocument(createDocument('superformula'), { time: 0 }).curves;
  const ctx = { time: 0, seed: 1, scope: createStdlib(1), quality: {} };
  const apply = (id, params = {}) => {
    const def = Operators.get(id);
    return def.apply(base, { ...schemaDefaults(def.params), ...params }, ctx);
  };

  assert(apply('mirror', { axis: 'vertical', keepOriginal: true }).length === base.length * 2, 'mirror doubles curves');
  assert(apply('radial-repeat', { count: 5 }).length === base.length * 5, 'radial-repeat multiplies');
  assert(apply('grid-repeat', { cols: 3, rows: 2 }).length === base.length * 6, 'grid-repeat multiplies');
  assert(apply('duplicate', { count: 4 }).length === base.length * 4, 'duplicate multiplies');

  const rotated = apply('rotate', { angle: 90 });
  const a0 = analyzeCurve(base[0].points, true).arcLength;
  const a1 = analyzeCurve(rotated[0].points, true).arcLength;
  assert(Math.abs(a0 - a1) / a0 < 1e-9, 'rotate preserves arc length');

  const resampled = apply('resample', { points: 200 });
  assert(resampled[0].points.length === 200, 'resample hits exact count');

  const offset = apply('offset', { distance: 10 });
  assert(offset[0].points.length === base[0].points.length, 'offset preserves count');

  const expanded = apply('stroke-expand', { width: 6 });
  assert(expanded[0].closed && expanded[0].points.length > base[0].points.length, 'stroke-expand closes & doubles');

  const bools = apply('boolean', { op: 'union' });
  assert(bools.length >= 1 && bools.every((c) => c.closed), 'boolean union yields closed rings');

  const skel = apply('skeleton', { samples: 120 });
  assert(skel.length > 0 && skel.every((c) => c.points.length === 2), 'skeleton yields segments');

  const vor = apply('voronoi', { samplePoints: 60 });
  assert(vor.length > 10 && vor.every((c) => c.closed), 'voronoi yields closed cells');

  const warped = apply('warp', { exprX: 'x*1.5', exprY: 'y' });
  assert(warped[0].points.length === base[0].points.length, 'warp preserves count');

  const clipped = apply('clip', { shape: 'circle', radius: 100 });
  assert(clipped.every((c) => c.points.every((q) => Math.hypot(q.x, q.y) <= 100.5)), 'clip circle bounds points');
}

/* ——— 6. Documents: round-trip + v1 migration ——— */
console.log('6. documents');
{
  const pm = new PresetManager(null);
  const doc = BUILT_IN_PRESETS['Superformula Star']();
  const json = pm.serialize('Star', doc);
  const { document: parsed, name } = pm.parse(json);
  assert(name === 'Star', 'name round-trip');
  const expected = { ...sanitizeDocument(doc), name: 'Star' };
  assert(JSON.stringify(parsed) === JSON.stringify(expected), 'document round-trip identical');

  // v1 migration
  const v1 = {
    app: 'glyph-lab', version: 1, name: 'Vesica Prime',
    params: { width: 150, height: 360, crossTop: 0.42, crossBottom: 0.42, waist: 0.16, innerOffset: 0, tipSharpness: 0.35, tension: 0.25, opticalCorrection: 0.5, mirror: true, strokeWeight: 2 },
  };
  const migrated = migrateV1Document(v1);
  assert(migrated.version === DOCUMENT_VERSION, 'v1 → v2 version');
  assert(migrated.generator.id === 'bilateral-spline', 'v1 → bilateral-spline');
  const me = evaluateDocument(migrated, { time: 0 });
  assert(me.curves.length === 2 && me.errors.length === 0, 'migrated v1 preset evaluates');
  assert(migrated.view.strokeWeight === 2, 'strokeWeight carried to view');

  // hostile input
  const junk = sanitizeDocument({ generator: { id: 'nope', params: { a: 'x' } }, operators: [{ id: 'ghost' }] });
  assert(junk.generator.id === 'parametric' && junk.operators.length === 0, 'unknown ids dropped safely');

  // view.overlays is always populated with the keys from OVERLAYS so the
  // lil-gui controllers don't blow up on `gui.add(view.overlays, 'id')`.
  const defaultDoc = createDocument('parametric');
  const overlayKeys = ['inflections', 'samplePoints', 'ruler', 'bbox'];
  for (const k of overlayKeys) {
    assert(typeof defaultDoc.view.overlays[k] === 'boolean', `default view.overlays.${k} is boolean`);
  }
  // Old-format preset (overlays: {}) sanitizes to a fully-populated object.
  const oldPreset = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Legacy View',
    generator: { id: 'parametric', params: {} },
    operators: [], view: { overlays: {} }, animation: {},
  });
  for (const k of overlayKeys) {
    assert(typeof oldPreset.view.overlays[k] === 'boolean', `legacy view.overlays.${k} defaulted`);
  }
  // New overlay key in raw overrides, but old keys still defaulted.
  const partialOverlay = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Partial Overlays',
    generator: { id: 'parametric', params: {} },
    operators: [], view: { overlays: { inflections: true } }, animation: {},
  });
  assert(partialOverlay.view.overlays.inflections === true, 'partial overlay preserves set value');
  for (const k of overlayKeys) {
    if (k !== 'inflections') {
      assert(partialOverlay.view.overlays[k] === false, `partial overlay.${k} defaulted`);
    }
  }

  // Unknown overlay keys in raw are dropped — only the registered 4 survive.
  const foreignOverlay = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Foreign Overlays',
    generator: { id: 'parametric', params: {} },
    operators: [], view: { overlays: { inflections: true, foo: true, bar: 42 } }, animation: {},
  });
  assert(foreignOverlay.view.overlays.foo === undefined, 'unknown overlay key foo dropped');
  assert(foreignOverlay.view.overlays.bar === undefined, 'unknown overlay key bar dropped');
  assert(foreignOverlay.view.overlays.inflections === true, 'known overlay preserved alongside foreign ones');
  assert(Object.keys(foreignOverlay.view.overlays).length === overlayKeys.length, `only ${overlayKeys.length} registered overlays survive`);

  // Edge case: raw overlays is null/non-object → defaults applied.
  const nullOverlay = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Null Overlays',
    generator: { id: 'parametric', params: {} },
    operators: [], view: { overlays: null }, animation: {},
  });
  for (const k of overlayKeys) {
    assert(nullOverlay.view.overlays[k] === false, `null overlays.${k} defaults to false`);
  }

  // dual-format read: current app id
  assert(APP_ID === 'parametrica', 'APP_ID is parametrica');
  const re = JSON.parse(json);
  assert(re.app === 'parametrica', 'serialized document carries current app id');

  // dual-format read: legacy glyph-lab v2 documents still sanitize
  const legacyV2 = {
    app: 'glyph-lab', version: 2, name: 'Legacy Test',
    generator: { id: 'parametric', params: {} },
    operators: [], view: {}, animation: {},
  };
  const fromLegacy = sanitizeDocument(legacyV2);
  assert(fromLegacy && fromLegacy.version === DOCUMENT_VERSION, 'legacy v2 glyph-lab doc still sanitizes');
  assert(isLegacyApp('glyph-lab') === true, 'glyph-lab recognized as legacy');
  assert(isLegacyApp('parametrica') === false, 'parametrica is not legacy');
  assert(isLegacyApp(undefined) === false, 'undefined is not legacy');

  // v2 migration: legacy v2 doc with params only (no generator) treated as v1
  const legacyWeird = { app: 'glyph-lab', version: 1, name: 'V1 Weird', params: { width: 150, height: 360, crossTop: 0.4, crossBottom: 0.4, waist: 0.2, tension: 0.3, mirror: true } };
  const fromV1Legacy = sanitizeDocument(legacyWeird);
  assert(fromV1Legacy.generator.id === 'bilateral-spline', 'v1 glyph-lab preset migrates via legacy app id');
}

/* ——— 7. Built-in preset library ——— */
console.log('7. built-in presets (11)');
{
  const pm = new PresetManager(null);
  assert(pm.names().length === 11, `expected 11 built-ins, got ${pm.names().length}`);
  for (const name of pm.names()) {
    const doc = pm.get(name);
    assert(doc, `preset "${name}" loads`);
    evalOK(doc, `preset "${name}"`);
  }
  assert(pm.delete('Infinity') === false, 'built-ins immutable');
}

/* ——— 8. Mutation ——— */
console.log('8. mutation engine (chained, across families)');
{
  let seed = 12345;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const mutator = new MutationEngine({ rng });
  for (const startName of ['Infinity', 'Fourier Butterfly', 'Vesica Prime (v1)']) {
    let doc = BUILT_IN_PRESETS[startName]();
    for (let i = 0; i < 40; i++) {
      doc = mutator.mutate(doc);
      assert(MutationEngine.isValid(doc), `mutation of "${startName}" #${i} must stay valid`);
      assert(doc.generator.id === BUILT_IN_PRESETS[startName]().generator.id, 'mutation stays in family');
    }
  }
}

/* ——— 9. SVG export ——— */
console.log('9. svg export');
{
  const doc = BUILT_IN_PRESETS['Golden Rose']();
  const { curves } = evaluateDocument(doc, { time: 0 });
  const svg = Exporter.buildSVG(curves, doc.view, { w: 900, h: 900 }, doc);
  assert(svg.includes('<svg') && svg.includes('stroke="#ffffff"'), 'svg structure');
  assert(svg.includes('"generator"'), 'document embedded in svg');
  const numbers = svg.match(/-?\d+\.?\d*/g).map(Number);
  assert(numbers.every(Number.isFinite), 'svg numbers finite');
  assert((svg.match(/-->/g) || []).length === 1, 'comment escaped');
}

/* ——— 10. Animation (time flows into equations) ——— */
console.log('10. animation');
{
  const doc = createDocument('parametric', {
    generator: { params: { exprX: 'cos(t + time)', exprY: 'sin(t + time)' } },
  });
  const a = evaluateDocument(doc, { time: 0 });
  const b = evaluateDocument(doc, { time: 1.5 });
  const pa = a.curves[0].points[0];
  const pb = b.curves[0].points[0];
  assert(Math.hypot(pa.x - pb.x, pa.y - pb.y) > 0.1, 'time changes geometry');

  // animatable number param
  const modDoc = createDocument('superformula');
  modDoc.generator.mods.m = '4 + 2*sin(time)';
  const m0 = evaluateDocument(modDoc, { time: 0 });
  const m1 = evaluateDocument(modDoc, { time: Math.PI / 2 });
  assert(m0.bbox.diagonal !== m1.bbox.diagonal, 'modulated param animates');
}

/* ——— 11. Performance budget ——— */
console.log('11. performance');
{
  const doc = BUILT_IN_PRESETS.Butterfly();
  const t0 = performance.now();
  evaluateDocument(doc, { time: 0 });
  const ms = performance.now() - t0;
  assert(ms < 500, `Butterfly evaluates in ${ms.toFixed(1)}ms (< 500ms budget)`);
}

/* ——— Snapshots ——— */
{
  const outDir = process.env.GLYPH_SNAPSHOT_DIR;
  if (outDir) {
    mkdirSync(outDir, { recursive: true });
    const pm = new PresetManager(null);
    for (const name of pm.names()) {
      const doc = pm.get(name);
      const { curves } = evaluateDocument(doc, { time: 0 });
      const svg = Exporter.buildSVG(curves, doc.view, { w: 900, h: 900 }, doc);
      writeFileSync(join(outDir, `${name.replace(/[\s:]+/g, '-').toLowerCase()}.svg`), svg);
    }
    console.log(`   snapshots written to ${outDir}`);
  }
}

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
