/**
 * geometry/repair.js — explicit, non-destructive mesh repair for fabrication.
 *
 * Cleans invalid/degenerate/duplicate faces, welds vertices, repairs face
 * orientation and caps open loops with fan or planar ear-clipping strategies.
 * Inputs are never mutated and the report lists every action.
 */

import { createMesh } from './contracts.js';
import { boundaryLoops, weldMesh } from './solidPrep.js';
import { validateMesh } from './validate.js';

export const DEFAULT_REPAIR_TOLERANCE = 1e-4;
export const DEFAULT_CAP_STRATEGY = 'auto';
export const CAP_STRATEGIES = Object.freeze(['auto', 'fan', 'planar', 'none']);

/**
 * @param {object} mesh
 * @param {{tolerance?:number,maxHoleEdges?:number,capStrategy?:string,orient?:boolean}} options
 */
export function repairMesh(mesh, {
  tolerance = DEFAULT_REPAIR_TOLERANCE,
  maxHoleEdges = 256,
  capStrategy = DEFAULT_CAP_STRATEGY,
  orient = true,
} = {}) {
  const eps = Number.isFinite(tolerance) && tolerance > 0 ? tolerance : DEFAULT_REPAIR_TOLERANCE;
  const strategy = CAP_STRATEGIES.includes(capStrategy) ? capStrategy : DEFAULT_CAP_STRATEGY;
  const report = emptyReport(strategy);
  if (!mesh || mesh.kind !== 'mesh' || !Array.isArray(mesh.vertices) || !Array.isArray(mesh.faces)) {
    return {
      mesh: null,
      validation: { ok: false, errors: ['repair requires a Mesh'], warnings: [], meta: null },
      report: { ...report, errors: ['repair requires a Mesh'] },
    };
  }

  let current = mesh;
  const cleaned = cleanupMesh(current, eps);
  current = cleaned.mesh;
  mergeReport(report, cleaned.report);

  if (strategy !== 'none') {
    const capped = capWithStrategy(current, {
      strategy,
      maxHoleEdges,
      tolerance: eps,
    });
    current = capped.mesh;
    mergeReport(report, capped.report);
  }

  if (orient) {
    const oriented = repairOrientation(current, eps);
    current = oriented.mesh;
    mergeReport(report, oriented.report);
  }

  const final = cleanupFaces(current, eps);
  current = final.mesh;
  mergeReport(report, final.report);

  const validation = validateMesh(current);
  report.errors = validation.errors ?? [];
  report.changed = actionCount(report) > 0;
  const unchanged = !report.changed;
  return {
    mesh: unchanged ? mesh : current,
    validation: unchanged ? validateMesh(mesh) : validation,
    report,
  };
}

/* ———————— cleanup ———————— */

function cleanupMesh(mesh, tolerance) {
  const report = emptyReport();
  const areaEps = Math.max(tolerance * tolerance, 1e-14);
  const faces = [];
  for (const face of mesh.faces) {
    if (!Array.isArray(face) || face.length < 3) {
      report.removedInvalidFaces++;
      continue;
    }
    if (face.some((index) => !Number.isInteger(index) || index < 0 || index >= mesh.vertices.length)) {
      report.removedInvalidFaces++;
      continue;
    }
    if (new Set(face).size < 3) {
      report.removedInvalidFaces++;
      continue;
    }
    if (faceArea(mesh.vertices, face) <= areaEps) {
      report.removedDegenerateFaces++;
      continue;
    }
    faces.push([...face]);
  }
  if (!faces.length) {
    return {
      mesh: createMesh({ id: mesh.id, vertices: mesh.vertices, faces: [], meta: mesh.meta }),
      report,
    };
  }
  const raw = createMesh({
    id: mesh.id,
    vertices: mesh.vertices,
    faces,
    meta: mesh.meta,
  });
  const welded = weldMesh(raw, { tolerance });
  report.weldedVertices += welded.stats.mergedVertices;
  report.removedDegenerateFaces += welded.stats.removedFaces;
  let current = welded.mesh;
  const deduped = removeDuplicateFaces(current);
  current = deduped.mesh;
  report.removedDuplicateFaces += deduped.removed;
  const degenerate = removeDegenerateFaces(current, areaEps);
  current = degenerate.mesh;
  report.removedDegenerateFaces += degenerate.removed;
  return { mesh: current, report };
}

function cleanupFaces(mesh, tolerance) {
  const report = emptyReport();
  const areaEps = Math.max(tolerance * tolerance, 1e-14);
  const deduped = removeDuplicateFaces(mesh);
  const degenerate = removeDegenerateFaces(deduped.mesh, areaEps);
  report.removedDuplicateFaces += deduped.removed;
  report.removedDegenerateFaces += degenerate.removed;
  return { mesh: degenerate.mesh, report };
}

function removeDegenerateFaces(mesh, areaEps) {
  const faces = [];
  let removed = 0;
  for (const face of mesh.faces) {
    if (!Array.isArray(face) || face.length < 3 || new Set(face).size < 3 || faceArea(mesh.vertices, face) <= areaEps) {
      removed++;
      continue;
    }
    faces.push(face);
  }
  return {
    mesh: createMesh({
      id: mesh.id,
      vertices: mesh.vertices,
      faces,
      normals: null,
      faceNormals: null,
      uvs: null,
      meta: mesh.meta,
    }),
    removed,
  };
}

function removeDuplicateFaces(mesh) {
  const groups = new Map();
  for (const face of mesh.faces) {
    const key = [...face].sort((a, b) => a - b).join(':');
    const sign = orientationSign(face, key);
    const group = groups.get(key) ?? { faces: [], signs: new Set() };
    group.faces.push(face);
    group.signs.add(sign);
    groups.set(key, group);
  }
  const faces = [];
  let removed = 0;
  for (const group of groups.values()) {
    if (group.signs.size > 1) {
      removed += group.faces.length;
      continue;
    }
    faces.push(group.faces[0]);
    removed += group.faces.length - 1;
  }
  return {
    mesh: createMesh({
      id: mesh.id,
      vertices: mesh.vertices,
      faces,
      normals: null,
      faceNormals: null,
      uvs: null,
      meta: mesh.meta,
    }),
    removed,
  };
}

/* ———————— orientation ———————— */

export function repairOrientation(mesh, tolerance = DEFAULT_REPAIR_TOLERANCE) {
  const report = emptyReport();
  const faces = mesh.faces.map((face) => [...face]);
  const edgeMap = buildEdgeMap(faces);
  const adjacency = faces.map(() => []);
  let nonManifoldEdges = 0;
  for (const edge of edgeMap.values()) {
    if (edge.uses.length > 2) nonManifoldEdges++;
    if (edge.uses.length !== 2) continue;
    const [a, b] = edge.uses;
    adjacency[a.face].push({ face: b.face, same: a.forward === b.forward });
    adjacency[b.face].push({ face: a.face, same: a.forward === b.forward });
  }
  if (nonManifoldEdges) report.warnings.push(`${nonManifoldEdges} non-manifold edges cannot be reoriented`);

  const flip = new Array(faces.length).fill(null);
  let contradictions = 0;
  for (let start = 0; start < faces.length; start++) {
    if (flip[start] !== null) continue;
    flip[start] = 0;
    const stack = [start];
    while (stack.length) {
      const face = stack.pop();
      for (const next of adjacency[face]) {
        const desired = next.same ? 1 - flip[face] : flip[face];
        if (flip[next.face] === null) {
          flip[next.face] = desired;
          stack.push(next.face);
        } else if (flip[next.face] !== desired) {
          contradictions++;
        }
      }
    }
  }
  for (let i = 0; i < faces.length; i++) {
    if (flip[i]) {
      faces[i].reverse();
      report.flippedFaces++;
    }
  }

  // Connected shells after consistency repair.
  const shells = connectedShells(faces, edgeMap);
  for (const shell of shells) {
    if (!shell.closed) continue;
    const volume = signedVolume(mesh.vertices, shell.faces.map((index) => faces[index]));
    const volumeEps = Math.max(tolerance ** 3, 1e-12);
    if (volume < -volumeEps) {
      for (const index of shell.faces) faces[index].reverse();
      report.flippedShells++;
      report.flippedFaces += shell.faces.length;
    } else if (Math.abs(volume) <= volumeEps) {
      report.warnings.push('closed shell has zero volume after orientation repair');
    }
  }
  report.orientationContradictions = contradictions;
  if (contradictions) {
    report.warnings.push(`orientation constraints disagree (${contradictions} conflicts)`);
  }
  return {
    mesh: createMesh({
      id: mesh.id,
      vertices: mesh.vertices,
      faces,
      normals: null,
      faceNormals: null,
      uvs: null,
      meta: mesh.meta,
    }),
    report,
  };
}

function buildEdgeMap(faces) {
  const edges = new Map();
  for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
    const face = faces[faceIndex];
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const edge = edges.get(key) ?? { a: Math.min(a, b), b: Math.max(a, b), uses: [] };
      edge.uses.push({ face: faceIndex, forward: a < b });
      edges.set(key, edge);
    }
  }
  return edges;
}

function connectedShells(faces, edgeMap) {
  const adjacency = faces.map(() => []);
  for (const edge of edgeMap.values()) {
    if (edge.uses.length !== 2) continue;
    const [a, b] = edge.uses;
    adjacency[a.face].push(b.face);
    adjacency[b.face].push(a.face);
  }
  const seen = new Array(faces.length).fill(false);
  const shells = [];
  for (let start = 0; start < faces.length; start++) {
    if (seen[start]) continue;
    const stack = [start];
    seen[start] = true;
    const shellFaces = [];
    let closed = true;
    while (stack.length) {
      const face = stack.pop();
      shellFaces.push(face);
      for (let i = 0; i < faces[face].length; i++) {
        const a = faces[face][i];
        const b = faces[face][(i + 1) % faces[face].length];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if ((edgeMap.get(key)?.uses.length ?? 0) !== 2) closed = false;
      }
      for (const next of adjacency[face]) {
        if (!seen[next]) {
          seen[next] = true;
          stack.push(next);
        }
      }
    }
    shells.push({ faces: shellFaces, closed });
  }
  return shells;
}

function signedVolume(vertices, faces) {
  let volume = 0;
  for (const face of faces) {
    const a = vertices[face[0]];
    for (let i = 1; i < face.length - 1; i++) {
      const b = vertices[face[i]];
      const c = vertices[face[i + 1]];
      volume += (
        a.x * (b.y * c.z - b.z * c.y)
        - a.y * (b.x * c.z - b.z * c.x)
        + a.z * (b.x * c.y - b.y * c.x)
      ) / 6;
    }
  }
  return volume;
}

/* ———————— caps ———————— */

export function capWithStrategy(mesh, {
  strategy = DEFAULT_CAP_STRATEGY,
  maxHoleEdges = 256,
  tolerance = DEFAULT_REPAIR_TOLERANCE,
} = {}) {
  const report = emptyReport(strategy);
  const limit = Math.max(3, Math.floor(Number(maxHoleEdges) || 256));
  const { loops, incomplete } = boundaryLoops(mesh);
  if (incomplete) report.warnings.push('boundary edges do not form complete loops');
  if (!loops.length) return { mesh, report };

  const vertices = mesh.vertices.map((vertex) => ({ ...vertex }));
  const faces = mesh.faces.map((face) => [...face]);
  for (const loop of loops) {
    if (loop.length > limit) {
      report.skippedLoops++;
      report.warnings.push(`skipped ${loop.length}-edge hole (limit ${limit})`);
      continue;
    }
    let capped = false;
    if (strategy === 'planar' || strategy === 'auto') {
      const planar = loopPlanarity(vertices, loop, tolerance);
      if (strategy === 'planar' || planar.near) {
        const triangles = planar.triangles;
        if (triangles) {
          for (const triangle of triangles) faces.push(triangle);
          report.planarCaps++;
          report.cappedLoops++;
          capped = true;
        } else {
          report.fallbackCaps++;
          report.warnings.push('planar cap failed; used fan fallback');
        }
      }
    }
    if (!capped) {
      fanCap(vertices, faces, loop);
      report.fanCaps++;
      report.cappedLoops++;
    }
  }

  return {
    mesh: createMesh({
      id: mesh.id,
      vertices,
      faces,
      normals: null,
      faceNormals: null,
      uvs: null,
      meta: mesh.meta,
    }),
    report,
  };
}

function loopPlanarity(vertices, loop, tolerance) {
  const points = loop.map((index) => vertices[index]);
  const normal = newellNormal(points);
  if (!normal) return { near: false, triangles: null };
  const centroid = points.reduce((sum, point) => ({
    x: sum.x + point.x / points.length,
    y: sum.y + point.y / points.length,
    z: sum.z + point.z / points.length,
  }), { x: 0, y: 0, z: 0 });
  let maxDistance = 0;
  for (const point of points) {
    const distance = Math.abs(
      normal.x * (point.x - centroid.x)
      + normal.y * (point.y - centroid.y)
      + normal.z * (point.z - centroid.z),
    );
    if (distance > maxDistance) maxDistance = distance;
  }
  const diagonal = loopDiagonal(points);
  const planarLimit = Math.max(tolerance * 10, diagonal * 1e-4);
  const near = maxDistance <= planarLimit;
  const projected = projectLoop(points, normal);
  const triangles2d = earClip(projected.points, tolerance);
  const triangles = triangles2d
    ? triangles2d.map((triangle) => triangle.map((index) => loop[index]))
    : null;
  return { near, triangles };
}

function fanCap(vertices, faces, loop) {
  if (loop.length === 3) {
    faces.push([loop[2], loop[1], loop[0]]);
    return;
  }
  const centroid = loop.reduce((sum, index) => {
    const point = vertices[index];
    return { x: sum.x + point.x / loop.length, y: sum.y + point.y / loop.length, z: sum.z + point.z / loop.length };
  }, { x: 0, y: 0, z: 0 });
  const centroidIndex = vertices.length;
  vertices.push(centroid);
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    faces.push([b, a, centroidIndex]);
  }
}

function projectLoop(points, normal) {
  const axis = Math.abs(normal.x) >= Math.abs(normal.y) && Math.abs(normal.x) >= Math.abs(normal.z)
    ? 'x'
    : (Math.abs(normal.y) >= Math.abs(normal.z) ? 'y' : 'z');
  const projected = points.map((point) => {
    if (axis === 'x') return { x: point.y, y: point.z };
    if (axis === 'y') return { x: point.x, y: point.z };
    return { x: point.x, y: point.y };
  });
  return { axis, points: projected };
}

function earClip(points, tolerance) {
  if (points.length < 3) return null;
  let order = points.map((_, index) => index);
  if (signedArea2D(points) < 0) order = order.reverse();
  const triangles = [];
  let guard = points.length * points.length;
  while (order.length > 3 && guard-- > 0) {
    let ear = -1;
    for (let i = 0; i < order.length; i++) {
      const previous = order[(i - 1 + order.length) % order.length];
      const current = order[i];
      const next = order[(i + 1) % order.length];
      if (orientation2D(points[previous], points[current], points[next]) <= tolerance) continue;
      let contains = false;
      for (const index of order) {
        if (index === previous || index === current || index === next) continue;
        if (pointInTriangle2D(points[index], points[previous], points[current], points[next], tolerance)) {
          contains = true;
          break;
        }
      }
      if (contains) continue;
      triangles.push([previous, current, next]);
      order.splice(i, 1);
      ear = i;
      break;
    }
    if (ear < 0) return null;
  }
  if (order.length === 3) {
    triangles.push([order[0], order[1], order[2]]);
  }
  return triangles.length === points.length - 2 ? triangles : null;
}

function signedArea2D(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function orientation2D(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function pointInTriangle2D(point, a, b, c, tolerance) {
  const o1 = orientation2D(a, b, point);
  const o2 = orientation2D(b, c, point);
  const o3 = orientation2D(c, a, point);
  const hasNegative = o1 < -tolerance || o2 < -tolerance || o3 < -tolerance;
  const hasPositive = o1 > tolerance || o2 > tolerance || o3 > tolerance;
  return !(hasNegative && hasPositive);
}

function newellNormal(points) {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    nx += (current.y - next.y) * (current.z + next.z);
    ny += (current.z - next.z) * (current.x + next.x);
    nz += (current.x - next.x) * (current.y + next.y);
  }
  const length = Math.hypot(nx, ny, nz);
  if (!Number.isFinite(length) || length <= 1e-12) return null;
  return { x: nx / length, y: ny / length, z: nz / length };
}

function loopDiagonal(points) {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.z < minZ) minZ = point.z;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
    if (point.z > maxZ) maxZ = point.z;
  }
  return Math.hypot(maxX - minX, maxY - minY, maxZ - minZ);
}

/* ———————— report helpers ———————— */

function emptyReport(strategy = DEFAULT_CAP_STRATEGY) {
  return {
    strategy,
    changed: false,
    removedInvalidFaces: 0,
    removedDegenerateFaces: 0,
    removedDuplicateFaces: 0,
    weldedVertices: 0,
    cappedLoops: 0,
    planarCaps: 0,
    fanCaps: 0,
    fallbackCaps: 0,
    skippedLoops: 0,
    flippedFaces: 0,
    flippedShells: 0,
    orientationContradictions: 0,
    warnings: [],
    errors: [],
  };
}

function mergeReport(target, source) {
  for (const key of [
    'removedInvalidFaces', 'removedDegenerateFaces', 'removedDuplicateFaces',
    'weldedVertices', 'cappedLoops', 'planarCaps', 'fanCaps', 'fallbackCaps',
    'skippedLoops', 'flippedFaces', 'flippedShells', 'orientationContradictions',
  ]) {
    target[key] += Number(source[key]) || 0;
  }
  target.warnings.push(...(source.warnings ?? []));
  target.errors.push(...(source.errors ?? []));
}

function actionCount(report) {
  return report.removedInvalidFaces
    + report.removedDegenerateFaces
    + report.removedDuplicateFaces
    + report.weldedVertices
    + report.cappedLoops
    + report.flippedFaces
    + report.flippedShells
    + report.orientationContradictions
    + report.skippedLoops;
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

function orientationSign(face, key) {
  const sorted = key.split(':').map(Number);
  const position = face.indexOf(sorted[0]);
  return face[(position + 1) % face.length] === sorted[1] ? 1 : -1;
}
