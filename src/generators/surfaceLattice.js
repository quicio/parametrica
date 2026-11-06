/**
 * surfaceLattice.js — cellular strut network on a surface of revolution.
 *
 * The generator emits one world Curve3D per Voronoi cell edge. Each curve is
 * the future strut centerline. The viewport renders the network as strokes;
 * Fabricate turns the same network into a closed tube solid.
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { compileOrThrow, makeScope } from './helpers.js';
import { createCurve3D } from '../geometry/contracts.js';
import { buildRevolveLattice } from '../geometry/latticeNetwork.js';
import { cameraFrom } from '../render/camera3d.js';
import { projectWorldCurves } from '../view/projection.js';

const DEFAULT_PROFILE = '45 + 42.5*e^(-((v-0.42)/0.22)^2) + 22.5*e^(-((v-1.0)/0.12)^2) - 12*e^(-((v-0.75)/0.14)^2)';

Generators.register({
  id: 'surface-lattice',
  name: 'Surface Lattice',
  category: 'surface',
  capabilities: {
    spatial: true,
    projection: '3d',
    geometryKind: 'curve3d',
    supportsFit: true,
    supportsClosed: false,
  },
  params: {
    profile: {
      label: 'R(v)', type: TYPE.EXPRESSION,
      default: DEFAULT_PROFILE,
      doc: 'Radius of the surface of revolution as a function of v in [0, 1].',
    },
    height: {
      label: 'Height (mm)', type: TYPE.NUMBER,
      min: 10, max: 600, step: 1, default: 200,
      doc: 'Axial height along Z. The profile is evaluated at v = z / height.',
    },
    floor: {
      label: 'Floor (mm)', type: TYPE.NUMBER,
      min: 0, max: 40, step: 0.5, default: 3,
      doc: 'Solid floor thickness at the base; the lattice starts above it.',
    },
    cellSize: {
      label: 'Cell size (mm)', type: TYPE.NUMBER,
      min: 5, max: 80, step: 0.5, default: 20,
      doc: 'Nominal Voronoi cell pitch measured on the surface.',
    },
    strut: {
      label: 'Strut (mm)', type: TYPE.NUMBER,
      min: 1, max: 12, step: 0.1, default: 3.5,
      doc: 'Strut diameter used when Fabricate turns the network into a solid.',
    },
    rim: {
      label: 'Rim (mm)', type: TYPE.NUMBER,
      min: 1, max: 20, step: 0.5, default: 4,
      doc: 'Solid rim band at the mouth; the lattice stops half a rim below the top.',
    },
    seed: {
      label: 'Seed', type: TYPE.NUMBER,
      min: 0, max: 9999, step: 1, default: 7,
      doc: 'Changes the cell layout without changing the cell size.',
    },
    samples: {
      advanced: true, label: 'Edge samples', type: TYPE.NUMBER,
      min: 2, max: 16, step: 1, default: 6,
      doc: 'Points sampled along each curved cell edge.',
    },
    fit: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340 },
    depthOcclusion: {
      advanced: true, label: 'Depth Fade', type: TYPE.BOOLEAN, default: true,
      doc: 'Modulate stroke alpha by depth so nearer struts read brighter.',
    },
    depthAttenuation: {
      advanced: true, label: 'Fade Strength', type: TYPE.NUMBER,
      min: 0, max: 1, step: 0.01, default: 0.55,
    },
  },

  domain: () => ({ t0: 0, t1: 1, closed: false }),

  generate(params, ctx) {
    const fn = compileOrThrow(params.profile, 'R(v)', 'profile');
    const scope = makeScope(ctx);
    const radiusAt = (v) => {
      scope.v = v;
      return fn(scope);
    };
    const network = buildRevolveLattice({
      radiusAt,
      height: params.height,
      top: (Number(params.height) || 200) - (Number(params.rim) || 4) / 2,
      floor: params.floor,
      cellSize: params.cellSize,
      seed: (Number(params.seed) || 0) + (Number(ctx.seed) || 1) * 9973,
      samples: params.samples,
    });
    return network.curves.map((curve, index) => createCurve3D({
      id: `surface-lattice:${ctx.layerIndex ?? 0}:${index}`,
      points: curve.points,
      closed: false,
      meta: {
        source: 'surface-lattice',
        lattice: network.stats,
        edgeLength: curve.length,
      },
    }));
  },

  sample(params, ctx) {
    const geometry = this.generate(params, ctx);
    return projectWorldCurves(geometry, {
      camera: cameraFrom(ctx.document?.view),
      projection: '3d',
      fit: params.fit,
      depthFade: params.depthOcclusion,
      depthStrength: params.depthAttenuation,
    });
  },
});
