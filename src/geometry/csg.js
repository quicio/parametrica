/**
 * geometry/csg.js — deterministic BSP-based constructive solid geometry.
 *
 * Operands are validated closed Mesh/Solid data. The engine returns a
 * structured success, empty or failure result and never mutates its inputs.
 * It is DOM-free and independent from the renderer.
 */

import { createMesh, isMesh, isSolid } from './contracts.js';
import { weldMesh } from './solidPrep.js';
import { validateMesh } from './validate.js';
import { remesh } from './remesh.js';
import { adaptiveTolerance } from './robustPredicates.js';

export const CSG_OPERATIONS = Object.freeze(['union', 'difference', 'intersection']);
export const CSG_DEFAULT_TOLERANCE = 1e-4;
const COPLANAR = 0;
const FRONT = 1;
const BACK = 2;
const SPANNING = 3;

class ComplexityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ComplexityError';
    this.code = 'complexity';
  }
}

/**
 * Combine validated solids.
 *
 * @param {'union'|'difference'|'intersection'} operation
 * @param {Array<object>} operands Mesh/Solid values
 * @param {{tolerance?:number,maxDepth?:number,maxPolygons?:number,maxInputTriangles?:number}} options
 */
export function booleanSolids(operation, operands, {
  tolerance = CSG_DEFAULT_TOLERANCE,
  maxDepth = 4096,
  maxPolygons = 250_000,
  maxInputTriangles = 50_000,
  strategy = 'auto',
  remeshResolution = 64,
} = {}) {
  let eps = Number.isFinite(tolerance) && tolerance > 0 ? tolerance : CSG_DEFAULT_TOLERANCE;
  const stats = {
    operation,
    operands: Array.isArray(operands) ? operands.length : 0,
    inputTriangles: 0,
    outputTriangles: 0,
    outputPolygons: 0,
    splits: 0,
    depth: 0,
    tolerance: eps,
    requestedStrategy: strategy,
    strategy: strategy === 'auto' ? 'bsp' : strategy,
    fallback: null,
    remeshResolution: null,
    toleranceSource: tolerance === 'auto' ? 'auto' : 'explicit',
  };
  if (!CSG_OPERATIONS.includes(operation)) {
    return failure('invalid-operation', `unsupported boolean operation "${operation}"`, stats);
  }
  const list = Array.isArray(operands) ? operands : [];
  if (list.length < 2) {
    return failure('invalid-operand', 'boolean requires at least two operands', stats);
  }

  const meshes = [];
  for (const operand of list) {
    const mesh = boundaryMesh(operand);
    if (!mesh) {
      return failure('invalid-operand', 'boolean operands must be Mesh or Solid values', stats);
    }
    const validation = validateMesh(mesh);
    if (!validation.ok || !validation.meta?.closed) {
      return failure(
        'invalid-operand',
        `boolean operand is not a validated closed solid: ${validation.errors[0] ?? 'unknown error'}`,
        stats,
      );
    }
    if ((validation.meta.selfIntersections?.count ?? 0) > 0) {
      return failure('self-intersecting-operand', 'boolean operand contains self-intersections', stats);
    }
    stats.inputTriangles += mesh.faces.length;
    meshes.push(mesh);
  }
  if (stats.inputTriangles > maxInputTriangles) {
    return failure(
      'complexity',
      `boolean input has ${stats.inputTriangles} triangles (limit ${maxInputTriangles})`,
      stats,
    );
  }
  if (tolerance === 'auto') {
    const points = meshes.flatMap((mesh) => mesh.vertices);
    const adaptive = adaptiveTolerance(points, { factor: 1e-7, floor: 1e-9, ceiling: 1e-3 });
    eps = adaptive.epsilon;
    stats.tolerance = eps;
  }

  if (strategy === 'remesh') {
    return booleanRemesh(operation, meshes, { remeshResolution, tolerance: eps, stats });
  }

  const budget = { splits: 0, maxPolygons, maxDepth, depth: 0 };
  try {
    let polygons = toPolygons(meshes[0]);
    for (let i = 1; i < meshes.length; i++) {
      const left = new Node(polygons, eps, budget, 0);
      const right = new Node(toPolygons(meshes[i]), eps, budget, 0);
      polygons = combine(operation, left, right);
      budget.depth = Math.max(budget.depth, left.depth, right.depth);
      if (polygons.length > maxPolygons) {
        throw new ComplexityError(`boolean polygon budget exceeded (${polygons.length} > ${maxPolygons})`);
      }
    }
    stats.splits = budget.splits;
    stats.depth = budget.depth;
    stats.outputPolygons = polygons.length;
    if (!polygons.length) {
      return { ok: true, empty: true, geometry: null, validation: null, stats };
    }
    let mesh = polygonsToMesh(polygons, `${operation}-result`, eps);
    if (!mesh) return { ok: true, empty: true, geometry: null, validation: null, stats };
    let validation = validateMesh(mesh);
    if (!validation.ok && needsTJunctionRepair(validation)) {
      mesh = resolveTJunctions(mesh, eps);
      mesh = dedupeFaces(mesh);
      validation = validateMesh(mesh);
    }
    if (validation.meta?.volume !== null && validation.meta.volume < 0) {
      mesh = flipMesh(mesh);
      validation = validateMesh(mesh);
    }
    if (!validation.ok) {
      if (strategy === 'auto') {
        return booleanRemesh(operation, meshes, {
          remeshResolution,
          tolerance: eps,
          stats,
          fallback: 'bsp-invalid',
        });
      }
      return failure('invalid-result', validation.errors[0] ?? 'boolean result failed validation', stats, validation);
    }
    const volume = validation.meta?.volume;
    const volumeEps = Math.max(eps ** 3, bboxDiagonal(mesh) ** 3 * 1e-12);
    if (volume === null || Math.abs(volume) <= volumeEps) {
      return { ok: true, empty: true, geometry: null, validation: null, stats };
    }
    mesh.meta = {
      ...mesh.meta,
      source: 'csg',
      csg: { operation, operands: list.length, tolerance: eps },
    };
    stats.outputTriangles = mesh.faces.length;
    return { ok: true, empty: false, geometry: mesh, validation, stats };
  } catch (error) {
    if (strategy === 'auto') {
      return booleanRemesh(operation, meshes, {
        remeshResolution,
        tolerance: eps,
        stats,
        fallback: error.code ?? 'bsp-failed',
      });
    }
    return failure(error.code ?? 'invalid-result', error.message ?? String(error), stats);
  }
}

function booleanRemesh(operation, meshes, { remeshResolution, tolerance, stats, fallback = null }) {
  const result = remesh(meshes, {
    operation,
    resolution: remeshResolution,
    tolerance,
  });
  stats.strategy = 'remesh';
  stats.fallback = fallback;
  stats.remeshResolution = remeshResolution;
  stats.projected = Boolean(result.stats?.projected);
  stats.featureEdges = result.stats?.featureEdges ?? 0;
  if (!result.ok) {
    return failure(result.error?.code ?? 'remesh-failed', result.error?.message ?? 'remesh failed', stats);
  }
  if (result.empty) {
    return { ok: true, empty: true, geometry: null, validation: null, stats };
  }
  stats.outputTriangles = result.mesh.faces.length;
  stats.outputPolygons = result.mesh.faces.length;
  return {
    ok: true,
    empty: false,
    geometry: result.mesh,
    validation: result.validation,
    stats,
  };
}

function combine(operation, a, b) {
  if (operation === 'union') {
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    return a.allPolygons();
  }
  if (operation === 'difference') {
    a.invert();
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    a.invert();
    return a.allPolygons();
  }
  a.invert();
  b.clipTo(a);
  b.invert();
  a.clipTo(b);
  b.clipTo(a);
  a.build(b.allPolygons());
  a.invert();
  return a.allPolygons();
}

class Plane {
  constructor(normal, w) {
    this.normal = normal;
    this.w = w;
  }

  clone() {
    return new Plane({ ...this.normal }, this.w);
  }

  flip() {
    this.normal = { x: -this.normal.x, y: -this.normal.y, z: -this.normal.z };
    this.w = -this.w;
  }
}

class Polygon {
  constructor(vertices) {
    this.vertices = vertices;
    this.plane = planeFromVertices(vertices);
  }

  clone() {
    return new Polygon(this.vertices.map((vertex) => ({ ...vertex })));
  }

  flip() {
    this.vertices.reverse();
    this.plane.flip();
  }
}

class Node {
  constructor(polygons = [], eps = CSG_DEFAULT_TOLERANCE, budget = null, depth = 0) {
    this.plane = null;
    this.front = null;
    this.back = null;
    this.polygons = [];
    this.depth = depth;
    if (polygons.length) this.build(polygons, eps, budget, depth);
  }

  invert() {
    for (const polygon of this.polygons) polygon.flip();
    if (this.plane) this.plane.flip();
    if (this.front) this.front.invert();
    if (this.back) this.back.invert();
    const front = this.front;
    this.front = this.back;
    this.back = front;
  }

  clipPolygons(polygons, eps = CSG_DEFAULT_TOLERANCE, budget = null) {
    if (!this.plane) return polygons.slice();
    let front = [];
    let back = [];
    for (const polygon of polygons) {
      splitPolygon(this.plane, polygon, front, back, front, back, eps, budget);
    }
    if (this.front) front = this.front.clipPolygons(front, eps, budget);
    if (this.back) back = this.back.clipPolygons(back, eps, budget);
    else back = [];
    return front.concat(back);
  }

  clipTo(bsp, eps = CSG_DEFAULT_TOLERANCE, budget = null) {
    this.polygons = bsp.clipPolygons(this.polygons, eps, budget);
    if (this.front) this.front.clipTo(bsp, eps, budget);
    if (this.back) this.back.clipTo(bsp, eps, budget);
  }

  allPolygons() {
    let polygons = this.polygons.slice();
    if (this.front) polygons = polygons.concat(this.front.allPolygons());
    if (this.back) polygons = polygons.concat(this.back.allPolygons());
    return polygons;
  }

  build(polygons, eps = CSG_DEFAULT_TOLERANCE, budget = null, depth = 0) {
    if (budget && depth > budget.maxDepth) {
      throw new ComplexityError(`boolean BSP depth exceeded (${depth} > ${budget.maxDepth})`);
    }
    this.depth = Math.max(this.depth, depth);
    if (!this.plane) this.plane = choosePlane(polygons, eps);
    const front = [];
    const back = [];
    for (const polygon of polygons) {
      splitPolygon(this.plane, polygon, this.polygons, this.polygons, front, back, eps, budget);
    }
    if (budget) budget.depth = Math.max(budget.depth, this.depth);
    if (front.length) {
      if (!this.front) this.front = new Node([], eps, budget, depth + 1);
      this.front.build(front, eps, budget, depth + 1);
    }
    if (back.length) {
      if (!this.back) this.back = new Node([], eps, budget, depth + 1);
      this.back.build(back, eps, budget, depth + 1);
    }
  }
}

function choosePlane(polygons, eps) {
  if (polygons.length <= 8) return polygons[0].plane.clone();
  const step = Math.max(1, Math.floor(polygons.length / 16));
  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < polygons.length; i += step) {
    const plane = polygons[i].plane;
    let front = 0;
    let back = 0;
    let spanning = 0;
    for (const polygon of polygons) {
      const type = polygonType(plane, polygon, eps);
      if (type === FRONT) front++;
      else if (type === BACK) back++;
      else if (type === SPANNING) spanning++;
    }
    const score = Math.abs(front - back) + spanning * 2;
    if (score < bestScore) {
      bestScore = score;
      best = plane.clone();
      if (score === 0) break;
    }
  }
  return best ?? polygons[0].plane.clone();
}

function polygonType(plane, polygon, eps) {
  let type = 0;
  for (const vertex of polygon.vertices) {
    const distance = plane.normal.x * vertex.x + plane.normal.y * vertex.y + plane.normal.z * vertex.z - plane.w;
    type |= distance < -eps ? BACK : distance > eps ? FRONT : COPLANAR;
  }
  return type;
}

function splitPolygon(plane, polygon, coplanarFront, coplanarBack, front, back, eps, budget) {
  let polygonType = 0;
  const types = [];
  for (const vertex of polygon.vertices) {
    const distance = plane.normal.x * vertex.x + plane.normal.y * vertex.y + plane.normal.z * vertex.z - plane.w;
    const type = distance < -eps ? BACK : distance > eps ? FRONT : COPLANAR;
    polygonType |= type;
    types.push(type);
  }
  if (polygonType === COPLANAR) {
    const dot = plane.normal.x * polygon.plane.normal.x
      + plane.normal.y * polygon.plane.normal.y
      + plane.normal.z * polygon.plane.normal.z;
    (dot > 0 ? coplanarFront : coplanarBack).push(polygon);
    return;
  }
  if (polygonType === FRONT) {
    front.push(polygon);
    return;
  }
  if (polygonType === BACK) {
    back.push(polygon);
    return;
  }

  const frontVertices = [];
  const backVertices = [];
  const count = polygon.vertices.length;
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    const ti = types[i];
    const tj = types[j];
    const vi = polygon.vertices[i];
    const vj = polygon.vertices[j];
    if (ti !== BACK) frontVertices.push({ ...vi });
    if (ti !== FRONT) backVertices.push(ti !== BACK ? { ...vi } : vi);
    if ((ti | tj) === SPANNING) {
      const direction = {
        x: vj.x - vi.x,
        y: vj.y - vi.y,
        z: vj.z - vi.z,
      };
      const denominator = plane.normal.x * direction.x
        + plane.normal.y * direction.y
        + plane.normal.z * direction.z;
      const t = Math.abs(denominator) < eps
        ? 0.5
        : (plane.w - (plane.normal.x * vi.x + plane.normal.y * vi.y + plane.normal.z * vi.z)) / denominator;
      const vertex = {
        x: vi.x + direction.x * t,
        y: vi.y + direction.y * t,
        z: vi.z + direction.z * t,
      };
      frontVertices.push(vertex);
      backVertices.push({ ...vertex });
      if (budget) budget.splits++;
    }
  }
  if (frontVertices.length >= 3) {
    const piece = new Polygon(frontVertices);
    if (piece.plane) front.push(piece);
  }
  if (backVertices.length >= 3) {
    const piece = new Polygon(backVertices);
    if (piece.plane) back.push(piece);
  }
  if (budget && front.length + back.length > budget.maxPolygons) {
    throw new ComplexityError(`boolean polygon budget exceeded (${front.length + back.length} > ${budget.maxPolygons})`);
  }
}

function toPolygons(mesh) {
  const polygons = [];
  for (const face of mesh.faces) {
    if (!Array.isArray(face) || face.length < 3) continue;
    for (let i = 1; i < face.length - 1; i++) {
      const vertices = [mesh.vertices[face[0]], mesh.vertices[face[i]], mesh.vertices[face[i + 1]]]
        .map((vertex) => ({ x: vertex.x, y: vertex.y, z: vertex.z }));
      const polygon = new Polygon(vertices);
      if (polygon.plane) polygons.push(polygon);
    }
  }
  return polygons;
}

function polygonsToMesh(polygons, id, tolerance = CSG_DEFAULT_TOLERANCE) {
  const vertices = [];
  const faces = [];
  for (const polygon of polygons) {
    if (!polygon.plane || polygon.vertices.length < 3) continue;
    const offset = vertices.length;
    for (const vertex of polygon.vertices) vertices.push({ x: vertex.x, y: vertex.y, z: vertex.z });
    for (let i = 1; i < polygon.vertices.length - 1; i++) {
      faces.push([offset, offset + i, offset + i + 1]);
    }
  }
  if (!faces.length) return null;
  const raw = createMesh({ id, vertices, faces, meta: { source: 'csg' } });
  const welded = weldMesh(raw, { tolerance }).mesh;
  const deduped = dedupeFaces(welded);
  return deduped.faces.length ? deduped : null;
}

function needsTJunctionRepair(validation) {
  return (validation.errors ?? []).some((error) => (
    error.includes('open boundary') || error.includes('non-manifold') || error.includes('inconsistent edge')
  ));
}

/**
 * Insert vertices that lie on triangle edges. BSP output can contain
 * T-junctions where one operand was split against the other but the adjacent
 * face was not; validation requires matching edges.
 */
export function resolveTJunctions(mesh, tolerance = CSG_DEFAULT_TOLERANCE) {
  const eps = Number.isFinite(tolerance) && tolerance > 0 ? tolerance : CSG_DEFAULT_TOLERANCE;
  const vertices = mesh.vertices;
  const grid = buildVertexGrid(vertices, eps);
  const faces = [];
  let inserted = 0;

  const splitFace = (face, depth = 0) => {
    if (depth > 16 || face.length !== 3) {
      faces.push(face);
      return;
    }
    for (let i = 0; i < 3; i++) {
      const a = face[i];
      const b = face[(i + 1) % 3];
      const c = face[(i + 2) % 3];
      const candidate = findVertexOnEdge(vertices, grid, a, b, eps);
      if (candidate !== null) {
        inserted++;
        splitFace([a, candidate, c], depth + 1);
        splitFace([candidate, b, c], depth + 1);
        return;
      }
    }
    faces.push(face);
  };

  for (const face of mesh.faces) splitFace(face);
  if (!inserted) return mesh;
  return createMesh({
    id: mesh.id,
    vertices: mesh.vertices,
    faces,
    normals: null,
    faceNormals: null,
    uvs: null,
    meta: { ...mesh.meta, tJunctionsInserted: inserted },
  });
}

function buildVertexGrid(vertices, eps) {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const vertex of vertices) {
    if (vertex.x < minX) minX = vertex.x;
    if (vertex.y < minY) minY = vertex.y;
    if (vertex.z < minZ) minZ = vertex.z;
    if (vertex.x > maxX) maxX = vertex.x;
    if (vertex.y > maxY) maxY = vertex.y;
    if (vertex.z > maxZ) maxZ = vertex.z;
  }
  const diagonal = Number.isFinite(minX) ? Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) : 0;
  const cell = Math.max(diagonal / 64, eps * 4, 1e-9);
  const cells = new Map();
  for (let i = 0; i < vertices.length; i++) {
    const key = gridKey(vertices[i], cell);
    const list = cells.get(key) ?? [];
    list.push(i);
    cells.set(key, list);
  }
  return { cell, cells };
}

function gridKey(point, cell) {
  return `${Math.floor(point.x / cell)}|${Math.floor(point.y / cell)}|${Math.floor(point.z / cell)}`;
}

function findVertexOnEdge(vertices, grid, a, b, eps) {
  const pa = vertices[a];
  const pb = vertices[b];
  const minX = Math.min(pa.x, pb.x) - eps;
  const minY = Math.min(pa.y, pb.y) - eps;
  const minZ = Math.min(pa.z, pb.z) - eps;
  const maxX = Math.max(pa.x, pb.x) + eps;
  const maxY = Math.max(pa.y, pb.y) + eps;
  const maxZ = Math.max(pa.z, pb.z) + eps;
  const from = {
    x: Math.floor(minX / grid.cell),
    y: Math.floor(minY / grid.cell),
    z: Math.floor(minZ / grid.cell),
  };
  const to = {
    x: Math.floor(maxX / grid.cell),
    y: Math.floor(maxY / grid.cell),
    z: Math.floor(maxZ / grid.cell),
  };
  const cells = (to.x - from.x + 1) * (to.y - from.y + 1) * (to.z - from.z + 1);
  const candidates = new Set();
  if (cells <= 4096) {
    for (let x = from.x; x <= to.x; x++) {
      for (let y = from.y; y <= to.y; y++) {
        for (let z = from.z; z <= to.z; z++) {
          for (const index of grid.cells.get(`${x}|${y}|${z}`) ?? []) candidates.add(index);
        }
      }
    }
  } else {
    for (let i = 0; i < vertices.length; i++) candidates.add(i);
  }

  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const dz = pb.z - pa.z;
  const lengthSquared = dx * dx + dy * dy + dz * dz;
  if (lengthSquared <= eps * eps) return null;
  let best = null;
  let bestT = Infinity;
  for (const index of candidates) {
    if (index === a || index === b) continue;
    const point = vertices[index];
    if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY || point.z < minZ || point.z > maxZ) continue;
    const t = ((point.x - pa.x) * dx + (point.y - pa.y) * dy + (point.z - pa.z) * dz) / lengthSquared;
    if (t <= 1e-9 || t >= 1 - 1e-9) continue;
    const closest = { x: pa.x + dx * t, y: pa.y + dy * t, z: pa.z + dz * t };
    if (Math.hypot(point.x - closest.x, point.y - closest.y, point.z - closest.z) > eps) continue;
    if (t < bestT) {
      bestT = t;
      best = index;
    }
  }
  return best;
}

function dedupeFaces(mesh) {
  const groups = new Map();
  for (const face of mesh.faces) {
    if (!Array.isArray(face) || face.length !== 3) continue;
    const key = [...face].sort((a, b) => a - b).join(':');
    const sign = orientationSign(face, key);
    const group = groups.get(key) ?? { faces: [], signs: new Set() };
    group.faces.push(face);
    group.signs.add(sign);
    groups.set(key, group);
  }
  const faces = [];
  for (const group of groups.values()) {
    if (group.signs.size > 1) continue;
    faces.push(group.faces[0]);
  }
  return createMesh({
    id: mesh.id,
    vertices: mesh.vertices,
    faces,
    normals: null,
    faceNormals: null,
    uvs: null,
    meta: mesh.meta,
  });
}

function orientationSign(face, key) {
  const sorted = key.split(':').map(Number);
  const position = face.indexOf(sorted[0]);
  return face[(position + 1) % 3] === sorted[1] ? 1 : -1;
}

function flipMesh(mesh) {
  return createMesh({
    id: mesh.id,
    vertices: mesh.vertices,
    faces: mesh.faces.map((face) => [...face].reverse()),
    normals: null,
    faceNormals: null,
    uvs: null,
    meta: mesh.meta,
  });
}

function planeFromVertices(vertices) {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    nx += (current.y - next.y) * (current.z + next.z);
    ny += (current.z - next.z) * (current.x + next.x);
    nz += (current.x - next.x) * (current.y + next.y);
    cx += current.x;
    cy += current.y;
    cz += current.z;
  }
  const length = Math.hypot(nx, ny, nz);
  if (!Number.isFinite(length) || length <= 1e-12) return null;
  const normal = { x: nx / length, y: ny / length, z: nz / length };
  const count = vertices.length;
  return new Plane(normal, normal.x * (cx / count) + normal.y * (cy / count) + normal.z * (cz / count));
}

function boundaryMesh(geometry) {
  if (isSolid(geometry)) return isMesh(geometry.boundary) ? geometry.boundary : null;
  if (isMesh(geometry)) return geometry;
  return null;
}

function bboxDiagonal(mesh) {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const vertex of mesh.vertices ?? []) {
    if (vertex.x < minX) minX = vertex.x;
    if (vertex.y < minY) minY = vertex.y;
    if (vertex.z < minZ) minZ = vertex.z;
    if (vertex.x > maxX) maxX = vertex.x;
    if (vertex.y > maxY) maxY = vertex.y;
    if (vertex.z > maxZ) maxZ = vertex.z;
  }
  if (!Number.isFinite(minX)) return 0;
  return Math.hypot(maxX - minX, maxY - minY, maxZ - minZ);
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
