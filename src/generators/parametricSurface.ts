/**
 * parametricSurface.js — first world-space parametric surface generator.
 *
 *   x = fx(u, v)   y = fy(u, v)   z = fz(u, v)
 *
 * The generator returns a world Surface grid. Camera projection, tessellation
 * and rendering happen downstream.
 */

import { Generators } from '../core/registry.ts';
import { TYPE } from '../core/schema.ts';
import type { GeneratorDefinition } from '../core/registry.ts';
import type { GeneratorContext } from './context.ts';

interface SurfaceParams {
  [key: string]: unknown;
  exprX: string; exprY: string; exprZ: string;
  u0: number; u1: number; v0: number; v1: number; samplesU: number; samplesV: number;
  closedU: boolean; closedV: boolean; seamU: string; seamV: string; fit: number;
}
import { compileOrThrow, makeScope, TAU } from './helpers.js';
import { createSurface } from '../geometry/contracts.js';

Generators.register(({
  id: 'parametric-surface',
  name: 'Parametric Surface',
  category: 'surface',
  capabilities: {
    spatial: true,
    projection: '3d',
    geometryKind: 'surface',
    supportsFit: true,
    supportsClosed: true,
  },
  params: {
    exprX: {
      label: 'x(u,v)', type: TYPE.EXPRESSION,
      default: '(2 + cos(v))*cos(u)',
      doc: 'World x as a function of u, v and time.',
    },
    exprY: {
      label: 'y(u,v)', type: TYPE.EXPRESSION,
      default: '(2 + cos(v))*sin(u)',
      doc: 'World y as a function of u, v and time.',
    },
    exprZ: {
      label: 'z(u,v)', type: TYPE.EXPRESSION,
      default: 'sin(v)',
      doc: 'World z as a function of u, v and time.',
    },
    u0: { label: 'u min', type: TYPE.NUMBER, min: -2 * TAU, max: 2 * TAU, step: 0.05, snap: false, default: 0 },
    u1: { label: 'u max', type: TYPE.NUMBER, min: -2 * TAU, max: 4 * TAU, step: 0.05, snap: false, default: TAU },
    v0: { label: 'v min', type: TYPE.NUMBER, min: -2 * TAU, max: 2 * TAU, step: 0.05, snap: false, default: 0 },
    v1: { label: 'v max', type: TYPE.NUMBER, min: -2 * TAU, max: 4 * TAU, step: 0.05, snap: false, default: TAU },
    samplesU: { label: 'Samples U', type: TYPE.NUMBER, min: 8, max: 160, step: 1, default: 64 },
    samplesV: { label: 'Samples V', type: TYPE.NUMBER, min: 8, max: 160, step: 1, default: 32 },
    closedU: { label: 'Close U', type: TYPE.BOOLEAN, default: true },
    closedV: { label: 'Close V', type: TYPE.BOOLEAN, default: true },
    seamU: {
      advanced: true, label: 'U seam', type: TYPE.SELECT,
      options: ['normal', 'reverse'], default: 'normal',
      doc: 'Normal joins v to v at the U seam; reverse joins v to -v (half twist).',
    },
    seamV: {
      advanced: true, label: 'V seam', type: TYPE.SELECT,
      options: ['normal', 'reverse'], default: 'normal',
      doc: 'Normal joins u to u at the V seam; reverse joins u to -u (half twist).',
    },
    fit: { advanced: true, label: 'Fit Size', type: TYPE.NUMBER, min: 0, max: 800, step: 1, default: 340 },
  },

  // Compatibility domain for the generic generator contract. The surface grid
  // itself carries the U/V domains.
  domain: () => ({ t0: 0, t1: 1, closed: false }),

  generate(params: SurfaceParams, ctx: GeneratorContext): unknown[] {
    const fx = compileOrThrow(params.exprX, 'x(u,v)', 'exprX');
    const fy = compileOrThrow(params.exprY, 'y(u,v)', 'exprY');
    const fz = compileOrThrow(params.exprZ, 'z(u,v)', 'exprZ');
    const scope = makeScope(ctx);
    const uCells = Math.max(2, Math.floor(params.samplesU));
    const vCells = Math.max(2, Math.floor(params.samplesV));
    // A cell interval needs both endpoints. Closed axes repeat the first
    // sample at the seam; open axes keep the final endpoint as a distinct row.
    const uSamples = uCells + 1;
    const vSamples = vCells + 1;
    const points = [];

    for (let uIndex = 0; uIndex < uSamples; uIndex++) {
      const uRatio = uIndex / uCells;
      const u = params.u0 + (params.u1 - params.u0) * uRatio;
      const row = [];
      for (let vIndex = 0; vIndex < vSamples; vIndex++) {
        const vRatio = vIndex / vCells;
        const v = params.v0 + (params.v1 - params.v0) * vRatio;
        scope.u = u;
        scope.v = v;
        scope.t = u;
        scope.theta = v;
        const x = fx(scope);
        const y = fy(scope);
        const z = fz(scope);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
          const error = new Error(`non-finite surface point at u=${u.toFixed(4)}, v=${v.toFixed(4)}`);
          (error as Error & { key?: string }).key = 'exprX';
          throw error;
        }
        row.push({ x, y, z });
      }
      points.push(row);
    }

    return [createSurface({
      id: 'parametric-surface',
      domain: {
        u: [params.u0, params.u1],
        v: [params.v0, params.v1],
        closedU: Boolean(params.closedU),
        closedV: Boolean(params.closedV),
        seamU: params.seamU,
        seamV: params.seamV,
      },
      grid: { rows: uSamples, cols: vSamples, points },
      meta: {
        source: 'parametric-surface',
        cellsU: uCells,
        cellsV: vCells,
        closedU: Boolean(params.closedU),
        closedV: Boolean(params.closedV),
        seamU: params.seamU,
        seamV: params.seamV,
      },
    })];
  },
}) as unknown as GeneratorDefinition);
