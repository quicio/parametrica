/**
 * geometry/surfaceTessellation.js — deterministic Surface → Mesh.
 */

import { createMesh } from './contracts.js';
import { validateSurface } from './validate.js';

/**
 * Tessellate a Surface grid. Closed axes are welded by wrapping face indices
 * to the first unique row/column, producing a watertight closed mesh.
 */
export function tessellateSurface(surface, { id = surface.id, smooth = true } = {}) {
  const validation = validateSurface(surface);
  if (!validation.ok) {
    const error = new Error(`surface tessellation: ${validation.errors[0]}`);
    error.validation = validation;
    throw error;
  }
  const rows = surface.grid.points;
  const gridRows = rows.length;
  const gridCols = rows[0].length;
  const closedU = Boolean(surface.domain.closedU);
  const closedV = Boolean(surface.domain.closedV);
  const uniqueRows = closedU ? gridRows - 1 : gridRows;
  const uniqueCols = closedV ? gridCols - 1 : gridCols;
  const uCells = closedU ? uniqueRows : uniqueRows - 1;
  const vCells = closedV ? uniqueCols : uniqueCols - 1;
  if (uCells < 1 || vCells < 1) {
    throw new Error('surface tessellation: grid needs at least one cell in U and V');
  }

  const vertices = [];
  for (let u = 0; u < uniqueRows; u++) {
    for (let v = 0; v < uniqueCols; v++) vertices.push({ ...rows[u][v] });
  }
  const indexOf = (u, v) => u * uniqueCols + v;
  const faces = [];
  const faceNormals = [];
  for (let u = 0; u < uCells; u++) {
    const u1 = closedU ? (u + 1) % uniqueRows : u + 1;
    for (let v = 0; v < vCells; v++) {
      const v1 = closedV ? (v + 1) % uniqueCols : v + 1;
      const a = indexOf(u, v);
      const b = indexOf(u1, v);
      const c = indexOf(u1, v1);
      const d = indexOf(u, v1);
      faces.push([a, b, c], [a, c, d]);
      faceNormals.push(faceNormal(vertices[a], vertices[b], vertices[c]));
      faceNormals.push(faceNormal(vertices[a], vertices[c], vertices[d]));
    }
  }

  return createMesh({
    id,
    vertices,
    faces,
    normals: smooth ? vertexNormals(vertices, faces) : null,
    faceNormals,
    meta: {
      source: 'surface-tessellation',
      surfaceId: surface.id,
      smooth: Boolean(smooth),
      uCells,
      vCells,
      closedU,
      closedV,
      gridRows: uniqueRows,
      gridCols: uniqueCols,
    },
  });
}

function faceNormal(a, b, c) {
  const abx = b.x - a.x; const aby = b.y - a.y; const abz = b.z - a.z;
  const acx = c.x - a.x; const acy = c.y - a.y; const acz = c.z - a.z;
  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;
  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

function vertexNormals(vertices, faces) {
  const sums = vertices.map(() => ({ x: 0, y: 0, z: 0 }));
  for (const face of faces) {
    const a = vertices[face[0]];
    const b = vertices[face[1]];
    const c = vertices[face[2]];
    const normal = faceNormal(a, b, c);
    const area = triangleArea(a, b, c);
    for (const index of face) {
      sums[index].x += normal.x * area;
      sums[index].y += normal.y * area;
      sums[index].z += normal.z * area;
    }
  }
  return sums.map((sum) => {
    const len = Math.hypot(sum.x, sum.y, sum.z) || 1;
    return { x: sum.x / len, y: sum.y / len, z: sum.z / len };
  });
}

function triangleArea(a, b, c) {
  const abx = b.x - a.x; const aby = b.y - a.y; const abz = b.z - a.z;
  const acx = c.x - a.x; const acy = c.y - a.y; const acz = c.z - a.z;
  const cx = aby * acz - abz * acy;
  const cy = abz * acx - abx * acz;
  const cz = abx * acy - aby * acx;
  return 0.5 * Math.hypot(cx, cy, cz);
}

export function surfaceArea(surface) {
  try {
    const mesh = tessellateSurface(surface);
    return mesh.faces.reduce((sum, face) => (
      sum + triangleArea(mesh.vertices[face[0]], mesh.vertices[face[1]], mesh.vertices[face[2]])
    ), 0);
  } catch {
    return 0;
  }
}
