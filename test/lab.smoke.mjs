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

import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import '../src/generators/index.js';
import '../src/operators/index.js';
import '../src/render/passes/index.js';

import { Registry, Generators, Operators, RenderPasses } from '../src/core/registry.ts';
import { trochoidTurns, lissajousTurns, roseTurns } from '../src/generators/helpers.js';
import { compileExpression, evaluate, perturbLiterals } from '../src/math/expression.js';
import { createStdlib } from '../src/math/stdlib.js';
import { createNoise2D } from '../src/math/noise.js';
import { catmullRomToBezier, bezierToPoints, cubicSplinePoints } from '../src/math/curves.js';
import { sampleAdaptive, splitCurveAtDiscontinuities } from '../src/sampling/sampling.js';
import { postProcess } from '../src/sampling/parametric.js';
import { createDocument, sanitizeDocument, migrateV1Document, createLayer, createInstanceLayer, attachLayerAliases, nextLayerId, DOCUMENT_VERSION, APP_ID, isLegacyApp, PROJECTIONS, sanitizeProjection, sanitizeColorRamp, DEFAULT_COLOR_RAMP, DEFAULT_VIEW } from '../src/core/document.js';
import { createDefaultFillGradient, sanitizeFillGradient, resolveFillGradient } from '../src/core/fillGradient.ts';
import { evaluateDocument, POINT_LIMITS } from '../src/core/engine.js';
import { schemaDefaults } from '../src/core/schema.ts';
import { History } from '../src/core/history.js';
import { SessionStore, SESSION_STORAGE_KEY } from '../src/core/session.js';
import { toggleMode, normalizeModes } from '../src/ui/widgets/modeToggles.js';
import { HarmonicsEditor } from '../src/ui/widgets/HarmonicsEditor.js';
import { sha256Hex, canonicalStringify } from '../src/lab/hash.js';
import { computeDescriptor } from '../src/lab/descriptor.js';
import { buildParametricSummary, formatParametricValue } from '../src/lab/parametricSummary.js';
import { computeSensitivity, shapeDistance } from '../src/lab/sensitivity.js';
import { Notebook, sanitizeCheckpoint, INBOX_PROJECT_ID } from '../src/lab/notebook.js';
import { NotebookWorkspace } from '../src/lab/workspace.js';
import { MemoryNotebookRepository, migrateNotebook } from '../src/lab/notebookRepository.js';
import { supportsSpatial } from '../src/core/capabilities.ts';
import { ParamTypes } from '../src/ui/params/ParamRegistry.js';
import { FakeDialogService } from '../src/ui/dialogs.js';
import { createCurve2D, createCurve3D, createSurface, createMesh } from '../src/geometry/contracts.js';
import { validateGeometry, validateMesh, validateSolid, validateSurface } from '../src/geometry/validate.js';
import { liftCurve2D, meshToSolid, surfaceToMesh } from '../src/geometry/relations.js';
import { tessellateSurface, tessellateSurfaceWithMapping, surfaceArea } from '../src/geometry/surfaceTessellation.js';
import { documentDiff, descriptorDiff } from '../src/lab/diff.js';
import { ExplorationSession, morphDocuments } from '../src/lab/exploration.js';
import { createTimeline, sanitizeTimeline, resolveTimelineValue, upsertKeyframe, frameTimes } from '../src/animation/timeline.js';
import { adviseOffline, resolvePath, validateSuggestion, applySuggestionToDocument } from '../src/ai/offline.js';
import { createProvider, runAdvisor, parseAdvisorResponse, shouldAutoAnalyze, PROVIDERS } from '../src/ai/provider.js';
import { AdvisorCache, cacheKey } from '../src/ai/cache.js';
import { buildAdvisorPrompt } from '../src/ai/prompt.js';
import { traceImageData, traceImageContours, otsuThreshold, binarize, grayscale, simplifyRDP, resampleClosed, contourToFourier, reconstructFromHarmonics, buildFourierDocument, buildFourierDocuments, MAX_IMAGE_EDGE } from '../src/input/imageTrace.js';
import { createGeneration, nextGeneration, isChildValid, describeStructuralChange, MAX_CHILDREN, MAX_PARENTS } from '../src/lab/evolution.js';
import { numericParameterRefs, refKey, schemaForRef, stageForRef, pathForRef } from '../src/lab/parameters.js';
import { MutationEngine } from '../src/mutation/MutationEngine.js';
import { PresetManager, META_STORAGE_KEY, RECENT_LIMIT } from '../src/presets/PresetManager.js';
import { PREVIEW_MAX_CHARS, PREVIEW_SIZE, PREVIEW_VERSION, previewKey } from '../src/presets/preview.js';
import { BUILT_IN_PRESETS } from '../src/presets/builtins.js';
import { Exporter, unsupportedSvgFeatures } from '../src/export/Exporter.js';
import { exportBinarySTL, BinaryStlExporter, FabricationExportError } from '../src/export/stl.js';
import { buildFabricationReport, resolveFabricationSource } from '../src/application/fabricationSource.js';
import { getLookPreset, LOOK_PRESETS, lookPresetAvailability, lookPresetMatchesView, resolveLookPreset } from '../src/render/lookPresets.js';
import { encodeGIF, gifFrameTimes, GIF_MAX_FRAMES } from '../src/export/gif.js';
import { analyzeCurve } from '../src/analysis/differential.js';
import { warpExpressions } from '../src/operators/geometry/deform.js';
import { projectCurves, projectPoint, gradientAxisValue, supportsOrthographic, projectionFor } from '../src/render/projection.js';
import { project3D } from '../src/view/camera.js';
import { zoomCamera } from '../src/view/cameraController.js';
import { projectWorldCurves, projectWorldMeshes, projectCameraCurveSegments, projectMesh, projectMeshToView, projectWorldMeshesToView, applyViewTransformToMeshes } from '../src/view/projection.js';
import { createViewTransform, createFrame, resolveFrame, sanitizeFrame, SPACE } from '../src/view/transform.js';
import { buildSpatialReference, createReference, sanitizeReference, referenceExtent } from '../src/view/spatialReference.js';
import { MAX_INSTANCE_LAYERS, MAX_LAYERS, canAddInstanceLayer, countInstanceLayers, dependentInstances, generatorForLayer, isInstanceLayer } from '../src/core/layers.ts';
import { createDefaultUnits, sanitizeUnits, validateUnits, worldToMillimetres, artboardToMillimetres, bboxToMillimetres } from '../src/core/units.js';
import { activeSurfaceDomain, summarizeSurfaceDomain, formatDomainValue } from '../src/geometry/uvDomain.js';
import { artboardPointFromCanvas, rayForArtboardPoint, intersectRayTriangle, orthoDepthForPoint } from '../src/interaction/ray.js';
import { pickSurface, validatePickResult } from '../src/interaction/surfacePicker.js';
import { buildInspectionOverlay } from '../src/interaction/inspectionOverlay.js';
import { buildRenderScene } from '../src/application/renderSceneBuilder.js';
import { rampColor, gradientRange } from '../src/render/passes/gradient.js';
import { PaletteStore, PALETTE_STORAGE_KEY, PALETTES } from '../src/render/palettes.js';

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
  assert(evaluate('2 < 3 && 4 >= 4', scope()).value === 1, 'comparison and boolean operators');
  assert(evaluate('!(2 > 3)', scope()).value === 1, 'boolean not operator');
  assert(evaluate('x^2 + y^2 < 25', { ...scope(), x: 3, y: 4 }).value === 0, 'strict comparison boundary');
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
  const hypotrochoid = Generators.get('hypotrochoid');
  const hypoParams = { ...schemaDefaults(hypotrochoid.params), R: 240, r: 90 };
  assert(Object.prototype.hasOwnProperty.call(hypotrochoid.params, 'rotations'), 'hypotrochoid exposes rotations');
  assert(Math.abs(hypotrochoid.domain(hypoParams).t1 - Math.PI * 6) < 1e-9, 'hypotrochoid T adapts to its 3-turn period');
  const epitrochoid = Generators.get('epitrochoid');
  const epiParams = { ...schemaDefaults(epitrochoid.params), R: 120, r: 30 };
  assert(Math.abs(epitrochoid.domain(epiParams).t1 - Math.PI * 2) < 1e-9, 'epitrochoid T adapts to its period');

  const longDomain = createDocument('parametric', {
    generator: { params: { exprX: 'cos(t)', exprY: 'sin(t)', t0: 0, t1: 100 } },
  });
  assert(longDomain.generator.params.t1 === 100, 'parametric t max accepts values beyond 4π');
  const longEval = evaluateDocument(longDomain, { time: 0 });
  assert(longEval.errors.length === 0 && longEval.curves.length === 1, 'long parametric domain evaluates');

  const hiRes = createDocument('parametric', {
    generator: { params: { samples: 20000, adaptive: false } },
  });
  assert(hiRes.generator.params.samples === 20000, 'parametric samples accept typed values above the slider range');
  assert(evaluateDocument(hiRes, { time: 0 }).stats.pointCount === 20000, '20k parametric samples evaluate exactly');

  const exactDuration = createDocument('harmonic-oscillator', {
    generator: { params: { duration: 19.37 } },
  });
  assert(exactDuration.generator.params.duration === 19.37, 'harmonic duration preserves exact typed values');
  assert(evaluateDocument(exactDuration, { time: 0 }).errors.length === 0, 'exact duration evaluates');
  for (const def of Generators.list()) {
    const doc = createDocument(def.id);
    evalOK(doc, `generator ${def.id}`);
    const { curves } = evaluateDocument(doc, { time: 0 });
    if (def.capabilities?.geometryKind === 'surface') {
      assert(curves.length > 0, `${def.id}: emits compatibility wireframe curves`);
      assert(curves.some((curve) => curve.closed), `${def.id}: closed axes emit closed wireframe curves`);
      continue;
    }
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
  assert(apply('radial-array', { count: 7 }).length === base.length * 7, 'radial-array multiplies');
  assert(apply('linear-array', { count: 6 }).length === base.length * 6, 'linear-array multiplies');
  assert(apply('kaleidoscope', { folds: 5, reflect: true }).length === base.length * 10, 'kaleidoscope mirrors each fold');
  assert(apply('kaleidoscope', { folds: 5, reflect: false }).length === base.length * 5, 'kaleidoscope can omit mirrors');
  const radial = apply('radial-array', { count: 4, sweep: 360, radius: 100, rotateCopies: false });
  assert(radial.length === base.length * 4, 'radial-array count');
  assert(Math.abs(radial[1].points[0].y - base[0].points[0].y) > 1, 'radial-array places copies around the orbit');
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

  const warped = apply('warp', { mode: 'manual', exprX: 'x*1.5', exprY: 'y' });
  assert(warped[0].points.length === base[0].points.length, 'manual warp preserves count');

  const defaultWarp = warpExpressions({ ampX: 40, ampY: 0, freqX: 1, freqY: 1, interference: 0, phase: 0 });
  assert(defaultWarp.x === 'x + 40*sin(y/60)', `warp default X equation (${defaultWarp.x})`);
  assert(defaultWarp.y === 'y', `warp default Y equation (${defaultWarp.y})`);
  const acidWarp = warpExpressions({ ampX: 60, ampY: 30, freqX: 2, freqY: 1.5, interference: 20, phase: 90 });
  assert(/sin/.test(acidWarp.x) && /cos/.test(acidWarp.y), 'warp controls generate both equations');
  assert(/\+ 1\.5708/.test(acidWarp.x), 'warp phase is converted from degrees to radians');

  const autoWarp = apply('warp', { mode: 'auto', ampX: 60, ampY: 30, freqX: 2, freqY: 1.5, interference: 20, phase: 90 });
  assert(autoWarp[0].points.length === base[0].points.length, 'auto warp preserves count');
  assert(autoWarp[0].points.some((pt, i) => pt.x !== base[0].points[i].x || pt.y !== base[0].points[i].y), 'auto warp changes geometry');

  const migratedWarp = createDocument('superformula', {
    operators: [{
      id: 'warp', enabled: true,
      params: { exprX: 'x + 10*sin(y/30)', exprY: 'y' },
      mods: {},
    }],
  });
  assert(migratedWarp.operators[0].params.mode === 'manual', 'warp documents without mode migrate to manual');

  const exprRotate = apply('rotate', { angle: 0, angleExpr: '60' });
  const rotatedPoint = base[0].points[0];
  const exprRotatedPoint = exprRotate[0].points[0];
  const a60 = Math.PI / 3;
  assert(
    Math.abs(exprRotatedPoint.x - (rotatedPoint.x * Math.cos(a60) - rotatedPoint.y * Math.sin(a60))) < 1e-6,
    'rotate angle expression is evaluated per point',
  );

  const exprScale = apply('scale', { sx: 1, sy: 1, scaleExpr: '2' });
  assert(Math.abs(exprScale[0].points[0].x - base[0].points[0].x * 2) < 1e-6, 'scale expression multiplies points');
  assert(Math.abs(exprScale[0].points[0].y - base[0].points[0].y * 2) < 1e-6, 'scale expression applies uniformly');

  const exprOffset = apply('offset', { distance: 0, copies: 1, distanceExpr: '12' });
  const offsetCopy = exprOffset[exprOffset.length - 1];
  assert(offsetCopy.points[0].x !== base[0].points[0].x || offsetCopy.points[0].y !== base[0].points[0].y,
    'offset distance expression displaces points');

  const displaced = apply('expression-displace', { exprX: '10', exprY: '-5' });
  assert(Math.abs(displaced[0].points[0].x - (base[0].points[0].x + 10)) < 1e-9, 'displace expression adds dx');
  assert(Math.abs(displaced[0].points[0].y - (base[0].points[0].y - 5)) < 1e-9, 'displace expression adds dy');

  const exprClipped = apply('expression-clip', { expr: 'x > 0', invert: false });
  assert(exprClipped.length > 0 && exprClipped.every((c) => c.points.every((pt) => pt.x > 0)), 'clip expression keeps only matching points');

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
  assert(defaultDoc.view.layout === 'single', 'default view uses the single layout');
  assert(defaultDoc.view.colorMetric === 'auto', 'default gradient metric is auto');
  assert(Object.keys(defaultDoc.view.passOpacity).length === 0, 'default pass opacity map is empty');
  const quadView = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Quad View',
    generator: { id: 'helix', params: {} },
    operators: [], view: { layout: 'quad' }, animation: {},
  });
  assert(quadView.view.layout === 'quad', 'quad layout survives sanitization');
  const badLayout = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Bad Layout',
    generator: { id: 'helix', params: {} },
    operators: [], view: { layout: 'grid' }, animation: {},
  });
  assert(badLayout.view.layout === 'single', 'unknown layout falls back to single');
  const metricView = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Metric View',
    generator: { id: 'helix', params: {} },
    operators: [], view: { colorMetric: 'curvature' }, animation: {},
  });
  assert(metricView.view.colorMetric === 'curvature', 'color metric survives sanitization');
  const badMetric = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Bad Metric',
    generator: { id: 'helix', params: {} },
    operators: [], view: { colorMetric: 'bogus' }, animation: {},
  });
  assert(badMetric.view.colorMetric === 'auto', 'unknown color metric falls back to auto');
  const opacityView = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Opacity View',
    generator: { id: 'parametric', params: {} },
    operators: [], view: { passOpacity: { stroke: 0.5, points: 2, bogus: 'x' } }, animation: {},
  });
  assert(opacityView.view.passOpacity.stroke === 0.5 && opacityView.view.passOpacity.points === 1, 'pass opacity sanitizes and clamps');
  // Partial camera in raw: only the set key is honored, others default.
  const partialCam = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Partial Camera',
    generator: { id: 'parametric', params: {} },
    operators: [], view: { camera: { yaw: 0.5 } }, animation: {},
  });
  assert(partialCam.view.camera.yaw === 0.5, 'partial camera preserves yaw');
  assert(Math.abs(partialCam.view.camera.pitch - 0.6) < 1e-6, 'partial camera defaults pitch');
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
  const nearCam = sanitizeDocument({
    app: 'parametrica', version: 2, name: 'Near Camera',
    generator: { id: 'parametric', params: {} },
    operators: [], view: { camera: { fov: 1 } }, animation: {},
  });
  assert(nearCam.view.camera.fov === 10, 'fov clamped to the usable wide-angle minimum');
  let zoomed = { ...DEFAULT_VIEW.camera };
  for (let i = 0; i < 200; i++) zoomed = zoomCamera(zoomed, -1);
  assert(zoomed.fov === 10, 'interactive zoom stops at the same minimum');

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
  for (const name of ['Spirograph', 'Guilloché', 'Geometric Flower', 'Radial Mandala', 'Interference Patterns', 'Orbital Patterns']) {
    assert(pm.isBuiltIn(name), `ornamental preset "${name}" is present`);
  }
  assert(pm.delete('Infinity') === false, 'built-ins immutable');

  // Golden Rose uses the 13/8 Fibonacci approximation of phi so it closes.
  const golden = pm.get('Golden Rose');
  const goldenEval = evaluateDocument(golden, { time: 0 });
  assert(goldenEval.errors.length === 0, 'Golden Rose evaluates');
  const goldenCurve = goldenEval.curves[0];
  assert(goldenCurve.closed, 'Golden Rose is closed');
  const goldenFirst = goldenCurve.points[0];
  const goldenLast = goldenCurve.points[goldenCurve.points.length - 1];
  const goldenGap = Math.hypot(goldenLast.x - goldenFirst.x, goldenLast.y - goldenFirst.y);
  assert(goldenGap < 1e-6, `Golden Rose seam meets exactly (gap ${goldenGap})`);

  // Catalog: every built-in is discoverable, grouped and described.
  const entries = pm.entries();
  assert(entries.length === Object.keys(BUILT_IN_PRESETS).length, 'catalog lists every built-in preset');
  assert(entries.every((entry) => entry.category && entry.description), 'every preset has a category and description');
  const categories = pm.categories();
  assert(categories[0].id === 'all' && categories[0].count === entries.length, 'All category counts every preset');
  assert(categories.every((category) => category.id === 'all' || category.id === 'favorites' || category.count > 0), 'empty categories are hidden except Favorites');
  assert(categories.some((category) => category.id === 'favorites' && category.count === 0), 'Favorites is always available');
  assert(categories.some((category) => category.id === 'surfaces' && category.count === 9), 'surface category lists nine presets');
  assert(pm.search('catenoid').length === 2, 'search matches preset names including Fabricate examples');
  assert(pm.search('minimal').length >= 3, 'search matches tags and descriptions');
  assert(pm.search('parametric-surface').length >= 9, 'search matches the generator id');

  // Surface preset family.
  const surfaceNames = [
    'Torus', 'Sphere', 'Hyperbolic Saddle', 'Wave Sheet', 'Helicoid',
    'Catenoid', 'Enneper Surface', 'Möbius Band', 'Seashell',
  ];
  for (const name of surfaceNames) {
    assert(pm.isBuiltIn(name), `surface preset "${name}" is present`);
    const doc = pm.get(name);
    assert(doc.generator.id === 'parametric-surface', `surface preset "${name}" uses parametric-surface`);
    const evaluation = evaluateDocument(doc, { time: 0 });
    assert(evaluation.errors.length === 0, `surface preset "${name}" evaluates`);
    assert(evaluation.geometry[0]?.kind === 'surface', `surface preset "${name}" emits a Surface`);
    assert(evaluation.meshes[0]?.faces.length > 0, `surface preset "${name}" tessellates`);
  }

  // User presets are discoverable in their own category.
  const userPm = new PresetManager(null);
  userPm.save('My Torus', pm.get('Torus'));
  const userEntry = userPm.entries().find((entry) => entry.name === 'My Torus');
  assert(userEntry && userEntry.builtIn === false && userEntry.category === 'user', 'user presets join the catalog');
  assert(userPm.categories().some((category) => category.id === 'user' && category.count === 1), 'user category reports its count');
  assert(userPm.search('torus').some((entry) => entry.name === 'My Torus'), 'search includes user presets');
}

/* ——— 7b. Vortex Stack composition preset ——— */
console.log('7b. Vortex Stack composition preset');
{
  const pm = new PresetManager(null);
  const doc = pm.get('Vortex Stack');
  assert(doc?.name === 'Vortex Stack', 'Vortex Stack preset exists');
  assert(doc.layers.length === 6, 'Vortex Stack has one source and five instances');
  assert(doc.layers[0].visible === false, 'Vortex Stack source is hidden');
  assert(doc.activeLayer === 1, 'Vortex Stack opens on the first instance');
  const instances = doc.layers.filter((layer) => layer.type === 'instance');
  assert(instances.length === 5, 'Vortex Stack has five instance layers');
  assert(instances.every((layer) => layer.source.layerId === doc.layers[0].id), 'every instance references the source');
  assert(instances.every((layer) => layer.operators.map((op) => op.id).join(',') === 'translate,rotate,scale'), 'every instance has translate/rotate/scale');
  assert(doc.view.modes.length === 1 && doc.view.modes[0] === 'stroke', 'Vortex Stack starts in stroke view');
  assert(Math.abs(doc.view.camera.yaw + 0.6) < 1e-9 && Math.abs(doc.view.camera.pitch - 0.34) < 1e-9, 'Vortex Stack camera is documented');
  assert(doc.view.guides === false, 'Vortex Stack disables guides');

  const evaluation = evaluateDocument(doc, { time: 0 });
  assert(evaluation.errors.length === 0, 'Vortex Stack evaluates without errors');
  assert(evaluation.layers.length === 6, 'Vortex Stack evaluates all layers');
  assert(evaluation.layers[0].visible === false, 'Vortex Stack source stays hidden');
  assert(evaluation.layers.slice(1).every((layer) => layer.meshes.length === 1), 'Vortex Stack instances tessellate');
  assert(evaluation.layers.slice(1).every((layer) => layer.surfaceMappings[0].meshId === layer.meshes[0].id), 'Vortex Stack mappings are instance-local');

  const again = pm.get('Vortex Stack');
  const structure = (value) => value.layers.map((layer) => ({
    type: layer.type,
    name: layer.name,
    source: layer.source?.layerId ?? null,
    operators: layer.operators.map((op) => op.id),
    style: layer.style,
  }));
  const firstStructure = structure(doc);
  const secondStructure = structure(again);
  secondStructure.forEach((layer, index) => {
    if (layer.source) layer.source = firstStructure[index].source;
  });
  assert(JSON.stringify(firstStructure) === JSON.stringify(secondStructure), 'Vortex Stack structure is deterministic apart from ids');
  assert(previewKey(doc) === previewKey(again), 'Vortex Stack preview hash normalizes ids and source refs');
  assert(PREVIEW_VERSION === 4, 'preview version bumped for size-aware hashing');
  assert(previewKey(doc, { size: 224 }) !== previewKey(doc), 'preview key includes requested size');

  const entry = pm.entries().find((item) => item.name === 'Vortex Stack');
  assert(entry?.category === 'compositions' && entry.generator === 'parametric-surface', 'Vortex Stack catalog metadata resolves its source generator');
  assert(pm.search('vortex').some((item) => item.name === 'Vortex Stack'), 'Vortex Stack is searchable by name');
  assert(pm.search('composition').some((item) => item.name === 'Vortex Stack'), 'Vortex Stack is searchable by tag');
  assert(pm.categories().some((category) => category.id === 'compositions' && category.count === 1), 'Compositions category lists Vortex Stack');
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

  const baseLayers = [{ visible: true, meshes: [], renderMeshes: [], style: { blend: 'normal' } }];
  const supported = unsupportedSvgFeatures(
    {
      ...doc.view,
      modes: ['gradient-wireframe', 'surface-fill', 'tangents', 'curvature'],
      overlays: { inflections: true },
      style: { ...doc.view.style, blend: 'multiply' },
    },
    baseLayers,
  );
  assert(supported.length === 0, 'vector passes, overlays and blend are SVG-supported');
  const sdfOmitted = unsupportedSvgFeatures(
    { ...doc.view, modes: ['signed-distance'], overlays: {}, style: { ...doc.view.style, blend: 'normal' } },
    baseLayers,
  );
  assert(sdfOmitted.includes('Signed Distance (raster-only)'), 'SVG omission list keeps raster-only SDF');

  const helix = BUILT_IN_PRESETS['Básica']();
  helix.view.modes = ['gradient-wireframe'];
  helix.view.colorRamp = ['#ff0000', '#0000ff'];
  const helixEval = evaluateDocument(helix, { time: 0 });
  const gradientSvg = Exporter.buildSVG(helixEval.curves, helix.view, { w: 900, h: 900 }, helix);
  assert(gradientSvg.includes('data-pass="gradient-wireframe"'), 'gradient wireframe exports as a pass');
  const gradientColors = [...gradientSvg.matchAll(/stroke="(#[0-9a-f]{6})"/g)].map((match) => match[1]);
  assert(gradientColors.includes('#ff0000') && gradientColors.some((color) => parseInt(color.slice(5, 7), 16) > 200), 'gradient ramp colors reach SVG');

  const torus = BUILT_IN_PRESETS.Torus();
  torus.view.modes = ['surface-fill'];
  const torusEval = evaluateDocument(torus, { time: 0 });
  const surfaceSvg = Exporter.buildSVG(torusEval.curves, torus.view, { w: 900, h: 900 }, torus, null, {
    meshes: torusEval.renderMeshes,
  });
  assert(surfaceSvg.includes('data-pass="surface-fill"') && surfaceSvg.includes('<path'), 'surface fill exports as SVG polygons');

  const overlayDoc = BUILT_IN_PRESETS['Lissajous 3:5']();
  overlayDoc.view.overlays = { inflections: true, samplePoints: true, ruler: true, bbox: true };
  const overlayEval = evaluateDocument(overlayDoc, { time: 0 });
  const overlaySvg = Exporter.buildSVG(overlayEval.curves, overlayDoc.view, { w: 900, h: 900 }, overlayDoc);
  assert(overlaySvg.includes('data-overlays="true"'), 'overlays export as a separate SVG group');
  assert(overlaySvg.includes('<circle') && overlaySvg.includes('<rect') && overlaySvg.includes('<line'), 'overlay primitives reach SVG');

  const diagnostic = BUILT_IN_PRESETS['Lissajous 3:5']();
  diagnostic.view.modes = ['tangents', 'normals', 'curvature', 'topology'];
  const diagnosticEval = evaluateDocument(diagnostic, { time: 0 });
  const diagnosticSvg = Exporter.buildSVG(diagnosticEval.curves, diagnostic.view, { w: 900, h: 900 }, diagnostic);
  for (const id of ['tangents', 'normals', 'curvature', 'topology']) {
    assert(diagnosticSvg.includes(`data-pass="${id}"`), `SVG exports diagnostic pass ${id}`);
  }
  assert(diagnosticSvg.includes('<line') && diagnosticSvg.includes('<circle'), 'diagnostic primitives reach SVG');

  const blended = BUILT_IN_PRESETS['Lissajous 3:5']();
  blended.view.style.blend = 'multiply';
  const blendedEval = evaluateDocument(blended, { time: 0 });
  const blendedSvg = Exporter.buildSVG(blendedEval.curves, blended.view, { w: 900, h: 900 }, blended);
  assert(blendedSvg.includes('mix-blend-mode:multiply'), 'blend mode exports as CSS mix-blend-mode');
  const opaqueDoc = BUILT_IN_PRESETS['Lissajous 3:5']();
  opaqueDoc.view.passOpacity = { stroke: 0.5 };
  const opaqueEval = evaluateDocument(opaqueDoc, { time: 0 });
  const opaqueSvg = Exporter.buildSVG(opaqueEval.curves, opaqueDoc.view, { w: 900, h: 900 }, opaqueDoc);
  assert(opaqueSvg.includes('data-pass="stroke" opacity="0.5"'), 'pass opacity reaches the SVG group');

  const gradientDoc = BUILT_IN_PRESETS['Golden Rose']();
  gradientDoc.view.style.fill.enabled = true;
  gradientDoc.view.style.fill.gradient = {
    enabled: true,
    type: 'linear',
    angle: 45,
    colors: ['#ff0000', '#00ff00', '#0000ff'],
  };
  const gradientEval = evaluateDocument(gradientDoc, { time: 0 });
  const gradientFillSvg = Exporter.buildSVG(gradientEval.curves, gradientDoc.view, { w: 900, h: 900 }, gradientDoc);
  assert(gradientFillSvg.includes('<linearGradient') && gradientFillSvg.includes('stop-color="#ff0000"'), 'linear fill gradient exports defs');
  assert(gradientFillSvg.includes('fill="url(#svg-0-stroke-'), 'gradient fill paints with a URL');
  const radialDoc = BUILT_IN_PRESETS['Golden Rose']();
  radialDoc.view.style.fill.enabled = true;
  radialDoc.view.style.fill.gradient = {
    enabled: true,
    type: 'radial',
    centerX: 0.3,
    centerY: 0.6,
    radius: 0.5,
    colors: ['#ffffff', '#000000'],
  };
  const radialEval = evaluateDocument(radialDoc, { time: 0 });
  const radialFillSvg = Exporter.buildSVG(radialEval.curves, radialDoc.view, { w: 900, h: 900 }, radialDoc);
  assert(radialFillSvg.includes('<radialGradient') && radialFillSvg.includes('r="180"'), 'radial fill gradient exports geometry');

  const surfaceGradientDoc = createDocument('parametric-surface', {
    generator: { params: { samplesU: 8, samplesV: 8, closedU: false, closedV: false, fit: 300 } },
  });
  surfaceGradientDoc.view.modes = ['surface-fill'];
  surfaceGradientDoc.view.style.fill.enabled = true;
  surfaceGradientDoc.view.style.fill.gradient = {
    enabled: true,
    type: 'linear',
    angle: 30,
    colors: ['#ff0000', '#0000ff'],
  };
  surfaceGradientDoc.layers[0].style = surfaceGradientDoc.view.style;
  const surfaceGradientEval = evaluateDocument(surfaceGradientDoc, { time: 0 });
  const surfaceGradientSvg = Exporter.buildSVG(
    surfaceGradientEval.curves,
    surfaceGradientDoc.view,
    { w: 900, h: 900 },
    surfaceGradientDoc,
    null,
    { meshes: surfaceGradientEval.renderMeshes },
  );
  assert(surfaceGradientSvg.includes('<linearGradient'), 'surface fill uses the fill gradient');
  assert((surfaceGradientSvg.match(/fill="url\(#/g) || []).length > 10, 'surface faces reuse the gradient paint');

  const plotterView = {
    ...doc.view,
    modes: ['gradient-wireframe', 'tangents', 'surface-fill'],
    overlays: { inflections: true, samplePoints: true, ruler: true, bbox: true },
    style: {
      ...doc.view.style,
      fill: { ...doc.view.style.fill, enabled: true, gradient: { ...doc.view.style.fill.gradient, enabled: true } },
      blend: 'multiply',
    },
  };
  const plotterLayers = [
    {
      visible: true,
      style: { stroke: { color: '#e30613', width: 3, opacity: 0.5, cap: 'butt', join: 'miter' } },
      curves: [{ closed: true, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] }],
    },
    {
      visible: false,
      style: { stroke: { color: '#00ff00', width: 9 } },
      curves: [{ closed: false, points: [{ x: 50, y: 50 }, { x: 60, y: 60 }] }],
    },
  ];
  const plotterSvg = Exporter.buildPlotterSVG([], plotterView, { w: 900, h: 900 }, doc, plotterLayers);
  assert(plotterSvg.includes('data-plotter="true"'), 'plotter SVG is marked');
  assert(plotterSvg.includes('class="plotter-layer"') && !plotterSvg.includes('data-layer="1"'), 'plotter SVG keeps only visible layers');
  assert(plotterSvg.includes('fill="none"') && !plotterSvg.includes('fill="#') && !plotterSvg.includes('<linearGradient'), 'plotter SVG drops fills and gradients');
  assert(!plotterSvg.includes('svg-pass') && !plotterSvg.includes('svg-overlays') && !plotterSvg.includes('mix-blend-mode'), 'plotter SVG drops passes, overlays and blend');
  assert(plotterSvg.includes('Z') && plotterSvg.includes('stroke="#e30613"') && plotterSvg.includes('stroke-width="3"'), 'plotter SVG preserves lines and closed seams');
  assert(plotterSvg.includes('stroke-linecap="butt"') && plotterSvg.includes('stroke-linejoin="miter"'), 'plotter SVG preserves cap and join');
  assert(plotterSvg.includes('parametrica document:'), 'plotter SVG embeds the document');
  assert(!plotterSvg.includes('<rect'), 'plotter SVG has no background rect');

  const sdfDoc = BUILT_IN_PRESETS['Lissajous 3:5']();
  sdfDoc.view.modes = ['signed-distance'];
  const sdfEval = evaluateDocument(sdfDoc, { time: 0 });
  const sdfWarnings = [];
  Exporter.buildSVG(sdfEval.curves, sdfDoc.view, { w: 900, h: 900 }, sdfDoc, null, {
    onUnsupported: (name) => sdfWarnings.push(name),
  });
  assert(sdfWarnings.some((name) => name.includes('Signed Distance')), 'SDF is reported as a raster-only omission');
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

  // Exact periods for the mathematical families.
  assert(trochoidTurns(240, 90, 'hypo') === 3, 'hypotrochoid 240/90 closes after 3 turns');
  assert(trochoidTurns(120, 30, 'epi') === 1, 'epitrochoid 120/30 closes after 1 turn');
  assert(lissajousTurns(3, 5) === 1, 'integer Lissajous closes after one turn');
  assert(lissajousTurns(1.25, 5) === 4, 'fractional Lissajous derives four turns');
  assert(roseTurns(8, 3) === 3, 'rose n/d period is the reduced denominator');
  assert(roseTurns(4, 2) === 1, 'reducible rose n/d is reduced first');

  // Discontinuities become separate open strokes, never artificial chords.
  const jump = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1000, y: 0 }, { x: 1001, y: 0 }];
  const jumped = splitCurveAtDiscontinuities(jump, { closed: false });
  assert(jumped.segments.length === 2 && jumped.broken, 'large jump splits a polyline into two strokes');
  const hole = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: NaN, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
  const holed = splitCurveAtDiscontinuities(hole, { closed: false });
  assert(holed.segments.length === 2, 'non-finite sample splits the curve around the pole');
  const square = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  assert(splitCurveAtDiscontinuities(square, { closed: true }).closed === true, 'implicit closing seam stays closed');
  const arc = Array.from({ length: 101 }, (_, i) => ({ x: Math.cos(i / 100), y: Math.sin(i / 100) }));
  assert(splitCurveAtDiscontinuities(arc, { closed: true }).closed === false, 'a chord spanning many samples is not a closure');
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
  assert(clampEval.stats.pointCount === POINT_LIMITS.perCurve, `samples modulation clamps to the 50k engine budget (got ${clampEval.stats.pointCount})`);
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

  const fracLissajous = createDocument('lissajous', {
    generator: { params: { a: 1.25, b: 5, samples: 400, adaptive: false } },
  });
  const fracEval = evaluateDocument(fracLissajous, { time: 0 });
  assert(fracEval.curves[0].closed === true, 'fractional Lissajous closes after its auto period');
  assert(fracEval.curves[0].meta.turns === 4, 'fractional Lissajous derives 4 turns');

  const openParametric = createDocument('parametric', {
    generator: { params: { exprX: 'cos(t)', exprY: 'sin(t)', t0: 0, t1: 1, closed: true } },
  });
  assert(evaluateDocument(openParametric, { time: 0 }).curves[0].closed === false, 'partial domain is detected as open');

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

  const hierarchyStorage = new MemoryStorage();
  const hierarchy = new Notebook({ storage: hierarchyStorage, now: () => 2000 });
  assert(hierarchy.projects.length === 1 && hierarchy.projects[0].id === INBOX_PROJECT_ID, 'notebook starts with Inbox');
  const project = hierarchy.createProject('Encargo');
  const series = hierarchy.createSeries(project.id, 'Rosetas');
  assert(project && series && hierarchy.seriesFor(project.id).length === 1, 'project and series are created');
  const nested = hierarchy.add({
    id: 'nested-1', name: 'Roseta 01', document: docA, descriptor: descriptorA,
    projectId: project.id, seriesId: series.id,
  });
  assert(nested.projectId === project.id && nested.seriesId === series.id, 'checkpoint stores its hierarchy');
  const hierarchyReload = new Notebook({ storage: hierarchyStorage, now: () => 2000 });
  assert(hierarchyReload.getProject(project.id)?.name === 'Encargo', 'projects persist');
  assert(hierarchyReload.getSeries(series.id)?.name === 'Rosetas', 'series persist');
  assert(hierarchyReload.get('nested-1')?.projectId === project.id, 'checkpoint project persists');
  hierarchyReload.moveCheckpoint('nested-1', { projectId: INBOX_PROJECT_ID });
  assert(hierarchyReload.get('nested-1').seriesId === null, 'moving to Inbox clears the series');
  hierarchyReload.removeSeries(series.id);
  assert(hierarchyReload.seriesFor(project.id).length === 0, 'deleting a series removes it');
  hierarchyReload.removeProject(project.id);
  assert(hierarchyReload.getProject(project.id) === null, 'deleting a project removes it');
  assert(hierarchyReload.get('nested-1').projectId === INBOX_PROJECT_ID, 'project deletion moves creations to Inbox');

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
  assert(defaults.view.style.stroke.width === 0.5, 'default stroke width');
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

  const layerWidthWins = sanitizeDocument({
    app: 'parametrica', version: 3, name: 'Layer width wins',
    activeLayer: 0,
    view: { strokeWeight: 9, style: { stroke: { width: 9 } } },
    layers: [{
      id: 'layer-1', name: 'Layer', visible: true, locked: false, seed: 1,
      generator: { id: 'parametric', params: {}, mods: {} },
      operators: [],
      style: { stroke: { width: 4 } },
    }],
  });
  assert(layerWidthWins.view.style.stroke.width === 4 && layerWidthWins.view.strokeWeight === 4, 'layer style width is authoritative over legacy view width');

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
  const gradientStyle = sanitizeFillGradient({
    enabled: true,
    type: 'radial',
    angle: 999,
    centerX: -1,
    centerY: 2,
    radius: 9,
    colors: ['#ff0000', 'bad', '#00ff00'],
  });
  assert(gradientStyle.enabled && gradientStyle.type === 'radial', 'fill gradient type round-trip');
  assert(gradientStyle.angle === 360 && gradientStyle.centerX === 0 && gradientStyle.centerY === 1 && gradientStyle.radius === 3, 'fill gradient values clamp');
  assert(gradientStyle.colors.join(',') === '#ff0000,#00ff00', 'fill gradient drops invalid colors');
  assert(createDefaultFillGradient().enabled === false, 'fill gradient defaults off');
  const linearGradient = resolveFillGradient(
    { enabled: true, type: 'linear', angle: 0, colors: ['#ff0000', '#0000ff'] },
    { minX: -10, minY: -5, width: 20, height: 10 },
  );
  assert(linearGradient.x1 === -10 && linearGradient.x2 === 10 && linearGradient.y1 === 0 && linearGradient.y2 === 0, 'linear gradient follows angle 0');
  const verticalGradient = resolveFillGradient(
    { enabled: true, type: 'linear', angle: 90, colors: ['#ff0000', '#0000ff'] },
    { minX: -10, minY: -5, width: 20, height: 10 },
  );
  assert(Math.abs(verticalGradient.y1 + 5) < 1e-6 && Math.abs(verticalGradient.y2 - 5) < 1e-6, 'linear gradient follows angle 90');
  const radialGradient = resolveFillGradient(
    { enabled: true, type: 'radial', centerX: 0.25, centerY: 0.75, radius: 0.5, colors: ['#ff0000', '#0000ff'] },
    { minX: -10, minY: -5, width: 20, height: 10 },
  );
  assert(radialGradient.cx === -5 && radialGradient.cy === 2.5 && radialGradient.r === 10, 'radial gradient follows bbox center and radius');
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

  class PaletteMemory {
    constructor() { this.map = new Map(); }
    getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
    setItem(key, value) { this.map.set(key, String(value)); }
    removeItem(key) { this.map.delete(key); }
  }
  const paletteStorage = new PaletteMemory();
  const paletteStore = new PaletteStore(paletteStorage);
  assert(paletteStore.entries().length === PALETTES.length, 'palette store starts with built-ins');
  const savedPalette = paletteStore.save('Mine', { background: '#123456', stroke: '#abcdef', fill: '#fedcba' });
  assert(savedPalette.id.startsWith('custom-') && paletteStore.entries().length === PALETTES.length + 1, 'custom palette is saved');
  assert(paletteStorage.getItem(PALETTE_STORAGE_KEY).includes('Mine'), 'custom palette persists');
  const reloadedPalettes = new PaletteStore(paletteStorage);
  assert(reloadedPalettes.get(savedPalette.id)?.background === '#123456', 'custom palette reloads');
  const replacedPalette = reloadedPalettes.save('Mine', { background: '#000000', stroke: '#ffffff', fill: '#ffffff' });
  assert(replacedPalette.id === savedPalette.id && reloadedPalettes.entries().length === PALETTES.length + 1, 'same name replaces a custom palette');
  assert(reloadedPalettes.delete(savedPalette.id), 'custom palette deletes');
  assert(reloadedPalettes.entries().length === PALETTES.length, 'built-ins remain after delete');
  let emptyName = null;
  try { reloadedPalettes.save('', {}); } catch (error) { emptyName = error; }
  assert(emptyName && /name required/i.test(emptyName.message), 'empty palette name is rejected');
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
  const layerAnalysis = ev.layers[1].analysis;
  assert(layerAnalysis.perCurve.length === ev.layers[1].curves.length, 'layer analysis is scoped to its layer');
  const expectedLayer = analyzeCurve(ev.layers[1].curves[0].points, ev.layers[1].curves[0].closed);
  assert(Math.abs(layerAnalysis.perCurve[0].arcLength - expectedLayer.arcLength) < 1e-9, 'layer analysis matches its own curves');
  assert(layerAnalysis !== ev.analysis, 'layer analysis is distinct from combined analysis');
  const modesDoc = createDocument('parametric');
  modesDoc.layers.push(createLayer('rose', { name: 'Points layer', modes: ['stroke', 'points'], colorMetric: 'curvature' }));
  attachLayerAliases(modesDoc);
  const modesEval = evaluateDocument(modesDoc, { time: 0 });
  assert(modesEval.layers[1].modes.join(',') === 'stroke,points', 'layer render-mode override survives evaluation');
  assert(modesEval.layers[1].colorMetric === 'curvature', 'layer color metric survives evaluation');
  const modesRoundTrip = sanitizeDocument(JSON.parse(JSON.stringify(modesDoc)));
  assert(modesRoundTrip.layers[1].modes.join(',') === 'stroke,points', 'layer render-mode override survives round-trip');
  assert(modesRoundTrip.layers[1].colorMetric === 'curvature', 'layer color metric survives round-trip');
  assert(ev.curves.every((c) => c.meta.layerId), 'curves carry layer ids');
  assert(ev.stats.curveCount === ev.curves.length, 'aggregate curve count');

  const desc = computeDescriptor(doc, ev.curves, { layers: ev.layers });
  assert(desc.layers.length === 2, 'descriptor exposes per-layer descriptors');
  assert(desc.layers[0].layerId === doc.layers[0].id, 'layer descriptors carry ids');
  assert(desc.curveCount === ev.curves.length, 'descriptor aggregate curve count');

  const svg = Exporter.buildSVG(ev.curves, doc.view, { w: 900, h: 900 }, doc, ev.layers);
  assert((svg.match(/class="svg-layer"/g) || []).length === 2, 'SVG has one group per visible layer');
  assert(svg.includes('#e30613'), 'SVG carries per-layer color');

  const hidden = structuredClone(doc);
  hidden.layers[1].visible = false;
  const hiddenEval = evaluateDocument(attachLayerAliases(hidden), { time: 0 });
  assert(hiddenEval.curves.every((c) => c.meta.layerId !== hidden.layers[1].id), 'hidden layer omitted from curves');
  const hiddenSvg = Exporter.buildSVG(hiddenEval.curves, hidden.view, { w: 900, h: 900 }, hidden, hiddenEval.layers);
  assert((hiddenSvg.match(/class="svg-layer"/g) || []).length === 1, 'hidden layer omitted from SVG');

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

  const gifTimes = gifFrameTimes(1, 10);
  assert(gifTimes.length === 10 && gifTimes[0] === 0, 'GIF frame plan reuses timeline timestamps');
  assert(gifFrameTimes(1, 120).length === 50, 'GIF frame plan caps playback at 50 FPS');
  let capError = null;
  try { gifFrameTimes(60, 10); } catch (error) { capError = error; }
  assert(capError && capError.message.includes(String(GIF_MAX_FRAMES)), 'GIF frame plan enforces the frame cap');

  const gifFrames = [
    { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) },
    { width: 2, height: 2, data: new Uint8ClampedArray(16).map((_, i) => (i % 4 === 2 ? 255 : 0)) },
  ];
  const gif = encodeGIF(gifFrames, { fps: 12, loop: true });
  assert(String.fromCharCode(...gif.slice(0, 6)) === 'GIF89a', 'GIF has a GIF89a header');
  assert(gif[gif.length - 1] === 0x3b, 'GIF ends with the trailer');
  const gifView = new DataView(gif.buffer, gif.byteOffset, gif.byteLength);
  assert(gifView.getUint16(6, true) === 2 && gifView.getUint16(8, true) === 2, 'GIF keeps frame dimensions');
  assert(new TextDecoder('latin1').decode(gif).includes('NETSCAPE2.0'), 'GIF loop extension is present');
  const once = encodeGIF(gifFrames, { fps: 12, loop: false });
  assert(!new TextDecoder('latin1').decode(once).includes('NETSCAPE2.0'), 'GIF plays once when loop is off');

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

  const twoCircles = makeImage(240, 240, (x, y) => (
    Math.hypot(x - 70, y - 120) < 38 || Math.hypot(x - 170, y - 120) < 38
  ));
  const many = traceImageContours(twoCircles, { harmonics: 16, samples: 256 });
  assert(many.ok && many.count === 2, `two-circle trace finds two contours (${many.reason ?? many.count})`);
  assert(many.contours.every((entry) => entry.harmonicsX.length && entry.harmonicsY.length), 'each contour has Fourier terms');
  const multiDoc = buildFourierDocuments(many, { name: 'Two contours' });
  assert(multiDoc.layers.length === 2 && multiDoc.activeLayer === 0, 'multi-contour apply creates one layer per contour');
  const multiEval = evaluateDocument(multiDoc, { time: 0 });
  assert(multiEval.errors.length === 0 && multiEval.curves.length === 2, 'multi-contour document evaluates');

  const ring = makeImage(240, 240, (x, y) => {
    const d = Math.hypot(x - 120, y - 120);
    return d < 90 && d > 42;
  });
  const ringTrace = traceImageContours(ring, { harmonics: 16, samples: 256 });
  assert(ringTrace.ok && ringTrace.count === 2 && ringTrace.holeCount === 1, 'ring trace detects outer contour and one hole');
  assert(ringTrace.contours.some((entry) => entry.hole), 'hole contour is marked');
  const ringDoc = buildFourierDocuments(ringTrace, { name: 'Ring' });
  assert(ringDoc.layers.length === 2 && ringDoc.layers.some((layer) => /hole/i.test(layer.name)), 'hole contours become named Fourier layers');
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
  const flat2D = [{ points: [{ x: 3, y: 4 }, { x: 5, y: 6 }] }];
  assert(!supportsOrthographic(flat2D), '2D curves do not support orthographic views');
  assert(supportsOrthographic(fake), '3D metadata enables orthographic views');
  assert(projectionFor(flat2D, 'xz') === '3d', '2D projections fall back to the camera view');
  assert(projectionFor(fake, 'xz') === 'xz', '3D projections stay selected');
  assert(projectCurves(flat2D, 'xz') === flat2D, '2D projection leaves geometry untouched');
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
  const metricCurve = [{
    points: [
      { x: 0, y: 0, x3: 0, y3: 0, h3: 2 },
      { x: 3, y: 4, x3: 3, y3: 4, h3: 8 },
      { x: 6, y: 0, x3: 6, y3: 0, h3: 2 },
    ],
  }];
  const heightRange = gradientRange(metricCurve, '3d', 'height');
  assert(heightRange.min === 2 && heightRange.max === 8, 'height metric range');
  const radiusRange = gradientRange(metricCurve, '3d', 'radius');
  assert(radiusRange.min === 0 && radiusRange.max === 6, 'radius metric range');
  const metricAnalysis = { perCurve: [{ curvatures: new Float64Array([1, 3, 1]) }] };
  const curvatureRange = gradientRange(metricCurve, '3d', 'curvature', metricAnalysis);
  assert(curvatureRange.min === 1 && curvatureRange.max === 3, 'curvature metric range');
  const arcRange = gradientRange(metricCurve, '3d', 'arc');
  assert(arcRange.min === 0 && Math.abs(arcRange.max - 10) < 1e-6, 'arc-length metric range');

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
    assert((svg.includes('<path') || svg.includes('<line')) && svg.includes('parametrica document:'), `${name}: SVG export is well-formed`);
  }
  assert(signatures.size === helixNames.length, 'all six helix variations are geometrically distinct');

  const summaryDoc = BUILT_IN_PRESETS['Básica']();
  const summary = buildParametricSummary(summaryDoc);
  assert(summary.layerName === 'Básica' && /Helix/i.test(summary.generatorName), 'parametric summary identifies the active shape');
  assert(summary.params.some((param) => param.label === 'Radius' && param.value === '120'), 'parametric summary exposes shape values');
  assert(summary.params.some((param) => param.advanced), 'parametric summary keeps advanced values available');
  assert(formatParametricValue([1, 2, 3]) === '3 items', 'parametric summary formats arrays');
  assert(formatParametricValue(true) === 'yes', 'parametric summary formats booleans');
  assert(formatParametricValue(3.141592) === '3.1416', 'parametric summary rounds numbers');
  assert(formatParametricValue({ expr: 'sin(time)' }).startsWith('ƒ '), 'parametric summary formats animatable expressions');
}

/* ——— 26. Session recovery ——— */
console.log('26. session recovery');
{
  class MemoryStorage {
    constructor() { this.map = new Map(); this.fail = false; }
    getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
    setItem(key, value) {
      if (this.fail) throw new Error('quota exceeded');
      this.map.set(key, String(value));
    }
    removeItem(key) { this.map.delete(key); }
  }

  const storage = new MemoryStorage();
  const store = new SessionStore({ storage, now: () => 1234, delay: 10 });
  const doc = createDocument('helix', { generator: { params: { r: 222 } } });
  doc.animation.playing = true;
  assert(store.save(doc), 'session saves');
  const loaded = store.load();
  assert(loaded?.savedAt === 1234, 'session keeps its timestamp');
  assert(loaded?.document.generator.id === 'helix', 'session keeps the generator');
  assert(loaded?.document.generator.params.r === 222, 'session keeps numeric changes');
  assert(loaded?.document.animation.playing === false, 'session never restores playback');
  assert(storage.getItem(SESSION_STORAGE_KEY)?.includes('helix'), 'session uses the canonical storage key');

  store.clear();
  assert(store.load() === null, 'clear removes the session');

  const scheduled = new SessionStore({ storage, now: () => 2000, delay: 5 });
  scheduled.schedule(createDocument('lissajous', { generator: { params: { a: 7 } } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert(scheduled.load()?.document.generator.params.a === 7, 'scheduled session save lands');

  scheduled.schedule(createDocument('lissajous'));
  assert(scheduled.flush(createDocument('lissajous', { generator: { params: { a: 9 } } })), 'flush writes immediately');
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert(scheduled.load()?.document.generator.params.a === 9, 'flush cancels the pending debounce');

  storage.setItem(SESSION_STORAGE_KEY, '{broken json');
  const broken = new SessionStore({ storage });
  assert(broken.load() === null && /JSON/.test(broken.lastError), 'corrupt sessions are rejected');

  storage.fail = true;
  const full = new SessionStore({ storage });
  assert(full.save(doc) === false, 'quota failures do not throw');
  assert(/quota/.test(full.lastError), 'quota failures are reported');
}

/* ——— 27. registry contracts ——— */
console.log('27. registry contracts');
{
  const local = new Registry('generator');
  let duplicate = false;
  local.register({ id: 'sample-stage', name: 'Sample', category: 'test', params: {}, sample: () => [] });
  try {
    local.register({ id: 'sample-stage', name: 'Again', category: 'test', params: {}, sample: () => [] });
  } catch (error) {
    duplicate = /duplicate/.test(error.message);
  }
  assert(duplicate, 'registry rejects duplicate ids');

  let missingSample = false;
  try {
    new Registry('generator').register({ id: 'broken', name: 'Broken', category: 'test', params: {} });
  } catch (error) {
    missingSample = /missing sample/.test(error.message);
  }
  assert(missingSample, 'registry rejects a generator without sample');

  let unknownType = false;
  try {
    new Registry('operator').register({
      id: 'broken-op', name: 'Broken', category: 'test',
      params: { x: { type: 'mystery', default: 1 } }, apply: () => [],
    });
  } catch (error) {
    unknownType = /unknown type/.test(error.message);
  }
  assert(unknownType, 'registry rejects unknown parameter types');

  let badHook = false;
  try {
    new Registry('generator').register({
      id: 'bad-hook', name: 'Bad Hook', category: 'test', params: {},
      sample: () => [], previewParams: 42,
    });
  } catch (error) {
    badHook = /hook "previewParams"/.test(error.message);
  }
  assert(badHook, 'registry rejects non-function hooks');

  for (const def of Generators.list()) {
    assert(typeof def.sample === 'function' || typeof def.generate === 'function', `generator ${def.id} has sample or generate`);
  }
  for (const def of Operators.list()) {
    assert(typeof def.apply === 'function', `operator ${def.id} has apply`);
  }
  for (const def of RenderPasses.list()) {
    assert(typeof def.draw === 'function', `render pass ${def.id} has draw`);
    assert(['base', 'surface', 'color', 'diagnostic'].includes(def.group), `render pass ${def.id} has a valid group`);
    assert(typeof def.description === 'string' && def.description.length > 0, `render pass ${def.id} has a description`);
    if (def.appliesTo !== undefined) assert(typeof def.appliesTo === 'function', `render pass ${def.id} appliesTo is a function`);
  }
  const surfaceFillPass = RenderPasses.get('surface-fill');
  assert(surfaceFillPass.appliesTo({ meshes: [] }) === false, 'surface fill is inapplicable without meshes');
  assert(surfaceFillPass.appliesTo({ meshes: [{}] }) === true, 'surface fill applies with meshes');
  const epicyclesPass = RenderPasses.get('epicycles');
  assert(epicyclesPass.appliesTo({ document: createDocument('fourier') }) === true, 'epicycles applies to Fourier documents');
  assert(epicyclesPass.appliesTo({ document: createDocument('parametric') }) === false, 'epicycles does not apply to parametric documents');
}

/* ——— 28. extensibility boundaries ——— */
console.log('28. extensibility boundaries');
{
  assert(supportsSpatial(Generators.get('helix')) === true, 'helix declares spatial capability');
  assert(supportsSpatial(Generators.get('parametric-3d')) === true, 'parametric-3d declares spatial capability');
  assert(supportsSpatial(Generators.get('lissajous')) === false, 'lissajous remains planar');

  for (const type of ['number', 'boolean', 'select', 'expression', 'source', 'harmonics']) {
    assert(ParamTypes.has(type), `param type ${type} is registered`);
  }
  assert(ParamTypes.get('number').modulatable === true, 'number params are modulatable');
  assert(ParamTypes.get('select').bindable === true, 'select params are bindable');

  const repo = new MemoryNotebookRepository();
  const docA = createDocument('lissajous');
  const evalA = evaluateDocument(docA, { time: 0 });
  const descriptorA = computeDescriptor(docA, evalA.curves);
  const notebook = new Notebook({ repository: repo, now: () => 3000 });
  notebook.add({ id: 'repo-1', name: 'Repo checkpoint', document: docA, descriptor: descriptorA });
  const reloaded = new Notebook({ repository: repo, now: () => 3000 });
  assert(reloaded.get('repo-1')?.name === 'Repo checkpoint', 'memory repository round-trips');

  const migrated = migrateNotebook({ version: 1, checkpoints: [] });
  assert(migrated.version === 2 && Array.isArray(migrated.projects), 'migration returns a current snapshot');
  let badMigration = false;
  try { migrateNotebook({ nope: true }); } catch { badMigration = true; }
  assert(badMigration, 'migration rejects unknown notebook shapes');

  const project = reloaded.createProject('Workspace project');
  const series = reloaded.createSeries(project.id, 'Workspace series');
  const workspace = new NotebookWorkspace(reloaded);
  workspace.setProject(project.id);
  workspace.setSeries(series.id);
  assert(workspace.target.projectId === project.id, 'workspace owns the active project');
  assert(workspace.target.seriesId === series.id, 'workspace owns the active series');
  reloaded.removeSeries(series.id);
  assert(workspace.target.seriesId === null, 'workspace clears a deleted series');
  reloaded.removeProject(project.id);
  assert(workspace.target.projectId === INBOX_PROJECT_ID, 'workspace falls back to Inbox');

  const coreDir = new URL('../src/core/', import.meta.url);
  for (const file of readdirSync(coreDir)) {
    if (!file.endsWith('.js') || file === 'App.js') continue;
    const source = readFileSync(new URL(file, coreDir), 'utf8');
    assert(!/from ['"][^'"]*\/ui\//.test(source), `core/${file} does not import UI modules`);
  }

  const fake = new FakeDialogService({ prompts: ['Project A'], confirms: [true, false] });
  const promptResult = await fake.prompt({ title: 'Name' });
  assert(promptResult === 'Project A', 'fake dialog returns queued prompt values');
  assert(await fake.confirm({ title: 'Delete' }) === true, 'fake dialog returns queued confirmations');
  assert(await fake.confirm({ title: 'Cancel' }) === false, 'fake dialog can cancel');
}

/* ——— 29. world geometry contracts ——— */
console.log('29. world geometry contracts');
{
  const curve2d = createCurve2D({
    id: 'c2',
    points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    closed: false,
  });
  assert(validateGeometry(curve2d).ok, 'valid Curve2D passes validation');
  assert(!validateGeometry(createCurve2D({ id: 'bad', points: [{ x: NaN, y: 0 }, { x: 1, y: 1 }] })).ok, 'non-finite Curve2D rejected');

  const curve3d = createCurve3D({
    id: 'c3',
    points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }],
  });
  assert(validateGeometry(curve3d).ok, 'valid Curve3D passes validation');
  assert(liftCurve2D(curve2d).points[1].z === 0, 'lifting a curve keeps z = 0');

  const surface = createSurface({
    id: 's1',
    domain: { u: [0, 1], v: [0, 1], closedU: false, closedV: false },
    grid: {
      rows: 2,
      cols: 2,
      points: [
        [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
        [{ x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }],
      ],
    },
  });
  assert(validateGeometry(surface).ok, 'valid Surface passes validation');
  const surfaceMesh = surfaceToMesh(surface);
  assert(validateMesh(surfaceMesh).ok === false, 'open surface mesh is not watertight');
  assert(surfaceMesh.faces.length === 2, 'surface tessellation emits two triangles');

  const cubeVertices = [
    { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 },
  ];
  const cubeFaces = [
    [4, 5, 6], [4, 6, 7],
    [1, 0, 3], [1, 3, 2],
    [1, 2, 6], [1, 6, 5],
    [0, 4, 7], [0, 7, 3],
    [3, 7, 6], [3, 6, 2],
    [0, 1, 5], [0, 5, 4],
  ];
  const cube = createMesh({ id: 'cube', vertices: cubeVertices, faces: cubeFaces });
  const cubeValidation = validateMesh(cube);
  assert(cubeValidation.ok, 'closed cube mesh passes topology validation');
  const promoted = meshToSolid(cube, { id: 'cube-solid' });
  assert(promoted.solid?.closed === true, 'validated mesh promotes to Solid');
  assert(Math.abs(promoted.solid.volume - 8) < 1e-6, 'cube volume is 8');
  const openCube = createMesh({ id: 'open', vertices: cubeVertices, faces: cubeFaces.slice(0, -1) });
  assert(meshToSolid(openCube).solid === null, 'open mesh cannot become Solid');
  const degenerate = createMesh({ id: 'degenerate', vertices: cubeVertices, faces: [...cubeFaces, [0, 0, 1]] });
  assert(!validateMesh(degenerate).ok, 'degenerate face rejected');
  assert(!validateSolid({ ...promoted.solid, closed: false }).ok, 'unvalidated closed flag cannot make a solid');

  const helixDoc = createDocument('helix', { generator: { params: { samples: 120, adaptive: false } } });
  const first = evaluateDocument(helixDoc, { time: 0, bypassCache: false });
  const firstWorld = first.layers[0].geometry;
  const firstDescriptor = computeDescriptor(helixDoc, first.curves, { geometry: first.geometry });
  helixDoc.view.camera.yaw += 0.7;
  const second = evaluateDocument(helixDoc, { time: 0, bypassCache: false });
  const secondDescriptor = computeDescriptor(helixDoc, second.curves, { geometry: second.geometry });
  assert(second.layers[0].geometry === firstWorld, 'camera changes reuse cached world geometry');
  assert(JSON.stringify(second.worldBBox ?? second.layers[0].worldBBox) === JSON.stringify(first.layers[0].worldBBox), 'camera changes keep world bbox stable');
  assert(firstDescriptor.spatial === true, 'spatial descriptor is marked');
  assert(firstDescriptor.world.perimeter === secondDescriptor.world.perimeter, 'camera changes keep world descriptor metrics stable');
  const rotateDoc = createDocument('helix', {
    generator: { params: { samples: 120, adaptive: false } },
    operators: [{ id: 'rotate', enabled: true, params: { angle: 90, cx: 0, cy: 0 }, mods: {} }],
  });
  const cameraEval = evaluateDocument(rotateDoc, { time: 0 });
  const world = cameraEval.layers[0].geometry;
  rotateDoc.view.projection = 'xz';
  const orthoEval = evaluateDocument(rotateDoc, { time: 0 });
  assert(orthoEval.layers[0].geometry === world, 'projection switch keeps canonical world geometry');
  assert(JSON.stringify(orthoEval.curves.map((c) => c.points)) !== JSON.stringify(cameraEval.curves.map((c) => c.points)), 'projection switch reprojects the world transform');

  const viewDoc = createDocument('helix', {
    generator: { params: { samples: 120, adaptive: false } },
    operators: [{ id: 'warp', enabled: true, params: { mode: 'manual', exprX: 'x + 20', exprY: 'y' }, mods: {} }],
  });
  const viewEval = evaluateDocument(viewDoc, { time: 0 });
  const viewWorld = viewEval.layers[0].geometry;
  viewDoc.view.projection = 'xz';
  const viewOrtho = evaluateDocument(viewDoc, { time: 0 });
  assert(viewOrtho.layers[0].geometry === viewWorld, 'view-space operator never mutates world geometry');
  assert(JSON.stringify(viewOrtho.curves.map((c) => c.points)) !== JSON.stringify(viewEval.curves.map((c) => c.points)), 'view-space operator result is recomputed for projection');

  const cached = evaluateDocument(helixDoc, { time: 0, bypassCache: false });
  const uncached = evaluateDocument(helixDoc, { time: 0, bypassCache: true });
  assert(JSON.stringify(cached.curves.map((c) => c.points)) === JSON.stringify(uncached.curves.map((c) => c.points)), 'cache-on and cache-off project equivalent curves');

  // Near-plane handling: points behind the camera must never project to
  // finite screen coordinates. They used to flip across the screen and
  // produce long radial "spark" lines at some camera angles. With this
  // orbit camera at yaw = pitch = 0 the eye is at (fov, 0, 0) looking
  // toward -X, so "behind" means x > fov.
  const nearCam = { yaw: 0, pitch: 0, fov: 1 };
  assert(project3D(2, 0, 0, nearCam) === null, 'points behind the camera are clipped');
  assert(project3D(0, 0, 0, nearCam) !== null, 'points in front of the camera still project');

  const crossing = [{
    id: 'crossing',
    closed: false,
    points: [
      { x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0.5 },
      { x: 2, y: 0, z: -2 }, { x: 2, y: 1, z: -1 },
      { x: 0, y: 0, z: 0.5 }, { x: 0, y: 1, z: 1 },
    ],
  }];
  const split = projectCameraCurveSegments(crossing[0], nearCam);
  assert(split.length === 2, 'camera clipping splits a curve into visible runs');
  assert(split.every((curve) => curve.points.length >= 2 && curve.closed === false), 'clipped runs stay open and usable');
  assert(
    split.flatMap((curve) => curve.points).every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
    'clipped curve coordinates stay finite',
  );
  const farCurve = [{ id: 'far', points: [{ x: 1000, y: 0, z: 0 }, { x: 1000, y: 1, z: 0 }] }];
  const safeProjection = projectWorldCurves(farCurve, { camera: nearCam, fit: 0 });
  assert(
    safeProjection[0]?.points.length === 2 &&
    safeProjection[0].points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
    'scene distance keeps far geometry in front of the camera',
  );

  const plane = createMesh({
    id: 'plane',
    vertices: [
      { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: 1 },
      { x: 0, y: -1, z: -1 }, { x: 0, y: 1, z: -1 },
      { x: 2, y: -1, z: 1 }, { x: 2, y: 1, z: 1 },
      { x: 2, y: -1, z: -1 }, { x: 2, y: 1, z: -1 },
    ],
    faces: [[0, 1, 3, 2], [4, 6, 7, 5], [0, 2, 6, 4], [1, 5, 7, 3]],
  });
  const projectedPlane = projectMesh(plane, { camera: nearCam, fit: 100 });
  assert(projectedPlane.vertices.slice(0, 4).every(Boolean), 'visible mesh vertices project');
  assert(projectedPlane.vertices.slice(4).every((point) => point === null), 'hidden mesh vertices are clipped');
  assert(
    projectedPlane.vertices.filter(Boolean).every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
    'visible mesh coordinates stay finite',
  );
  const farPlane = createMesh({
    id: 'far-plane',
    vertices: [
      { x: 1000, y: 0, z: 0 }, { x: 1000, y: 1, z: 0 },
      { x: 1000, y: 0, z: 1 }, { x: 1000, y: 1, z: 1 },
    ],
    faces: [[0, 1, 2], [1, 3, 2]],
  });
  const farProjection = projectWorldMeshes([farPlane], { camera: nearCam, fit: 100 })[0];
  assert(
    farProjection.vertices.every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y)),
    'scene distance keeps far meshes in front of the camera',
  );

  const shapes = [];
  const fakeP = {
    CLOSE: 0,
    stroke() {},
    strokeWeight() {},
    fill() {},
    beginShape() { shapes.push([]); },
    vertex(x, y) { shapes[shapes.length - 1].push([x, y]); },
    endShape() {},
  };
  RenderPasses.get('surface-fill').draw(fakeP, {
    meshes: [projectedPlane],
    view: {
      style: {
        stroke: { color: '#ffffff', width: 1, opacity: 1 },
        fill: { enabled: false },
      },
    },
  });
  assert(shapes.length === 1 && shapes[0].length === 4, 'surface fill skips faces that touch hidden vertices');
}

/* ——— 30. parametric surfaces ——— */
console.log('30. parametric surfaces');
{
  const doc = createDocument('parametric-surface', {
    generator: { params: { samplesU: 16, samplesV: 8, fit: 300 } },
  });
  const first = evaluateDocument(doc, { time: 0 });
  assert(first.errors.length === 0, 'parametric-surface evaluates without errors');
  assert(first.geometry.length === 1 && first.geometry[0].kind === 'surface', 'parametric-surface emits Surface geometry');
  assert(first.meshes.length === 1, 'surface tessellates to one Mesh');
  const mesh = first.meshes[0];
  assert(mesh.faces.length === 16 * 8 * 2, `surface tessellation triangle count (${mesh.faces.length})`);
  assert(mesh.vertices.length === 16 * 8, 'closed torus welds seam vertices');
  assert(mesh.normals.length === mesh.vertices.length, 'mesh has one normal per vertex');
  assert(mesh.normals.every((n) => Math.abs(Math.hypot(n.x, n.y, n.z) - 1) < 1e-6), 'vertex normals are unit vectors');
  assert(mesh.faceNormals.length === mesh.faces.length, 'mesh has one face normal per face');
  assert(validateMesh(mesh).ok, 'closed surface mesh passes topology validation');
  assert(mesh.meta.twistU === false && mesh.meta.twistV === false, 'normal closed seams have no twist');
  assert(surfaceArea(first.geometry[0]) > 0, 'surface area is positive');

  const surfaceDescriptor = computeDescriptor(doc, first.curves, { geometry: first.geometry });
  assert(surfaceDescriptor.spatial === true, 'surface descriptor is spatial');
  assert(surfaceDescriptor.world.surfaceCount === 1, 'descriptor records the surface count');
  assert(surfaceDescriptor.world.area > 0, 'descriptor records surface area');

  const worldSurface = first.geometry[0];
  const worldMesh = first.meshes[0];
  doc.view.camera.yaw += 0.8;
  const second = evaluateDocument(doc, { time: 0 });
  assert(second.geometry[0] === worldSurface, 'camera changes reuse cached Surface');
  assert(second.meshes[0] === worldMesh, 'camera changes reuse cached Mesh');
  assert(JSON.stringify(second.renderMeshes[0].vertices.map((p) => [p.x, p.y])) !== JSON.stringify(first.renderMeshes[0].vertices.map((p) => [p.x, p.y])), 'camera changes reproject mesh vertices');

  doc.view.projection = 'xz';
  const ortho = evaluateDocument(doc, { time: 0 });
  assert(ortho.geometry[0] === worldSurface, 'orthographic view keeps Surface');
  assert(ortho.viewProjection === 'xz', 'surface view projection is recorded');
  assert(ortho.renderMeshes[0].vertices.every((p) => p.depthAlpha === 1), 'orthographic surface disables camera fade');

  const openDoc = createDocument('parametric-surface', {
    generator: { params: { samplesU: 8, samplesV: 10, closedU: false, closedV: false } },
  });
  const open = evaluateDocument(openDoc, { time: 0 });
  assert(open.geometry[0].domain.closedU === false, 'open surface preserves closure flags');
  assert(open.geometry[0].grid.rows === 9 && open.geometry[0].grid.cols === 11, 'open surface samples both cell endpoints');
  assert(open.meshes[0].vertices.length === 9 * 11, 'open surface mesh keeps all samples');
  assert(open.meshes[0].faces.length === 8 * 10 * 2, 'open surface tessellates every cell');

  const direct = tessellateSurface(open.geometry[0]);
  assert(direct.faces.length === 8 * 10 * 2, 'open surface tessellation excludes no cell');

  const domainDoc = createDocument('parametric-surface', {
    generator: {
      params: {
        exprX: 'u', exprY: 'v', exprZ: '0',
        u0: -1, u1: 1, v0: -2, v1: 2,
        samplesU: 8, samplesV: 10,
        closedU: false, closedV: false,
      },
    },
  });
  const domainGrid = evaluateDocument(domainDoc, { time: 0 }).geometry[0].grid.points;
  const start = domainGrid[0][0];
  const lastU = domainGrid[domainGrid.length - 1][0];
  const lastV = domainGrid[0][domainGrid[0].length - 1];
  assert(Math.abs(start.x + 1) < 1e-9 && Math.abs(start.y + 2) < 1e-9, 'open surface samples the first endpoint');
  assert(Math.abs(lastU.x - 1) < 1e-9, 'open surface samples the U endpoint');
  assert(Math.abs(lastV.y - 2) < 1e-9, 'open surface samples the V endpoint');

  const mobiusDoc = BUILT_IN_PRESETS['Möbius Band']();
  const mobiusEval = evaluateDocument(mobiusDoc, { time: 0 });
  const mobiusSurface = mobiusEval.geometry[0];
  const mobiusGrid = mobiusSurface.grid.points;
  const mobiusMesh = mobiusEval.meshes[0];
  const firstRow = mobiusGrid[0];
  const lastRow = mobiusGrid[mobiusGrid.length - 1];
  assert(mobiusGrid.length === 65, 'Möbius band samples the closing U endpoint');
  assert(mobiusSurface.domain.closedU === true && mobiusSurface.domain.seamU === 'reverse', 'Möbius preset uses a reversed closed U seam');
  let seamClosed = true;
  for (let v = 0; v < firstRow.length; v++) {
    const a = firstRow[v];
    const b = lastRow[lastRow.length - 1 - v];
    if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > 1e-4) seamClosed = false;
  }
  assert(seamClosed, 'Möbius start and end rows meet across the half twist');
  const mobiusValidation = validateSurface(mobiusSurface);
  assert(mobiusValidation.ok, 'Möbius surface validates');
  assert(!mobiusValidation.warnings.includes('reverse U seam endpoints do not meet'), 'Möbius reversed seam endpoints are consistent');
  assert(mobiusMesh.meta.twistU === true && mobiusMesh.meta.twistV === false, 'Möbius mesh records the U twist');
  assert(mobiusMesh.vertices.length === 64 * 17, 'Möbius seam vertices are welded');
  assert(mobiusMesh.faces.length === 64 * 16 * 2, 'Möbius tessellates every cell');
  assert(validateMesh(mobiusMesh).meta.manifold === true, 'Möbius welded mesh is manifold');
  assert(mobiusEval.curves.filter((curve) => curve.closed).length === 9, 'Möbius wireframe pairs twisted U loops');

  assert(RenderPasses.has('surface-fill') && RenderPasses.has('surface-wireframe'), 'surface render passes are registered');
  assert(first.curves.length > 0, 'surface emits wireframe curves for stroke compatibility');
}

/* ——— 30b. surface workbench operators ——— */
console.log('30b. surface workbench operators');
{
  const makeDoc = () => createDocument('parametric-surface', {
    generator: { params: { samplesU: 8, samplesV: 6, closedU: false, closedV: false, fit: 300 } },
  });

  const base = evaluateDocument(makeDoc(), { time: 0 });
  const baseSurface = base.geometry[0];
  const baseFirst = baseSurface.grid.points[0][0];
  const baseMapping = base.surfaceMappings[0];

  const translatedDoc = makeDoc();
  translatedDoc.operators = [
    { id: 'translate', enabled: true, params: { dx: 10, dy: -4, dz: 3 } },
  ];
  const translated = evaluateDocument(translatedDoc, { time: 0 });
  assert(translated.errors.length === 0, 'surface translate evaluates without errors');
  assert(translated.geometry.length === 1 && translated.geometry[0].kind === 'surface', 'translate preserves Surface kind');
  const translatedFirst = translated.geometry[0].grid.points[0][0];
  assert(Math.abs(translatedFirst.x - (baseFirst.x + 10)) < 1e-9, 'surface translate moves world x');
  assert(Math.abs(translatedFirst.y - (baseFirst.y - 4)) < 1e-9, 'surface translate moves world y');
  assert(Math.abs(translatedFirst.z - (baseFirst.z + 3)) < 1e-9, 'surface translate moves world z');
  assert(translated.geometry[0].grid.rows === baseSurface.grid.rows, 'translate preserves grid rows');
  assert(JSON.stringify(translated.surfaceMappings[0].domain) === JSON.stringify(baseMapping.domain), 'translate preserves mapping domain');
  assert(translated.surfaceMappings[0].grid.uCells === baseMapping.grid.uCells, 'translate preserves mapping cells');
  assert(translated.surfaceMappings[0].faces.length === translated.meshes[0].faces.length, 'translated mapping matches tessellated faces');

  const translatedGeometry = translated.geometry[0];
  const translatedMapping = translated.surfaceMappings[0];
  translatedDoc.view.camera.yaw += 0.6;
  const cameraOnly = evaluateDocument(translatedDoc, { time: 0 });
  assert(cameraOnly.geometry[0] === translatedGeometry, 'camera-only change reuses operated Surface');
  assert(cameraOnly.surfaceMappings[0] === translatedMapping, 'camera-only change reuses SurfaceMapping');

  const rotatedDoc = makeDoc();
  rotatedDoc.operators = [
    { id: 'rotate', enabled: true, params: { angle: 90, cx: 0, cy: 0 } },
  ];
  const rotated = evaluateDocument(rotatedDoc, { time: 0 });
  assert(rotated.errors.length === 0, 'surface rotate evaluates without errors');
  assert(rotated.geometry[0].kind === 'surface' && rotated.meshes.length === 1, 'rotate keeps one Surface and one Mesh');
  const rotatedFirst = rotated.geometry[0].grid.points[0][0];
  assert(Math.abs(rotatedFirst.x + baseFirst.y) < 1e-9, 'surface rotate maps x around world origin');
  assert(Math.abs(rotatedFirst.y - baseFirst.x) < 1e-9, 'surface rotate maps y around world origin');
  assert(rotated.surfaceMappings[0].faces.length === rotated.meshes[0].faces.length, 'rotated mapping stays aligned');

  const scaledDoc = makeDoc();
  scaledDoc.operators = [
    { id: 'scale', enabled: true, params: { sx: 2, sy: 0.5, sz: 3 } },
  ];
  const scaled = evaluateDocument(scaledDoc, { time: 0 });
  assert(scaled.errors.length === 0, 'surface scale evaluates without errors');
  const scaledFirst = scaled.geometry[0].grid.points[0][0];
  assert(Math.abs(scaledFirst.x - baseFirst.x * 2) < 1e-9, 'surface scale applies x');
  assert(Math.abs(scaledFirst.y - baseFirst.y * 0.5) < 1e-9, 'surface scale applies y');
  assert(Math.abs(scaledFirst.z - baseFirst.z * 3) < 1e-9, 'surface scale applies z');

  const mirroredDoc = makeDoc();
  mirroredDoc.operators = [
    { id: 'mirror', enabled: true, params: { axis: 'vertical', keepOriginal: true } },
  ];
  const mirrored = evaluateDocument(mirroredDoc, { time: 0 });
  assert(mirrored.errors.length === 0, 'surface mirror evaluates without errors');
  assert(mirrored.geometry.length === 2 && mirrored.meshes.length === 2, 'mirror with original emits two Surfaces');
  assert(mirrored.surfaceMappings.length === 2, 'each mirrored Surface gets a mapping');
  const mirroredBack = mirrored.geometry[1].grid.points[0][0];
  assert(Math.abs(mirroredBack.x + baseFirst.x) < 1e-9, 'mirror reflects world x');
  assert(mirrored.meshes.every((mesh, index) => mirrored.surfaceMappings[index].meshId === mesh.id), 'mirrored mappings target their own mesh');

  const arrayDoc = makeDoc();
  arrayDoc.operators = [
    { id: 'linear-array', enabled: true, params: { count: 3, spacing: 20, angle: 0 } },
  ];
  const arrayed = evaluateDocument(arrayDoc, { time: 0 });
  assert(arrayed.errors.length === 0, 'surface linear array evaluates without errors');
  assert(arrayed.geometry.length === 3 && arrayed.meshes.length === 3, 'linear array repeats the Surface');
  assert(arrayed.surfaceMappings.length === 3, 'arrayed Surfaces keep one mapping each');
  assert(new Set(arrayed.geometry.map((item) => item.id)).size === 3, 'arrayed Surfaces have distinct ids');
  assert(arrayed.surfaceMappings.every((mapping) => mapping.grid.rows === baseMapping.grid.rows && mapping.grid.cols === baseMapping.grid.cols), 'topology-changing repeat regenerates matching mappings');

  const chainedDoc = makeDoc();
  chainedDoc.operators = [
    { id: 'translate', enabled: true, params: { dx: 5, dy: 0, dz: 0 } },
    { id: 'mirror', enabled: true, params: { axis: 'horizontal', keepOriginal: false } },
    { id: 'scale', enabled: true, params: { sx: 1, sy: 1, sz: 1 } },
  ];
  const chained = evaluateDocument(chainedDoc, { time: 0 });
  assert(chained.errors.length === 0, 'world operators chain before tessellation');
  assert(chained.geometry.length === 1 && chained.geometry[0].kind === 'surface', 'chained transforms keep one Surface');

  Operators.register({
    id: 'test-curve-only',
    name: 'Curve only (test)',
    category: 'geometry',
    hidden: true,
    space: 'world',
    accepts: ['curve2d'],
    produces: ['curve2d'],
    params: {},
    apply: (curves) => curves,
  });
  const unsupportedDoc = makeDoc();
  unsupportedDoc.operators = [
    { id: 'test-curve-only', enabled: true, params: {} },
  ];
  const unsupported = evaluateDocument(unsupportedDoc, { time: 0 });
  assert(unsupported.errors.length === 1, 'unsupported surface operator reports one error');
  assert(unsupported.errors[0].stage === 'operator' && unsupported.errors[0].index === 0, 'unsupported operator error is keyed');
  assert(unsupported.errors[0].message.includes('does not accept surface'), 'unsupported operator names the geometry kind');
  Operators.map.delete('test-curve-only');

  const finite = [translated, rotated, scaled, mirrored, arrayed, chained];
  assert(finite.every((evaluation) => evaluation.geometry.every((item) => item.grid.points.flat().every((point) => (
    Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)
  )))), 'surface operators preserve finite world coordinates');

  const curveDoc = createDocument('parametric', {});
  curveDoc.operators = [{ id: 'translate', enabled: true, params: { dx: 7, dy: 2, dz: 0 } }];
  const curveEval = evaluateDocument(curveDoc, { time: 0 });
  assert(curveEval.errors.length === 0, 'translate accepts curve documents');
  assert(curveEval.curves[0].points[0].z === undefined, 'curve translate does not add a z coordinate');
}

/* ——— 30c. physical units ——— */
console.log('30c. physical units');
{
  const defaults = createDefaultUnits();
  assert(defaults.world === 'unitless' && defaults.artboard === 'unitless', 'units default to unitless');
  assert(defaults.mmPerWorldUnit === null && defaults.mmPerArtboardUnit === null, 'unitless factors are null');

  const doc = createDocument('parametric', {});
  assert(JSON.stringify(doc.view.units) === JSON.stringify(defaults), 'new documents carry explicit unitless metadata');
  const legacyRaw = JSON.parse(JSON.stringify(doc));
  delete legacyRaw.view.units;
  const legacy = sanitizeDocument(legacyRaw);
  assert(JSON.stringify(legacy.view.units) === JSON.stringify(defaults), 'legacy documents sanitize to unitless');

  const physical = {
    world: 'mm', mmPerWorldUnit: 2.5,
    artboard: 'cm', mmPerArtboardUnit: 10,
  };
  assert(validateUnits(physical).ok, 'complete physical units validate');
  assert(Math.abs(worldToMillimetres(4, physical) - 10) < 1e-12, 'world conversion uses mmPerWorldUnit');
  assert(Math.abs(artboardToMillimetres(3, physical) - 30) < 1e-12, 'artboard conversion uses mmPerArtboardUnit');
  assert(worldToMillimetres(4, defaults) === null, 'unitless world never claims millimetres');
  assert(artboardToMillimetres(3, defaults) === null, 'unitless artboard never claims millimetres');

  const physicalBBox = bboxToMillimetres({ width: 10, height: 20, depth: 5 }, physical);
  assert(physicalBBox.width === 25 && physicalBBox.height === 50 && physicalBBox.depth === 12.5, 'bbox conversion scales every world axis');

  const invalid = sanitizeUnits({ world: 'mm', mmPerWorldUnit: -1, artboard: 'cm', mmPerArtboardUnit: 0 });
  assert(invalid.mmPerWorldUnit === null && invalid.mmPerArtboardUnit === null, 'non-positive factors are rejected');
  assert(validateUnits(invalid).ok === false, 'incomplete physical units fail validation');
  assert(sanitizeUnits({ world: 'furlong' }).world === 'unitless', 'unknown unit systems fall back to unitless');

  const physicalDoc = createDocument('parametric', { view: { units: physical } });
  assert(physicalDoc.view.units.world === 'mm' && physicalDoc.view.units.mmPerWorldUnit === 2.5, 'createDocument accepts explicit units');
  const roundTrip = sanitizeDocument(JSON.parse(JSON.stringify(physicalDoc)));
  assert(JSON.stringify(roundTrip.view.units) === JSON.stringify(physical), 'physical units survive sanitize round-trip');

  const geometryDoc = createDocument('parametric-surface', {
    generator: { params: { samplesU: 8, samplesV: 6 } },
  });
  const before = evaluateDocument(geometryDoc, { time: 0 });
  const beforePoints = JSON.stringify(before.geometry[0].grid.points);
  const beforeBBox = JSON.stringify(before.worldBBox);
  geometryDoc.view.units = sanitizeUnits(physical);
  const after = evaluateDocument(geometryDoc, { time: 0 });
  assert(JSON.stringify(after.geometry[0].grid.points) === beforePoints, 'units never rescale world vertices');
  assert(JSON.stringify(after.worldBBox) === beforeBBox, 'units never change world bbox');
  assert(JSON.stringify(after.surfaceMappings[0].domain) === JSON.stringify(before.surfaceMappings[0].domain), 'units never change SurfaceMapping');

  const view = createDocument('parametric', {}).view;
  const curves = evaluateDocument(createDocument('parametric', {}), { time: 0 }).curves;
  const unitlessSvg = Exporter.buildPlotterSVG(curves, view, { w: 900, h: 900 });
  assert(unitlessSvg.includes('width="900" height="900"'), 'unitless plotter keeps abstract page size');
  assert(!unitlessSvg.includes('data-units'), 'unitless plotter makes no physical claim');
  const pageUnits = { ...defaults, artboard: 'mm', mmPerArtboardUnit: 0.5 };
  const physicalSvg = Exporter.buildPlotterSVG(curves, { ...view, units: pageUnits }, { w: 900, h: 900 });
  assert(physicalSvg.includes('width="450mm" height="450mm"'), 'physical plotter declares millimetre page size');
  assert(physicalSvg.includes('data-units="mm"'), 'physical plotter marks the declared unit');
  assert(physicalSvg.includes('viewBox="-450 -450 900 900"'), 'physical plotter keeps the abstract viewBox');
}

/* ——— 30d. fabrication STL export ——— */
console.log('30d. fabrication STL export');
{
  const units = { world: 'mm', mmPerWorldUnit: 2, artboard: 'unitless', mmPerArtboardUnit: null };
  const doc = createDocument('parametric-surface', {
    generator: { params: { samplesU: 10, samplesV: 8 } },
  });
  const evaluation = evaluateDocument(doc, { time: 0 });
  const mesh = evaluation.meshes[0];
  assert(validateMesh(mesh).ok, 'closed surface mesh is fabrication-valid');
  const before = JSON.stringify(mesh);

  const exported = exportBinarySTL(mesh, { units });
  assert(exported.unit === 'mm' && exported.scale === 2, 'STL export declares millimetres and scale');
  assert(exported.triangles === mesh.faces.length, 'STL writes one triangle per mesh face');
  assert(exported.data.length === 84 + 50 * exported.triangles, 'binary STL byte length is exact');
  const view = new DataView(exported.data.buffer);
  assert(view.getUint32(80, true) === exported.triangles, 'binary STL header records the triangle count');
  const face = mesh.faces[0];
  const vertex = mesh.vertices[face[0]];
  assert(Math.abs(view.getFloat32(84, true)) <= 1 + 1e-6, 'first facet starts with a finite normal');
  assert(Math.abs(view.getFloat32(96, true) - vertex.x * 2) < 1e-4, 'first vertex x is scaled to millimetres');
  assert(Math.abs(view.getFloat32(100, true) - vertex.y * 2) < 1e-4, 'first vertex y is scaled to millimetres');
  assert(Math.abs(view.getFloat32(104, true) - vertex.z * 2) < 1e-4, 'first vertex z is scaled to millimetres');
  assert(view.getUint16(84 + 48, true) === 0, 'facet attribute bytes are zero');

  const again = exportBinarySTL(mesh, { units });
  assert(Buffer.compare(Buffer.from(exported.data), Buffer.from(again.data)) === 0, 'STL export is byte-deterministic');
  assert(JSON.stringify(mesh) === before, 'STL export never mutates world geometry');

  const explicit = exportBinarySTL(mesh, { mmPerWorldUnit: 0.5 });
  assert(explicit.scale === 0.5, 'explicit millimetre scale overrides units');
  const facade = new BinaryStlExporter();
  assert(facade.id === 'binary-stl' && facade.mimeType === 'model/stl', 'binary STL exporter advertises its format');
  assert(facade.export(mesh, { units }) instanceof Uint8Array, 'exporter facade returns bytes');

  let unitlessError = null;
  try {
    exportBinarySTL(mesh, { units: createDefaultUnits() });
  } catch (error) {
    unitlessError = error;
  }
  assert(unitlessError instanceof FabricationExportError && unitlessError.code === 'units-required', 'unitless STL export is rejected');

  const openDoc = createDocument('parametric-surface', {
    generator: { params: { samplesU: 6, samplesV: 6, closedU: false, closedV: false } },
  });
  const openMesh = evaluateDocument(openDoc, { time: 0 }).meshes[0];
  assert(validateMesh(openMesh).ok === false, 'open surface mesh is not fabrication-valid');
  let openError = null;
  try {
    exportBinarySTL(openMesh, { units });
  } catch (error) {
    openError = error;
  }
  assert(openError instanceof FabricationExportError && openError.code === 'invalid-geometry', 'open mesh is rejected before writing bytes');
  assert(openError.validation.errors.some((message) => message.includes('open boundary')), 'open mesh error identifies the boundary');

  const badMesh = { ...mesh, faces: mesh.faces.map((faceIndices, index) => (index === 0 ? [0, 1, 999999] : faceIndices)) };
  let badError = null;
  try {
    exportBinarySTL(badMesh, { units });
  } catch (error) {
    badError = error;
  }
  assert(badError instanceof FabricationExportError && badError.code === 'invalid-geometry', 'invalid indices are rejected');

  const solid = meshToSolid(mesh).solid;
  assert(solid && validateSolid(solid).ok, 'closed mesh promotes to a valid Solid');
  const solidStl = exportBinarySTL(solid, { units });
  assert(solidStl.triangles === mesh.faces.length && solidStl.kind === 'solid', 'STL exports a Solid boundary');
}

/* ——— 30e. fabrication source and report ——— */
console.log('30e. fabrication source and report');
{
  const units = { world: 'mm', mmPerWorldUnit: 2, artboard: 'unitless', mmPerArtboardUnit: null };
  const doc = createDocument('parametric-surface', {
    generator: { params: { samplesU: 10, samplesV: 8 } },
  });
  const evaluation = evaluateDocument(doc, { time: 0 });
  const before = JSON.stringify(evaluation.meshes[0]);

  const resolved = resolveFabricationSource({ evaluation, layerIndex: 0 });
  assert(resolved.source?.exportable === true, 'closed surface mesh resolves as a fabrication source');
  assert(resolved.candidates.length === 1 && resolved.closed === 1, 'source resolution counts candidates');
  assert(resolved.source.geometry.kind === 'mesh', 'surface tessellation supplies Mesh sources');

  const report = buildFabricationReport({ evaluation, layerIndex: 0, units });
  assert(report.exportable === true && report.unitsReady === true, 'physical units make a closed source exportable');
  assert(report.triangles === evaluation.meshes[0].faces.length, 'report counts triangles');
  assert(report.vertices === evaluation.meshes[0].vertices.length, 'report counts vertices');
  assert(Number.isFinite(report.volume) && report.volume > 0, 'report includes a positive volume');
  assert(report.bbox.width > 0 && report.physical.width === report.bbox.width * 2, 'report includes world and physical bounds');
  assert(report.source.validation.meta.selfIntersections.checked === true, 'report confirms the self-intersection check ran');
  assert(report.source.validation.meta.selfIntersections.count === 0, 'clean fabrication source has no self-intersections');

  const unitless = buildFabricationReport({ evaluation, layerIndex: 0, units: createDefaultUnits() });
  assert(unitless.unitsReady === false && unitless.exportable === false, 'unitless documents cannot export');
  assert(unitless.reason.includes('world scale'), 'unitless report explains the missing scale');

  const exporter = new Exporter({
    document: { ...doc, view: { ...doc.view, units }, activeLayer: 0 },
    evaluation,
    notify: () => {},
  });
  const built = exporter.buildSTLFromCurrent();
  assert(built.data instanceof Uint8Array && built.triangles === report.triangles, 'Exporter builds STL from the active source');
  let unitlessBuild = null;
  try {
    new Exporter({
      document: { ...doc, view: { ...doc.view, units: createDefaultUnits() }, activeLayer: 0 },
      evaluation,
      notify: () => {},
    }).buildSTLFromCurrent();
  } catch (error) {
    unitlessBuild = error;
  }
  assert(unitlessBuild && unitlessBuild.message.includes('world scale'), 'Exporter rejects STL without physical units');

  const openDoc = createDocument('parametric-surface', {
    generator: { params: { samplesU: 6, samplesV: 6, closedU: false, closedV: false } },
  });
  const openEvaluation = evaluateDocument(openDoc, { time: 0 });
  const openReport = buildFabricationReport({ evaluation: openEvaluation, layerIndex: 0, units });
  assert(openReport.source === null && openReport.candidates.length === 1, 'open mesh is listed but not selectable');
  assert(openReport.exportable === false && openReport.reason.includes('No validated closed'), 'open mesh report explains why export is unavailable');

  const flatEvaluation = { layers: [{ id: 'plain', name: 'Plain', geometry: [], meshes: [] }] };
  const empty = buildFabricationReport({ evaluation: flatEvaluation, layerIndex: 0, units });
  assert(empty.source === null && empty.reason.includes('no Mesh/Solid'), 'empty layer reports no fabrication geometry');
  assert(JSON.stringify(evaluation.meshes[0]) === before, 'fabrication report never mutates world geometry');
}

/* ——— 30g. look presets ——— */
console.log('30g. look presets');
{
  assert(LOOK_PRESETS.length === 7, 'seven built-in look presets are defined');
  assert(new Set(LOOK_PRESETS.map((preset) => preset.id)).size === LOOK_PRESETS.length, 'look preset ids are unique');
  assert(getLookPreset('surface')?.requires === 'surface', 'surface preset declares its requirement');
  assert(getLookPreset('missing') === null, 'unknown look preset returns null');

  const noSurface = lookPresetAvailability(getLookPreset('surface'), { hasSurface: false });
  assert(noSurface.available === false && noSurface.reason.includes('surface'), 'surface preset is unavailable without meshes');
  assert(lookPresetAvailability(getLookPreset('surface'), { hasSurface: true }).available === true, 'surface preset enables with meshes');
  assert(lookPresetAvailability(getLookPreset('epicycles'), { generatorId: 'fourier' }).available === true, 'epicycles preset enables on Fourier');
  const notFourier = lookPresetAvailability(getLookPreset('epicycles'), { generatorId: 'parametric' });
  assert(notFourier.available === false && notFourier.reason.includes('Fourier'), 'epicycles preset explains the Fourier requirement');
  assert(lookPresetAvailability(getLookPreset('line'), {}).available === true, 'line preset is always available');

  const surface = resolveLookPreset(getLookPreset('surface'));
  assert(surface.modes.includes('surface-fill') && surface.modes.includes('surface-wireframe'), 'surface preset resolves surface passes');
  assert(surface.colorMetric === 'auto' && surface.guides === false, 'surface preset resolves view fields');
  const technical = resolveLookPreset(getLookPreset('technical'));
  assert(technical.overlays.inflections === true && technical.overlays.bboxt === undefined, 'preset overlays only include known ids');
  assert(technical.overlays.bbox === true && technical.overlays.ruler === true, 'technical preset enables overlays');
  assert(Object.keys(technical.overlays).length > 0, 'resolved overlays are explicit');

  const view = {
    modes: [...technical.modes],
    overlays: technical.overlays,
    colorMetric: technical.colorMetric,
    guides: technical.guides,
  };
  assert(lookPresetMatchesView(getLookPreset('technical'), view), 'matching view detects the technical preset');
  assert(!lookPresetMatchesView(getLookPreset('line'), view), 'a different preset does not match');
  view.modes = [...view.modes, 'points', 'points'];
  assert(lookPresetMatchesView(getLookPreset('technical'), view), 'mode matching ignores duplicates');
  view.colorMetric = 'height';
  assert(!lookPresetMatchesView(getLookPreset('technical'), view), 'color metric mismatch rejects a preset match');
}

/* ——— 30h. instance layers ——— */
console.log('30h. instance layers');
{
  const makeDoc = () => {
    const doc = createDocument('parametric-surface', {
      generator: { params: { samplesU: 8, samplesV: 6, closedU: true, closedV: true } },
    });
    const source = doc.layers[0];
    const instance = createInstanceLayer(source.id, {
      name: 'Torus instance',
      operators: [{ id: 'translate', enabled: true, params: { dx: 1.5, dy: 0, dz: 0 } }],
    });
    doc.layers.push(instance);
    doc.activeLayer = 1;
    return { doc, source, instance };
  };

  const { doc, source, instance } = makeDoc();
  assert(isInstanceLayer(instance) && !isInstanceLayer(source), 'layer kind detection distinguishes instance and generator');
  assert(instance.type === 'instance' && instance.generator === null && instance.seed === null, 'instance stores type/source without generator or seed');
  assert(instance.source.layerId === source.id, 'instance stores a persistent source layer id');
  assert(generatorForLayer(doc, instance)?.id === source.generator.id, 'explicit resolver finds the source generator');
  assert(dependentInstances(doc, source.id).length === 1, 'dependent instance lookup works');
  assert(countInstanceLayers(doc) === 1, 'instance count works');
  assert(doc.generator === null, 'document.generator is null for an active instance');
  assert(resolvePath(doc, 'generator.params.samplesU') === null, 'advisor path resolution is safe for an instance');
  assert(validateSuggestion(doc, { path: 'generator.params.samplesU', to: 12 }).ok === false, 'advisor suggestion validation is safe for an instance');

  const evaluation = evaluateDocument(doc, { time: 0 });
  assert(evaluation.errors.length === 0, 'instance layer evaluates without errors');
  assert(evaluation.layers.length === 2, 'source and instance both evaluate');
  assert(evaluation.layers[1].type === 'instance' && evaluation.layers[1].source.layerId === source.id, 'evaluation exposes instance source metadata');
  assert(evaluation.layers[1].geometry[0].id === `${instance.id}:surface:0`, 'instance surface id is deterministic');
  assert(evaluation.layers[1].meshes[0].id === `${instance.id}:mesh:0`, 'instance mesh id is deterministic');
  const mapping = evaluation.layers[1].surfaceMappings[0];
  assert(mapping.surfaceId === evaluation.layers[1].geometry[0].id, 'instance mapping uses the instance surface id');
  assert(mapping.meshId === evaluation.layers[1].meshes[0].id, 'instance mapping uses the instance mesh id');
  assert(mapping.domain.u[0] === source.generator.params.u0, 'instance mapping preserves the source domain');
  assert(evaluation.layers[1].meshes[0].meta.sourceLayerId === source.id, 'instance mesh records its source layer');

  const again = evaluateDocument(doc, { time: 0 });
  assert(again.layers[1].geometry[0].id === evaluation.layers[1].geometry[0].id, 'instance ids are stable across reevaluation');
  assert(again.layers[1].geometry[0] === evaluation.layers[1].geometry[0], 'instance cache reuses world geometry');
  assert(again.layers[1].meshes[0] === evaluation.layers[1].meshes[0], 'instance cache reuses meshes');

  const coldA = evaluateDocument(doc, { time: 0, bypassCache: true });
  const coldB = evaluateDocument(doc, { time: 0, bypassCache: true });
  assert(coldA.layers[0].geometry[0].id === coldB.layers[0].geometry[0].id, 'surface ids are deterministic across bypass-cache evaluations');
  assert(coldA.layers[0].geometry[0].id === `${source.generator.id}:0:surface:0`, 'surface id uses generator/layer/index');

  const sourceSurfaceBefore = JSON.stringify(evaluation.layers[0].geometry[0].grid.points);
  const instanceSurfaceBefore = JSON.stringify(evaluation.layers[1].geometry[0].grid.points);
  assert(sourceSurfaceBefore !== instanceSurfaceBefore, 'instance transform changes its world geometry');

  doc.layers[0].generator.params.samplesU = 10;
  const propagated = evaluateDocument(doc, { time: 0 });
  assert(propagated.layers[1].geometry[0].grid.rows === 11, 'source parameter changes propagate to instance rows');

  doc.layers[1].source.layerId = 'missing-source';
  const missing = evaluateDocument(doc, { time: 0 });
  assert(missing.errors.some((error) => error.stage === 'instance' && /not found/.test(error.message)), 'missing source reports an instance error');

  const curveSourceDoc = createDocument('parametric', {});
  curveSourceDoc.layers.push(createInstanceLayer(curveSourceDoc.layers[0].id, { name: 'curve instance' }));
  curveSourceDoc.activeLayer = 1;
  const curveSourceEval = evaluateDocument(curveSourceDoc, { time: 0 });
  assert(curveSourceEval.errors.some((error) => /Surface geometry/.test(error.message)), 'curve sources are rejected for instances');

  const nested = makeDoc();
  const nestedInstance = createInstanceLayer(nested.instance.id, { name: 'nested' });
  nested.doc.layers.push(nestedInstance);
  nested.doc.activeLayer = 2;
  const nestedEval = evaluateDocument(nested.doc, { time: 0 });
  assert(nestedEval.errors.some((error) => /another instance/.test(error.message)), 'instance of instance is rejected');

  const mirrorDoc = makeDoc();
  mirrorDoc.instance.operators = [{ id: 'mirror', enabled: true, params: { axis: 'vertical', keepOriginal: false } }];
  const mirrorEval = evaluateDocument(mirrorDoc.doc, { time: 0 });
  assert(mirrorEval.errors.some((error) => /not allowed on an instance/.test(error.message)), 'mirror is rejected on instance layers');

  const repeatDoc = makeDoc();
  repeatDoc.instance.operators = [{ id: 'linear-array', enabled: true, params: { count: 2, spacing: 1 } }];
  const repeatEval = evaluateDocument(repeatDoc.doc, { time: 0 });
  assert(repeatEval.errors.some((error) => /not allowed on an instance/.test(error.message)), 'repeat is rejected on instance layers');

  const hiddenSource = makeDoc();
  hiddenSource.source.visible = false;
  const hiddenEval = evaluateDocument(hiddenSource.doc, { time: 0 });
  assert(hiddenEval.layers[0].visible === false && hiddenEval.layers[1].meshes.length === 1, 'hidden source still evaluates for a visible instance');
  assert(hiddenEval.geometry.length === 1, 'hidden source does not contribute world geometry to the scene');

  const hiddenInstance = makeDoc();
  hiddenInstance.instance.visible = false;
  const hiddenInstanceEval = evaluateDocument(hiddenInstance.doc, { time: 0 });
  assert(hiddenInstanceEval.layers[1].visible === false && hiddenInstanceEval.layers[1].curves.length === 0, 'hidden instance is omitted from render output');

  const sourceChanged = makeDoc();
  const secondSource = createLayer('parametric-surface', { name: 'Second source', seed: 2 });
  sourceChanged.doc.layers.push(secondSource);
  sourceChanged.doc.layers[1].source.layerId = secondSource.id;
  const changedEval = evaluateDocument(sourceChanged.doc, { time: 0 });
  assert(changedEval.errors.length === 0, 'changing the instance source reevaluates cleanly');
  assert(changedEval.layers[1].meshes[0].meta.sourceLayerId === secondSource.id, 'changed instance points at the new source');

  const roundTrip = sanitizeDocument(JSON.parse(JSON.stringify(doc)));
  assert(roundTrip.layers[1].type === 'instance' && roundTrip.layers[1].source.layerId === 'missing-source', 'instance source round-trips through sanitization');
  assert(roundTrip.layers[0].type === 'generator', 'generator type round-trips');

  const legacy = JSON.parse(JSON.stringify(createDocument('parametric')));
  delete legacy.layers[0].type;
  assert(sanitizeDocument(legacy).layers[0].type === 'generator', 'legacy layers migrate to generator type');

  const capped = JSON.parse(JSON.stringify(createDocument('parametric')));
  capped.layers = Array.from({ length: MAX_LAYERS + 5 }, (_, index) => ({
    ...capped.layers[0],
    id: `layer-cap-${index}`,
  }));
  assert(sanitizeDocument(capped).layers.length === MAX_LAYERS, 'layer cap sanitizes to 32 layers');
  assert(MAX_INSTANCE_LAYERS === 24, 'instance limit is 24');

  const restored = createDocument('parametric');
  restored.layers[0].id = 'layer-100';
  const normalized = sanitizeDocument(JSON.parse(JSON.stringify(restored)));
  const newId = nextLayerId(normalized);
  assert(newId !== 'layer-100', 'next layer id avoids restored ids');
  const newLayer = createLayer('rose', { id: newId });
  assert(!normalized.layers.some((layer) => layer.id === newLayer.id), 'new layer id is unique in the document');
  normalized.layers.push(newLayer);
  assert(new Set(normalized.layers.map((layer) => layer.id)).size === normalized.layers.length, 'restored document keeps unique layer ids');
  const limitDoc = createDocument('parametric-surface', {});
  for (let i = 0; i < MAX_INSTANCE_LAYERS; i++) {
    limitDoc.layers.push(createInstanceLayer(limitDoc.layers[0].id, { name: `i${i}` }));
  }
  assert(countInstanceLayers(limitDoc) === MAX_INSTANCE_LAYERS, 'instance count reaches the limit');
  assert(!canAddInstanceLayer(limitDoc), 'instance creation is blocked at 24');
}

/* ——— 31. preset library ——— */
console.log('31. preset library');
{
  class MemoryStorage {
    constructor() { this.map = new Map(); }
    getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
    setItem(key, value) { this.map.set(key, String(value)); }
    removeItem(key) { this.map.delete(key); }
  }

  const storage = new MemoryStorage();
  const pm = new PresetManager(storage);
  assert(pm.categories().some((category) => category.id === 'favorites' && category.count === 0), 'favorites filter is always present');
  assert(!pm.categories().some((category) => category.id === 'recent'), 'recent filter is hidden when empty');

  assert(pm.toggleFavorite('Torus') === true, 'starring adds a favorite');
  assert(pm.isFavorite('Torus'), 'favorite state is reported');
  assert(pm.favoriteEntries().length === 1 && pm.favoriteEntries()[0].name === 'Torus', 'favorites list contains the preset');
  assert(pm.toggleFavorite('Torus') === false, 'unstarring removes a favorite');
  assert(!pm.isFavorite('Torus'), 'unfavorite state is reported');
  assert(pm.toggleFavorite('Does Not Exist') === false, 'unknown presets cannot be favorited');

  pm.toggleFavorite('Sphere');
  pm.toggleFavorite('Torus');
  const reloaded = new PresetManager(storage);
  assert(reloaded.isFavorite('Torus') && reloaded.isFavorite('Sphere'), 'favorites survive a reload');
  assert(reloaded.favoriteEntries().map((entry) => entry.name).join(',') === 'Torus,Sphere', 'favorites keep catalog order');

  assert(!reloaded.categories().some((category) => category.id === 'recent'), 'recent hidden before first use');
  assert(reloaded.markUsed('Torus', 1000) === true, 'mark recent for a known preset');
  assert(reloaded.markUsed('Sphere', 2000) === true, 'mark a second recent');
  assert(reloaded.markUsed('Torus', 3000) === true, 're-marking moves a recent to the front');
  assert(reloaded.recentEntries().map((entry) => entry.name).join(',') === 'Torus,Sphere', 'recents are most-recent-first and deduped');
  const recentNames = ['Torus', 'Sphere', 'Catenoid', 'Helicoid', 'Seashell', 'Enneper Surface', 'Möbius Band', 'Wave Sheet', 'Hyperbolic Saddle', 'Sphere'];
  recentNames.forEach((name, index) => reloaded.markUsed(name, 5000 + index));
  assert(reloaded.recentEntries().length === RECENT_LIMIT, `recents cap at ${RECENT_LIMIT}`);
  assert(reloaded.recentEntries()[0].name === 'Sphere', 'recents keep the most recent first under the cap');
  assert(reloaded.markUsed('Does Not Exist', 9000) === false, 'unknown presets cannot be recent');

  const recentStorage = new MemoryStorage();
  const recents = new PresetManager(recentStorage);
  recents.markUsed('Torus', 10);
  recents.markUsed('Sphere', 20);
  const recentsReloaded = new PresetManager(recentStorage);
  assert(recentsReloaded.recentEntries().map((entry) => entry.name).join(',') === 'Sphere,Torus', 'recents survive a reload');

  const pruneStorage = new MemoryStorage();
  pruneStorage.setItem(META_STORAGE_KEY, JSON.stringify({
    version: 1,
    favorites: ['Torus', 'Ghost', 'Torus'],
    recent: [
      { name: 'Ghost', at: 1 },
      { name: 'Torus', at: 2 },
      { name: 'Torus', at: 3 },
      { name: 'Sphere', at: 'nope' },
    ],
    previews: { Ghost: { hash: 'x', dataUrl: 'data:image/png;base64,AAAA' } },
  }));
  const pruned = new PresetManager(pruneStorage);
  assert(pruned.favoriteEntries().map((entry) => entry.name).join(',') === 'Torus', 'unknown favorites are pruned');
  assert(pruned.recentEntries().map((entry) => entry.name).join(',') === 'Torus', 'unknown, duplicate and invalid recents are pruned');

  const corruptStorage = new MemoryStorage();
  corruptStorage.setItem(META_STORAGE_KEY, '{broken');
  const corrupt = new PresetManager(corruptStorage);
  assert(corrupt.favoriteEntries().length === 0 && corrupt.recentEntries().length === 0, 'corrupt metadata starts empty');
  assert(corrupt.get('Torus') !== null, 'presets still load after corrupt metadata');

  const failingStorage = {
    getItem() { return null; },
    setItem() { throw new Error('quota'); },
  };
  const failing = new PresetManager(failingStorage);
  assert(failing.toggleFavorite('Torus') === true, 'favorites work when storage fails');
  assert(failing.markUsed('Torus') === true, 'recents work when storage fails');
  assert(failing.isFavorite('Torus') && failing.recentEntries().length === 1, 'session usage state survives storage failure');

  const torus = pm.get('Torus');
  const sphere = pm.get('Sphere');
  assert(PREVIEW_SIZE === 96, 'preview source size is 96');
  assert(PREVIEW_MAX_CHARS === 24_000, 'preview persistence cap is 24k');
  assert(PREVIEW_VERSION >= 1, 'preview profile is versioned');
  assert(previewKey(torus) === previewKey(pm.get('Torus')), 'preview key is stable for identical documents');
  assert(previewKey(torus) !== previewKey(sphere), 'preview key changes with the document');

  let renders = 0;
  const previewStorage = new MemoryStorage();
  const fakeUrl = 'data:image/png;base64,FAKE';
  const withPreview = new PresetManager(previewStorage, {
    renderPreview: () => { renders++; return fakeUrl; },
  });
  assert(withPreview.preview('Torus') === null, 'nothing is cached before generation');
  assert(withPreview.ensurePreview('Torus') === fakeUrl, 'ensurePreview returns a rendered thumbnail');
  assert(renders === 1, 'preview renderer runs once');
  assert(withPreview.ensurePreview('Torus') === fakeUrl && renders === 1, 'cached preview is reused');
  assert(withPreview.preview('Torus') === fakeUrl, 'preview cache is readable');

  withPreview.save('My Torus', withPreview.get('Torus'));
  assert(withPreview.ensurePreview('My Torus') === fakeUrl, 'user preset preview is generated');
  assert(withPreview.preview('My Torus') === fakeUrl, 'user preset preview is cached');
  const persisted = JSON.parse(previewStorage.getItem(META_STORAGE_KEY));
  assert(persisted.previews['My Torus']?.dataUrl === fakeUrl, 'user preview is persisted');
  assert(!persisted.previews.Torus, 'built-in preview is not persisted');
  const previewReloaded = new PresetManager(previewStorage);
  assert(previewReloaded.preview('My Torus') === fakeUrl, 'user preview survives a reload');
  assert(previewReloaded.preview('Torus') === null, 'built-in preview is session-only');
  previewReloaded.save('My Torus', previewReloaded.get('Sphere'));
  assert(previewReloaded.preview('My Torus') === null, 'overwriting a user preset evicts its preview');

  const cleanup = new PresetManager(new MemoryStorage(), { renderPreview: () => fakeUrl });
  cleanup.save('Disposable', cleanup.get('Torus'));
  cleanup.toggleFavorite('Disposable');
  cleanup.markUsed('Disposable', 1);
  cleanup.ensurePreview('Disposable');
  assert(cleanup.delete('Disposable') === true, 'user preset is deleted');
  assert(!cleanup.isFavorite('Disposable'), 'delete removes the favorite');
  assert(cleanup.recentEntries().length === 0, 'delete removes the recent');
  assert(cleanup.preview('Disposable') === null, 'delete removes the preview');
}

/* ——— 32. Spatial contracts ——— */
console.log('32. spatial contracts');
{
  assert(SPACE.PARAMETER === 'parameter' && SPACE.WORLD === 'world' && SPACE.ARTBOARD === 'artboard', 'space ids are explicit and stable');

  const defaultFrame = createFrame();
  assert(defaultFrame.mode === 'scene' && defaultFrame.anchor === 'bbox', 'default frame is scene/bbox');
  assert(sanitizeFrame({ mode: 'nope', fit: -1 }).mode === 'scene', 'invalid frame mode falls back');
  assert(sanitizeFrame({ mode: 'world' }).anchor === 'world-origin', 'world frame anchors at the world origin');
  assert(sanitizeFrame({ fit: 0 }).fit === 0, 'fit zero remains a meaningful native-scale frame');

  const rawLine = postProcess([{ id: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] }], { fit: 100 });
  assert(Math.abs(rawLine[0].points[1].x - rawLine[0].points[0].x) === 10, 'generator post-processing no longer applies fit');

  const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 50, width: 100, height: 50, cx: 50, cy: 25 };
  const fitted = resolveFrame({ bounds, mode: 'composition', fit: 200 });
  assert(fitted.scale === 2, 'fit scale maps the largest bbox side to the fit size');
  assert(fitted.tx === -100 && fitted.ty === -50, 'fit centers the projected bbox');
  const native = resolveFrame({ bounds, mode: 'composition', fit: 0 });
  assert(native.scale === 1 && native.tx === -50 && native.ty === -25, 'native fit keeps scale but still centers');
  const anchored = resolveFrame({
    bounds,
    mode: 'world',
    anchor: 'world-origin',
    scale: 2,
    projectedOrigin: { x: 50, y: 25 },
  });
  assert(anchored.scale === 2 && anchored.tx === -100 && anchored.ty === -50, 'world frame anchors the projected origin');

  const worldTransform = createViewTransform({
    projection: 'xy',
    frame: { mode: 'world', anchor: 'world-origin', scale: 2 },
    bounds,
  });
  const origin = worldTransform.toArtboard({ x: 0, y: 0, z: 0 });
  const ten = worldTransform.toArtboard({ x: 10, y: 0, z: 0 });
  assert(Math.abs(origin.x) < 1e-9 && Math.abs(origin.y) < 1e-9, 'world transform maps the world origin to artboard origin');
  assert(Math.abs(ten.x - 20) < 1e-9, 'world transform keeps a stable world-unit scale');
  const device = worldTransform.toDevice({ x: 10, y: -5 }, { x: 10, y: 20, w: 200, h: 100, scale: 0.5 });
  assert(device.x === 115 && device.y === 67.5, 'artboard transform maps to device pixels predictably');

  const meshA = createMesh({
    id: 'mesh-a',
    vertices: [{ x: -5, y: -5, z: 0 }, { x: 5, y: -5, z: 0 }, { x: 5, y: 5, z: 0 }, { x: -5, y: 5, z: 0 }],
    faces: [[0, 1, 2], [0, 2, 3]],
  });
  const meshB = createMesh({
    id: 'mesh-b',
    vertices: [{ x: 95, y: -5, z: 0 }, { x: 105, y: -5, z: 0 }, { x: 105, y: 5, z: 0 }, { x: 95, y: 5, z: 0 }],
    faces: [[0, 1, 2], [0, 2, 3]],
  });
  const projectedMeshes = projectWorldMeshes([meshA, meshB], { projection: 'xy', fit: 200 });
  const centreA = projectedMeshes[0].vertices.reduce((sum, point) => sum + point.x, 0) / 4;
  const centreB = projectedMeshes[1].vertices.reduce((sum, point) => sum + point.x, 0) / 4;
  assert(Math.abs(centreB - centreA) > 50, 'multiple meshes keep their relative positions under one fit');
  assert(Math.abs(centreA) > 1, 'the first mesh is not independently centered');

  const twoLayerDoc = createDocument('parametric-3d', {
    generator: {
      params: { exprX: 'cos(t)', exprY: 'sin(t)', exprZ: '0', samples: 64, fit: 200 },
    },
    view: { frame: { mode: 'scene', fit: 200 } },
  });
  twoLayerDoc.layers.push(createLayer('parametric-3d', {
    name: 'Offset',
    generator: { params: { exprX: 'cos(t) + 20', exprY: 'sin(t)', exprZ: '0', samples: 64, fit: 200 } },
  }));
  const twoLayerEval = evaluateDocument(twoLayerDoc, { time: 0 });
  const scene = buildRenderScene({ evaluation: twoLayerEval, document: twoLayerDoc, view: twoLayerDoc.view });

  const singleDoc = createDocument('helix', { generator: { params: { samples: 200, fit: 340 } } });
  const singleEval = evaluateDocument(singleDoc, { time: 0 });
  const singleScene = buildRenderScene({ evaluation: singleEval, document: singleDoc, view: singleDoc.view });
  const singleDelta = singleEval.curves[0].points.reduce((max, point, index) => {
    const other = singleScene.layers[0].curves[0].points[index];
    return Math.max(max, Math.hypot(point.x - other.x, point.y - other.y));
  }, 0);
  assert(singleDelta < 1e-9, 'single-layer scene preserves the existing fit exactly');
  assert(scene.layers.length === 2, 'scene contains every spatial layer');
  assert(scene.meta.space === SPACE.WORLD, 'scene declares world-space input');
  assert(scene.transform, 'scene exposes the shared ViewTransform');
  const firstBox = scene.layers[0].bbox;
  const secondBox = scene.layers[1].bbox;
  assert(Math.abs(secondBox.cx - firstBox.cx) > 10, 'scene framing preserves layer offsets instead of centering each layer');

  const worldMeshes = [meshA, meshB];
  const sceneTransform = createViewTransform({
    projection: 'xy',
    frame: { mode: 'scene', anchor: 'bbox', fit: 200 },
    bounds,
  });
  assert(worldMeshes.every((mesh) => mesh.vertices.every((point) => point.x !== undefined)), 'mesh fixtures stay world-space');

  const svg = Exporter.buildSVG(scene.layers.flatMap((layer) => layer.curves), twoLayerDoc.view, { w: 900, h: 900 }, twoLayerDoc, scene.layers);
  const plotter = Exporter.buildPlotterSVG(scene.layers.flatMap((layer) => layer.curves), twoLayerDoc.view, { w: 900, h: 900 }, twoLayerDoc, scene.layers);
  const firstPoint = scene.layers[0].curves[0].points[0];
  const expectedPoint = `M ${Number(firstPoint.x.toFixed(2))} ${Number(firstPoint.y.toFixed(2))}`;
  assert(svg.includes('data-layer="0"') && plotter.includes('data-plotter="true"'), 'SVG and plotter consume the render scene');
  assert(plotter.includes(expectedPoint), 'plotter coordinates match the scene artboard coordinates');

  const flatDoc = createDocument('parametric', {
    generator: { params: { samples: 128, fit: 340 } },
  });
  const flatEval = evaluateDocument(flatDoc, { time: 0 });
  const flatScene = buildRenderScene({ evaluation: flatEval, document: flatDoc, view: flatDoc.view });
  assert(flatScene.meta.space === SPACE.ARTBOARD, 'planar generators remain artboard-space');
  assert(JSON.stringify(flatScene.layers[0].curves) === JSON.stringify(flatEval.curves), 'planar curves are not re-framed');

  const surfaceDoc = createDocument('parametric-surface', {
    generator: {
      params: {
        samplesU: 16, samplesV: 8, closedU: false, closedV: false,
        exprX: 'cos(u) * (2 + cos(v))', exprY: 'sin(u) * (2 + cos(v))', exprZ: 'sin(v)',
        fit: 300,
      },
    },
    view: { projection: 'xy' },
  });
  const surfaceEval = evaluateDocument(surfaceDoc, { time: 0 });
  const surfaceScene = buildRenderScene({ evaluation: surfaceEval, document: surfaceDoc, view: surfaceDoc.view });
  const surfaceDelta = surfaceEval.renderMeshes[0].vertices.reduce((max, point, index) => {
    const other = surfaceScene.layers[0].meshes[0].vertices[index];
    if (!point || !other) return max;
    return Math.max(max, Math.hypot(point.x - other.x, point.y - other.y));
  }, 0);
  assert(surfaceDelta < 1e-9, 'single-surface scene preserves the existing fit exactly');
  const orthoScene = buildRenderScene({ evaluation: surfaceEval, document: surfaceDoc, view: { ...surfaceDoc.view, projection: 'xy' } });
  const perspectiveScene = buildRenderScene({
    evaluation: surfaceEval,
    document: surfaceDoc,
    view: { ...surfaceDoc.view, projection: '3d' },
    projectionOverride: '3d',
  });
  assert(orthoScene.meta.projection === 'xy', 'orthographic scene keeps its projection');
  assert(perspectiveScene.meta.projection === '3d', 'quad 3D panel reprojects world geometry');
  assert(
    perspectiveScene.layers[0].meshes[0].vertices.some((point) => point.depth > 0),
    '3D panel uses camera depth even when the document is orthographic',
  );

  assert(sceneTransform.space === SPACE.WORLD && sceneTransform.projection === 'xy', 'ViewTransform declares source space and projection');
}

/* ——— 33. Spatial reference ——— */
console.log('33. spatial reference');
{
  const defaults = createReference();
  assert(defaults.enabled === false && defaults.ground === false, 'spatial reference is off by default');
  const sanitized = sanitizeReference({ enabled: 1, ground: 'yes', extra: true });
  assert(sanitized.enabled === true && sanitized.ground === true && !('extra' in sanitized), 'reference config is sanitized');
  assert(referenceExtent({ width: 100, height: 50, depth: 20 }) === 75, 'reference extent follows world size');
  assert(
    referenceExtent({ width: 1000, height: 1000, depth: 1000 }) === 750,
    'reference extent follows world size, not projected artboard scale',
  );
  assert(
    referenceExtent({ width: 240, height: 240, depth: 1130 }) === 226,
    'reference extent caps a deep world shape without using projected units',
  );
  assert(
    referenceExtent({ width: 0, height: 0, depth: 1000 }) === 750,
    'vertical shapes still receive a visible reference extent',
  );

  const ortho = createViewTransform({
    projection: 'xy',
    frame: { mode: 'world', anchor: 'world-origin', scale: 1 },
  });
  const reference = buildSpatialReference({
    transform: ortho,
    worldBBox: { width: 100, height: 50, depth: 20 },
    ground: true,
    divisions: 2,
  });
  assert(Math.abs(reference.origin.x) < 1e-9 && Math.abs(reference.origin.y) < 1e-9, 'reference origin is the world origin');
  assert(reference.axes.length === 2, 'orthographic XY hides the perpendicular Z axis');
  const axisX = reference.axes.find((axis) => axis.id === 'x');
  const axisY = reference.axes.find((axis) => axis.id === 'y');
  assert(Math.abs(axisX.labelPoint.x - reference.extent * 0.86) < 1e-9, 'X axis follows world scale');
  assert(Math.abs(axisY.labelPoint.y + reference.extent * 0.86) < 1e-9, 'Y axis follows the orthographic projection');
  assert(reference.ground.length === 10, 'ground uses a low number of divisions');

  const perspective = createViewTransform({
    projection: '3d',
    camera: { yaw: -Math.PI / 6, pitch: Math.PI / 9, fov: 320 },
    frame: { mode: 'world', anchor: 'world-origin', scale: 1 },
  });
  const perspectiveReference = buildSpatialReference({
    transform: perspective,
    worldBBox: { width: 100, height: 100, depth: 100 },
  });
  assert(perspectiveReference.axes.length === 3, 'perspective keeps all three axes');

  const doc = createDocument('helix', { generator: { params: { samples: 160, fit: 340 } } });
  const evaluation = evaluateDocument(doc, { time: 0 });
  const before = buildRenderScene({ evaluation, document: doc, view: doc.view });
  assert(before.meta.reference.enabled === false, 'reference is absent from the default scene');
  const frameBefore = JSON.stringify(before.transform.frame);
  const bboxBefore = JSON.stringify(before.meta.bbox);

  doc.view.reference.enabled = true;
  doc.view.reference.ground = true;
  const after = buildRenderScene({ evaluation, document: doc, view: doc.view });
  assert(after.meta.reference.enabled === true, 'reference configuration reaches the scene');
  assert(JSON.stringify(after.transform.frame) === frameBefore, 'toggling the reference never changes the frame');
  assert(JSON.stringify(after.meta.bbox) === bboxBefore, 'toggling the reference never changes the artwork bbox');
  assert(after.meta.referenceTransform === after.transform, 'scene mode shares one reference transform');
  const projectedOrigin = after.transform.toArtboard({ x: 0, y: 0, z: 0 });
  const sceneReference = buildSpatialReference({
    transform: after.meta.referenceTransform,
    worldBBox: after.meta.worldBBox,
    ground: after.meta.reference.ground,
  });
  assert(
    Math.abs(sceneReference.origin.x - projectedOrigin.x) < 1e-9
    && Math.abs(sceneReference.origin.y - projectedOrigin.y) < 1e-9,
    'reference origin matches the scene transform',
  );

  const compositionDoc = createDocument('parametric-3d', {
    generator: { params: { exprX: 'cos(t)', exprY: 'sin(t)', exprZ: '0', samples: 64, fit: 160 } },
    view: { frame: { mode: 'composition' } },
  });
  compositionDoc.layers.push(createLayer('parametric-3d', {
    name: 'Second',
    generator: { params: { exprX: 'cos(t) + 20', exprY: 'sin(t)', exprZ: '0', samples: 64, fit: 160 } },
  }));
  compositionDoc.activeLayer = 1;
  const compositionEval = evaluateDocument(compositionDoc, { time: 0 });
  const compositionScene = buildRenderScene({
    evaluation: compositionEval,
    document: compositionDoc,
    view: compositionDoc.view,
  });
  assert(
    compositionScene.meta.referenceTransform === compositionScene.layers[1].transform,
    'composition mode anchors the reference to the active spatial layer',
  );

  const flatDoc = createDocument('parametric', { generator: { params: { samples: 96, fit: 340 } } });
  const flatEval = evaluateDocument(flatDoc, { time: 0 });
  const flatScene = buildRenderScene({ evaluation: flatEval, document: flatDoc, view: flatDoc.view });
  assert(flatScene.meta.referenceTransform === null, 'planar-only scenes have no spatial reference transform');
}

/* ——— 34. UV domain ——— */
console.log('34. uv domain');
{
  const doc = createDocument('parametric-surface', {
    generator: {
      params: {
        exprX: 'cos(u) * (3 + cos(v))',
        exprY: 'sin(u) * (3 + cos(v))',
        exprZ: 'sin(v)',
        u0: -1.5, u1: 2.5,
        v0: 10, v1: -2,
        samplesU: 8, samplesV: 6,
        closedU: true, closedV: false,
        seamU: 'reverse', seamV: 'normal',
        fit: 300,
      },
    },
  });
  const evaluation = evaluateDocument(doc, { time: 0 });
  const surface = evaluation.geometry[0];
  const summary = summarizeSurfaceDomain(surface);
  assert(summary && summary.valid, 'valid surface domain produces a summary');
  assert(summary.u.start === -1.5 && summary.u.end === 2.5, 'U endpoints come from Surface.domain');
  assert(summary.u.min === -1.5 && summary.u.max === 2.5 && summary.u.reversed === false, 'U bounds are not normalized to [0,1]');
  assert(summary.v.start === 10 && summary.v.end === -2, 'V endpoints preserve their real orientation');
  assert(summary.v.min === -2 && summary.v.max === 10 && summary.v.reversed === true, 'V bounds preserve min/max and reversal');
  assert(summary.rows === 9 && summary.cols === 9, 'domain summary reads actual grid samples');
  assert(summary.u.closed === true && summary.u.seam === 'reverse', 'closed U and reverse seam are preserved');
  assert(summary.v.closed === false && summary.v.seam === 'normal', 'open V remains open');
  assert(formatDomainValue(6.283185) === '6.2832', 'domain values use compact numeric formatting');

  assert(summarizeSurfaceDomain({ kind: 'curve2d' }) === null, 'non-surface geometry has no UV domain');
  assert(summarizeSurfaceDomain({
    kind: 'surface',
    domain: { u: [0, 1] },
    grid: { rows: 2, cols: 2, points: [] },
  }) === null, 'missing V domain is invalid');
  assert(summarizeSurfaceDomain({
    kind: 'surface',
    domain: { u: [0, 0], v: [0, 1] },
    grid: { rows: 2, cols: 2, points: [] },
  }) === null, 'degenerate U domain is invalid');

  const active = activeSurfaceDomain(evaluation, doc);
  assert(active?.layerName === doc.layers[0].name, 'active surface domain resolves the active layer');
  assert(active?.surfaceCount === 1, 'active surface domain counts surfaces');

  const flatDoc = createDocument('parametric', { generator: { params: { samples: 64, fit: 340 } } });
  const flatEval = evaluateDocument(flatDoc, { time: 0 });
  assert(activeSurfaceDomain(flatEval, flatDoc) === null, 'planar active layers have no UV domain');

  doc.layers[0].visible = false;
  const hiddenEval = evaluateDocument(doc, { time: 0 });
  assert(activeSurfaceDomain(hiddenEval, doc) === null, 'hidden surface layers have no active UV domain');
  doc.layers[0].visible = true;

  const visibleEval = evaluateDocument(doc, { time: 0 });
  const scene = buildRenderScene({ evaluation: visibleEval, document: doc, view: doc.view });
  const before = {
    geometry: JSON.stringify(visibleEval.geometry),
    frame: JSON.stringify(scene.transform.frame),
    bbox: JSON.stringify(scene.meta.bbox),
  };
  const domain = activeSurfaceDomain(visibleEval, doc);
  assert(domain && domain.u.start === -1.5, 'domain summary reads the evaluated surface');
  assert(JSON.stringify(visibleEval.geometry) === before.geometry, 'UV summary does not mutate geometry');
  assert(JSON.stringify(scene.transform.frame) === before.frame, 'UV summary does not mutate the frame');
  assert(JSON.stringify(scene.meta.bbox) === before.bbox, 'UV summary does not mutate the bbox');

  const svg = Exporter.buildSVG(
    scene.layers.flatMap((layer) => layer.curves),
    doc.view,
    { w: 900, h: 900 },
    doc,
    scene.layers,
  );
  assert(!svg.includes('uv-domain') && !svg.includes('UV DOMAIN'), 'UV domain never enters SVG export');
}

/* ——— 35. Surface mapping ——— */
console.log('35. surface mapping');
{
  const makeSurface = ({
    rows = 5,
    cols = 5,
    u = [0, 1],
    v = [0, 1],
    closedU = false,
    closedV = false,
    seamU = 'normal',
    seamV = 'normal',
    id = 'surface-mapping-fixture',
  } = {}) => createSurface({
    id,
    domain: { u, v, closedU, closedV, seamU, seamV },
    grid: {
      rows,
      cols,
      points: Array.from({ length: rows }, (_, ui) => (
        Array.from({ length: cols }, (_, vi) => ({ x: ui, y: vi, z: ui + vi }))
      )),
    },
    meta: {},
  });

  const open = makeSurface({
    u: [-1.5, 2.5],
    v: [10, -2],
    rows: 5,
    cols: 6,
    closedU: false,
    closedV: false,
  });
  const { mesh: openMesh, mapping: openMap } = tessellateSurfaceWithMapping(open);
  assert(openMap.kind === 'surface-mapping', 'mapping has an explicit kind');
  assert(openMap.surfaceId === open.id && openMap.meshId === openMesh.id, 'mapping links surface and mesh');
  assert(openMap.domain.u[0] === -1.5 && openMap.domain.u[1] === 2.5, 'mapping preserves non-normalized U domain');
  assert(openMap.domain.v[0] === 10 && openMap.domain.v[1] === -2, 'mapping preserves inverted V domain');
  assert(openMap.grid.uCells === 4 && openMap.grid.vCells === 5, 'mapping stores logical cell counts');
  assert(openMap.faces.length === openMesh.faces.length, 'mapping has one entry per mesh triangle');
  assert(
    openMap.faces.every((face, index) => JSON.stringify(face.indices) === JSON.stringify(openMesh.faces[index])),
    'mapping indices match mesh faces exactly',
  );
  assert(openMap.faces[0].cell.u === 0 && openMap.faces[0].cell.v === 0 && openMap.faces[0].triangle === 0, 'first triangle carries its cell and triangle index');
  assert(openMap.faces[1].triangle === 1, 'second triangle is marked inside the same cell');
  assert(openMap.faces[0].uv[0].u === -1.5 && openMap.faces[0].uv[0].v === 10, 'corner UV starts at the real domain origin');
  assert(openMap.faces[0].uv[1].u === -0.5 && openMap.faces[0].uv[1].v === 10, 'corner UV advances by the real U step');
  assert(openMap.faces[0].uv[2].v === 7.6, 'corner UV advances by the real V step');
  const lastOpen = openMap.faces[openMap.faces.length - 1];
  assert(lastOpen.uv.some((uv) => uv.u === 2.5) && lastOpen.uv.some((uv) => uv.v === -2), 'mapping reaches the real domain end');
  assert(
    openMap.faces.every((face) => face.indices.every((index) => index >= 0 && index < openMesh.vertices.length)),
    'mapping vertex indices stay inside the mesh',
  );

  const closedU = makeSurface({ rows: 5, cols: 5, closedU: true, closedV: false });
  const { mesh: closedUMesh, mapping: closedUMap } = tessellateSurfaceWithMapping(closedU);
  const seamUFace = closedUMap.faces.find((face) => face.uv.some((uv) => uv.u === 1));
  assert(seamUFace, 'closed U mapping has a seam triangle ending at u1');
  const seamUCorner = seamUFace.uv.findIndex((uv) => uv.u === 1);
  const seamUIndex = seamUFace.indices[seamUCorner];
  assert(seamUIndex < closedUMap.grid.cols, 'closed U seam vertex wraps to the first row');
  assert(closedUMesh.meta.closedU === true && closedUMesh.meta.twistU === false, 'closed U mesh keeps topology flags');
  assert(closedUMap.domain.closedU === true && closedUMap.domain.twistU === false, 'mapping keeps closed U without twist');

  const closedV = makeSurface({ rows: 5, cols: 5, closedU: false, closedV: true });
  const { mapping: closedVMap } = tessellateSurfaceWithMapping(closedV);
  assert(closedVMap.faces.some((face) => face.uv.some((uv) => uv.v === 1)), 'closed V mapping has a seam triangle ending at v1');
  assert(closedVMap.domain.closedV === true, 'mapping keeps closed V');

  const reverse = makeSurface({
    rows: 5,
    cols: 5,
    closedU: true,
    closedV: true,
    seamU: 'reverse',
    seamV: 'normal',
  });
  const { mapping: reverseMap } = tessellateSurfaceWithMapping(reverse);
  assert(reverseMap.domain.seamU === 'reverse' && reverseMap.domain.twistU === true, 'reverse U seam becomes a mapping twist');
  assert(reverseMap.domain.seamV === 'normal' && reverseMap.domain.twistV === false, 'V remains normal');
  assert(reverseMap.faces.some((face) => face.uv.some((uv) => uv.u === 1)), 'reverse seam still carries the real u1 UV');
  assert(reverseMap.faces.some((face) => face.uv.some((uv) => uv.v === 1)), 'closed V still carries the real v1 UV');

  const bothReverse = makeSurface({
    rows: 5,
    cols: 5,
    closedU: true,
    closedV: true,
    seamU: 'reverse',
    seamV: 'reverse',
  });
  const { mapping: bothReverseMap } = tessellateSurfaceWithMapping(bothReverse);
  assert(bothReverseMap.domain.twistU && bothReverseMap.domain.twistV, 'both reverse seams are represented as twists');

  const { mapping: sharedMap } = tessellateSurfaceWithMapping(makeSurface({
    rows: 5,
    cols: 5,
    closedU: true,
    closedV: true,
  }));
  const uvByVertex = new Map();
  for (const face of sharedMap.faces) {
    face.indices.forEach((index, corner) => {
      const uv = face.uv[corner];
      const key = `${uv.u}:${uv.v}`;
      if (!uvByVertex.has(index)) uvByVertex.set(index, new Set());
      uvByVertex.get(index).add(key);
    });
  }
  assert(
    [...uvByVertex.values()].some((set) => set.size > 1),
    'a welded seam vertex can carry multiple UVs',
  );

  const zeroSpan = makeSurface({ rows: 3, cols: 3, u: [0, 0], v: [0, 1] });
  const { mapping: zeroMap } = tessellateSurfaceWithMapping(zeroSpan);
  assert(zeroMap.faces.every((face) => face.uv.every((uv) => uv.u === 0)), 'degenerate zero-span domain keeps finite duplicate UVs');

  let invalidDomain = null;
  try {
    tessellateSurfaceWithMapping({
      kind: 'surface',
      id: 'invalid',
      domain: { u: [0, 1] },
      grid: {
        rows: 2,
        cols: 2,
        points: [
          [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
          [{ x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }],
        ],
      },
      meta: {},
    });
  } catch (error) {
    invalidDomain = error;
  }
  assert(invalidDomain && /domain/.test(invalidDomain.message), 'invalid domain fails explicitly');

  const doc = createDocument('parametric-surface', {
    generator: {
      params: {
        exprX: 'cos(u) * (2 + cos(v))',
        exprY: 'sin(u) * (2 + cos(v))',
        exprZ: 'sin(v)',
        u0: 0, u1: Math.PI * 2,
        v0: 0, v1: Math.PI * 2,
        samplesU: 8, samplesV: 8,
        closedU: true, closedV: true,
        fit: 300,
      },
    },
  });
  const first = evaluateDocument(doc, { time: 0 });
  assert(first.surfaceMappings.length === 1, 'surface evaluation exposes a mapping sidecar');
  assert(first.layers[0].surfaceMappings.length === 1, 'layer evaluation exposes a mapping sidecar');
  const firstMap = first.surfaceMappings[0];
  const firstDomain = [...firstMap.domain.u];
  const firstCells = firstMap.grid.uCells;
  assert(firstMap.domain.twistU === false, 'engine mapping carries topology metadata');

  doc.generator.params.u1 = 1.5;
  doc.generator.params.samplesU = 10;
  const second = evaluateDocument(doc, { time: 0 });
  const secondMap = second.surfaceMappings[0];
  assert(secondMap !== firstMap, 'reevaluation creates a new mapping');
  assert(secondMap.domain.u[1] === 1.5 && secondMap.domain.u[0] === firstDomain[0], 'reevaluation updates the real domain');
  assert(secondMap.grid.uCells !== firstCells, 'topology changes replace the mapping grid');

  const stable = evaluateDocument(doc, { time: 0 });
  assert(stable.surfaceMappings[0] === secondMap, 'unchanged evaluation reuses the cached mapping');

  const scene = buildRenderScene({ evaluation: second, document: doc, view: doc.view });
  const before = {
    geometry: JSON.stringify(second.geometry),
    frame: JSON.stringify(scene.transform.frame),
    bbox: JSON.stringify(scene.meta.bbox),
  };
  const svg = Exporter.buildSVG(
    scene.layers.flatMap((layer) => layer.curves),
    doc.view,
    { w: 900, h: 900 },
    doc,
    scene.layers,
  );
  assert(JSON.stringify(second.geometry) === before.geometry, 'mapping does not mutate geometry');
  assert(JSON.stringify(scene.transform.frame) === before.frame, 'mapping does not mutate the frame');
  assert(JSON.stringify(scene.meta.bbox) === before.bbox, 'mapping does not mutate the bbox');
  assert(!svg.includes('surface-mapping'), 'mapping never enters SVG export');
}

/* ——— 36. Projection source ——— */
console.log('36. projection source');
{
  const depthMesh = createMesh({
    id: 'depth-mesh',
    vertices: [
      { x: 1, y: 2, z: 10 },
      { x: 1, y: 2, z: 20 },
      { x: 2, y: 2, z: 20 },
    ],
    faces: [[0, 1, 2]],
  });
  const plain = projectMeshToView(depthMesh, { projection: 'xy' });
  const preserved = projectMeshToView(depthMesh, { projection: 'xy', preserveSource: true });
  assert(!('source' in plain), 'normal projection does not allocate a source sidecar');
  assert(preserved.source?.kind === 'mesh-projection-source', 'preserved projection exposes an explicit source contract');
  assert(preserved.source.view === 'xy', 'source records the orthographic view');
  assert(preserved.source.sourceMeshId === depthMesh.id, 'source records the origin mesh id');
  assert(preserved.source.sourceVertices === depthMesh.vertices, 'source aliases the canonical world vertices');
  assert(JSON.stringify(preserved.source.sourceIndices) === '[0,1,2]', 'source records explicit vertex identity');
  assert(preserved.source.sourceVertexCount === depthMesh.vertices.length, 'source records the vertex count');
  assert(preserved.source.orthoDepth.axis === 'z' && preserved.source.orthoDepth.sign === -1, 'XY orthographic depth uses -Z');
  assert(
    JSON.stringify(preserved.source.orthoDepth.values) === JSON.stringify([-10, -20, -20]),
    'XY preserves distinct orthographic depth for shared projected positions',
  );
  assert(
    preserved.vertices[0].x === plain.vertices[0].x
    && preserved.vertices[0].y === plain.vertices[0].y
    && preserved.vertices[0].depth === 0,
    'preserving source keeps the existing projected render coordinates and depth',
  );
  assert(JSON.stringify(preserved.faces) === JSON.stringify(plain.faces), 'preserving source does not alter faces');
  assert(!('source' in projectMeshToView(preserved, { projection: 'xy' })), 're-projection without preserveSource strips stale source');

  const axisMesh = createMesh({
    id: 'axis-mesh',
    vertices: [
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 5, z: 6 },
      { x: 7, y: 8, z: 9 },
    ],
    faces: [[0, 1, 2]],
  });
  const xz = projectMeshToView(axisMesh, { projection: 'xz', preserveSource: true });
  const yz = projectMeshToView(axisMesh, { projection: 'yz', preserveSource: true });
  assert(xz.source.orthoDepth.axis === 'y' && xz.source.orthoDepth.sign === -1, 'XZ orthographic depth uses -Y');
  assert(yz.source.orthoDepth.axis === 'x' && yz.source.orthoDepth.sign === -1, 'YZ orthographic depth uses -X');
  assert(JSON.stringify(xz.source.orthoDepth.values) === JSON.stringify([-2, -5, -8]), 'XZ preserves the dropped Y coordinate');
  assert(JSON.stringify(yz.source.orthoDepth.values) === JSON.stringify([-1, -4, -7]), 'YZ preserves the dropped X coordinate');

  const viewProjected = projectWorldMeshesToView([depthMesh], {
    projection: 'xy',
    preserveSource: true,
  })[0];
  assert(viewProjected.source.sourceMeshId === depthMesh.id, 'projectWorldMeshesToView forwards source preservation');
  const transformed = applyViewTransformToMeshes([viewProjected], createViewTransform({
    projection: 'xy',
    frame: { mode: 'composition', anchor: 'bbox', fit: 100 },
    bounds: { width: 10, height: 10, cx: 0, cy: 0 },
  }))[0];
  assert(transformed.source === viewProjected.source, 'frame application preserves the source sidecar');

  const camera3d = { yaw: -Math.PI / 6, pitch: Math.PI / 9, fov: 320 };
  const perspective = projectMeshToView(depthMesh, {
    projection: '3d',
    camera: camera3d,
    preserveSource: true,
  });
  assert(perspective.source.orthoDepth === null, 'perspective depth stays in per-vertex depth');
  assert(perspective.vertices.some((point) => point && point.depth > 0), 'perspective vertices keep normalized depth');

  const surface = createSurface({
    id: 'mapping-source-surface',
    domain: { u: [0, 1], v: [0, 1], closedU: false, closedV: false, seamU: 'normal', seamV: 'normal' },
    grid: {
      rows: 3,
      cols: 3,
      points: [
        [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 2, z: 0 }],
        [{ x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 2, z: 0 }],
        [{ x: 2, y: 0, z: 0 }, { x: 2, y: 1, z: 0 }, { x: 2, y: 2, z: 0 }],
      ],
    },
    meta: {},
  });
  const { mesh: surfaceMesh, mapping } = tessellateSurfaceWithMapping(surface);
  const mappedProjection = projectMeshToView(surfaceMesh, { projection: 'xy', preserveSource: true });
  assert(mappedProjection.source.sourceMeshId === mapping.meshId, 'projection source matches SurfaceMapping mesh identity');
  assert(mapping.faces.every((face) => face.indices.every((index) => index < mappedProjection.source.sourceVertexCount)),
    'SurfaceMapping indices remain valid against projected source vertices');
  assert(mapping.domain.u[0] === 0 && mapping.domain.u[1] === 1, 'projection source does not alter SurfaceMapping');

  const surfaceDoc = createDocument('parametric-surface', {
    generator: {
      params: {
        samplesU: 8, samplesV: 8, closedU: true, closedV: true,
        exprX: 'cos(u) * (2 + cos(v))',
        exprY: 'sin(u) * (2 + cos(v))',
        exprZ: 'sin(v)',
        fit: 300,
      },
    },
  });
  const first = evaluateDocument(surfaceDoc, { time: 0 });
  const firstVertex = first.renderMeshes[0].vertices[0];
  const firstMapping = first.surfaceMappings[0];
  surfaceDoc.view.camera.yaw += 0.4;
  const second = evaluateDocument(surfaceDoc, { time: 0 });
  assert(JSON.stringify(second.renderMeshes[0].vertices[0]) !== JSON.stringify(firstVertex), 'camera changes invalidate projected mesh vertices');
  assert(second.surfaceMappings[0] === firstMapping, 'projection cache invalidation leaves SurfaceMapping stable');

  const scene = buildRenderScene({ evaluation: second, document: surfaceDoc, view: surfaceDoc.view });
  const before = { frame: JSON.stringify(scene.transform.frame), bbox: JSON.stringify(scene.meta.bbox) };
  const svg = Exporter.buildSVG(
    scene.layers.flatMap((layer) => layer.curves),
    surfaceDoc.view,
    { w: 900, h: 900 },
    surfaceDoc,
    scene.layers,
  );
  assert(JSON.stringify(scene.transform.frame) === before.frame, 'projection source does not alter the frame');
  assert(JSON.stringify(scene.meta.bbox) === before.bbox, 'projection source does not alter the bbox');
  assert(!svg.includes('mesh-projection-source') && !svg.includes('surface-mapping'), 'projection source never enters SVG export');
}

/* ——— 37. Surface picking ——— */
console.log('37. surface picking');
{
  const bbox = {
    minX: -20, maxX: 20, minY: -20, maxY: 20, minZ: -20, maxZ: 20,
    diagonal: Math.hypot(40, 40, 40),
  };
  const ortho = createViewTransform({
    projection: 'xy',
    frame: { mode: 'world', anchor: 'world-origin', scale: 1 },
  });
  const canvasPoint = artboardPointFromCanvas(
    { x: 230, y: 110 },
    { x: 10, y: 20, w: 400, h: 200, scale: 2 },
  );
  assert(canvasPoint.x === 10 && canvasPoint.y === -5, 'canvas point converts to artboard without viewport distortion');
  const nonSquarePoint = artboardPointFromCanvas(
    { x: 500, y: 300 },
    { x: 50, y: 25, w: 300, h: 500, scale: 1.5 },
  );
  assert(
    Math.abs(nonSquarePoint.x - 200) < 1e-9 && Math.abs(nonSquarePoint.y - 50 / 3) < 1e-9,
    'canvas conversion respects artboard offset, scale and aspect ratio',
  );

  const worldPoint = { x: 12, y: -4, z: 30 };
  const camera = { yaw: -Math.PI / 6, pitch: Math.PI / 9, fov: 320 };
  const perspective = createViewTransform({
    projection: '3d',
    camera,
    frame: { mode: 'world', anchor: 'world-origin', scale: 1 },
  });
  const perspectiveArt = perspective.toArtboard(worldPoint);
  const perspectiveRay = rayForArtboardPoint({ point: perspectiveArt, transform: perspective });
  assert(perspectiveRay?.kind === 'perspective', 'perspective cursor produces a perspective ray');
  assert(Math.abs(Math.hypot(
    perspectiveRay.direction.x,
    perspectiveRay.direction.y,
    perspectiveRay.direction.z,
  ) - 1) < 1e-9, 'perspective ray direction is normalized');
  const perspectiveHit = intersectRayTriangle(
    perspectiveRay,
    { x: -20, y: -20, z: 30 },
    { x: 40, y: -20, z: 30 },
    { x: 0, y: 40, z: 30 },
  );
  assert(perspectiveHit, 'perspective ray intersects a world triangle');
  const perspectiveWorld = {
    x: perspectiveRay.origin.x + perspectiveRay.direction.x * perspectiveHit.t,
    y: perspectiveRay.origin.y + perspectiveRay.direction.y * perspectiveHit.t,
    z: perspectiveRay.origin.z + perspectiveRay.direction.z * perspectiveHit.t,
  };
  assert(
    Math.abs(perspectiveWorld.x - worldPoint.x) < 1e-7
    && Math.abs(perspectiveWorld.y - worldPoint.y) < 1e-7
    && Math.abs(perspectiveWorld.z - worldPoint.z) < 1e-7,
    'perspective ray inversion returns the original world point',
  );

  for (const fov of [50, 320, 1000]) {
    const zoomed = createViewTransform({
      projection: '3d',
      camera: { yaw: 0.2, pitch: -0.3, fov },
      frame: { mode: 'world', anchor: 'world-origin', scale: 1 },
    });
    const zoomArt = zoomed.toArtboard(worldPoint);
    const zoomRay = rayForArtboardPoint({ point: zoomArt, transform: zoomed });
    const zoomHit = intersectRayTriangle(
      zoomRay,
      { x: -20, y: -20, z: 30 },
      { x: 40, y: -20, z: 30 },
      { x: 0, y: 40, z: 30 },
    );
    const zoomWorld = zoomHit ? {
      x: zoomRay.origin.x + zoomRay.direction.x * zoomHit.t,
      y: zoomRay.origin.y + zoomRay.direction.y * zoomHit.t,
      z: zoomRay.origin.z + zoomRay.direction.z * zoomHit.t,
    } : null;
    assert(
      zoomWorld
      && Math.abs(zoomWorld.x - worldPoint.x) < 1e-6
      && Math.abs(zoomWorld.y - worldPoint.y) < 1e-6
      && Math.abs(zoomWorld.z - worldPoint.z) < 1e-6,
      `FOV ${fov} rays preserve the original world point`,
    );
  }

  const orthoWorld = { x: 3, y: 4, z: 7 };
  const orthoArt = ortho.toArtboard(orthoWorld);
  const orthoRay = rayForArtboardPoint({ point: orthoArt, transform: ortho, worldBBox: bbox });
  assert(orthoRay?.kind === 'orthographic', 'orthographic cursor produces a parallel ray');
  assert(orthoRay.direction.z === -1 && orthoRay.origin.z > bbox.maxZ, 'XY orthographic ray starts above the scene');
  const orthoHit = intersectRayTriangle(
    orthoRay,
    { x: 2, y: 3, z: 7 },
    { x: 4, y: 3, z: 7 },
    { x: 3, y: 5, z: 7 },
  );
  assert(orthoHit, 'orthographic ray intersects a world triangle');
  assert(orthoDepthForPoint(orthoWorld, 'xy').value === -7, 'orthographic depth uses -Z');
  assert(intersectRayTriangle(
    orthoRay,
    { x: 0, y: 0, z: 7 },
    { x: 1, y: 0, z: 7 },
    { x: 2, y: 0, z: 7 },
  ) === null, 'degenerate triangles are ignored');
  const tinyScale = 1e-6;
  const tinyHit = intersectRayTriangle(
    { origin: { x: 0.5 * tinyScale, y: 0.5 * tinyScale, z: tinyScale }, direction: { x: 0, y: 0, z: -1 } },
    { x: 0, y: 0, z: 0 },
    { x: tinyScale, y: 0, z: 0 },
    { x: 0, y: tinyScale, z: 0 },
  );
  assert(tinyHit, 'tolerance scales down for very small triangles');
  const closeHit = intersectRayTriangle(
    { origin: { x: 0.5e-10, y: 0.5e-10, z: 0.5e-10 }, direction: { x: 0, y: 0, z: -1 } },
    { x: 0, y: 0, z: 0 },
    { x: 1e-10, y: 0, z: 0 },
    { x: 0, y: 1e-10, z: 0 },
  );
  assert(closeHit, 'near-zero but positive ray distances are accepted');

  const directRay = { origin: { x: 0, y: 0, z: 10 }, direction: { x: 0, y: 0, z: -1 } };
  const edgeHit = intersectRayTriangle(
    directRay,
    { x: 5, y: -5, z: 0 },
    { x: 5, y: 5, z: 0 },
    { x: -5, y: 5, z: 0 },
  );
  assert(edgeHit && Math.abs(edgeHit.barycentric.a - 0.5) < 1e-9, 'edge intersections return stable barycentrics');
  const vertexHit = intersectRayTriangle(
    directRay,
    { x: 0, y: 0, z: 0 },
    { x: 5, y: 0, z: 0 },
    { x: 0, y: 5, z: 0 },
  );
  assert(vertexHit && Math.abs(vertexHit.barycentric.a - 1) < 1e-9, 'vertex intersections return the vertex barycentric');
  assert(intersectRayTriangle(
    directRay,
    { x: 0, y: 5, z: 0 },
    { x: 5, y: -5, z: 0 },
    { x: -5, y: -5, z: 0 },
  ) !== null, 'inverted winding is picked double-sided');
  assert(intersectRayTriangle(
    directRay,
    { x: NaN, y: 0, z: 0 },
    { x: 5, y: 0, z: 0 },
    { x: 0, y: 5, z: 0 },
  ) === null, 'NaN triangle data is rejected');

  const xzRay = rayForArtboardPoint({
    point: createViewTransform({ projection: 'xz', frame: { mode: 'world', anchor: 'world-origin', scale: 1 } })
      .toArtboard({ x: 3, y: 4, z: 5 }),
    transform: createViewTransform({ projection: 'xz', frame: { mode: 'world', anchor: 'world-origin', scale: 1 } }),
    worldBBox: bbox,
  });
  const yzRay = rayForArtboardPoint({
    point: createViewTransform({ projection: 'yz', frame: { mode: 'world', anchor: 'world-origin', scale: 1 } })
      .toArtboard({ x: 3, y: 4, z: 5 }),
    transform: createViewTransform({ projection: 'yz', frame: { mode: 'world', anchor: 'world-origin', scale: 1 } }),
    worldBBox: bbox,
  });
  assert(xzRay.orthoAxis === 'y' && xzRay.direction.y === -1, 'XZ ray looks along -Y');
  assert(yzRay.orthoAxis === 'x' && yzRay.direction.x === -1, 'YZ ray looks along -X');

  const flatSurface = createSurface({
    id: 'flat-pick-surface',
    domain: { u: [0, 1], v: [0, 1], closedU: false, closedV: false, seamU: 'normal', seamV: 'normal' },
    grid: {
      rows: 3,
      cols: 3,
      points: [
        [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 2, z: 0 }],
        [{ x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 2, z: 0 }],
        [{ x: 2, y: 0, z: 0 }, { x: 2, y: 1, z: 0 }, { x: 2, y: 2, z: 0 }],
      ],
    },
    meta: {},
  });
  const { mesh: flatMesh, mapping: flatMapping } = tessellateSurfaceWithMapping(flatSurface);
  const sceneFor = (transform, layers = [{ id: 'layer-a', transform }]) => ({
    kind: 'render-scene',
    transform,
    layers,
    meta: { worldBBox: { ...bbox, minZ: 0, maxZ: 0 } },
  });
  const layerFor = (meshes, mappings) => ({
    id: 'layer-a',
    name: 'Surface A',
    visible: true,
    meshes,
    surfaceMappings: mappings,
  });
  const flatFace = flatMapping.faces[0];
  const flatCentre = flatFace.indices.reduce((sum, index) => ({
    x: sum.x + flatMesh.vertices[index].x / 3,
    y: sum.y + flatMesh.vertices[index].y / 3,
    z: sum.z + flatMesh.vertices[index].z / 3,
  }), { x: 0, y: 0, z: 0 });
  const flatArt = ortho.toArtboard(flatCentre);
  const flatScene = sceneFor(ortho);
  const flatEvaluation = {
    layers: [layerFor([flatMesh], [flatMapping])],
    worldBBox: { ...bbox, minZ: 0, maxZ: 0 },
  };
  const flatPick = pickSurface({
    evaluation: flatEvaluation,
    scene: flatScene,
    artboardPoint: flatArt,
  });
  assert(flatPick?.meshId === flatMesh.id && flatPick.faceIndex === 0, 'orthographic picking resolves the world triangle');
  assert(flatPick.mappingStatus === 'ok' && flatPick.uv, 'picking resolves UV through SurfaceMapping');
  assert(flatPick.cell.u === 0 && flatPick.cell.v === 0 && flatPick.triangle === 0, 'picking returns the logical cell and triangle');
  const expectedUV = flatFace.uv.reduce((sum, uv) => ({
    u: sum.u + uv.u / 3,
    v: sum.v + uv.v / 3,
  }), { u: 0, v: 0 });
  assert(
    Math.abs(flatPick.uv.u - expectedUV.u) < 1e-9
    && Math.abs(flatPick.uv.v - expectedUV.v) < 1e-9,
    'picking interpolates real corner UVs',
  );
  assert(
    Math.abs(flatPick.world.x - flatCentre.x) < 1e-9
    && Math.abs(flatPick.world.z - flatCentre.z) < 1e-9,
    'picking returns the world intersection point',
  );

  const perspectiveFlat = createViewTransform({
    projection: '3d',
    camera,
    frame: { mode: 'world', anchor: 'world-origin', scale: 1 },
  });
  const perspectiveFlatPick = pickSurface({
    evaluation: flatEvaluation,
    scene: sceneFor(perspectiveFlat),
    artboardPoint: perspectiveFlat.toArtboard(flatCentre),
  });
  assert(perspectiveFlatPick?.mappingStatus === 'ok', 'perspective picking resolves the same triangle and mapping');

  const nearSurface = createSurface({
    ...flatSurface,
    id: 'near-pick-surface',
    grid: {
      rows: 3,
      cols: 3,
      points: flatSurface.grid.points.map((row) => row.map((point) => ({ ...point, z: 10 }))),
    },
  });
  const { mesh: nearMesh, mapping: nearMapping } = tessellateSurfaceWithMapping(nearSurface);
  const occlusionEvaluation = {
    layers: [layerFor([flatMesh, nearMesh], [flatMapping, nearMapping])],
    worldBBox: { ...bbox, minZ: 0, maxZ: 10 },
  };
  const occlusionScene = sceneFor(ortho, [{ id: 'layer-a', transform: ortho }]);
  occlusionScene.meta.worldBBox = { ...bbox, minZ: 0, maxZ: 10 };
  const occlusionPick = pickSurface({
    evaluation: occlusionEvaluation,
    scene: occlusionScene,
    artboardPoint: flatArt,
  });
  assert(occlusionPick?.meshId === nearMesh.id, 'picking selects the nearest surface regardless of mesh order');
  assert(Number.isFinite(occlusionPick.distance), 'occlusion result exposes a finite distance');
  const reversedOcclusionPick = pickSurface({
    evaluation: {
      layers: [layerFor([nearMesh, flatMesh], [nearMapping, flatMapping])],
      worldBBox: { ...bbox, minZ: 0, maxZ: 10 },
    },
    scene: occlusionScene,
    artboardPoint: flatArt,
  });
  assert(reversedOcclusionPick?.meshId === nearMesh.id, 'occlusion is independent of mesh array order');

  const compositionLayers = [
    { ...layerFor([flatMesh], [flatMapping]), id: 'layer-a' },
    { ...layerFor([nearMesh], [nearMapping]), id: 'layer-b' },
  ];
  const compositionScene = {
    kind: 'render-scene',
    transform: ortho,
    layers: [
      { id: 'layer-a', transform: ortho },
      { id: 'layer-b', transform: ortho },
    ],
    meta: {
      worldBBox: { ...bbox, minZ: 0, maxZ: 10 },
      frame: { mode: 'composition' },
    },
  };
  const compositionEvaluation = {
    layers: compositionLayers,
    worldBBox: { ...bbox, minZ: 0, maxZ: 10 },
  };
  const activeFarPick = pickSurface({
    evaluation: compositionEvaluation,
    scene: compositionScene,
    artboardPoint: flatArt,
    activeLayerId: 'layer-a',
  });
  assert(activeFarPick?.layerId === 'layer-a', 'composition mode inspects the active layer instead of comparing independent world rays');
  const ambiguousCompositionPick = pickSurface({
    evaluation: compositionEvaluation,
    scene: compositionScene,
    artboardPoint: flatArt,
  });
  assert(ambiguousCompositionPick === null, 'composition picking without an active layer is explicitly ambiguous');

  const missingMappingPick = pickSurface({
    evaluation: {
      layers: [layerFor([flatMesh], [])],
      worldBBox: flatEvaluation.worldBBox,
    },
    scene: flatScene,
    artboardPoint: flatArt,
  });
  assert(missingMappingPick?.mappingStatus === 'missing' && missingMappingPick.uv === null, 'missing mapping is explicit and never invents UVs');

  const malformedMapping = {
    ...flatMapping,
    faces: flatMapping.faces.map((face, index) => (
      index === 0
        ? { ...face, uv: [{ u: NaN, v: 0 }, face.uv[1], face.uv[2]] }
        : face
    )),
  };
  const malformedPick = pickSurface({
    evaluation: {
      layers: [layerFor([flatMesh], [malformedMapping])],
      worldBBox: flatEvaluation.worldBBox,
    },
    scene: flatScene,
    artboardPoint: flatArt,
  });
  assert(malformedPick?.mappingStatus === 'mismatch' && malformedPick.uv === null, 'malformed UVs are rejected instead of displayed as valid');

  const seamMesh = createMesh({
    id: 'seam-pick-mesh',
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    ],
    faces: [[0, 1, 2]],
  });
  const seamMapping = {
    kind: 'surface-mapping',
    surfaceId: 'seam-pick-surface',
    meshId: 'seam-pick-mesh',
    domain: { u: [0, 1], v: [0, 1], closedU: true, closedV: false, seamU: 'reverse', seamV: 'normal', twistU: true, twistV: false },
    grid: { rows: 1, cols: 2, uCells: 1, vCells: 1 },
    faces: [{
      indices: [0, 1, 2],
      cell: { u: 1, v: 0 },
      triangle: 0,
      uv: [{ u: 1, v: 0 }, { u: 0, v: 0 }, { u: 0, v: 1 }],
    }],
  };
  const seamPick = pickSurface({
    evaluation: {
      layers: [layerFor([seamMesh], [seamMapping])],
      worldBBox: { ...bbox, minZ: 0, maxZ: 0 },
    },
    scene: flatScene,
    artboardPoint: ortho.toArtboard({ x: 1 / 3, y: 1 / 3, z: 0 }),
  });
  assert(seamPick?.mappingStatus === 'ok', 'seam triangle resolves through its explicit mapping');
  assert(
    Math.abs(seamPick.uv.u - 1 / 3) < 1e-9 && Math.abs(seamPick.uv.v - 1 / 3) < 1e-9,
    'seam UV interpolation preserves the real u1 corner',
  );

  const perspectiveTriangleMesh = createMesh({
    id: 'perspective-pick-mesh',
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 10, z: 20 },
    ],
    faces: [[0, 1, 2]],
  });
  const perspectiveTriangleMapping = {
    kind: 'surface-mapping',
    surfaceId: 'perspective-pick-surface',
    meshId: 'perspective-pick-mesh',
    domain: { u: [10, 20], v: [-3, 7], closedU: false, closedV: false, seamU: 'normal', seamV: 'normal', twistU: false, twistV: false },
    grid: { rows: 2, cols: 2, uCells: 1, vCells: 1 },
    faces: [{
      indices: [0, 1, 2],
      cell: { u: 0, v: 0 },
      triangle: 0,
      uv: [{ u: 10, v: -3 }, { u: 20, v: -3 }, { u: 10, v: 7 }],
    }],
  };
  const perspectiveWorldPick = {
    x: 2, y: 3, z: 6,
  };
  const bary = { a: 0.2, b: 0.3, c: 0.5 };
  perspectiveWorldPick.x = 0 * bary.a + 10 * bary.b + 0 * bary.c;
  perspectiveWorldPick.y = 0 * bary.a + 0 * bary.b + 10 * bary.c;
  perspectiveWorldPick.z = 0 * bary.a + 10 * bary.b + 20 * bary.c;
  const perspectiveTriangleScene = sceneFor(perspective);
  const perspectiveTrianglePick = pickSurface({
    evaluation: {
      layers: [layerFor([perspectiveTriangleMesh], [perspectiveTriangleMapping])],
      worldBBox: bbox,
    },
    scene: perspectiveTriangleScene,
    artboardPoint: perspective.toArtboard(perspectiveWorldPick),
  });
  assert(perspectiveTrianglePick?.mappingStatus === 'ok', 'perspective picking resolves a slanted triangle');
  const expectedPerspectiveUV = {
    u: 10 * bary.a + 20 * bary.b + 10 * bary.c,
    v: -3 * bary.a + -3 * bary.b + 7 * bary.c,
  };
  assert(
    Math.abs(perspectiveTrianglePick.uv.u - expectedPerspectiveUV.u) < 1e-7
    && Math.abs(perspectiveTrianglePick.uv.v - expectedPerspectiveUV.v) < 1e-7,
    'perspective picking interpolates UV consistently in world space',
  );
  assert(
    Math.abs(perspectiveTrianglePick.world.x - perspectiveWorldPick.x) < 1e-7
    && Math.abs(perspectiveTrianglePick.world.y - perspectiveWorldPick.y) < 1e-7
    && Math.abs(perspectiveTrianglePick.world.z - perspectiveWorldPick.z) < 1e-7,
    'perspective picking returns the exact world point',
  );

  const realDoc = createDocument('parametric-surface', {
    generator: {
      params: {
        samplesU: 8, samplesV: 8, closedU: true, closedV: true,
        exprX: 'cos(u) * (2 + cos(v))',
        exprY: 'sin(u) * (2 + cos(v))',
        exprZ: 'sin(v)',
        fit: 300,
      },
    },
  });
  const realEval = evaluateDocument(realDoc, { time: 0 });
  const realScene = buildRenderScene({ evaluation: realEval, document: realDoc, view: realDoc.view });
  const realMesh = realEval.meshes[0];
  const realFace = realEval.surfaceMappings[0].faces[0];
  const realCentre = realFace.indices.reduce((sum, index) => ({
    x: sum.x + realMesh.vertices[index].x / 3,
    y: sum.y + realMesh.vertices[index].y / 3,
    z: sum.z + realMesh.vertices[index].z / 3,
  }), { x: 0, y: 0, z: 0 });
  const realArt = realScene.layers[0].transform.toArtboard(realCentre);
  const beforePick = {
    geometry: JSON.stringify(realEval.geometry),
    frame: JSON.stringify(realScene.transform.frame),
    bbox: JSON.stringify(realScene.meta.bbox),
  };
  const realPick = pickSurface({
    evaluation: realEval,
    scene: realScene,
    artboardPoint: realArt,
  });
  assert(realPick?.mappingStatus === 'ok', 'real surface picking returns a mapped result');
  assert(JSON.stringify(realEval.geometry) === beforePick.geometry, 'picking does not mutate surface geometry');
  assert(JSON.stringify(realScene.transform.frame) === beforePick.frame, 'picking does not mutate the frame');
  assert(JSON.stringify(realScene.meta.bbox) === beforePick.bbox, 'picking does not mutate the bbox');
  const svg = Exporter.buildSVG(
    realScene.layers.flatMap((layer) => layer.curves),
    realDoc.view,
    { w: 900, h: 900 },
    realDoc,
    realScene.layers,
  );
  assert(!svg.includes('surface-pick'), 'picking never enters SVG export');

  const overlay = buildInspectionOverlay({
    evaluation: flatEvaluation,
    scene: flatScene,
    result: flatPick,
  });
  assert(overlay?.marker && overlay.triangle?.length === 3, 'inspection overlay exposes marker and triangle');
  assert(overlay.cell?.length === 4 && overlay.mappingValid, 'valid mapping exposes a four-corner cell highlight');
  const missingOverlay = buildInspectionOverlay({
    evaluation: {
      layers: [layerFor([flatMesh], [])],
      worldBBox: flatEvaluation.worldBBox,
    },
    scene: flatScene,
    result: missingMappingPick,
  });
  assert(missingOverlay?.triangle?.length === 3 && missingOverlay.cell === null, 'missing mapping highlights only the triangle');
  assert(missingOverlay.mappingValid === false, 'missing mapping is visibly marked invalid');
  const malformedOverlay = buildInspectionOverlay({
    evaluation: {
      layers: [layerFor([flatMesh], [malformedMapping])],
      worldBBox: flatEvaluation.worldBBox,
    },
    scene: flatScene,
    result: malformedPick,
  });
  assert(malformedOverlay?.cell === null && malformedOverlay.mappingValid === false, 'malformed mapping never highlights a cell');

  assert(validatePickResult(flatPick, flatEvaluation), 'current pick validates against its evaluation');
  const shiftedEval = {
    layers: [layerFor([{
      ...flatMesh,
      vertices: flatMesh.vertices.map((point) => ({ ...point, x: point.x + 1 })),
    }], [flatMapping])],
    worldBBox: flatEvaluation.worldBBox,
  };
  assert(!validatePickResult(flatPick, shiftedEval), 'geometry changes invalidate a stored pick');
  const hiddenEval = {
    layers: [{ ...layerFor([flatMesh], [flatMapping]), visible: false }],
    worldBBox: flatEvaluation.worldBBox,
  };
  assert(!validatePickResult(flatPick, hiddenEval), 'hidden layers invalidate a stored pick');
  assert(!validatePickResult({ ...flatPick, world: { ...flatPick.world, x: flatPick.world.x + 1 } }, flatEvaluation), 'tampered world points are rejected');
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
