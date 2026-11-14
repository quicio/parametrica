/**
 * surface-seams.test.mjs — seam overlay domain checks.
 */

import { createSurface } from '../../src/geometry/contracts.ts';
import { tessellateSurface, tessellateSurfaceWithMapping } from '../../src/geometry/surfaceTessellation.ts';
import { createViewTransform } from '../../src/view/transform.ts';
import { buildSeamOverlay } from '../../src/interaction/seamOverlay.ts';

export function run(assert) {
  /* ——— 38. Surface seams ——— */
  console.log('38. surface seams');
  {
    const makeSurface = ({
      rows = 3,
      cols = 3,
      u = [0, 1],
      v = [0, 1],
      closedU = false,
      closedV = false,
      seamU = 'normal',
      seamV = 'normal',
      id = 'seam-surface',
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
    const transform = createViewTransform({
      projection: 'xy',
      frame: { mode: 'world', anchor: 'world-origin', scale: 1 },
    });
    const scene = {
      transform,
      layers: [{ id: 'seam-layer', transform }],
      meta: {},
    };
    const evaluationFor = (surface) => {
      const { mesh, mapping } = tessellateSurfaceWithMapping(surface);
      return {
        layers: [{
          id: 'seam-layer',
          name: surface.id,
          visible: true,
          meshes: [mesh],
          surfaceMappings: [mapping],
        }],
      };
    };
    const kindsFor = (surface, sceneValue = scene) => {
      const overlay = buildSeamOverlay({
        evaluation: evaluationFor(surface),
        scene: sceneValue,
      });
      return { overlay, kinds: new Set(overlay.edges.map((edge) => edge.kind)) };
    };

    const open = kindsFor(makeSurface());
    assert(open.overlay.status === 'borders', 'open domain reports borders only');
    for (const kind of ['border-u0', 'border-u1', 'border-v0', 'border-v1']) {
      assert(open.kinds.has(kind), `open domain shows ${kind}`);
    }
    assert(![...open.kinds].some((kind) => kind.startsWith('seam-')), 'open domain has no seam');

    const closedU = kindsFor(makeSurface({ closedU: true }));
    assert(closedU.kinds.has('seam-u'), 'closed U shows a U seam');
    assert(!closedU.kinds.has('border-u0') && !closedU.kinds.has('border-u1'), 'closed U does not duplicate U borders');
    assert(closedU.kinds.has('border-v0') && closedU.kinds.has('border-v1'), 'closed U keeps open V borders');

    const closedV = kindsFor(makeSurface({ closedV: true }));
    assert(closedV.kinds.has('seam-v'), 'closed V shows a V seam');
    assert(!closedV.kinds.has('border-v0') && !closedV.kinds.has('border-v1'), 'closed V does not duplicate V borders');

    const closedBoth = kindsFor(makeSurface({ closedU: true, closedV: true }));
    assert(closedBoth.kinds.has('seam-u') && closedBoth.kinds.has('seam-v'), 'closed both shows both seams');
    assert(![...closedBoth.kinds].some((kind) => kind.startsWith('border-')), 'closed both has no open borders');

    const reverseU = kindsFor(makeSurface({ closedU: true, seamU: 'reverse' }));
    assert(reverseU.kinds.has('seam-u-twist') && !reverseU.kinds.has('seam-u'), 'reverse U is marked as a twist seam');
    const reverseV = kindsFor(makeSurface({ closedV: true, seamV: 'reverse' }));
    assert(reverseV.kinds.has('seam-v-twist') && !reverseV.kinds.has('seam-v'), 'reverse V is marked as a twist seam');
    const bothTwist = kindsFor(makeSurface({ closedU: true, closedV: true, seamU: 'reverse', seamV: 'reverse' }));
    assert(bothTwist.kinds.has('seam-u-twist') && bothTwist.kinds.has('seam-v-twist'), 'both reverse axes expose both twist seams');

    const inverted = kindsFor(makeSurface({ u: [2.5, -1.5], v: [10, -2] }));
    assert(inverted.overlay.status === 'borders', 'inverted open domains keep valid logical borders');
    assert(inverted.kinds.has('border-u0') && inverted.kinds.has('border-u1'), 'inverted U preserves both logical borders');
    assert(inverted.kinds.has('border-v0') && inverted.kinds.has('border-v1'), 'inverted V preserves both logical borders');

    const noMapping = buildSeamOverlay({
      evaluation: {
        layers: [{
          id: 'seam-layer',
          visible: true,
          meshes: [tessellateSurface(makeSurface())],
          surfaceMappings: [],
        }],
      },
      scene,
    });
    assert(noMapping.status === 'unavailable' && noMapping.edges.length === 0, 'missing mapping disables seam visualization');

    const valid = evaluationFor(makeSurface({ closedU: true, seamU: 'reverse' }));
    const validMapping = valid.layers[0].surfaceMappings[0];
    const malformedMapping = {
      ...validMapping,
      faces: validMapping.faces.map((face, index) => (
        index === 0 ? { ...face, uv: [{ u: NaN, v: 0 }, face.uv[1], face.uv[2]] } : face
      )),
    };
    const malformed = buildSeamOverlay({
      evaluation: {
        layers: [{ ...valid.layers[0], surfaceMappings: [malformedMapping] }],
      },
      scene,
    });
    assert(malformed.status === 'partial', 'malformed mapping is marked partial when other faces remain trustworthy');
    assert(malformed.edges.every((edge) => edge.points.every((point) => Number.isFinite(point.x))), 'malformed mapping never emits invalid edges');

    const zeroSpan = buildSeamOverlay({
      evaluation: evaluationFor(makeSurface({ u: [0, 0] })),
      scene,
    });
    assert(zeroSpan.status === 'unavailable' && zeroSpan.edges.length === 0, 'zero-span domains cannot declare seams');

    const perspective = createViewTransform({
      projection: '3d',
      camera: { yaw: -Math.PI / 6, pitch: Math.PI / 9, fov: 320 },
      frame: { mode: 'world', anchor: 'world-origin', scale: 1 },
    });
    const perspectiveScene = { transform: perspective, layers: [{ id: 'seam-layer', transform: perspective }], meta: {} };
    const projectedSeams = kindsFor(makeSurface({ closedU: true }), perspectiveScene);
    assert(projectedSeams.overlay.status === 'declared' && projectedSeams.kinds.has('seam-u'), 'seams project in perspective');
    assert(
      projectedSeams.overlay.edges.every((edge) => edge.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))),
      'projected seam endpoints stay finite',
    );
    const orthoSeams = kindsFor(makeSurface({ closedU: true }));
    assert(
      JSON.stringify(orthoSeams.overlay.edges[0].points) !== JSON.stringify(projectedSeams.overlay.edges[0].points),
      'camera/projection changes replace seam artboard coordinates',
    );

    const before = JSON.stringify(valid);
    buildSeamOverlay({ evaluation: valid, scene });
    assert(JSON.stringify(valid) === before, 'seam overlay does not mutate evaluation or SurfaceMapping');

    const empty = buildSeamOverlay({});
    assert(empty.status === 'unavailable' && empty.edges.length === 0, 'missing evaluation yields no seam data');
  }
}
