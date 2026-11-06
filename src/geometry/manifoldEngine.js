/**
 * geometry/manifoldEngine.js — Manifold WASM adapter.
 *
 * Manifold is loaded lazily and synchronously usable once ready. Our Mesh/Solid
 * data is converted to Manifold Mesh, the boolean runs, and the result is
 * converted back and validated by the standard mesh gate.
 */

import { createMesh, isMesh, isSolid } from './contracts.js';
import { validateMesh } from './validate.js';
import { repairMesh } from './repair.js';

let modulePromise = null;
let wasm = null;

export function initManifold() {
  if (!modulePromise) {
    modulePromise = import('manifold-3d')
      .then(async (module) => {
        let options;
        const browserRuntime = typeof window !== 'undefined'
          || (typeof self !== 'undefined' && typeof self.postMessage === 'function');
        if (browserRuntime) {
          const wasm = await import('manifold-3d/manifold.wasm?url');
          options = { locateFile: () => wasm.default };
        }
        return module.default(options);
      })
      .then((loaded) => {
        loaded.setup();
        wasm = loaded;
        return loaded;
      })
      .catch((error) => {
        modulePromise = null;
        throw error;
      });
  }
  return modulePromise;
}

export function isManifoldReady() {
  return Boolean(wasm);
}

export function manifoldBoolean(operation, operands, { tolerance = 1e-4 } = {}) {
  if (!wasm) {
    return failure('not-ready', 'Manifold is still loading', emptyStats(operation, tolerance));
  }
  const list = Array.isArray(operands) ? operands : [operands];
  const stats = emptyStats(operation, tolerance);
  if (list.length < 2) {
    return failure('invalid-operand', 'Manifold boolean requires at least two operands', stats);
  }
  const meshes = list.map(boundaryMesh);
  if (meshes.some((mesh) => !mesh)) {
    return failure('invalid-operand', 'Manifold operands must be Mesh or Solid values', stats);
  }
  for (const mesh of meshes) {
    const validation = validateMesh(mesh);
    if (!validation.ok || !validation.meta?.closed) {
      return failure(
        'invalid-operand',
        `Manifold operand is not a validated closed solid: ${validation.errors[0] ?? 'unknown error'}`,
        stats,
        validation,
      );
    }
    stats.inputTriangles += mesh.faces.length;
  }

  const { Manifold } = wasm;
  const built = [];
  let result = null;
  try {
    for (const mesh of meshes) built.push(Manifold.ofMesh(toManifoldMesh(mesh, tolerance)));
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
    const repaired = repairMesh(geometry, {
      tolerance,
      capStrategy: 'none',
      orient: false,
      topology: 'split',
    });
    const output = repaired.mesh ?? geometry;
    const validation = repaired.validation ?? validateMesh(output);
    stats.outputTriangles = output.faces.length;
    stats.repaired = repaired.report?.changed ?? false;
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
    return failure('manifold-error', error?.message ?? String(error), stats);
  } finally {
    if (result) result.delete();
    for (const manifold of built) manifold.delete();
  }
}

export function manifoldLevelSet(sdf, {
  bounds,
  edgeLength,
  tolerance = -1,
  level = 0,
  repairTolerance = 1e-4,
} = {}) {
  const stats = {
    engine: 'manifold',
    strategy: 'manifold-levelset',
    edgeLength,
    tolerance,
    outputTriangles: 0,
  };
  if (!wasm) {
    return failure('not-ready', 'Manifold is still loading', stats);
  }
  if (!bounds || !Number.isFinite(edgeLength) || edgeLength <= 0) {
    return failure('invalid-options', 'manifoldLevelSet requires bounds and a positive edgeLength', stats);
  }
  let manifold = null;
  try {
    const box = {
      min: Array.isArray(bounds.min) ? bounds.min : [bounds.min.x, bounds.min.y, bounds.min.z],
      max: Array.isArray(bounds.max) ? bounds.max : [bounds.max.x, bounds.max.y, bounds.max.z],
    };
    manifold = wasm.Manifold.levelSet(sdf, box, edgeLength, level, tolerance);
    if (manifold.numTri() > 0) {
      const simplified = manifold.simplify(Math.max(repairTolerance, edgeLength * 1e-4));
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
      output = repaired.mesh ?? geometry;
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
    return failure('manifold-error', error?.message ?? String(error), stats);
  } finally {
    if (manifold) manifold.delete();
  }
}

function toManifoldMesh(mesh, tolerance) {
  const vertProperties = new Float32Array(mesh.vertices.length * 3);
  for (let i = 0; i < mesh.vertices.length; i++) {
    const point = mesh.vertices[i];
    vertProperties[i * 3] = point.x;
    vertProperties[i * 3 + 1] = point.y;
    vertProperties[i * 3 + 2] = point.z;
  }
  const indices = [];
  for (const face of mesh.faces) {
    for (let i = 1; i < face.length - 1; i++) {
      indices.push(face[0], face[i], face[i + 1]);
    }
  }
  return new wasm.Mesh({
    numProp: 3,
    vertProperties,
    triVerts: new Uint32Array(indices),
    tolerance,
  });
}

function fromManifold(manifold, id) {
  const output = manifold.getMesh();
  const vertexCount = output.vertProperties.length / output.numProp;
  const vertices = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const offset = i * output.numProp;
    vertices[i] = {
      x: output.vertProperties[offset],
      y: output.vertProperties[offset + 1],
      z: output.vertProperties[offset + 2],
    };
  }
  const parent = Array.from({ length: vertexCount }, (_, index) => index);
  const find = (index) => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = root;
      index = next;
    }
    return root;
  };
  const from = output.mergeFromVert ?? [];
  const to = output.mergeToVert ?? [];
  for (let i = 0; i < Math.min(from.length, to.length); i++) {
    const a = find(from[i]);
    const b = find(to[i]);
    if (a !== b) parent[a] = b;
  }
  const remap = new Map();
  const compact = [];
  const compactIndex = (index) => {
    const root = find(index);
    if (!remap.has(root)) {
      remap.set(root, compact.length);
      compact.push(vertices[root]);
    }
    return remap.get(root);
  };
  const faces = [];
  for (let i = 0; i < output.triVerts.length; i += 3) {
    const a = compactIndex(output.triVerts[i]);
    const b = compactIndex(output.triVerts[i + 1]);
    const c = compactIndex(output.triVerts[i + 2]);
    if (a !== b && b !== c && c !== a) faces.push([a, b, c]);
  }
  return createMesh({ id, vertices: compact, faces, meta: { source: 'manifold', manifoldGuaranteed: true } });
}

function boundaryMesh(geometry) {
  if (isSolid(geometry)) return isMesh(geometry.boundary) ? geometry.boundary : null;
  if (isMesh(geometry)) return geometry;
  return null;
}

function emptyStats(operation, tolerance) {
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

function failure(code, message, stats, validation = null) {
  return {
    ok: false,
    empty: false,
    geometry: null,
    validation,
    error: { code, message },
    stats,
  };
}
