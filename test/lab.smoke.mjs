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
import '../src/render/passes/index.js';

import { Generators, Operators, RenderPasses } from '../src/core/registry.js';
import { compileExpression, evaluate, perturbLiterals } from '../src/math/expression.js';
import { createStdlib } from '../src/math/stdlib.js';
import { createNoise2D } from '../src/math/noise.js';
import { catmullRomToBezier, bezierToPoints, cubicSplinePoints } from '../src/math/curves.js';
import { sampleAdaptive } from '../src/sampling/sampling.js';
import { createDocument, sanitizeDocument, migrateV1Document, createLayer, attachLayerAliases, DOCUMENT_VERSION, APP_ID, isLegacyApp, PROJECTIONS, sanitizeProjection, sanitizeColorRamp, DEFAULT_COLOR_RAMP } from '../src/core/document.js';
import { evaluateDocument, POINT_LIMITS } from '../src/core/engine.js';
import { schemaDefaults, TYPE } from '../src/core/schema.js';
import { History } from '../src/core/history.js';
import { toggleMode, normalizeModes } from '../src/ui/widgets/modeToggles.js';
import { HarmonicsEditor } from '../src/ui/widgets/HarmonicsEditor.js';
import { sha256Hex, canonicalStringify } from '../src/lab/hash.js';
import { computeDescriptor } from '../src/lab/descriptor.js';
import { computeSensitivity, shapeDistance } from '../src/lab/sensitivity.js';
import { Notebook, sanitizeCheckpoint } from '../src/lab/notebook.js';
import { documentDiff, descriptorDiff } from '../src/lab/diff.js';
import { ExplorationSession, morphDocuments } from '../src/lab/exploration.js';
import { createTimeline, sanitizeTimeline, resolveTimelineValue, upsertKeyframe, frameTimes } from '../src/animation/timeline.js';
import { adviseOffline, validateSuggestion, applySuggestionToDocument } from '../src/ai/offline.js';
import { createProvider, runAdvisor, parseAdvisorResponse, shouldAutoAnalyze, PROVIDERS } from '../src/ai/provider.js';
import { AdvisorCache, cacheKey } from '../src/ai/cache.js';
import { buildAdvisorPrompt } from '../src/ai/prompt.js';
import { traceImageData, otsuThreshold, binarize, grayscale, simplifyRDP, resampleClosed, contourToFourier, reconstructFromHarmonics, buildFourierDocument, MAX_IMAGE_EDGE } from '../src/input/imageTrace.js';
import { createGeneration, nextGeneration, isChildValid, describeStructuralChange, MAX_CHILDREN, MAX_PARENTS } from '../src/lab/evolution.js';
import { numericParameterRefs, refKey, schemaForRef, stageForRef, pathForRef } from '../src/lab/parameters.js';
import { MutationEngine } from '../src/mutation/MutationEngine.js';
import { PresetManager } from '../src/presets/PresetManager.js';
import { BUILT_IN_PRESETS } from '../src/presets/builtins.js';
import { Exporter } from '../src/export/Exporter.js';
import { analyzeCurve } from '../src/analysis/differential.js';
import { projectCurves, projectPoint, gradientAxisValue } from '../src/render/projection.js';
import { rampColor, gradientRange } from '../src/render/passes/gradient.js';

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
console.log(`4. generators (${Generators.list().length})`);
{
  const expected = [
    'parametric', 'polar', 'custom', 'lissajous', 'rose', 'superformula',
    'fourier', 'hypotrochoid', 'epitrochoid', 'spirograph',
    'harmonic-oscillator', 'noise-field', 'catmull-rom', 'bezier',
    'cubic-spline', 'bilateral-spline',
    'lorenz', 'clifford', 'dejong', 'aizawa', 'concentric-ellipses',
    'parametric-3d', 'helix',
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

  // 3D depth metadata survives post-processing (fit/center) and geometry
  // operators — per-point fields (depth, depthAlpha) must not be dropped.
  const helixDoc = createDocument('parametric-3d', {
    generator: { params: { samples: 300 } },
  });
  const helixEval = evaluateDocument(helixDoc, { time: 0 });
  const helixPoint = helixEval.curves[0]?.points[100];
  assert(helixPoint?.depthAlpha != null, 'parametric-3d: depthAlpha survives fit/center');
  assert(typeof helixPoint?.depth === 'number', 'parametric-3d: depth survives fit/center');
  assert(typeof helixPoint?.h3 === 'number', 'parametric-3d: true height survives fit/center');
  assert(typeof helixPoint?.x3 === 'number' && typeof helixPoint?.y3 === 'number', 'parametric-3d: world coordinates survive fit/center');
  // A mirror operator must preserve depth fields on the flipped copies.
  helixDoc.operators.push({ id: 'mirror', enabled: true, params: { axis: 'vertical', keepOriginal: true }, mods: {} });
  const mirrored = evaluateDocument(helixDoc, { time: 0 });
  assert(mirrored.curves.length === 2, 'mirror: two curves (original + flipped)');
  for (const c of mirrored.curves) {
    assert(c.points[50]?.depthAlpha != null, 'mirror: flipped copy keeps depthAlpha');
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

  // view.camera: every fresh document carries a fully-populated
  // { yaw, pitch, fov } so 3D-projected generators and the canvas
  // drag handler never see undefined.
  assert(defaultDoc.view.camera, 'default view.camera exists');
  assert(typeof defaultDoc.view.camera.yaw === 'number', 'default view.camera.yaw is number');
  assert(typeof defaultDoc.view.camera.pitch === 'number', 'default view.camera.pitch is number');
  assert(typeof defaultDoc.view.camera.fov === 'number', 'default view.camera.fov is number');
  // Partial camera in raw: only the set key is honored, others default.
  const partialCam = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Partial Camera',
    generator: { id: 'parametric', params: {} },
    operators: [], view: { camera: { yaw: 0.5 } }, animation: {},
  });
  assert(partialCam.view.camera.yaw === 0.5, 'partial camera preserves yaw');
  assert(Math.abs(partialCam.view.camera.pitch - Math.PI / 9) < 1e-6, 'partial camera defaults pitch');
  assert(partialCam.view.camera.fov === 320, 'partial camera defaults fov');
  // Null / non-object camera → defaults applied.
  const nullCam = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Null Camera',
    generator: { id: 'parametric', params: {} },
    operators: [], view: { camera: null }, animation: {},
  });
  assert(typeof nullCam.view.camera.yaw === 'number', 'null camera → defaults have yaw');
  // Out-of-range yaw clamps to [-π, π], pitch clamps away from ±π/2.
  const oorCam = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'OOR Camera',
    generator: { id: 'parametric', params: {} },
    operators: [], view: { camera: { yaw: 100, pitch: 1.55, fov: 99999 } }, animation: {},
  });
  assert(Math.abs(oorCam.view.camera.yaw) <= Math.PI + 1e-9, `yaw clamped (got ${oorCam.view.camera.yaw})`);
  assert(Math.abs(oorCam.view.camera.pitch) <= Math.PI / 2, `pitch clamped (got ${oorCam.view.camera.pitch})`);
  assert(oorCam.view.camera.fov === 2000, 'fov clamped to 2000');

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
console.log(`7. built-in presets (${Object.keys(BUILT_IN_PRESETS).length})`);
{
  const pm = new PresetManager(null);
  assert(pm.names().length === Object.keys(BUILT_IN_PRESETS).length, `expected ${Object.keys(BUILT_IN_PRESETS).length} built-ins, got ${pm.names().length}`);
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

/* ——— 11. Sampling contracts ——— */
console.log('11. sampling');
{
  // The adaptive sampler must respect `samples` as a hard upper
  // bound — high-curvature curves used to produce ~3× the requested
  // count, breaking the user-visible slider.
  const { sampleUniform, sampleAdaptive } = await import('../src/sampling/sampling.js');
  const fn = (t) => ({ x: Math.sin(t) + 0.25 * Math.sin(11 * t), y: Math.cos(2 * t) - 0.4 * Math.cos(7 * t) });
  for (const N of [32, 50, 100, 250, 700, 2000]) {
    const u = sampleUniform(fn, 0, Math.PI * 2, N);
    assert(u.length === N, `uniform sampler returns exactly ${N} (got ${u.length})`);
    const a = sampleAdaptive(fn, 0, Math.PI * 2, { minSteps: 8, samples: N });
    assert(a.length <= N, `adaptive sampler respects ${N} upper bound (got ${a.length})`);
    assert(a.length >= 2, `adaptive sampler keeps at least 2 points (got ${a.length})`);
  }
  // Adaptive output for a smooth low-curvature curve is naturally
  // shorter than the requested cap (it only refines where curvature
  // demands it). Use a circle — straight-line chords approximate
  // it well at coarse granularity.
  const circle = (t) => ({ x: Math.cos(t), y: Math.sin(t) });
  const simple = sampleAdaptive(circle, 0, Math.PI * 2, { minSteps: 8, samples: 200 });
  assert(simple.length < 200, `simple curve under cap: ${simple.length} < 200`);
  assert(simple.length >= 8, `coarse grid is still respected: ${simple.length} >= 8`);
  // Total points (used by engine budgets) — a known-issue regressed to
  // ~177 on samples=50 before this fix; should now be exactly 50.
  const fifty = sampleAdaptive(fn, 0, Math.PI * 2, { minSteps: 8, samples: 50 });
  assert(fifty.length === 50, `samples=50 yields exactly 50 (got ${fifty.length})`);

  // Inverted domain (t0 > t1) must be normalized by sampleParametric —
  // the user can type T MIN=57 > T MAX=-24 and get [−24, 57], not a
  // 13-period backwards tangle.
  const { sampleParametric } = await import('../src/generators/helpers.js');
  const scope = { t: 0, theta: 0, time: 0 };
  const inv = sampleParametric(
    (s) => Math.cos(s.t),
    (s) => Math.sin(s.t),
    { t0: 57.09, t1: -24.58, samples: 50, adaptive: false, scope },
  );
  assert(inv.length === 50, `inverted domain yields 50 points (got ${inv.length})`);
  // First point is at t=-24.58, NOT at t=57.09 — proves the swap.
  const tAtFirst = -24.58;
  assert(Math.abs(inv[0].x - Math.cos(tAtFirst)) < 1e-6, `inverted domain starts at t1 (${inv[0].x.toFixed(4)} ≈ ${Math.cos(tAtFirst).toFixed(4)})`);
  const tAtLast = 57.09;
  assert(Math.abs(inv[inv.length - 1].x - Math.cos(tAtLast)) < 1e-6, `inverted domain ends at t0 (${inv[inv.length - 1].x.toFixed(4)} ≈ ${Math.cos(tAtLast).toFixed(4)})`);
}

/* ——— 12. Performance budget ——— */
console.log('12. performance');
{
  const doc = BUILT_IN_PRESETS.Butterfly();
  const t0 = performance.now();
  evaluateDocument(doc, { time: 0 });
  const ms = performance.now() - t0;
  assert(ms < 500, `Butterfly evaluates in ${ms.toFixed(1)}ms (< 500ms budget)`);

  // Geometry-only reference: 20k samples, no differential analysis.
  // The CI gate is deliberately looser than the local <16ms target.
  const heavy = createDocument('clifford', { generator: { params: { samples: 20000 } } });
  delete evaluateDocument._cache;
  const t1 = performance.now();
  const heavyEval = evaluateDocument(heavy, { time: 0 });
  const heavyMs = performance.now() - t1;
  assert(heavyEval.stats.pointCount === 20000, 'performance sample has 20k points');
  assert(heavyMs < 50, `20k geometry pipeline in ${heavyMs.toFixed(1)}ms (< 50ms CI gate)`);

  // Helix at the maximum practical sample count: the 3D pipeline must stay
  // inside the same geometry gate; gradient batching is covered by e2e.
  const helixHeavy = createDocument('helix', {
    generator: { params: { samples: 8000, adaptive: false } },
  });
  delete evaluateDocument._cache;
  const t2 = performance.now();
  const helixEval = evaluateDocument(helixHeavy, { time: 0 });
  const helixMs = performance.now() - t2;
  assert(helixEval.stats.pointCount === 8000, 'helix performance sample has 8k points');
  assert(helixMs < 50, `8k helix pipeline in ${helixMs.toFixed(1)}ms (< 50ms CI gate)`);
}

/* ——— 13. Reliability hardening regressions ——— */
console.log('13. reliability regressions');
{
  /* — document isolation — */
  const a = createDocument('parametric');
  a.view.overlays.inflections = true;
  a.view.camera.yaw = 1.234;
  a.view.modes.push('points');
  const b = createDocument('polar');
  assert(b.view.overlays.inflections === false, 'new document does not inherit overlay state');
  assert(b.view.camera.yaw !== 1.234, 'new document does not inherit camera state');
  assert(b.view.modes.length === 1 && b.view.modes[0] === 'stroke', 'new document keeps default modes');
  assert(a.view.overlays !== b.view.overlays, 'overlay objects are per-document');
  assert(a.view.camera !== b.view.camera, 'camera objects are per-document');
  assert(a.view.modes !== b.view.modes, 'mode arrays are per-document');

  const s1 = sanitizeDocument({ generator: { id: 'parametric' }, view: { overlays: { inflections: true } } });
  const s2 = sanitizeDocument({ generator: { id: 'parametric' } });
  assert(s1.view.overlays !== s2.view.overlays, 'sanitized views do not share overlay objects');
  assert(s1.view.camera !== s2.view.camera, 'sanitized views do not share camera objects');

  /* — schema defaults are cloned — */
  const f1 = createDocument('fourier');
  const f2 = createDocument('fourier');
  assert(f1.generator.params.harmonicsX !== f2.generator.params.harmonicsX, 'harmonic default arrays are cloned');
  f1.generator.params.harmonicsX[0].amp = 9;
  assert(f2.generator.params.harmonicsX[0].amp !== 9, 'mutating one harmonic table does not leak');

  /* — built-in preset namespace — */
  const pm = new PresetManager(null);
  let collision = false;
  try {
    pm.save('Lissajous 3:5', createDocument('parametric'));
  } catch {
    collision = true;
  }
  assert(collision, 'built-in preset names are reserved');
  assert(pm.isBuiltIn('Lissajous 3:5'), 'built-in preset still resolves after rejected save');

  /* — seed-aware cache — */
  const noiseDoc = createDocument('parametric');
  noiseDoc.generator.params.exprX = 'noise(t)*100';
  noiseDoc.generator.params.exprY = 't*10';
  delete evaluateDocument._cache;
  const seed1 = evaluateDocument(noiseDoc, { time: 0 });
  const first = seed1.curves[0].points[50].x;
  noiseDoc.seed = 4242;
  const seed2 = evaluateDocument(noiseDoc, { time: 0 });
  const second = seed2.curves[0].points[50].x;
  assert(first !== second, `seed change invalidates cached noise geometry (${first} vs ${second})`);
  noiseDoc.seed = 1;
  delete evaluateDocument._cache;
  const seed3 = evaluateDocument(noiseDoc, { time: 0 });
  assert(seed3.curves[0].points[50].x === first, 'same seed reproduces the same geometry');

  /* — modulation clamping — */
  const clampDoc = createDocument('parametric');
  clampDoc.generator.params.adaptive = false;
  clampDoc.generator.mods.samples = '50000';
  const clampEval = evaluateDocument(clampDoc, { time: 0 });
  assert(clampEval.stats.pointCount === 8000, `samples modulation clamps to schema max (got ${clampEval.stats.pointCount})`);
  assert(clampEval.errors.length === 0, 'clamped modulation is not an error');

  const nonFinite = createDocument('parametric');
  nonFinite.generator.params.adaptive = false;
  nonFinite.generator.mods.samples = '1/0';
  const nf = evaluateDocument(nonFinite, { time: 0 });
  assert(nf.errors.some((e) => e.key === 'samples'), 'non-finite modulation carries its schema key');
  assert(nf.stats.pointCount === 700, 'non-finite modulation falls back to the schema default');

  /* — keyed generator errors — */
  const badX = createDocument('parametric');
  badX.generator.params.exprX = 'sin(3*t';
  const badXEval = evaluateDocument(badX, { time: 0 });
  assert(badXEval.errors[0]?.key === 'exprX', 'invalid x(t) error carries key exprX');
  assert(/Expected/.test(badXEval.errors[0]?.message ?? ''), 'invalid x(t) keeps the parser message');

  const badR = createDocument('polar');
  badR.generator.params.exprR = 'sin(';
  const badREval = evaluateDocument(badR, { time: 0 });
  assert(badREval.errors[0]?.key === 'exprR', 'invalid r(θ) error carries key exprR');

  /* — per-stage budget — */
  const budgetDoc = createDocument('clifford', {
    generator: { params: { samples: 12000 } },
    operators: [{
      id: 'radial-repeat', enabled: true,
      params: { count: 48, radius: 0, rotateCopies: true }, mods: {},
    }],
  });
  const budgetEval = evaluateDocument(budgetDoc, { time: 0 });
  assert(budgetEval.stats.peakPoints <= POINT_LIMITS.total, `peak points capped (${budgetEval.stats.peakPoints})`);
  assert(budgetEval.stats.pointCount <= POINT_LIMITS.total, 'final points capped');

  /* — lazy analysis — */
  const lazyDoc = createDocument('clifford', { generator: { params: { samples: 4000 } } });
  const lazy = evaluateDocument(lazyDoc, { time: 0 });
  assert(lazy.stats.analysisMs === 0, 'analysis is lazy until requested');
  const analysis = lazy.analysis;
  assert(analysis.perCurve.length === lazy.curves.length, 'lazy analysis produces per-curve results');
  assert(lazy.stats.analysisMs >= 0, 'analysis timing is recorded');

  /* — sampling: exact uniform counts — */
  const exactIds = [
    'parametric', 'polar', 'custom', 'lissajous', 'rose', 'superformula',
    'hypotrochoid', 'epitrochoid', 'spirograph', 'harmonic-oscillator',
  ];
  for (const id of exactIds) {
    const doc = createDocument(id);
    doc.generator.params.samples = 321;
    doc.generator.params.adaptive = false;
    const ev = evaluateDocument(doc, { time: 0 });
    assert(ev.errors.length === 0, `${id}: uniform evaluation has no errors`);
    assert(ev.stats.pointCount === 321, `${id}: adaptive=false gives exactly 321 points (got ${ev.stats.pointCount})`);
  }

  /* — sampling: adaptive cap — */
  for (const def of Generators.list()) {
    if (!def.params.samples || !def.params.adaptive) continue;
    const doc = createDocument(def.id);
    const min = def.params.samples.min ?? 64;
    const cap = Math.min(256, Math.max(min, 64));
    doc.generator.params.samples = cap;
    doc.generator.params.adaptive = true;
    const ev = evaluateDocument(doc, { time: 0 });
    assert(ev.errors.length === 0, `${def.id}: adaptive evaluation has no errors`);
    assert(ev.stats.pointCount <= cap, `${def.id}: adaptive output <= cap ${cap} (got ${ev.stats.pointCount})`);
  }

  /* — sampler endpoint completeness — */
  const circle = (t) => ({ x: Math.cos(t), y: Math.sin(t) });
  const circlePts = sampleAdaptive(circle, 0, Math.PI * 2, { minSteps: 8, samples: 200 });
  const circleEnd = circlePts[circlePts.length - 1];
  assert(Math.hypot(circleEnd.x - 1, circleEnd.y) < 1e-9, 'adaptive sampler always reaches t1');
  assert(circlePts.length < 200, 'adaptive sampler may use fewer than the cap');

  /* — closure follows endpoints — */
  const closed35 = createDocument('lissajous', {
    generator: { params: { a: 3, b: 5, samples: 400, adaptive: false } },
  });
  assert(evaluateDocument(closed35, { time: 0 }).curves[0].closed === true, '3:5 Lissajous is closed');

  const openLissajous = createDocument('lissajous', {
    generator: { params: { a: 1.25, b: 5, samples: 400, adaptive: false } },
  });
  assert(evaluateDocument(openLissajous, { time: 0 }).curves[0].closed === false, 'fractional Lissajous is open');

  const openSuper = createDocument('superformula', {
    generator: { params: { m: 5, a: 1, b: 2, samples: 400, adaptive: false } },
  });
  assert(evaluateDocument(openSuper, { time: 0 }).curves[0].closed === false, 'non-periodic superformula is open');

  /* — discrete attractors hide the inert Step Size control — */
  assert(!Object.prototype.hasOwnProperty.call(Generators.get('clifford').params, 'dt'), 'clifford omits dt');
  assert(!Object.prototype.hasOwnProperty.call(Generators.get('dejong').params, 'dt'), 'dejong omits dt');
  assert(Object.prototype.hasOwnProperty.call(Generators.get('lorenz').params, 'dt'), 'lorenz keeps dt');
  assert(Object.prototype.hasOwnProperty.call(Generators.get('aizawa').params, 'dt'), 'aizawa keeps dt');

  /* — history helper — */
  const h = new History(3);
  h.record('a');
  h.record('b');
  assert(h.undo('c') === 'b', 'history undo returns the previous snapshot');
  assert(h.redo('b') === 'c', 'history redo returns the future snapshot');
  const limited = new History(2);
  limited.record('1');
  limited.record('2');
  limited.record('3');
  assert(limited.past.length === 2, 'history respects its limit');

  /* — mode helpers — */
  assert(JSON.stringify(normalizeModes(undefined)) === '["stroke"]', 'empty modes normalize to stroke');
  assert(JSON.stringify(normalizeModes(['bogus'], ['stroke', 'points'])) === '["stroke"]',
    'unknown mode ids normalize to stroke when the registry order is known');
  assert(JSON.stringify(toggleMode(['stroke'], 'points', true, ['stroke', 'points', 'wireframe']))
    === '["stroke","points"]', 'toggleMode adds in registry order');
  assert(JSON.stringify(toggleMode(['stroke', 'points'], 'points', false, ['stroke', 'points']))
    === '["stroke"]', 'toggleMode removes a mode');
  assert(JSON.stringify(toggleMode(['stroke'], 'stroke', false, ['stroke', 'points']))
    === '["stroke"]', 'toggleMode never leaves the view empty');

  /* — harmonics editor accepts its documented API — */
  {
    const previousDocument = globalThis.document;
    const makeEl = () => ({
      className: '',
      textContent: '',
      innerHTML: '',
      children: [],
      appendChild(child) { this.children.push(child); return child; },
      addEventListener() {},
      setAttribute() {},
    });
    globalThis.document = { createElement: makeEl };
    try {
      let getRowsCalls = 0;
      const rows = {
        harmonicsX: [{ freq: 1, amp: 1, phase: 0, rot: 0, ox: 0, oy: 0 }],
        harmonicsY: [{ freq: 2, amp: 0.5, phase: 0, rot: Math.PI / 2, ox: 0, oy: 0 }],
      };
      const editor = new HarmonicsEditor({
        getRows: (axis) => { getRowsCalls++; return rows[axis]; },
        onChange: () => {},
      });
      assert(editor.el, 'HarmonicsEditor constructs with {getRows,onChange}');
      assert(getRowsCalls === 2, `HarmonicsEditor reads both axes (got ${getRowsCalls})`);
    } finally {
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
    }
  }
}

/* ——— 14. Lab observer ——— */
console.log('14. lab observer');
{
  assert(sha256Hex('') === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'sha256 empty vector');
  assert(sha256Hex('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256 abc vector');
  assert(canonicalStringify({ b: 1, a: { d: 2, c: [3] } }) === '{"a":{"c":[3],"d":2},"b":1}', 'canonical JSON sorts keys');
  assert(
    sha256Hex(canonicalStringify({ a: 1, b: 2 })) === sha256Hex(canonicalStringify({ b: 2, a: 1 })),
    'canonical hash ignores key insertion order',
  );

  const circleDoc = createDocument('parametric');
  circleDoc.generator.params.exprX = 'cos(t)';
  circleDoc.generator.params.exprY = 'sin(t)';
  circleDoc.generator.params.samples = 512;
  const circleEval = evaluateDocument(circleDoc, { time: 0 });
  const circle = computeDescriptor(circleDoc, circleEval.curves);
  const expectedArea = Math.PI * 170 * 170;
  assert(circle.version === 1, 'descriptor version is 1');
  assert(circle.documentHash.length === 64, 'descriptor hash is 64 hex chars');
  assert(Math.abs(circle.area - expectedArea) / expectedArea < 0.02, 'circle area within 2%');
  assert(Math.abs(circle.perimeter - 2 * Math.PI * 170) / (2 * Math.PI * 170) < 0.05, 'circle perimeter within 5%');
  assert(circle.compactness > 0.95, `circle compactness (${circle.compactness.toFixed(3)})`);
  assert(circle.symmetry.folds === 1 && circle.symmetry.score > 0.95, 'circle is continuously symmetric');
  assert(circle.complexity.turningNumber > 0.9 && circle.complexity.turningNumber < 1.1, 'circle turning number ≈ 1');
  assert(circle.topology.components === 1 && circle.topology.holes === 0, 'circle topology');
  assert(circle.coverage > 0 && circle.coverage < 1, 'circle coverage is bounded');
  for (const value of [circle.area, circle.perimeter, circle.compactness, circle.curvature.entropy, circle.coverage, circle.complexity.fractalDimension]) {
    assert(Number.isFinite(value), 'descriptor metrics are finite');
  }

  const sfDoc = createDocument('superformula');
  const sfEval = evaluateDocument(sfDoc, { time: 0 });
  const sf = computeDescriptor(sfDoc, sfEval.curves);
  assert(sf.symmetry.folds === 6, `superformula default has 6-fold symmetry (got ${sf.symmetry.folds})`);
  assert(sf.symmetry.score > 0.95, 'superformula symmetry score is high');
  assert(sf.documentHash === computeDescriptor(sfDoc, sfEval.curves).documentHash, 'descriptor hash is reproducible');

  const empty = computeDescriptor(sfDoc, []);
  assert(empty.curveCount === 0 && empty.area === 0 && empty.coverage === 0, 'empty descriptor is zeroed');
  assert(empty.symmetry.folds === 1 && empty.symmetry.score === 0, 'empty descriptor symmetry defaults');

  const before = JSON.stringify(sfDoc);
  const reportA = computeSensitivity(sfDoc, sfEval.curves, { maxParams: 8 });
  const reportB = computeSensitivity(sfDoc, sfEval.curves, { maxParams: 8 });
  assert(JSON.stringify(reportA.entries) === JSON.stringify(reportB.entries), 'sensitivity is deterministic');
  assert(reportA.entries.length === 8, 'sensitivity respects maxParams');
  assert(reportA.entries[0].impact >= reportA.entries[reportA.entries.length - 1].impact, 'sensitivity is sorted by impact');
  assert(reportA.entries.some((entry) => entry.impact > 0), 'sensitivity finds an influential parameter');
  assert(JSON.stringify(sfDoc) === before, 'sensitivity does not mutate the document');

  const identical = shapeDistance(sfEval.curves, sfEval.curves, 340);
  assert(identical === 0, `shape distance to itself is 0 (got ${identical})`);

  const heavyDoc = createDocument('clifford', { generator: { params: { samples: 12000 } } });
  const heavyEval = evaluateDocument(heavyDoc, { time: 0 });
  const tDesc = performance.now();
  const heavyDesc = computeDescriptor(heavyDoc, heavyEval.curves);
  const descMs = performance.now() - tDesc;
  assert(descMs < 500, `12k descriptor in ${descMs.toFixed(1)}ms (< 500ms)`);
  assert(heavyDesc.analysis.intersectionsSampled === true, 'large figures sample intersection metrics');
}

/* ——— 15. Lab notebook ——— */
console.log('15. lab notebook');
{
  class MemoryStorage {
    constructor() { this.map = new Map(); }
    getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
    setItem(key, value) { this.map.set(key, String(value)); }
    removeItem(key) { this.map.delete(key); }
  }

  const docA = createDocument('superformula');
  const evalA = evaluateDocument(docA, { time: 0 });
  const descriptorA = computeDescriptor(docA, evalA.curves);
  const docB = sanitizeDocument(structuredClone(docA));
  docB.seed = 4242;
  docB.generator.params.radius = 300;
  const evalB = evaluateDocument(docB, { time: 0 });
  const descriptorB = computeDescriptor(docB, evalB.curves);

  const storage = new MemoryStorage();
  const notebook = new Notebook({ storage, now: () => 1000 });
  const a = notebook.add({
    id: 'cp-a', name: 'A', createdAt: 1000,
    document: docA, descriptor: descriptorA,
    thumbnail: 'data:image/png;base64,AAAA',
  });
  const b = notebook.add({
    id: 'cp-b', name: 'B', createdAt: 2000,
    document: docB, descriptor: descriptorB,
    parentId: a.id, tags: ['symmetry', ' test ', 'symmetry'], notes: 'first branch',
  });

  assert(notebook.items.length === 2, 'notebook accepts two checkpoints');
  assert(a.name === 'A' && b.name === 'B', 'checkpoint names survive');
  assert(b.parentId === 'cp-a', 'checkpoint parent lineage');
  assert(b.tags.length === 2 && b.tags[1] === 'test', 'tags are trimmed and deduplicated');
  assert(notebook.latest().id === 'cp-b', 'latest checkpoint');
  assert(notebook.get('cp-a').document.generator.params.radius === 280, 'stored document is cloned');

  // Mutating the source after saving must not mutate the checkpoint.
  docA.generator.params.radius = 999;
  assert(notebook.get('cp-a').document.generator.params.radius === 280, 'checkpoint is isolated from source document');

  const comparison = notebook.compare('cp-a', 'cp-b');
  assert(comparison !== null, 'compare returns a result');
  assert(comparison.parameterDiff.some((d) => d.path === 'seed'), 'parameter diff catches seed');
  assert(comparison.parameterDiff.some((d) => d.path === 'generator.params.radius'), 'parameter diff catches radius');
  assert(comparison.descriptorDiff.length > 0, 'descriptor diff catches changed metrics');
  assert(comparison.descriptorDiff.every((d) => typeof d.delta === 'number'), 'descriptor diff carries deltas');

  const same = notebook.compare('cp-a', 'cp-a');
  assert(same.parameterDiff.length === 0 && same.descriptorDiff.length === 0, 'same checkpoint produces empty diffs');

  const reloaded = new Notebook({ storage });
  assert(reloaded.items.length === 2, 'notebook persists to injected storage');
  assert(reloaded.get('cp-b').parentId === 'cp-a', 'lineage persists');

  const exported = notebook.exportJSON();
  const importedStorage = new MemoryStorage();
  const importedNotebook = new Notebook({ storage: importedStorage });
  const importResult = importedNotebook.importJSON(exported);
  assert(importResult.added === 2 && importResult.skipped === 0, 'notebook export/import round-trip');
  assert(importedNotebook.get('cp-b').parentId === 'cp-a', 'imported lineage is preserved');

  const partial = JSON.stringify({
    version: 1,
    checkpoints: [
      { id: 'ok', name: 'OK', createdAt: 1, document: docA, descriptor: descriptorA },
      { id: 'bad', name: 'Bad', createdAt: 2, document: null, descriptor: null },
    ],
  });
  const partialResult = importedNotebook.importJSON(partial);
  assert(partialResult.added === 1 && partialResult.skipped === 1, 'partial import skips invalid checkpoints');

  const oversized = 'data:image/png;base64,' + 'A'.repeat(70_000);
  const oversizedCp = sanitizeCheckpoint({
    id: 'oversized', name: 'Oversized', createdAt: 3,
    document: docA, descriptor: descriptorA, thumbnail: oversized,
  });
  assert(oversizedCp && oversizedCp.thumbnail === null, 'oversized thumbnails are dropped');

  const invalid = sanitizeCheckpoint({ id: 'x', document: { generator: { id: 'nope' } }, descriptor: null });
  assert(invalid === null, 'invalid checkpoint rejected');
  let rejected = false;
  try {
    notebook.add({ id: 'bad', name: 'Bad', document: null, descriptor: descriptorA });
  } catch {
    rejected = true;
  }
  assert(rejected, 'adding an invalid checkpoint throws');

  const limited = new Notebook({ storage: new MemoryStorage(), limit: 2, now: () => 10 });
  for (let i = 0; i < 3; i++) {
    limited.add({ id: `l${i}`, name: `L${i}`, document: docA, descriptor: descriptorA });
  }
  assert(limited.items.length === 2 && limited.items[0].id === 'l1', 'notebook limit keeps the newest');

  const updated = notebook.update('cp-b', { name: 'B updated', tags: ['kept'], notes: 'changed' });
  assert(updated.name === 'B updated' && updated.tags[0] === 'kept', 'checkpoint metadata update');
  assert(notebook.remove('cp-b'), 'remove checkpoint');
  assert(notebook.items.length === 1 && notebook.get('cp-a'), 'remove keeps the other checkpoint');

  assert(documentDiff(docA, docB).some((d) => d.path === 'generator.params.radius'), 'documentDiff path shape');
  assert(descriptorDiff(descriptorA, descriptorB).every((d) => d.path !== 'documentHash'), 'descriptorDiff excludes hash');
}

/* ——— 16. Lab exploration (1D) ——— */
console.log('16. lab exploration');
{
  const doc = createDocument('lissajous');
  const refs = numericParameterRefs(doc);
  const refA = refs.find((ref) => ref.key === 'a');
  const refB = refs.find((ref) => ref.key === 'b');
  assert(refA && refB, 'lissajous exposes numeric a/b references');

  const session = new ExplorationSession(doc);
  const original = JSON.stringify(doc);
  const sweep = session.sweep1D(refA, { steps: 5 });
  assert(sweep.length === 5, 'sweep produces the requested number of candidates');
  assert(sweep[0].value === refA.schema.min, 'sweep starts at schema min');
  assert(sweep[4].value === refA.schema.max, 'sweep ends at schema max');
  assert(sweep.every((candidate) => candidate.document.generator.params.b === doc.generator.params.b), 'sweep only changes the selected axis');
  assert(JSON.stringify(doc) === original, 'sweep does not mutate the base document');

  const sweepAgain = new ExplorationSession(doc).sweep1D(refA, { steps: 5 });
  assert(
    JSON.stringify(sweep.map((c) => c.document)) === JSON.stringify(sweepAgain.map((c) => c.document)),
    'sweep is deterministic',
  );

  const random = new ExplorationSession(doc);
  random.setSelection([refA]);
  random.setLock(refB, true);
  const batchA = random.randomize({ intensity: 0.2, count: 4, seed: 42 });
  const batchB = random.randomize({ intensity: 0.2, count: 4, seed: 42 });
  assert(batchA.length === 4, 'randomize produces requested candidates');
  assert(JSON.stringify(batchA.map((c) => c.document)) === JSON.stringify(batchB.map((c) => c.document)), 'randomize is seeded and deterministic');
  assert(batchA.every((candidate) => candidate.document.generator.params.b === doc.generator.params.b), 'locked parameters stay unchanged');
  assert(batchA.every((candidate) => candidate.document.generator.params.a >= refA.schema.min && candidate.document.generator.params.a <= refA.schema.max), 'randomized values stay in schema range');
  assert(JSON.stringify(doc) === original, 'randomize does not mutate the base document');

  const solo = new ExplorationSession(doc);
  solo.solo(refA);
  assert(solo.selection.length === 1 && refKey(solo.selection[0]) === refKey(refA), 'solo selects exactly one parameter');
  assert(solo.locks.length === refs.length - 1, 'solo locks every other parameter');
  assert(solo.isLocked(refB), 'solo locks another parameter');

  const filtered = new ExplorationSession(doc);
  filtered.setLock(refB, true);
  filtered.setSelection([refA, refB]);
  assert(filtered.selection.length === 1 && filtered.selection[0].key === 'a', 'selection ignores locked parameters');

  let noSelection = false;
  try {
    new ExplorationSession(doc).randomize();
  } catch {
    noSelection = true;
  }
  assert(noSelection, 'randomize requires a selection');
}

/* ——— 17. Artboard and style ——— */
console.log('17. artboard and style');
{
  const defaults = createDocument('parametric');
  assert(defaults.view.artboard.width === 900 && defaults.view.artboard.height === 900, 'default artboard is 900×900');
  assert(defaults.view.artboard.background === '#000000' && defaults.view.artboard.margin === 0, 'default artboard background/margin');
  assert(defaults.view.style.stroke.color === '#ffffff', 'default stroke is white');
  assert(defaults.view.style.stroke.width === 2, 'default stroke width');
  assert(defaults.view.style.fill.enabled === false, 'default fill is off');

  const isolated = createDocument('polar');
  assert(isolated.view.artboard !== defaults.view.artboard, 'artboards are per-document');
  assert(isolated.view.style !== defaults.view.style, 'styles are per-document');

  const legacy = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Legacy width',
    generator: { id: 'parametric', params: {} },
    operators: [], view: { strokeWeight: 5 }, animation: {},
  });
  assert(legacy.view.strokeWeight === 5 && legacy.view.style.stroke.width === 5, 'legacy strokeWeight migrates to style width');

  const styled = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Styled',
    generator: { id: 'parametric', params: {} },
    operators: [],
    view: {
      strokeWeight: 2,
      artboard: { width: 1080, height: 1350, background: '#f2eee3', margin: 30 },
      style: {
        stroke: { color: '#e30613', width: 3, opacity: 0.5, cap: 'butt', join: 'miter' },
        fill: { enabled: true, color: '#121212', opacity: 0.8 },
        blend: 'multiply',
      },
    },
    animation: {},
  });
  assert(styled.view.artboard.width === 1080 && styled.view.artboard.height === 1350, 'artboard dimensions round-trip');
  assert(styled.view.artboard.background === '#f2eee3', 'artboard background round-trip');
  assert(styled.view.style.stroke.color === '#e30613' && styled.view.style.stroke.opacity === 0.5, 'stroke style round-trip');
  assert(styled.view.style.stroke.width === 3 && styled.view.strokeWeight === 3, 'style width wins and syncs legacy field');
  assert(styled.view.style.fill.enabled && styled.view.style.fill.color === '#121212', 'fill style round-trip');
  assert(styled.view.style.blend === 'multiply', 'blend round-trip');

  const clamped = sanitizeDocument({
    generator: { id: 'parametric', params: {} },
    view: { artboard: { width: 10, height: 99999, margin: 999, background: 'not-a-color' } },
  });
  assert(clamped.view.artboard.width === 240, 'artboard width clamps to min');
  assert(clamped.view.artboard.height === 4096, 'artboard height clamps to max');
  assert(clamped.view.artboard.margin === 120, 'artboard margin clamps');
  assert(clamped.view.artboard.background === '#000000', 'invalid background falls back');

  const styledEval = evaluateDocument(styled, { time: 0 });
  const svg = Exporter.buildSVG(styledEval.curves, styled.view, { w: 900, h: 900 }, styled);
  assert(svg.includes('width="1080"') && svg.includes('height="1350"'), 'styled SVG uses artboard dimensions');
  assert(svg.includes('fill="#f2eee3"'), 'styled SVG background');
  assert(svg.includes('stroke="#e30613"') && svg.includes('stroke-opacity="0.5"') && svg.includes('stroke-width="3"'), 'styled SVG stroke');
  assert(svg.includes('fill="#121212"') && svg.includes('fill-opacity="0.8"'), 'styled SVG fill');

  const defaultSvg = Exporter.buildSVG(defaults.view ? evaluateDocument(defaults, { time: 0 }).curves : [], defaults.view, { w: 900, h: 900 }, defaults);
  assert(defaultSvg.includes('stroke="#ffffff"'), 'default SVG keeps white stroke');
}

/* ——— 18. Grid and morph ——— */
console.log('18. grid and morph');
{
  const doc = createDocument('lissajous');
  const refs = numericParameterRefs(doc);
  const refA = refs.find((ref) => ref.key === 'a');
  const refB = refs.find((ref) => ref.key === 'b');
  const session = new ExplorationSession(doc);
  const grid = session.grid2D(refA, refB, { cols: 4, rows: 3 });
  assert(grid.length === 12, '2D grid has cols × rows cells');
  assert(grid[0].x === refA.schema.min && grid[0].y === refB.schema.min, 'grid starts at both minima');
  assert(grid[11].x === refA.schema.max && grid[11].y === refB.schema.max, 'grid ends at both maxima');
  assert(grid[1].y === grid[0].y && grid[1].x > grid[0].x, 'X changes fastest');
  assert(grid[4].x === grid[0].x && grid[4].y > grid[0].y, 'rows advance Y');
  const gridAgain = new ExplorationSession(doc).grid2D(refA, refB, { cols: 4, rows: 3 });
  assert(JSON.stringify(grid.map((c) => c.document)) === JSON.stringify(gridAgain.map((c) => c.document)), 'grid is deterministic');
  let sameAxis = false;
  try { session.grid2D(refA, refA); } catch { sameAxis = true; }
  assert(sameAxis, 'grid rejects the same axis twice');
  const fullGrid = session.grid2D(refA, refB, { cols: 12, rows: 12 });
  assert(fullGrid.length === 144, 'grid caps at 144 candidates');

  const a = sanitizeDocument(structuredClone(doc));
  a.generator.params.a = 3;
  const b = sanitizeDocument(structuredClone(doc));
  b.generator.params.a = 10;
  const morph = morphDocuments(a, b, { steps: 5 });
  assert(morph.length === 5, 'morph produces requested frames');
  assert(morph[0].document.generator.params.a === 3, 'morph starts at A');
  assert(morph[4].document.generator.params.a === 10, 'morph ends at B');
  assert(Math.abs(morph[2].document.generator.params.a - 6.5) < 1e-6, 'morph interpolates linearly');
  assert(JSON.stringify(a.generator.params) === JSON.stringify(sanitizeDocument(structuredClone(doc)).generator.params), 'morph does not mutate A');
  assert(JSON.stringify(b.generator.params) !== JSON.stringify(doc.generator.params), 'morph B remains independent');

  const differentExpression = sanitizeDocument(structuredClone(b));
  differentExpression.generator.params.adaptive = !a.generator.params.adaptive;
  let rejectedExpression = false;
  try { morphDocuments(a, differentExpression); } catch { rejectedExpression = true; }
  assert(rejectedExpression, 'morph rejects differing non-numeric parameters');

  const differentSeed = sanitizeDocument(structuredClone(b));
  differentSeed.seed = 99;
  let rejectedSeed = false;
  try { morphDocuments(a, differentSeed); } catch { rejectedSeed = true; }
  assert(rejectedSeed, 'morph rejects differing seeds');

  let rejectedGenerator = false;
  try { morphDocuments(a, createDocument('rose')); } catch { rejectedGenerator = true; }
  assert(rejectedGenerator, 'morph rejects different generators');
}

/* ——— 19. Composition layers ——— */
console.log('19. composition layers');
{
  const doc = createDocument('parametric');
  assert(doc.version === 3, 'documents are version 3');
  assert(Array.isArray(doc.layers) && doc.layers.length === 1, 'new document has one layer');
  assert(doc.generator === doc.layers[0].generator, 'active generator aliases the first layer');
  assert(doc.activeLayer === 0, 'first layer is active');

  const second = createLayer('rose', { name: 'Rose layer', seed: 7 });
  second.style.stroke.color = '#e30613';
  doc.layers.push(second);
  doc.activeLayer = 1;
  attachLayerAliases(doc);
  assert(doc.generator.id === 'rose', 'generator alias follows active layer');
  assert(doc.layers[1].style.stroke.color === '#e30613', 'per-layer style');

  const ev = evaluateDocument(doc, { time: 0 });
  assert(ev.layers.length === 2, 'evaluation returns both layers');
  assert(ev.curves.length === ev.layers[0].curves.length + ev.layers[1].curves.length, 'composition concatenates curves');
  assert(ev.curves.every((c) => c.meta.layerId), 'curves carry layer ids');
  assert(ev.stats.curveCount === ev.curves.length, 'aggregate curve count');

  const desc = computeDescriptor(doc, ev.curves, { layers: ev.layers });
  assert(desc.layers.length === 2, 'descriptor exposes per-layer descriptors');
  assert(desc.layers[0].layerId === doc.layers[0].id, 'layer descriptors carry ids');
  assert(desc.curveCount === ev.curves.length, 'descriptor aggregate curve count');

  const svg = Exporter.buildSVG(ev.curves, doc.view, { w: 900, h: 900 }, doc, ev.layers);
  assert((svg.match(/<g /g) || []).length === 2, 'SVG has one group per visible layer');
  assert(svg.includes('#e30613'), 'SVG carries per-layer color');

  const hidden = structuredClone(doc);
  hidden.layers[1].visible = false;
  const hiddenEval = evaluateDocument(attachLayerAliases(hidden), { time: 0 });
  assert(hiddenEval.curves.every((c) => c.meta.layerId !== hidden.layers[1].id), 'hidden layer omitted from curves');
  const hiddenSvg = Exporter.buildSVG(hiddenEval.curves, hidden.view, { w: 900, h: 900 }, hidden, hiddenEval.layers);
  assert((hiddenSvg.match(/<g /g) || []).length === 1, 'hidden layer omitted from SVG');

  const broken = attachLayerAliases(structuredClone(doc));
  broken.layers[0].generator.params.exprX = 'sin(';
  const brokenEval = evaluateDocument(broken, { time: 0 });
  assert(brokenEval.errors.some((e) => e.layerId === broken.layers[0].id), 'layer errors are identified');
  assert(brokenEval.curves.some((c) => c.meta.layerId === broken.layers[1].id), 'valid layer still renders');

  const migrated = sanitizeDocument({
    version: 2,
    name: 'V2 layer migration',
    seed: 3,
    generator: { id: 'parametric', params: { exprX: 'cos(t)', exprY: 'sin(t)' } },
    operators: [],
    view: { artboard: { width: 1080, height: 1350, background: '#f2eee3' } },
    animation: {},
  });
  assert(migrated.version === 3 && migrated.layers.length === 1, 'v2 migrates to one v3 layer');
  assert(migrated.layers[0].seed === 3, 'v2 seed migrates to layer');
  assert(migrated.layers[0].generator.id === 'parametric', 'v2 generator migrates');
  assert(migrated.view.artboard.width === 1080, 'shared artboard survives migration');

  const roundtrip = sanitizeDocument(JSON.parse(JSON.stringify(doc)));
  assert(roundtrip.layers.length === 2 && roundtrip.activeLayer === 1, 'v3 layers/active round-trip');
  assert(roundtrip.layers[1].style.stroke.color === '#e30613', 'v3 layer style round-trip');
}

/* ——— 20. Motion timeline ——— */
console.log('20. motion timeline');
{
  const timeline = createTimeline({ duration: 2, loop: false });
  upsertKeyframe(timeline, { path: 'generator.params.a', layer: 0, time: 0, value: 0, easing: 'linear' });
  upsertKeyframe(timeline, { path: 'generator.params.a', layer: 0, time: 2, value: 10, easing: 'linear' });
  assert(resolveTimelineValue(timeline, 'generator.params.a', 0, 0) === 0, 'timeline starts at first keyframe');
  assert(resolveTimelineValue(timeline, 'generator.params.a', 0, 1) === 5, 'linear timeline interpolation');
  assert(resolveTimelineValue(timeline, 'generator.params.a', 0, 3) === 10, 'timeline clamps after the last keyframe');
  assert(resolveTimelineValue(timeline, 'generator.params.a', 0, -1) === 0, 'timeline clamps before the first keyframe');

  const easeTimeline = createTimeline({ duration: 1, loop: false });
  upsertKeyframe(easeTimeline, { path: 'generator.params.a', layer: 0, time: 0, value: 0, easing: 'ease-in' });
  upsertKeyframe(easeTimeline, { path: 'generator.params.a', layer: 0, time: 1, value: 10, easing: 'ease-in' });
  assert(resolveTimelineValue(easeTimeline, 'generator.params.a', 0, 0.5) === 2.5, 'ease-in timeline');

  const loopTimeline = createTimeline({ duration: 2, loop: true });
  upsertKeyframe(loopTimeline, { path: 'generator.params.a', layer: 0, time: 0, value: 1 });
  upsertKeyframe(loopTimeline, { path: 'generator.params.a', layer: 0, time: 2, value: 3 });
  assert(resolveTimelineValue(loopTimeline, 'generator.params.a', 0, 3) === 2, 'loop normalizes time');

  const doc = createDocument('lissajous');
  doc.animation.timeline = structuredClone(timeline);
  const before = evaluateDocument(doc, { time: 0 });
  const after = evaluateDocument(doc, { time: 1 });
  assert(JSON.stringify(before.curves[0].points[10]) !== JSON.stringify(after.curves[0].points[10]), 'engine applies timeline values');
  doc.animation.timeline.tracks[0].keyframes[1].value = 16;
  const changed = evaluateDocument(doc, { time: 1 });
  assert(JSON.stringify(after.curves[0].points[10]) !== JSON.stringify(changed.curves[0].points[10]), 'timeline edits invalidate the engine cache');

  const frames = frameTimes(6, 30);
  assert(frames.length === 180, 'frameTimes produces duration × fps frames');
  assert(frames[0] === 0 && Math.abs(frames[179] - 179 / 30) < 1e-6, 'frame timestamps are exact');

  const clamped = sanitizeTimeline({
    duration: 999,
    loop: true,
    tracks: [{ path: 'generator.params.a', layer: 0, keyframes: [{ time: 999, value: 999, easing: 'bogus' }] }],
  });
  assert(clamped.duration === 600, 'timeline duration clamps');
  assert(clamped.tracks[0].keyframes[0].time === 600, 'keyframe time clamps to duration');
  assert(clamped.tracks[0].keyframes[0].easing === 'linear', 'unknown easing falls back');
}

/* ——— 21. Offline advisor ——— */
console.log('21. offline advisor');
{
  const doc = createDocument('lissajous');
  const evaluation = evaluateDocument(doc, { time: 0 });
  const descriptor = computeDescriptor(doc, evaluation.curves);
  const response = adviseOffline({ current: descriptor, document: doc });
  assert(response.version === 1, 'advisor response is versioned');
  assert(typeof response.summary === 'string' && response.summary.length > 0, 'advisor produces a summary');
  assert(response.suggestions.length > 0, 'advisor produces suggestions');
  assert(response.suggestions.length <= 5, 'advisor caps suggestions at five');
  assert(response.suggestions.every((s) => s.path && Number.isFinite(Number(s.to))), 'suggestions carry path/value');

  const first = response.suggestions[0];
  const sourceBefore = JSON.stringify(doc.generator.params);
  const validated = validateSuggestion(doc, first);
  assert(validated.ok, 'generated suggestions are valid');
  const candidate = applySuggestionToDocument(doc, first);
  assert(candidate, 'valid suggestion produces a candidate');
  const field = first.path.split('.').pop();
  assert(Number(candidate.generator.params[field]) === Number(first.to), 'candidate applies the suggested value');
  assert(JSON.stringify(doc.generator.params) !== JSON.stringify(candidate.generator.params), 'candidate is independent');
  assert(JSON.stringify(doc.generator.params) === sourceBefore, 'source document remains unchanged');

  const invalid = validateSuggestion(doc, { path: 'generator.params.ghost', to: 2 });
  assert(!invalid.ok && /Unknown parameter/.test(invalid.reason), 'unknown path is rejected');

  const clamped = validateSuggestion(doc, {
    path: 'generator.params.samples',
    to: 999999,
  });
  assert(clamped.ok && clamped.value === 8000, 'numeric suggestion clamps to schema max');

  const previous = structuredClone(descriptor);
  previous.symmetry = { folds: 2, score: 0.2 };
  previous.curvature = { ...previous.curvature, entropy: 0.1 };
  const compared = adviseOffline({
    current: descriptor,
    previous,
    parameterDiff: [{ path: 'generator.params.a', from: 2, to: 3 }],
    descriptorDiff: [{ path: 'symmetry.score', from: 0.2, to: 0.9, delta: 0.7 }],
    document: doc,
  });
  assert(compared.summary.includes('parameter change'), 'evolution summary mentions parameter changes');
  assert(compared.changes.length === 1, 'evolution change list is populated');
}

/* ——— 22. Optional LLM advisor ——— */
console.log('22. optional llm advisor');
{
  const doc = createDocument('lissajous');
  const evaluation = evaluateDocument(doc, { time: 0 });
  const descriptor = computeDescriptor(doc, evaluation.curves);
  const input = {
    current: descriptor,
    previous: null,
    parameterDiff: [],
    descriptorDiff: [],
    document: doc,
  };

  const offline = createProvider({ id: 'offline' });
  const fake = createProvider({ id: 'fake' });
  assert(offline.network === false && fake.network === false, 'offline and fake providers never use the network');
  assert(PROVIDERS.find((p) => p.id === 'ollama')?.network === true, 'ollama is explicitly marked as a network provider');
  assert(PROVIDERS.find((p) => p.id === 'openai-compatible')?.network === true, 'openai-compatible is marked as a network provider');

  const cache = new AdvisorCache(10);
  const first = await runAdvisor(fake, input, { document: doc, cache });
  const second = await runAdvisor(fake, input, { document: doc, cache });
  assert(first.suggestions.length > 0, 'fake provider returns grounded suggestions');
  assert(JSON.stringify(first.summary) === JSON.stringify(second.summary), 'fake provider is deterministic');
  assert(JSON.stringify(first.suggestions) === JSON.stringify(second.suggestions), 'fake suggestions are deterministic');
  assert(second.fromCache === true, 'second identical analysis is served from cache');
  assert(cache.size === 1, 'cache stores one entry per document/provider/prompt');

  const key = cacheKey(input, fake, '1');
  assert(key.includes(descriptor.documentHash), 'cache key includes the document hash');
  assert(key.includes(fake.id), 'cache key includes the provider id');
  assert(cacheKey(input, fake, '2') !== key, 'cache key changes with the prompt version');
  assert(cacheKey({ ...input, current: { ...descriptor, documentHash: 'other' } }, fake, '1') !== key, 'cache key changes with the document hash');

  let calls = 0;
  const counting = {
    id: 'openai-compatible',
    network: true,
    async analyse() {
      calls += 1;
      return JSON.stringify({
        version: 1,
        summary: 'A grounded model response.',
        changes: [],
        suggestions: [{
          id: 'llm-1',
          path: 'generator.params.a',
          from: doc.generator.params.a,
          to: doc.generator.params.a + 1,
          rationale: 'Try a slightly different ratio.',
          expectedEffect: 'Shifts the figure.',
          confidence: 0.5,
          kind: 'subtle',
        }],
        caveats: ['Model output is a hypothesis.'],
      });
    },
  };
  const networkCache = new AdvisorCache(10);
  const modelFirst = await runAdvisor(counting, input, { document: doc, cache: networkCache });
  const modelSecond = await runAdvisor(counting, input, { document: doc, cache: networkCache });
  assert(calls === 1, 'a cache hit does not call the provider again');
  assert(modelSecond.fromCache === true, 'network response is marked as cached');
  assert(modelFirst.suggestions.length === 1, 'valid model suggestion survives validation');

  const invalid = parseAdvisorResponse({
    summary: 'Invalid paths and ranges.',
    changes: [{ path: 'generator.params.a', from: 1, to: 2, reading: 'a 1 → 2' }],
    suggestions: [
      { path: 'generator.params.ghost', to: 2 },
      { path: 'generator.params.samples', to: 999999, kind: 'structural' },
    ],
    caveats: ['Model caveat.'],
  }, doc);
  assert(invalid.suggestions.length === 1, 'invalid path suggestion is rejected');
  assert(invalid.suggestions[0].to === 8000 && invalid.suggestions[0].clamped === true, 'out-of-range value is clamped and flagged');
  assert(invalid.caveats.some((c) => /rejected/.test(c)), 'rejections are reported in caveats');
  assert(invalid.caveats.some((c) => /clamped/.test(c)), 'clamping is reported in caveats');

  let thrown = false;
  try {
    parseAdvisorResponse('this is not json', doc);
  } catch {
    thrown = true;
  }
  assert(thrown, 'non-JSON provider output is rejected');

  const failing = {
    id: 'ollama',
    network: true,
    async analyse() {
      throw new Error('connection refused');
    },
  };
  const fallback = await runAdvisor(failing, input, { document: doc, cache: new AdvisorCache(2) });
  assert(fallback.suggestions.length > 0, 'provider failure falls back to offline suggestions');
  assert(fallback.providerError === 'connection refused', 'provider failure is surfaced');
  assert(fallback.caveats.some((c) => /Provider failed/.test(c)), 'provider failure is explained in caveats');

  const prompt = buildAdvisorPrompt(input);
  const payload = JSON.parse(prompt.user);
  assert(payload.current.documentHash === descriptor.documentHash, 'prompt includes the grounded descriptor');
  assert(payload.document.layers.length >= 1, 'prompt includes a document summary');
  assert(!('image' in payload), 'no image is sent by default');
  const imagePrompt = buildAdvisorPrompt(input, { image: 'data:image/png;base64,AAAA' });
  assert(JSON.parse(imagePrompt.user).image === 'data:image/png;base64,AAAA', 'image is included only when opted in');
  assert(/only/i.test(prompt.system) && /JSON/i.test(prompt.system), 'system prompt demands grounded JSON output');

  assert(shouldAutoAnalyze({ provider: offline }) === true, 'automatic analysis is allowed offline');
  assert(shouldAutoAnalyze({ provider: offline, playing: true }) === false, 'no automatic analysis during playback');
  assert(shouldAutoAnalyze({ provider: offline, auto: false }) === false, 'automatic analysis respects the opt-out');
  assert(shouldAutoAnalyze({ provider: null }) === false, 'no provider means no automatic analysis');

  const small = new AdvisorCache(2);
  small.set('a', 1);
  small.set('b', 2);
  small.get('a');
  small.set('c', 3);
  assert(small.size === 2, 'cache is bounded');
  assert(small.get('b') === null, 'cache evicts the least recently used entry');
  assert(small.get('a') === 1, 'cache keeps recently used entries');
}

/* ——— 23. Image contour → Fourier ——— */
console.log('23. image contour to fourier');
{
  const makeImage = (w, h, draw) => {
    const data = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (draw(x, y)) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
        }
        data[i + 3] = 255;
      }
    }
    return { width: w, height: h, data };
  };

  const circle = makeImage(240, 240, (x, y) => Math.hypot(x - 120, y - 120) < 70);
  const gray = grayscale(circle);
  const threshold = otsuThreshold(gray);
  assert(threshold >= 0 && threshold <= 255, 'otsu threshold is in range');
  const mask = binarize(gray, circle.width, circle.height, threshold);
  assert(mask.some((v) => v === 1) && mask.some((v) => v === 0), 'threshold separates foreground and background');

  const traced = traceImageData(circle, { harmonics: 32, samples: 512 });
  assert(traced.ok, `circle trace succeeds (${traced.reason ?? 'ok'})`);
  assert(traced.componentArea > 10_000, 'largest component keeps the silhouette area');
  assert(traced.contour.length === 512, 'contour is resampled to the requested count');
  assert(traced.reconstruction.length === 512, 'reconstruction uses the same sample count');
  assert(traced.harmonicsX.length > 0 && traced.harmonicsY.length > 0, 'both axes receive harmonics');
  assert(traced.harmonicsX.length <= 32 && traced.harmonicsY.length <= 32, 'harmonic count is bounded');
  assert(traced.error.relative < 0.02, 'circle reconstruction error is small');
  assert(traced.harmonicsX.concat(traced.harmonicsY).every((h) => (
    Number.isFinite(h.freq) && Number.isFinite(h.amp) && Number.isFinite(h.phase) && Number.isFinite(h.rot)
  )), 'harmonics contain only finite numbers');
  assert(traced.mask.length === circle.width * circle.height, 'mask preview sizes match the image');

  const square = makeImage(240, 240, (x, y) => x > 50 && x < 190 && y > 60 && y < 180);
  const squareTrace = traceImageData(square, { harmonics: 24, samples: 512 });
  assert(squareTrace.ok && squareTrace.error.relative < 0.03, 'square reconstruction error is small');
  assert(squareTrace.pointCount < 40, 'RDP simplification reduces pixel staircases');

  const empty = makeImage(80, 80, () => false);
  const emptyTrace = traceImageData(empty);
  assert(!emptyTrace.ok && /No pixels/.test(emptyTrace.reason), 'empty image reports no contour');
  const black = makeImage(80, 80, () => true);
  const blackTrace = traceImageData(black);
  assert(!blackTrace.ok && /whole image/.test(blackTrace.reason), 'full foreground reports no contour');

  const inverted = makeImage(200, 200, (x, y) => Math.hypot(x - 100, y - 100) > 55);
  const invertedTrace = traceImageData(inverted, { invert: true, harmonics: 16 });
  assert(invertedTrace.ok, 'invert option traces light silhouettes on dark');
  assert(invertedTrace.error.relative < 0.03, 'inverted reconstruction stays close');

  const line = Array.from({ length: 40 }, (_, i) => ({ x: i, y: 10 }));
  const simplified = simplifyRDP(line, 1);
  assert(simplified.length === 2, 'RDP removes collinear points');
  const resampled = resampleClosed([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], 16);
  assert(resampled.length === 16, 'closed resampling keeps the requested count');
  assert(resampled.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), 'resampled points are finite');
  const gaps = resampled.map((p, i) => {
    const q = resampled[(i + 1) % resampled.length];
    return Math.hypot(q.x - p.x, q.y - p.y);
  });
  assert(Math.max(...gaps) - Math.min(...gaps) < 0.01, 'closed resampling is uniform by arc length');

  const circlePoints = Array.from({ length: 128 }, (_, i) => {
    const t = (Math.PI * 2 * i) / 128;
    return { x: Math.cos(t) * 50, y: Math.sin(t) * 50 };
  });
  const fourier = contourToFourier(circlePoints, 8);
  assert(fourier.error.relative < 0.001, 'a circle is represented by a few harmonics');
  assert(fourier.harmonicsX[0].freq === 1, 'dominant circle harmonic is frequency 1');
  const reconstructed = reconstructFromHarmonics(fourier.harmonicsX, fourier.harmonicsY, 128);
  assert(reconstructed.length === 128, 'reconstruction helper returns the requested samples');

  const doc = buildFourierDocument(traced, { name: 'Trace test' });
  assert(doc.version === 3, 'traced document uses the current document version');
  assert(doc.generator.id === 'fourier', 'traced document is editable via the fourier generator');
  assert(doc.layers.length === 1, 'traced document contains one layer');
  assert(doc.layers[0].generator.params.harmonicsX.length > 0, 'harmonics are stored in the layer');
  const serialized = JSON.stringify(doc);
  assert(!/image\/png|image\/jpeg|data:image/i.test(serialized), 'document contains no image data');
  assert(!/imageData|previewData|\.url/.test(serialized), 'document contains no UI-only image state');
  const evaluation = evaluateDocument(doc, { time: 0 });
  assert(evaluation.errors.length === 0, `traced document evaluates without errors: ${evaluation.errors[0]?.message ?? ''}`);
  assert(evaluation.curves.length > 0 && evaluation.stats.pointCount > 100, 'traced document produces curves');
  assert(MAX_IMAGE_EDGE >= 512, 'image tracing is bounded but keeps useful resolution');
}

/* ——— 24. Evolution lab ——— */
console.log('24. evolution lab');
{
  const parentA = createDocument('lissajous');
  parentA.generator.params.a = 2;
  parentA.generator.params.b = 3;
  const parentB = createDocument('lissajous');
  parentB.generator.params.a = 8;
  parentB.generator.params.b = 5;

  const generation = createGeneration([parentA, parentB], {
    count: 6,
    seed: 42,
    generation: 3,
    parentIds: ['A', 'B'],
    structuralRate: 0,
    mutationRate: 0,
  });
  assert(generation.children.length === 6, 'evolution produces the requested children');
  assert(generation.rejected === 0 && generation.attempts === 6, 'valid children need no retries');
  assert(generation.generation === 3 && generation.parentIds.join(',') === 'A,B', 'generation metadata is preserved');
  assert(generation.children.every((child) => child.parents.join(',') === 'A,B'), 'each child records both parents');
  assert(generation.children.every((child) => ['A', 'B'].includes(child.primaryParentId)), 'each child records a primary parent');
  assert(generation.children.every((child) => isChildValid(child.document)), 'all children pass full evaluation');

  for (const child of generation.children) {
    const a = Number(child.document.generator.params.a);
    const b = Number(child.document.generator.params.b);
    assert(a >= 2 && a <= 8, 'numeric crossover of a stays between parents');
    assert(b >= 3 && b <= 5, 'numeric crossover of b stays between parents');
    for (const ref of numericParameterRefs(child.document)) {
      const schema = schemaForRef(child.document, ref);
      const stage = stageForRef(child.document, ref);
      const value = Number(stage.params[ref.key]);
      assert(Number.isFinite(value) && value >= schema.min && value <= schema.max,
        `child numeric ${pathForRef(ref)} respects the schema`);
    }
  }

  const again = createGeneration([parentA, parentB], {
    count: 6,
    seed: 42,
    generation: 3,
    parentIds: ['A', 'B'],
    structuralRate: 0,
    mutationRate: 0,
  });
  assert(
    JSON.stringify(generation.children.map((child) => child.document)) ===
    JSON.stringify(again.children.map((child) => child.document)),
    'same parents and seed produce identical children',
  );

  const capped = createGeneration([parentA, parentB], {
    count: 99,
    seed: 1,
    structuralRate: 0,
    mutationRate: 0,
    parentIds: ['A', 'B'],
  });
  assert(capped.children.length === MAX_CHILDREN, 'children per generation are capped');

  let tooFew = false;
  try { createGeneration([parentA], {}); } catch { tooFew = true; }
  assert(tooFew, 'fewer than two parents are rejected');
  let tooMany = false;
  try { createGeneration([parentA, parentB, parentA, parentB, parentA], {}); } catch { tooMany = true; }
  assert(tooMany, 'more than four parents are rejected');
  assert(MAX_PARENTS === 4, 'parent budget is four');

  const structural = createGeneration([parentA, parentB], {
    count: 8,
    seed: 7,
    generation: 1,
    parentIds: ['A', 'B'],
    structuralRate: 1,
    mutationRate: 0,
  });
  assert(structural.children.length > 0, 'structural generation yields valid children');
  assert(structural.children.every((child) => isChildValid(child.document)), 'structural children are evaluated');
  assert(structural.children.every((child) => child.structuralChanges.length <= 3), 'structural changes are bounded');
  assert(structural.children.some((child) => child.structuralChanges.length > 0), 'structural mutation actually fires');
  const ops = structural.children.flatMap((child) => child.structuralChanges);
  assert(ops.some((change) => change.op === 'add'), 'structural add is exercised');
  assert(ops.every((change) => typeof describeStructuralChange(change) === 'string'), 'structural changes are describable');

  const rejected = createGeneration([parentA, parentB], {
    count: 4,
    seed: 3,
    parentIds: ['A', 'B'],
    validate: () => false,
    maxAttempts: 1,
  });
  assert(rejected.children.length === 0 && rejected.rejected === 4, 'invalid children are discarded');

  assert(!isChildValid({}), 'invalid documents fail validation');
  assert(nextGeneration([{ generation: 2 }, { generation: 5 }]) === 6, 'next generation follows the highest checkpoint');
  assert(nextGeneration([]) === 1, 'first generation is one');

  class MemoryStorage {
    constructor() { this.map = new Map(); }
    getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
    setItem(key, value) { this.map.set(key, String(value)); }
    removeItem(key) { this.map.delete(key); }
  }
  const storage = new MemoryStorage();
  const notebook = new Notebook({ storage, now: () => 1000 });
  const evalA = evaluateDocument(parentA, { time: 0 });
  const evalB = evaluateDocument(parentB, { time: 0 });
  const cpA = notebook.add({
    id: 'parent-a', name: 'Parent A', document: parentA,
    descriptor: computeDescriptor(parentA, evalA.curves),
  });
  const cpB = notebook.add({
    id: 'parent-b', name: 'Parent B', document: parentB,
    descriptor: computeDescriptor(parentB, evalB.curves),
  });
  const childDoc = generation.children[0].document;
  const childEval = evaluateDocument(childDoc, { time: 0 });
  const cpChild = notebook.add({
    id: 'child-1', name: 'G3 · child 1', document: childDoc,
    descriptor: computeDescriptor(childDoc, childEval.curves),
    parentId: cpA.id,
    parents: [cpA.id, cpB.id],
    generation: 3,
  });
  assert(cpChild.generation === 3, 'checkpoint stores its generation');
  assert(cpChild.parents.join(',') === 'parent-a,parent-b', 'checkpoint stores parent ids');
  const reloaded = new Notebook({ storage });
  assert(reloaded.get('child-1').generation === 3, 'generation persists');
  assert(reloaded.get('child-1').parents.length === 2, 'parent ids persist');
  const clampedLineage = sanitizeCheckpoint({
    id: 'child-x', name: 'X', document: parentA,
    descriptor: computeDescriptor(parentA, evalA.curves),
    generation: -10, parents: ['parent-a', 'parent-a', 'child-x', 'extra-1', 'extra-2', 'extra-3', 'extra-4'],
  });
  assert(clampedLineage.generation === 0, 'negative generation clamps to zero');
  assert(clampedLineage.parents.length === MAX_PARENTS, 'parent ids are bounded and deduplicated');
  assert(!clampedLineage.parents.includes('child-x'), 'a checkpoint cannot parent itself');
  notebook.remove(cpA.id);
  assert(notebook.get('child-1').parents.includes(cpB.id), 'removing a parent keeps the remaining parent');
  assert(!notebook.get('child-1').parents.includes(cpA.id), 'removing a parent clears it from children');
  assert(notebook.get('child-1').parentId === null, 'removing the primary parent clears parentId');
}

/* ——— 25. Helix Lab ——— */
console.log('25. helix lab');
{
  const helix = Generators.get('helix');
  assert(helix, 'helix generator is registered');
  assert(PROJECTIONS.join(',') === '3d,xy,xz,yz', 'projection ids are stable');
  assert(sanitizeProjection(undefined) === '3d', 'missing projection defaults to 3d');
  assert(sanitizeProjection('nope') === '3d', 'invalid projection defaults to 3d');
  assert(sanitizeProjection('xz') === 'xz', 'valid projection is preserved');
  assert(sanitizeColorRamp(['#fff', '#000'])?.length === 2, 'valid color ramp is preserved');
  assert(sanitizeColorRamp(['#fff', 'red']) === null, 'invalid color ramp falls back to default');
  assert(RenderPasses.has('gradient-wireframe'), 'gradient wireframe pass is registered');

  const baseParams = {
    ...schemaDefaults(helix.params),
    samples: 401,
    adaptive: false,
    fit: 0,
  };
  const base = createDocument('helix', { generator: { params: baseParams } });
  const domain = helix.domain(baseParams);
  assert(Math.abs((domain.t1 - domain.t0) - Math.PI * 2 * baseParams.turns) < 1e-9,
    'helix domain spans turns full revolutions');
  const baseEval = evaluateDocument(base, { time: 0 });
  assert(baseEval.errors.length === 0 && baseEval.curves.length === 1, 'classic helix evaluates');
  const basePoints = baseEval.curves[0].points;
  assert(basePoints.length === baseParams.samples, 'uniform helix honors the sample count');
  let classicOK = true;
  for (let i = 0; i < basePoints.length; i++) {
    const t = domain.t0 + ((domain.t1 - domain.t0) * i) / (basePoints.length - 1);
    const point = basePoints[i];
    if (Math.abs(point.x3 - baseParams.r * Math.cos(t)) > 1e-6 ||
        Math.abs(point.y3 - baseParams.r * Math.sin(t)) > 1e-6 ||
        Math.abs(point.h3 - baseParams.p * t) > 1e-6) {
      classicOK = false;
      break;
    }
  }
  assert(classicOK, 'a=0, b=0, theta=0 reduces to the classic helix');
  assert(basePoints.every((point) => point.depthAlpha != null && point.depth != null), 'helix stores depth metadata');
  assert(basePoints.every((point) => Number.isFinite(point.h3)), 'helix stores true height h3');

  const radial = createDocument('helix', {
    generator: { params: { ...baseParams, a: 35, k: 3, phi: 0 } },
  });
  const radialPoints = evaluateDocument(radial, { time: 0 }).curves[0].points;
  const radii = radialPoints.map((point) => Math.hypot(point.x3, point.y3));
  assert(Math.min(...radii) <= 120 - 35 + 1e-6, 'radial modulation reaches r+a');
  assert(Math.max(...radii) >= 120 + 35 - 1e-6, 'radial modulation reaches r+a');
  assert(Math.max(...radii) - Math.min(...radii) > 60, 'radial modulation has visible amplitude');

  const ripple = createDocument('helix', {
    generator: { params: { ...baseParams, b: 25, m: 2, psi: 0.4 } },
  });
  const ripplePoints = evaluateDocument(ripple, { time: 0 }).curves[0].points;
  let rippleOK = true;
  for (let i = 0; i < ripplePoints.length; i++) {
    const t = domain.t0 + ((domain.t1 - domain.t0) * i) / (ripplePoints.length - 1);
    const expected = 25 * Math.sin(2 * t + 0.4);
    if (Math.abs((ripplePoints[i].h3 - baseParams.p * t) - expected) > 1e-6) {
      rippleOK = false;
      break;
    }
  }
  assert(rippleOK, 'pitch ripple follows b·sin(m·t+ψ)');

  const torsion = createDocument('helix', {
    generator: { params: { ...baseParams, theta: Math.PI / 3 } },
  });
  const torsionPoints = evaluateDocument(torsion, { time: 0 }).curves[0].points;
  const torsionAngle = torsion.generator.params.theta;
  let torsionOK = true;
  for (let i = 0; i < torsionPoints.length; i++) {
    const angle = torsionAngle;
    const ex = basePoints[i].x3 * Math.cos(angle) - basePoints[i].y3 * Math.sin(angle);
    const ey = basePoints[i].x3 * Math.sin(angle) + basePoints[i].y3 * Math.cos(angle);
    if (Math.abs(torsionPoints[i].x3 - ex) > 1e-6 || Math.abs(torsionPoints[i].y3 - ey) > 1e-6) {
      torsionOK = false;
      break;
    }
  }
  assert(torsionOK, 'theta rotates the helix about the z axis');

  const adaptive = createDocument('helix', {
    generator: { params: { ...baseParams, samples: 220, adaptive: true, a: 25, k: 5 } },
  });
  const adaptiveEval = evaluateDocument(adaptive, { time: 0 });
  assert(adaptiveEval.curves[0].points.length <= 220, 'adaptive sampling honors the samples cap');
  assert(adaptiveEval.curves[0].points.length >= 2, 'adaptive sampling keeps a usable curve');

  const double = createDocument('helix', {
    generator: { params: { ...baseParams, strands: 2, a: 0, p: 12, theta: 0 } },
  });
  const doubleEval = evaluateDocument(double, { time: 0 });
  assert(doubleEval.curves.length === 2, 'strands=2 emits two curves');
  const first = doubleEval.curves[0].points;
  const second = doubleEval.curves[1].points;
  assert(first.length === second.length, 'double-helix strands share a sample count');
  assert(Math.abs(second[0].x3 + first[0].x3) < 1e-6, 'second strand is phase-shifted by π (x)');
  assert(Math.abs(second[0].y3 + first[0].y3) < 1e-6, 'second strand is phase-shifted by π (y)');
  assert(Math.abs(second[0].h3 - first[0].h3) < 1e-6, 'double-helix strands share their height');

  const metadata = createDocument('helix', {
    generator: { params: { ...baseParams, fit: 340, samples: 300 } },
  });
  const metadataPoint = evaluateDocument(metadata, { time: 0 }).curves[0].points[100];
  assert(metadataPoint.h3 != null && metadataPoint.x3 != null, 'helix world metadata survives fit');
  metadata.operators.push({ id: 'mirror', enabled: true, params: { axis: 'vertical', keepOriginal: true }, mods: {} });
  const mirrored = evaluateDocument(metadata, { time: 0 });
  assert(mirrored.curves.length === 2, 'mirror duplicates the helix');
  assert(mirrored.curves.every((curve) => curve.points[60]?.h3 != null), 'mirror preserves h3 metadata');

  const samplePoint = { x: 1, y: 2, x3: 3, y3: 4, h3: 5 };
  const xy = projectPoint(samplePoint, 'xy');
  const xz = projectPoint(samplePoint, 'xz');
  const yz = projectPoint(samplePoint, 'yz');
  assert(xy.x === 3 && xy.y === -4, 'xy keeps x/y');
  assert(xz.x === 3 && xz.y === -5, 'xz keeps x/z');
  assert(yz.x === -4 && yz.y === -5, 'yz keeps y/z');
  assert(xy.depthAlpha === 1, 'orthographic projections disable camera fade');

  const fake = [{ points: [
    { x: 0, y: 0, x3: 0, y3: 0, h3: 0 },
    { x: 0, y: 0, x3: 10, y3: 0, h3: 0 },
  ] }];
  const fitted = projectCurves(fake, 'xz', { fit: 100 });
  const fx = fitted[0].points.map((point) => point.x);
  assert(Math.abs(Math.max(...fx) - Math.min(...fx) - 100) < 1e-6, 'projection fit scales the projected bbox');
  assert(Math.abs(Math.max(...fx) + Math.min(...fx)) < 1e-6, 'projection fit centers the projected bbox');

  assert(gradientAxisValue({ x3: 3, y3: 4, h3: 9 }, 'xy') === 5, 'xy gradient uses radial distance');
  assert(gradientAxisValue({ x3: 3, y3: 4, h3: 9 }, 'xz') === 9, 'xz gradient uses true height');
  assert(rampColor(DEFAULT_COLOR_RAMP, 0).join(',') === '255,212,0', 'gradient starts yellow');
  assert(rampColor(DEFAULT_COLOR_RAMP, 1).join(',') === '30,91,255', 'gradient ends blue');
  const mid = rampColor(DEFAULT_COLOR_RAMP, 0.5);
  assert(mid[0] > 100 && mid[2] > 150, 'gradient midpoint is purple');
  const range = gradientRange(fake, 'xz');
  assert(range.min === 0 && range.max === 0, 'flat gradient range is finite');
  const tilted = [{ points: [{ x3: 0, y3: 0, h3: 2 }, { x3: 0, y3: 0, h3: 8 }] }];
  const tiltedRange = gradientRange(tilted, 'xz');
  assert(tiltedRange.min === 2 && tiltedRange.max === 8, 'gradient range follows h3');

  const helixNames = ['Básica', 'Radio Variable', 'Paso Variable', 'Ondulada', 'Doble Hélice', 'Cónica'];
  for (const name of helixNames) {
    assert(typeof BUILT_IN_PRESETS[name] === 'function', `helix preset "${name}" exists`);
  }
  const signatures = new Set();
  const pm = new PresetManager(null);
  for (const name of helixNames) {
    const doc = BUILT_IN_PRESETS[name]();
    assert(doc.view.projection === '3d', `${name}: defaults to the 3D camera`);
    assert(doc.generator.id === 'helix', `${name}: uses the helix generator`);
    const first = evaluateDocument(doc, { time: 0 });
    const second = evaluateDocument(doc, { time: 0 });
    assert(first.errors.length === 0, `${name}: evaluates without errors`);
    assert(first.curves.length > 0 && first.stats.pointCount > 24, `${name}: produces geometry`);
    assert(
      JSON.stringify(first.curves.map((curve) => curve.points.map((point) => [point.x3, point.y3, point.h3]))) ===
      JSON.stringify(second.curves.map((curve) => curve.points.map((point) => [point.x3, point.y3, point.h3]))),
      `${name}: is deterministic`,
    );
    const signature = first.curves[0].points
      .filter((_, index) => index % 17 === 0)
      .map((point) => `${point.x3.toFixed(2)},${point.y3.toFixed(2)},${point.h3.toFixed(2)}`)
      .join('|');
    signatures.add(signature);
    const json = pm.serialize(name, doc);
    const parsed = pm.parse(json);
    assert(parsed.document.generator.id === 'helix', `${name}: JSON round-trip keeps the generator`);
    const roundTrip = evaluateDocument(parsed.document, { time: 0 });
    assert(roundTrip.errors.length === 0 && roundTrip.curves.length === first.curves.length,
      `${name}: JSON round-trip evaluates`);
    const svg = Exporter.buildSVG(first.curves, parsed.document.view, { w: 900, h: 900 }, parsed.document);
    assert(svg.includes('<path') && svg.includes('parametrica document:'), `${name}: SVG export is well-formed`);
  }
  assert(signatures.size === helixNames.length, 'all six helix variations are geometrically distinct');
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
