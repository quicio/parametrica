/**
 * geometry/solidPrep.js — deterministic, non-destructive mesh preparation.
 *
 * Fabrication can close open parametric meshes without changing render
 * geometry. Every operation returns a new mesh plus a change report; inputs
 * are never mutated.
 */

import { createMesh } from './contracts.js';
import { clearManifoldGuarantee } from './trust.js';
import { validateMesh } from './validate.js';

export const DEFAULT_WELD_TOLERANCE = 1e-6;
export const DEFAULT_MAX_HOLE_EDGES = 256;

const EPS = 1e-12;

/**
 * Merge vertices within `tolerance` using a deterministic spatial hash.
 * Normals and UVs are dropped because their vertex correspondence may change.
 */
export function weldMesh(mesh, { tolerance = DEFAULT_WELD_TOLERANCE } = {}) {
  const tol = positiveTolerance(tolerance);
  const source = mesh;
  if (!isUsableMesh(source)) {
    return { mesh: source, stats: emptyStats(), warnings: ['mesh cannot be welded'] };
  }
  const vertices = source.vertices;
  const buckets = new Map();
  const remap = new Array(vertices.length);
  const merged = [];
  let mergedVertices = 0;

  for (let i = 0; i < vertices.length; i++) {
    const point = vertices[i];
    const cell = cellKey(point, tol);
    let found = -1;
    for (let dx = -1; dx <= 1 && found < 0; dx++) {
      for (let dy = -1; dy <= 1 && found < 0; dy++) {
        for (let dz = -1; dz <= 1 && found < 0; dz++) {
          const key = `${cell.x + dx}|${cell.y + dy}|${cell.z + dz}`;
          for (const candidate of buckets.get(key) ?? []) {
            if (distanceSquared(point, merged[candidate]) <= tol * tol) {
              found = candidate;
              break;
            }
          }
        }
      }
    }
    if (found >= 0) {
      remap[i] = found;
      mergedVertices++;
    } else {
      const index = merged.length;
      merged.push({ x: point.x, y: point.y, z: point.z });
      remap[i] = index;
      const key = `${cell.x}|${cell.y}|${cell.z}`;
      const list = buckets.get(key) ?? [];
      list.push(index);
      buckets.set(key, list);
    }
  }

  const faces = [];
  let removedFaces = 0;
  for (const face of source.faces) {
    const next = [];
    for (const index of face) {
      const mapped = remap[index];
      if (next[next.length - 1] !== mapped) next.push(mapped);
    }
    if (next.length > 2 && next[0] === next[next.length - 1]) next.pop();
    if (next.length < 3 || new Set(next).size < 3 || Math.abs(faceArea(merged, next)) < EPS) {
      removedFaces++;
      continue;
    }
    faces.push(next);
  }

  const result = createMesh({
    id: source.id,
    vertices: merged,
    faces,
    normals: null,
    faceNormals: null,
    uvs: null,
    meta: { ...clearManifoldGuarantee(source.meta), prepared: { weld: true, tolerance: tol } },
  });
  return {
    mesh: result,
    stats: {
      ...emptyStats(),
      inputVertices: source.vertices.length,
      outputVertices: merged.length,
      mergedVertices,
      removedFaces,
    },
    warnings: [],
  };
}

/**
 * Return directed open boundary loops. Each loop is an array of vertex
 * indices following the existing face winding.
 */
export function boundaryLoops(mesh) {
  if (!isUsableMesh(mesh)) return { loops: [], incomplete: true };
  const edges = new Map();
  for (const face of mesh.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = `${a}:${b}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  // An open edge is the directed edge whose reverse does not appear.
  const open = new Map();
  for (const [key, count] of edges) {
    const [a, b] = key.split(':').map(Number);
    const reverse = `${b}:${a}`;
    if (count === 1 && !edges.has(reverse)) open.set(a, b);
  }
  if (!open.size) return { loops: [], incomplete: false };

  const loops = [];
  const seen = new Set();
  let incomplete = false;
  for (const start of open.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let current = start;
    let guard = open.size + 1;
    while (guard-- > 0) {
      if (seen.has(current)) {
        if (current === start && loop.length >= 3) break;
        incomplete = true;
        break;
      }
      seen.add(current);
      loop.push(current);
      const next = open.get(current);
      if (next === undefined) {
        incomplete = true;
        break;
      }
      current = next;
    }
    if (current !== start) incomplete = true;
    if (loop.length >= 3 && current === start) loops.push(loop);
    else if (loop.length) incomplete = true;
  }
  return { loops, incomplete };
}

/**
 * Cap open boundary loops. Loops larger than maxHoleEdges are skipped.
 */
export function capMesh(mesh, { maxHoleEdges = DEFAULT_MAX_HOLE_EDGES } = {}) {
  const limit = Math.max(3, Math.floor(Number(maxHoleEdges) || DEFAULT_MAX_HOLE_EDGES));
  if (!isUsableMesh(mesh)) {
    return { mesh, stats: emptyStats(), warnings: ['mesh cannot be capped'] };
  }
  const { loops, incomplete } = boundaryLoops(mesh);
  if (!loops.length) {
    return {
      mesh,
      stats: { ...emptyStats(), inputVertices: mesh.vertices.length, outputVertices: mesh.vertices.length },
      warnings: incomplete ? ['boundary edges do not form complete loops'] : [],
    };
  }

  const vertices = mesh.vertices.map((point) => ({ x: point.x, y: point.y, z: point.z }));
  const faces = mesh.faces.map((face) => [...face]);
  const warnings = [];
  let cappedLoops = 0;
  let addedTriangles = 0;

  for (const loop of loops) {
    if (loop.length > limit) {
      warnings.push(`skipped ${loop.length}-edge hole (limit ${limit})`);
      continue;
    }
    if (loop.length === 3) {
      faces.push([loop[2], loop[1], loop[0]]);
      cappedLoops++;
      addedTriangles++;
      continue;
    }
    const centroid = loopCentroid(vertices, loop);
    const index = vertices.length;
    vertices.push(centroid);
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      faces.push([b, a, index]);
      addedTriangles++;
    }
    cappedLoops++;
  }

  const result = createMesh({
    id: mesh.id,
    vertices,
    faces,
    normals: null,
    faceNormals: null,
    uvs: null,
    meta: { ...clearManifoldGuarantee(mesh.meta), prepared: { ...(mesh.meta?.prepared ?? {}), cap: true, maxHoleEdges: limit } },
  });
  return {
    mesh: result,
    stats: {
      ...emptyStats(),
      inputVertices: mesh.vertices.length,
      outputVertices: vertices.length,
      cappedLoops,
      addedTriangles,
    },
    warnings,
  };
}

/**
 * Concatenate meshes with local index offsets. Optional welding runs after the
 * concatenation so coincident vertices across inputs can merge.
 */
export function mergeMeshes(meshes, { id = 'merged', weld = false, tolerance = DEFAULT_WELD_TOLERANCE } = {}) {
  const list = (Array.isArray(meshes) ? meshes : []).filter(isUsableMesh);
  if (!list.length) {
    return { mesh: null, stats: emptyStats(), warnings: ['no usable meshes to merge'] };
  }
  const vertices = [];
  const faces = [];
  let mergedVertices = 0;
  const shellIds = [];
  for (const mesh of list) {
    const offset = vertices.length;
    for (const point of mesh.vertices) vertices.push({ x: point.x, y: point.y, z: point.z });
    for (const face of mesh.faces) faces.push(face.map((index) => index + offset));
    shellIds.push(mesh.id ?? null);
  }
  let result = createMesh({
    id,
    vertices,
    faces,
    meta: { source: 'mesh-merge', shells: shellIds },
  });
  let stats = {
    ...emptyStats(),
    inputVertices: vertices.length,
    outputVertices: vertices.length,
  };
  const warnings = [];
  if (weld) {
    const welded = weldMesh(result, { tolerance });
    result = welded.mesh;
    mergedVertices = welded.stats.mergedVertices;
    stats = { ...welded.stats, inputVertices: vertices.length };
    warnings.push(...welded.warnings);
  }
  return { mesh: result, stats: { ...stats, mergedVertices, shells: list.length }, warnings };
}

/**
 * Compose weld and cap, then validate. This is the only function fabrication
 * should call; it returns a prepared copy and never mutates the input.
 */
export function prepareMesh(mesh, {
  weld = true,
  cap = true,
  tolerance = DEFAULT_WELD_TOLERANCE,
  maxHoleEdges = DEFAULT_MAX_HOLE_EDGES,
} = {}) {
  if (!weld && !cap) {
    return {
      mesh,
      validation: validateMesh(mesh),
      stats: emptyStats(),
      warnings: [],
      prepared: false,
    };
  }
  let current = mesh;
  let stats = emptyStats();
  const warnings = [];
  if (weld) {
    const welded = weldMesh(current, { tolerance });
    current = welded.mesh;
    stats = mergeStats(stats, welded.stats);
    warnings.push(...welded.warnings);
  }
  if (cap) {
    const capped = capMesh(current, { maxHoleEdges });
    current = capped.mesh;
    stats = mergeStats(stats, capped.stats);
    warnings.push(...capped.warnings);
  }
  const validation = validateMesh(current);
  return {
    mesh: current,
    validation,
    stats,
    warnings,
    prepared: true,
  };
}

function mergeStats(a, b) {
  return {
    inputVertices: Math.max(a.inputVertices, b.inputVertices),
    outputVertices: b.outputVertices || a.outputVertices,
    mergedVertices: a.mergedVertices + b.mergedVertices,
    removedFaces: a.removedFaces + b.removedFaces,
    cappedLoops: a.cappedLoops + b.cappedLoops,
    addedTriangles: a.addedTriangles + b.addedTriangles,
  };
}

function emptyStats() {
  return {
    inputVertices: 0,
    outputVertices: 0,
    mergedVertices: 0,
    removedFaces: 0,
    cappedLoops: 0,
    addedTriangles: 0,
  };
}

function isUsableMesh(mesh) {
  return Boolean(
    mesh
    && mesh.kind === 'mesh'
    && Array.isArray(mesh.vertices)
    && Array.isArray(mesh.faces)
    && mesh.vertices.length >= 3
    && mesh.faces.length,
  );
}

function positiveTolerance(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(number, 1) : DEFAULT_WELD_TOLERANCE;
}

function cellKey(point, tol) {
  return {
    x: Math.floor(point.x / tol),
    y: Math.floor(point.y / tol),
    z: Math.floor(point.z / tol),
  };
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function loopCentroid(vertices, loop) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const index of loop) {
    x += vertices[index].x;
    y += vertices[index].y;
    z += vertices[index].z;
  }
  return { x: x / loop.length, y: y / loop.length, z: z / loop.length };
}

function faceArea(vertices, face) {
  const a = vertices[face[0]];
  let area = 0;
  for (let i = 1; i < face.length - 1; i++) {
    const b = vertices[face[i]];
    const c = vertices[face[i + 1]];
    const abx = b.x - a.x; const aby = b.y - a.y; const abz = b.z - a.z;
    const acx = c.x - a.x; const acy = c.y - a.y; const acz = c.z - a.z;
    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;
    area += 0.5 * Math.hypot(cx, cy, cz);
  }
  return area;
}
