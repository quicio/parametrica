/**
 * surfaceLattice.js — cellular strut network on a surface of revolution.
 *
 * The generator emits one world Curve3D per Voronoi cell edge. Each curve is
 * the future strut centerline. The viewport renders the network as strokes;
 * Fabricate turns the same network into a closed tube solid.
 */

import { Generators } from '../core/registry.ts';
import { TYPE } from '../core/schema.ts';
import type { GeneratorDefinition } from '../core/registry.ts';
import type { GeneratorContext } from './context.ts';

type Rec = Record<string, unknown>;
interface LatticeParams {
  [key: string]: unknown;
  profile: string; height: number; floor: number; cellSize: number; density: number; densityExpression: string;
  irregularity: number; relaxation: number; aspect: number; minOpeningWidth: number; boundaryMode: string;
  strut: number; radiusExpression: string; rim: number; seed: number; samples: number; fit: number;
  depthOcclusion: boolean; depthAttenuation: number;
}
interface LatticeCell { id: string; boundary: boolean; invalidOpening: boolean; openingCenter?: { theta: number; z: number } | null; openingWidth: number }
interface LatticeEdge { points: { x: number; y: number; z: number }[]; edgeId: string; cellIds: string[]; length: number }
interface LatticeNetwork { curves: LatticeEdge[]; cells: LatticeCell[]; stats: Rec; specHash: string; networkHash: string; algorithmVersion: string }
import { compileOrThrow, makeScope } from './helpers.js';
import { createCurve3D } from '../geometry/contracts.js';
import { buildRevolveLattice } from '../geometry/latticeNetwork.js';
import { latticeSpecHash, normalizeLatticeSpec } from '../geometry/latticeSpec.js';
import { cameraFrom } from '../view/camera.ts';
import { projectWorldCurves } from '../view/projection.ts';

const DEFAULT_PROFILE = '45 + 42.5*e^(-((v-0.42)/0.22)^2) + 22.5*e^(-((v-1.0)/0.12)^2) - 12*e^(-((v-0.75)/0.14)^2)';
const NETWORK_CACHE = new Map<string, LatticeNetwork>();
const NETWORK_CACHE_LIMIT = 8;

Generators.register(({
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
      doc: 'Target cell pitch on the surface. Openings are smaller by the strut width.',
    },
    density: {
      label: 'Density', type: TYPE.NUMBER,
      min: 0.25, max: 4, step: 0.05, default: 1,
      doc: 'Multiplier for seed density and local target area.',
    },
    densityExpression: {
      advanced: true, label: 'Density(u,v)', type: TYPE.EXPRESSION,
      default: '',
      doc: 'Optional density multiplier in u,v. Empty = uniform density.',
    },
    irregularity: {
      label: 'Irregularity', type: TYPE.NUMBER,
      min: 0, max: 1, step: 0.01, default: 0.15,
      doc: 'Extra seed jitter. 0 keeps the area-weighted field; 1 adds controlled organic variation.',
    },
    relaxation: {
      label: 'Relaxation', type: TYPE.NUMBER,
      min: 0, max: 12, step: 1, default: 3,
      doc: 'Power/Lloyd iterations. More iterations equalize cell areas.',
    },
    aspect: {
      advanced: true, label: 'Aspect', type: TYPE.NUMBER,
      min: 0.25, max: 4, step: 0.05, default: 1,
      doc: 'Elongates cells in v; the area target is still measured on the surface.',
    },
    minOpeningWidth: {
      label: 'Min opening (mm)', type: TYPE.NUMBER,
      min: 0, max: 100, step: 0.5, default: 2,
      doc: 'Design target for the free opening width. The final solid is checked separately.',
    },
    boundaryMode: {
      advanced: true, label: 'Boundary', type: TYPE.SELECT,
      options: ['flag', 'clip'], default: 'flag',
      doc: 'Flag or clip cells touching the floor/rim.',
    },
    strut: {
      label: 'Strut (mm)', type: TYPE.NUMBER,
      min: 1, max: 12, step: 0.1, default: 3.5,
      doc: 'Strut diameter used when Fabricate turns the network into a solid.',
    },
    radiusExpression: {
      advanced: true, label: 'Radius(v,t)', type: TYPE.EXPRESSION,
      default: '',
      doc: 'Optional radius multiplier in v and t. 1 = base strut radius; clamped 0.25..2.',
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

  generate(params: LatticeParams, ctx: GeneratorContext): unknown[] {
    const fn = compileOrThrow(params.profile, 'R(v)', 'profile');
    const scope = makeScope(ctx);
    const radiusAt = (v: number): number => {
      scope.v = v;
      return fn(scope);
    };
    let densityAt: ((theta: number, z: number) => number) | null = null;
    let densityError = null;
    const densityExpression = typeof params.densityExpression === 'string'
      ? params.densityExpression.trim()
      : '';
    if (densityExpression) {
      try {
        const densityFn = compileOrThrow(densityExpression, 'density(u,v)', 'densityExpression');
        densityAt = (theta: number, z: number): number => {
          scope.u = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);
          scope.v = Math.max(0, Math.min(1, z / (Number(params.height) || 200)));
          scope.theta = theta;
          scope.z = z;
          return densityFn(scope);
        };
      } catch (error) {
        densityError = error instanceof Error ? error.message : 'density expression failed';
      }
    }
    const spec = normalizeLatticeSpec({
      profile: params.profile,
      height: params.height,
      top: (Number(params.height) || 200) - (Number(params.rim) || 4) / 2,
      floor: params.floor,
      cellSize: params.cellSize,
      density: params.density,
      densityExpression,
      irregularity: params.irregularity,
      relaxation: params.relaxation,
      aspect: params.aspect,
      boundaryMode: params.boundaryMode,
      seed: (Number(params.seed) || 0) + (Number(ctx.seed) || 1) * 9973,
      strutDiameter: params.strut,
      minOpeningWidth: params.minOpeningWidth,
    });
    const cacheKey = `${latticeSpecHash(spec)}:${Math.max(2, Math.round(Number(params.samples) || 6))}:${ctx.layerIndex ?? 0}`;
    let network = NETWORK_CACHE.get(cacheKey);
    if (!network) {
      network = buildRevolveLattice({
        spec,
        radiusAt,
        densityAt,
        densityError,
        samples: params.samples,
      }) as unknown as LatticeNetwork;
      if (NETWORK_CACHE.size >= NETWORK_CACHE_LIMIT) {
        const oldest = NETWORK_CACHE.keys().next().value;
        if (oldest !== undefined) NETWORK_CACHE.delete(oldest);
      }
      NETWORK_CACHE.set(cacheKey, network);
    }
    const net = network as LatticeNetwork;
    const height = Number(params.height) || 200;
    const latticeOpenings = net.cells
      .filter((cell) => !cell.boundary && !cell.invalidOpening && cell.openingCenter)
      .map((cell) => {
        const theta = cell.openingCenter!.theta;
        const z = cell.openingCenter!.z;
        const radius = radiusAt(Math.max(0, Math.min(1, z / height)));
        return {
          theta,
          z,
          x: radius * Math.cos(theta),
          y: radius * Math.sin(theta),
          width: cell.openingWidth,
          cellId: cell.id,
        };
      });
    return net.curves.map((curve, index) => createCurve3D({
      id: `surface-lattice:${ctx.layerIndex ?? 0}:${index}`,
      points: curve.points,
      closed: false,
      meta: {
        source: 'surface-lattice',
        lattice: net.stats,
        specHash: net.specHash,
        networkHash: net.networkHash,
        algorithmVersion: net.algorithmVersion,
        edgeId: curve.edgeId,
        cellIds: curve.cellIds,
        edgeLength: curve.length,
        ...(index === 0 ? { latticeOpenings } : {}),
      },
    }));
  },

  sample(params: LatticeParams, ctx: GeneratorContext): unknown[] {
    const geometry = (this as unknown as { generate(p: LatticeParams, c: GeneratorContext): unknown[] }).generate(params, ctx);
    return projectWorldCurves(geometry as never, {
      camera: cameraFrom((ctx.document as { view?: never } | undefined)?.view ?? null),
      projection: '3d',
      fit: params.fit,
      depthFade: params.depthOcclusion,
      depthStrength: params.depthAttenuation,
    });
  },
}) as unknown as GeneratorDefinition);
