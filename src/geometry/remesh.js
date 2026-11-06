/**
 * geometry/remesh.js — deterministic voxel remeshing for repair and CSG.
 *
 * A boolean inside/outside field is sampled on a regular grid, then an
 * iso-surface is extracted with marching tetrahedra. The result is welded,
 * oriented and validated by the existing repair/validation pipeline.
 */

import { createMesh, isMesh, isSolid } from './contracts.js';
import { repairMesh } from './repair.js';
import { validateMesh } from './validate.js';

export const DEFAULT_REMESH_RESOLUTION = 64;
export const DEFAULT_REMESH_MAX_POINTS = 2_000_000;

/**
 * @param {Array<object>|object} inputs Mesh/Solid values
 * @param {{operation?:string,resolution?:number,maxPoints?:number,tolerance?:number}} options
 */
export function remesh(inputs, {
  operation = 'union',
  resolution = DEFAULT_REMESH_RESOLUTION,
  maxPoints = DEFAULT_REMESH_MAX_POINTS,
  tolerance = 1e-4,
} = {}) {
  const meshes = (Array.isArray(inputs) ? inputs : [inputs]).map(boundaryMesh).filter(Boolean);
  if (!meshes.length) return { ok: false, empty: true, mesh: null, error: { code: 'invalid-operand', message: 'remesh requires Mesh/Solid input' } };
  const bvhs = meshes.map((mesh) => buildTriangleBvh(mesh));
  const bbox = meshes.reduce((box, mesh) => mergeBbox(box, meshBbox(mesh)), emptyBbox());
  const maxExtent = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z);
  if (!Number.isFinite(maxExtent) || maxExtent <= 0) {
    return { ok: false, empty: true, mesh: null, error: { code: 'degenerate', message: 'remesh requires a non-degenerate bbox' } };
  }
  const n = Math.max(8, Math.floor(Number(resolution) || DEFAULT_REMESH_RESOLUTION));
  const cell = maxExtent / n;
  const pad = cell * 2;
  const min = { x: bbox.min.x - pad, y: bbox.min.y - pad, z: bbox.min.z - pad };
  const max = { x: bbox.max.x + pad, y: bbox.max.y + pad, z: bbox.max.z + pad };
  const nx = Math.max(2, Math.ceil((max.x - min.x) / cell) + 1);
  const ny = Math.max(2, Math.ceil((max.y - min.y) / cell) + 1);
  const nz = Math.max(2, Math.ceil((max.z - min.z) / cell) + 1);
  const points = nx * ny * nz;
  if (points > maxPoints) {
    return {
      ok: false,
      empty: false,
      mesh: null,
      error: { code: 'complexity', message: `remesh grid has ${points} points (limit ${maxPoints})` },
      stats: { resolution: n, grid: [nx, ny, nz] },
    };
  }

  const inside = new Uint8Array(points);
  for (let k = 0; k < nz; k++) {
    const z = min.z + k * cell;
    for (let j = 0; j < ny; j++) {
      const y = min.y + j * cell;
      for (let i = 0; i < nx; i++) {
        const x = min.x + i * cell;
        const point = { x, y, z };
        let value = false;
        for (let m = 0; m < bvhs.length; m++) {
          const inMesh = insideMesh(bvhs[m], point);
          if (m === 0) value = inMesh;
          else if (operation === 'union') value = value || inMesh;
          else if (operation === 'intersection') value = value && inMesh;
          else if (operation === 'difference') value = value && !inMesh;
        }
        inside[(k * ny + j) * nx + i] = value ? 1 : 0;
      }
    }
  }

  const vertices = [];
  const faces = [];
  const edgeVertices = new Map();
  const vertexForEdge = (a, b, pa, pb, va, vb) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const existing = edgeVertices.get(key);
    if (existing !== undefined) return existing;
    const t = (0.5 - va) / (vb - va);
    const point = {
      x: pa.x + (pb.x - pa.x) * t,
      y: pa.y + (pb.y - pa.y) * t,
      z: pa.z + (pb.z - pa.z) * t,
    };
    const index = vertices.length;
    vertices.push(point);
    edgeVertices.set(key, index);
    return index;
  };

  const corner = (i, j, k) => ({
    index: (k * ny + j) * nx + i,
    point: { x: min.x + i * cell, y: min.y + j * cell, z: min.z + k * cell },
  });
  const tetrahedra = [
    [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6],
    [0, 7, 4, 6], [0, 4, 5, 6], [0, 5, 1, 6],
  ];

  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const corners = [
          corner(i, j, k), corner(i + 1, j, k), corner(i + 1, j + 1, k), corner(i, j + 1, k),
          corner(i, j, k + 1), corner(i + 1, j, k + 1), corner(i + 1, j + 1, k + 1), corner(i, j + 1, k + 1),
        ];
        for (const tetra of tetrahedra) {
          const values = tetra.map((index) => inside[corners[index].index]);
          const insideCount = values.reduce((sum, value) => sum + value, 0);
          if (insideCount === 0 || insideCount === 4) continue;
          if (insideCount === 1) {
            const a = tetra[values.indexOf(1)];
            const b = tetra.filter((_, index) => values[index] === 0);
            addTriangle(vertices, faces, vertexForEdge, corners, a, b[0], b[1], b[2], values, tetra);
          } else if (insideCount === 3) {
            const a = tetra[values.indexOf(0)];
            const b = tetra.filter((_, index) => values[index] === 1);
            addTriangle(vertices, faces, vertexForEdge, corners, a, b[0], b[1], b[2], values, tetra);
          } else {
            const insideCorners = tetra.filter((_, index) => values[index] === 1);
            const outsideCorners = tetra.filter((_, index) => values[index] === 0);
            const [a, b] = insideCorners;
            const [c, d] = outsideCorners;
            const ac = edgeVertex(vertexForEdge, corners, tetra, values, a, c);
            const ad = edgeVertex(vertexForEdge, corners, tetra, values, a, d);
            const bd = edgeVertex(vertexForEdge, corners, tetra, values, b, d);
            const bc = edgeVertex(vertexForEdge, corners, tetra, values, b, c);
            faces.push([ac, ad, bd], [ac, bd, bc]);
          }
        }
      }
    }
  }

  if (!faces.length) {
    return { ok: true, empty: true, mesh: null, stats: { resolution: n, grid: [nx, ny, nz] } };
  }
  const raw = createMesh({ id: 'remesh', vertices, faces, meta: { source: 'remesh', operation, resolution: n } });
  const repaired = repairMesh(raw, { tolerance, capStrategy: 'auto', orient: true, topology: n > 0 ? 'split' : 'none' });
  const validation = repaired.validation ?? validateMesh(raw);
  return {
    ok: Boolean(repaired.mesh),
    empty: false,
    mesh: repaired.mesh ?? raw,
    validation,
    stats: {
      resolution: n,
      grid: [nx, ny, nz],
      triangles: (repaired.mesh ?? raw).faces.length,
      volume: validation?.meta?.volume ?? null,
    },
    report: repaired.report,
  };
}

function addTriangle(vertices, faces, vertexForEdge, corners, a, b, c, d, values, tetra) {
  const ab = edgeVertex(vertexForEdge, corners, tetra, values, a, b);
  const ac = edgeVertex(vertexForEdge, corners, tetra, values, a, c);
  const ad = edgeVertex(vertexForEdge, corners, tetra, values, a, d);
  faces.push([ab, ac, ad]);
}

function edgeVertex(vertexForEdge, corners, tetra, values, a, b) {
  const ia = corners[a].index;
  const ib = corners[b].index;
  return vertexForEdge(ia, ib, corners[a].point, corners[b].point, valueAt(tetra, values, a), valueAt(tetra, values, b));
}

function valueAt(tetra, values, cornerIndex) {
  const position = tetra.indexOf(cornerIndex);
  return values[position];
}

/* ———————— BVH / inside ———————— */

function buildTriangleBvh(mesh) {
  const triangles = [];
  for (const face of mesh.faces) {
    if (!Array.isArray(face) || face.length < 3) continue;
    for (let i = 1; i < face.length - 1; i++) {
      const a = mesh.vertices[face[0]];
      const b = mesh.vertices[face[i]];
      const c = mesh.vertices[face[i + 1]];
      if (!a || !b || !c) continue;
      triangles.push({
        a, b, c,
        bbox: {
          min: { x: Math.min(a.x, b.x, c.x), y: Math.min(a.y, b.y, c.y), z: Math.min(a.z, b.z, c.z) },
          max: { x: Math.max(a.x, b.x, c.x), y: Math.max(a.y, b.y, c.y), z: Math.max(a.z, b.z, c.z) },
        },
      });
    }
  }
  return { root: buildNode(triangles, triangles.map((_, index) => index)), triangles };
}

function buildNode(triangles, indices) {
  const bbox = indices.reduce((box, index) => mergeBbox(box, triangles[index].bbox), emptyBbox());
  if (indices.length <= 8) return { bbox, indices };
  const extent = {
    x: bbox.max.x - bbox.min.x,
    y: bbox.max.y - bbox.min.y,
    z: bbox.max.z - bbox.min.z,
  };
  const axis = extent.x >= extent.y && extent.x >= extent.z ? 'x' : (extent.y >= extent.z ? 'y' : 'z');
  const sorted = [...indices].sort((a, b) => {
    const ca = centroid(triangles[a].bbox)[axis];
    const cb = centroid(triangles[b].bbox)[axis];
    return ca - cb || a - b;
  });
  const middle = Math.floor(sorted.length / 2);
  return { bbox, left: buildNode(triangles, sorted.slice(0, middle)), right: buildNode(triangles, sorted.slice(middle)) };
}

function insideMesh(entry, point) {
  const origin = { x: point.x + 1e-7, y: point.y + 1e-7, z: point.z + 1e-7 };
  const direction = normalize({ x: 1, y: 0.371390676, z: 0.529 });
  let hits = 0;
  const stack = [entry.root];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !rayBox(origin, direction, current.bbox)) continue;
    if (current.indices) {
      for (const index of current.indices) {
        if (rayTriangle(origin, direction, entry.triangles[index] ?? null)) hits++;
      }
    } else {
      stack.push(current.left, current.right);
    }
  }
  return (hits & 1) === 1;
}

function rayBox(origin, direction, bbox) {
  let tmin = -Infinity;
  let tmax = Infinity;
  for (const axis of ['x', 'y', 'z']) {
    if (Math.abs(direction[axis]) < 1e-12) {
      if (origin[axis] < bbox.min[axis] || origin[axis] > bbox.max[axis]) return false;
    } else {
      const inv = 1 / direction[axis];
      let t1 = (bbox.min[axis] - origin[axis]) * inv;
      let t2 = (bbox.max[axis] - origin[axis]) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return tmax >= 0;
}

function rayTriangle(origin, direction, triangle) {
  if (!triangle) return false;
  const { a, b, c } = triangle;
  const e1 = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const e2 = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const p = cross(direction, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-12) return false;
  const inv = 1 / det;
  const t = { x: origin.x - a.x, y: origin.y - a.y, z: origin.z - a.z };
  const u = dot(t, p) * inv;
  if (u < 0 || u > 1) return false;
  const q = cross(t, e1);
  const v = dot(direction, q) * inv;
  if (v < 0 || u + v > 1) return false;
  const distance = dot(e2, q) * inv;
  return distance > 1e-9;
}

function boundaryMesh(geometry) {
  if (isSolid(geometry)) return isMesh(geometry.boundary) ? geometry.boundary : null;
  if (isMesh(geometry)) return geometry;
  return null;
}

function meshBbox(mesh) {
  return (mesh.vertices ?? []).reduce((box, point) => ({
    min: {
      x: Math.min(box.min.x, point.x),
      y: Math.min(box.min.y, point.y),
      z: Math.min(box.min.z, point.z),
    },
    max: {
      x: Math.max(box.max.x, point.x),
      y: Math.max(box.max.y, point.y),
      z: Math.max(box.max.z, point.z),
    },
  }), emptyBbox());
}

function emptyBbox() {
  return { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
}

function mergeBbox(a, b) {
  return {
    min: {
      x: Math.min(a.min.x, b.min.x),
      y: Math.min(a.min.y, b.min.y),
      z: Math.min(a.min.z, b.min.z),
    },
    max: {
      x: Math.max(a.max.x, b.max.x),
      y: Math.max(a.max.y, b.max.y),
      z: Math.max(a.max.z, b.max.z),
    },
  };
}

function centroid(bbox) {
  return { x: (bbox.min.x + bbox.max.x) / 2, y: (bbox.min.y + bbox.max.y) / 2, z: (bbox.min.z + bbox.max.z) / 2 };
}

function cross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}
