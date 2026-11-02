/**
 * geometry/surfaceTessellation.js — deterministic Surface → Mesh.
 */

import { createMesh } from './contracts.js';
import { validateSurface } from './validate.js';

/**
 * Tessellate a Surface grid. Closed axes are welded by wrapping face indices
 * to the first unique row/column. A reversed seam (`seamU`/`seamV` =
 * `'reverse'`) additionally mirrors the opposite coordinate at the wrap,
 * which produces a half-twisted but crack-free mesh (Möbius band).
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
  const seamU = surface.domain?.seamU ?? surface.meta?.seamU ?? 'normal';
  const seamV = surface.domain?.seamV ?? surface.meta?.seamV ?? 'normal';
  const twistU = closedU && seamU === 'reverse';
  const twistV = closedV && seamV === 'reverse';
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

  // Resolve a logical grid coordinate to the welded index. Wrapping a twisted
  // axis mirrors the opposite coordinate, which is the topological half twist.
  const wrap = (index, size, twist) => {
    if (index >= 0 && index < size) return { index, flip: false };
    return { index: ((index % size) + size) % size, flip: Boolean(twist) };
  };
  const corner = (u, v) => {
    const cu = wrap(u, uniqueRows, twistU);
    const cv = wrap(v, uniqueCols, twistV);
    let ui = cu.index;
    let vi = cv.index;
    if (cu.flip) vi = uniqueCols - 1 - vi;
    if (cv.flip) ui = uniqueRows - 1 - ui;
    return indexOf(ui, vi);
  };

  const faces = [];
  const faceNormals = [];
  for (let u = 0; u < uCells; u++) {
    for (let v = 0; v < vCells; v++) {
      const a = corner(u, v);
      const b = corner(u + 1, v);
      const c = corner(u + 1, v + 1);
      const d = corner(u, v + 1);
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
      seamU,
      seamV,
      twistU,
      twistV,
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
