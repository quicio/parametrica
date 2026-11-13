/**
 * geometry/manifoldEngine.ts — Manifold WASM adapter.
 *
 * Manifold is loaded lazily and synchronously usable once ready. Our Mesh/Solid
 * data is converted to Manifold Mesh, the boolean runs, and the result is
 * converted back and validated by the standard mesh gate.
 */

import { createMesh, isMesh, isSolid } from './contracts.ts';
import type { Mesh, Point3D } from './contracts.ts';
import { validateMesh } from './validate.ts';
import type { ValidationResult } from './validate.ts';
import { repairMesh } from './repair.ts';
import type { Manifold, ManifoldToplevel, Mesh as ManifoldMesh, Vec3 } from 'manifold-3d';

type Rec = Record<string, unknown>;
type BoundsLike = { min: number[] | Vec3; max: number[] | Vec3 };

export interface ManifoldResult {
  ok: boolean;
  empty?: boolean;
  geometry: unknown;
  validation?: ValidationResult | null;
  error?: { code: string; message: string };
  stats: Rec;
}

export interface ManifoldLevelSetOptions {
  bounds?: BoundsLike;
  edgeLength?: number;
  tolerance?: number;
  level?: number;
  repairTolerance?: number;
}

let modulePromise: Promise<ManifoldToplevel> | null = null;
let wasm: ManifoldToplevel | null = null;

export function initManifold(): Promise<ManifoldToplevel> {
  if (!modulePromise) {
    modulePromise = import('manifold-3d')
      .then(async (module) => {
        let options: { locateFile: () => string } | undefined;
        const browserRuntime = typeof window !== 'undefined'
          || (typeof self !== 'undefined' && typeof self.postMessage === 'function');
        if (browserRuntime) {
          const wasmModule = await import('manifold-3d/manifold.wasm?url');
          options = { locateFile: () => wasmModule.default };
        }
        return module.default(options);
      })
      .then((loaded) => {
        loaded.setup();
        wasm = loaded;
        return loaded;
      })
      .catch((error: unknown) => {
        modulePromise = null;
        throw error;
      });
  }
  return modulePromise;
}

export function isManifoldReady(): boolean {
  return Boolean(wasm);
}

export function manifoldBoolean(operation: string, operands: unknown, { tolerance = 1e-4 }: { tolerance?: number } = {}): ManifoldResult {
  if (!wasm) {
    return failure('not-ready', 'Manifold is still loading', emptyStats(operation, tolerance));
  }
  const engine = wasm;
  const list = Array.isArray(operands) ? operands : [operands];
  const stats = emptyStats(operation, tolerance);
  if (list.length < 2) {
    return failure('invalid-operand', 'Manifold boolean requires at least two operands', stats);
  }
  const meshes = list.map(boundaryMesh);
  if (meshes.some((mesh) => !mesh)) {
    return failure('invalid-operand', 'Manifold operands must be Mesh or Solid values', stats);
  }
  const solids = meshes as Mesh[];
  for (const mesh of solids) {
    const validation = validateMesh(mesh);
    if (!validation.ok || !validation.meta?.closed) {
      return failure(
        'invalid-operand',
        `Manifold operand is not a validated closed solid: ${validation.errors[0] ?? 'unknown error'}`,
        stats,
        validation,
      );
    }
    stats.inputTriangles = (stats.inputTriangles as number) + mesh.faces.length;
  }

  const { Manifold } = engine;
  const built: Manifold[] = [];
  let result: Manifold | null = null;
  try {
    for (const mesh of solids) built.push(Manifold.ofMesh(toManifoldMesh(mesh, tolerance, engine)));
    if (operation === 'union') result = Manifold.union(built);
    else if (operation === 'difference') result = Manifold.difference(built);
    else if (operation === 'intersection') result = Manifold.intersection(built);
    else return failure('invalid-operation', `unsupported boolean operation "${operation}"`, stats);

    const status = result.status();
    if (status !== 'NoError') {
      return failure('manifold-error', `Manifold returned ${status}`, stats);
    }
    if (result.numTri() === 0) {
      return { ok: true, empty: true, geometry: null, validation: null, stats };
    }
    const geometry = fromManifold(result, `${operation}-manifold`);
    geometry.meta = {
      ...geometry.meta,
      source: 'manifold',
      boolean: { operation, operands: list.length, tolerance },
    };
    const rawValidation = validateMesh(geometry);
    let output = geometry;
    let validation = rawValidation;
    let repairedReport: { changed?: boolean } | null = null;
    if (!rawValidation.ok) {
      const attempts = [false, true].flatMap((orient) => [false, true].map((split) => ({
        orient,
        topology: split ? 'split' : 'none',
      })));
      for (const attempt of attempts) {
        const repaired = repairMesh(geometry, {
          tolerance,
          capStrategy: 'none',
          orient: attempt.orient,
          topology: attempt.topology,
        });
        repairedReport = repaired.report ?? repairedReport;
        if (repaired.validation?.ok) {
          output = (repaired.mesh as Mesh | null | undefined) ?? geometry;
          validation = repaired.validation;
          break;
        }
      }
    }
    stats.outputTriangles = output.faces.length;
    stats.repaired = repairedReport?.changed ?? false;
    if (!validation.ok) {
      // Keep the raw result so callers that own a post-repair step can close
      // small cracks instead of discarding potentially valid geometry.
      return {
        ...failure('invalid-result', validation.errors[0] ?? 'Manifold output failed validation', stats, validation),
        geometry: output,
      };
    }
    output.meta = {
      ...output.meta,
      source: 'manifold',
      boolean: { operation, operands: list.length, tolerance },
    };
    return { ok: true, empty: false, geometry: output, validation, stats };
  } catch (error) {
    return failure('manifold-error', error instanceof Error ? error.message : String(error), stats);
  } finally {
    if (result) result.delete();
    for (const manifold of built) manifold.delete();
  }
}

/**
 * Reduce a closed mesh for display. The source and result stay Mesh data;
 * callers must keep using the original for export.
 */
export function manifoldSimplify(mesh: unknown, { tolerance = 0.2, repairTolerance = 1e-4 }: { tolerance?: number; repairTolerance?: number } = {}): ManifoldResult {
  if (!wasm) {
    return { ok: false, geometry: null, error: { code: 'not-ready', message: 'Manifold is still loading' }, stats: {} };
  }
  if (!isMesh(mesh)) {
    return { ok: false, geometry: null, error: { code: 'invalid-operand', message: 'manifoldSimplify requires a Mesh' }, stats: {} };
  }
  const engine = wasm;
  const inputTriangles = mesh.faces.length;
  let source: Manifold | null = null;
  let simplified: Manifold | null = null;
  try {
    source = engine.Manifold.ofMesh(toManifoldMesh(mesh, repairTolerance, engine));
    const status = source.status();
    if (status !== 'NoError') {
      return { ok: false, geometry: null, error: { code: 'manifold-error', message: `Manifold returned ${status}` }, stats: { inputTriangles } };
    }
    simplified = source.simplify(tolerance);
    if (simplified.status() !== 'NoError' || simplified.numTri() === 0) {
      return { ok: false, geometry: null, error: { code: 'empty-result', message: 'simplify produced no geometry' }, stats: { inputTriangles } };
    }
    const geometry = fromManifold(simplified, `${mesh.id ?? 'mesh'}-preview`);
    const validation = validateMesh(geometry);
    return {
      ok: true,
      geometry,
      validation,
      stats: {
        inputTriangles,
        outputTriangles: geometry.faces.length,
        tolerance,
        strategy: 'manifold-simplify',
      },
    };
  } catch (error) {
    return { ok: false, geometry: null, error: { code: 'manifold-error', message: error instanceof Error ? error.message : String(error) }, stats: { inputTriangles } };
  } finally {
    if (simplified) simplified.delete();
    if (source) source.delete();
  }
}

export function manifoldLevelSet(sdf: (point: Vec3) => number, {
  bounds,
  edgeLength,
  tolerance = -1,
  level = 0,
  repairTolerance = 1e-4,
}: ManifoldLevelSetOptions = {}): ManifoldResult {
  const stats: Rec = {
    engine: 'manifold',
    strategy: 'manifold-levelset',
    edgeLength,
    tolerance,
    outputTriangles: 0,
  };
  if (!wasm) {
    return failure('not-ready', 'Manifold is still loading', stats);
  }
  if (!bounds || !Number.isFinite(edgeLength) || (edgeLength as number) <= 0) {
    return failure('invalid-options', 'manifoldLevelSet requires bounds and a positive edgeLength', stats);
  }
  const engine = wasm;
  const length = edgeLength as number;
  let manifold: Manifold | null = null;
  try {
    const min = bounds.min as unknown;
    const max = bounds.max as unknown;
    const minPoint = min as { x: number; y: number; z: number };
    const maxPoint = max as { x: number; y: number; z: number };
    const box = {
      min: (Array.isArray(min) ? min : [minPoint.x, minPoint.y, minPoint.z]) as Vec3,
      max: (Array.isArray(max) ? max : [maxPoint.x, maxPoint.y, maxPoint.z]) as Vec3,
    };
    manifold = engine.Manifold.levelSet(sdf, box, length, level, tolerance);
    if (manifold.numTri() > 0) {
      const simplified = manifold.simplify(Math.max(repairTolerance, length * 1e-4));
      manifold.delete();
      manifold = simplified;
    }
    const status = manifold.status();
    if (status !== 'NoError') return failure('manifold-error', `Manifold levelSet returned ${status}`, stats);
    if (manifold.numTri() === 0) return { ok: true, empty: true, geometry: null, validation: null, stats };
    const geometry = fromManifold(manifold, 'sdf-manifold');
    let validation = validateMesh(geometry);
    let output = geometry;
    if (!validation.ok) {
      const repaired = repairMesh(geometry, {
        tolerance: repairTolerance,
        capStrategy: 'auto',
        orient: false,
        topology: 'split',
      });
      output = (repaired.mesh as Mesh | null | undefined) ?? geometry;
      validation = repaired.validation ?? validateMesh(output);
      stats.repaired = repaired.report?.changed ?? false;
    }
    stats.outputTriangles = output.faces.length;
    if (!validation.ok) {
      return failure('invalid-result', validation.errors[0] ?? 'levelSet output failed validation', stats, validation);
    }
    output.meta = { ...output.meta, source: 'manifold-levelset' };
    return { ok: true, empty: false, geometry: output, validation, stats };
  } catch (error) {
    return failure('manifold-error', error instanceof Error ? error.message : String(error), stats);
  } finally {
    if (manifold) manifold.delete();
  }
}

function toManifoldMesh(mesh: Mesh, tolerance: number, engine: ManifoldToplevel): ManifoldMesh {
  const vertProperties = new Float32Array(mesh.vertices.length * 3);
  for (let i = 0; i < mesh.vertices.length; i++) {
    const point = mesh.vertices[i]!;
    vertProperties[i * 3] = point.x;
    vertProperties[i * 3 + 1] = point.y;
    vertProperties[i * 3 + 2] = point.z;
  }
  const indices: number[] = [];
  for (const face of mesh.faces) {
    for (let i = 1; i < face.length - 1; i++) {
      indices.push(face[0]!, face[i]!, face[i + 1]!);
    }
  }
  return new engine.Mesh({
    numProp: 3,
    vertProperties,
    triVerts: new Uint32Array(indices),
    tolerance,
  });
}

function fromManifold(manifold: Manifold, id: string): Mesh {
  const output = manifold.getMesh();
  const vertexCount = output.vertProperties.length / output.numProp;
  const vertices: Point3D[] = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const offset = i * output.numProp;
    vertices[i] = {
      x: output.vertProperties[offset]!,
      y: output.vertProperties[offset + 1]!,
      z: output.vertProperties[offset + 2]!,
    };
  }
  const parent = Array.from({ length: vertexCount }, (_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root]!;
    while (parent[index] !== index) {
      const next = parent[index]!;
      parent[index] = root;
      index = next;
    }
    return root;
  };
  const from = output.mergeFromVert ?? [];
  const to = output.mergeToVert ?? [];
  for (let i = 0; i < Math.min(from.length, to.length); i++) {
    const a = find(from[i]!);
    const b = find(to[i]!);
    if (a !== b) parent[a] = b;
  }
  const remap = new Map<number, number>();
  const compact: Point3D[] = [];
  const compactIndex = (index: number): number => {
    const root = find(index);
    if (!remap.has(root)) {
      remap.set(root, compact.length);
      compact.push(vertices[root]!);
    }
    return remap.get(root)!;
  };
  const faces: number[][] = [];
  for (let i = 0; i < output.triVerts.length; i += 3) {
    const a = compactIndex(output.triVerts[i]!);
    const b = compactIndex(output.triVerts[i + 1]!);
    const c = compactIndex(output.triVerts[i + 2]!);
    if (a !== b && b !== c && c !== a) faces.push([a, b, c]);
  }
  return createMesh({ id, vertices: compact, faces, meta: { source: 'manifold', manifoldGuaranteed: true } });
}

function boundaryMesh(geometry: unknown): Mesh | null {
  if (isSolid(geometry)) return isMesh(geometry.boundary) ? geometry.boundary : null;
  if (isMesh(geometry)) return geometry;
  return null;
}

function emptyStats(operation: string, tolerance: number): Rec {
  return {
    operation,
    engine: 'manifold',
    strategy: 'manifold',
    requestedStrategy: 'manifold',
    fallback: null,
    inputTriangles: 0,
    outputTriangles: 0,
    tolerance,
  };
}

function failure(code: string, message: string, stats: Rec, validation: ValidationResult | null = null): ManifoldResult {
  return {
    ok: false,
    empty: false,
    geometry: null,
    validation,
    error: { code, message },
    stats,
  };
}
