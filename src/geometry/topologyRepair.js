/**
 * geometry/topologyRepair.js — explicit non-manifold and non-orientable repair.
 *
 * Non-manifold edge fans are split by duplicating edge vertices. Non-orientable
 * cycles are cut by duplicating the conflicting seam edge. Geometry positions
 * never change; only topology does.
 */

import { createMesh } from './contracts.js';
import { validateMesh } from './validate.js';

export const DEFAULT_MAX_TOPOLOGY_EDGES = 4096;

export function repairTopology(mesh, {
  tolerance = 1e-4,
  nonManifold = 'split', // split | remove | none
  nonOrientable = 'cut', // cut | reject
  maxEdges = DEFAULT_MAX_TOPOLOGY_EDGES,
} = {}) {
  const report = {
    tolerance: Number(tolerance) || 1e-4,
    nonManifoldEdges: 0,
    splitEdges: 0,
    removedFaces: 0,
    duplicatedVertices: 0,
    nonOrientable: false,
    cuts: 0,
    orientationConflicts: 0,
    warnings: [],
    errors: [],
  };
  if (!mesh || mesh.kind !== 'mesh' || !Array.isArray(mesh.vertices) || !Array.isArray(mesh.faces)) {
    return { mesh: null, validation: { ok: false, errors: ['topology repair requires a Mesh'], warnings: [], meta: null }, report: { ...report, errors: ['topology repair requires a Mesh'] } };
  }

  let current = mesh;
  if (nonManifold !== 'none') {
    const split = splitNonManifold(current, { strategy: nonManifold, maxEdges, report });
    if (split.error) {
      return { mesh: null, validation: { ok: false, errors: [split.error], warnings: [], meta: null }, report: { ...report, errors: [split.error] } };
    }
    current = split.mesh;
  }

  if (nonOrientable === 'cut') {
    let guard = 32;
    while (guard-- > 0) {
      const conflict = findOrientationConflict(current);
      if (!conflict) break;
      report.nonOrientable = true;
      const cut = cutEdge(current, conflict.a, conflict.b, report);
      current = cut;
      report.cuts++;
    }
    if (findOrientationConflict(current)) {
      report.nonOrientable = true;
      report.warnings.push('non-orientable conflicts remain after seam cuts');
    }
  } else if (nonOrientable === 'reject') {
    const conflict = findOrientationConflict(current);
    if (conflict) {
      report.nonOrientable = true;
      report.errors.push('non-orientable topology cannot be closed as a single orientable shell');
      return {
        mesh: null,
        validation: { ok: false, errors: ['non-orientable topology'], warnings: [], meta: null },
        report,
      };
    }
  }

  const validation = validateMesh(current);
  report.errors = validation.errors ?? [];
  return { mesh: current, validation, report };
}

function splitNonManifold(mesh, { strategy, maxEdges, report }) {
  const edgeMap = buildEdgeMap(mesh.faces);
  const offenders = [...edgeMap.entries()]
    .filter(([, edge]) => edge.uses.length > 2)
    .sort(([a], [b]) => a.localeCompare(b));
  report.nonManifoldEdges = offenders.length;
  if (offenders.length > maxEdges) {
    return { error: `topology repair exceeds ${maxEdges} non-manifold edges` };
  }

  const vertices = mesh.vertices.map((vertex) => ({ ...vertex }));
  let faces = mesh.faces.map((face) => [...face]);

  for (const [, edge] of offenders) {
    const uses = [...edge.uses].sort((a, b) => a.face - b.face);
    if (strategy === 'remove') {
      const keep = new Set(uses.slice(0, 2).map((use) => use.face));
      const before = faces.length;
      faces = faces.filter((_, index) => keep.has(index));
      report.removedFaces += before - faces.length;
      continue;
    }
    const fans = incidentFans(mesh, edge, uses, vertices, faces);
    for (let i = 1; i < fans.length; i++) {
      const fan = fans[i];
      const copyA = vertices.length;
      vertices.push({ ...vertices[edge.a] });
      const copyB = vertices.length;
      vertices.push({ ...vertices[edge.b] });
      report.duplicatedVertices += 2;
      for (const faceIndex of fan.faces) {
        faces[faceIndex] = faces[faceIndex].map((index) => (
          index === edge.a ? copyA : (index === edge.b ? copyB : index)
        ));
      }
    }
    report.splitEdges++;
  }

  if (faces.length === mesh.faces.length && report.splitEdges === 0 && report.removedFaces === 0) {
    return { mesh };
  }
  return {
    mesh: createMesh({
      id: mesh.id,
      vertices,
      faces,
      normals: null,
      faceNormals: null,
      uvs: null,
      meta: { ...mesh.meta, topologyRepair: true },
    }),
  };
}

function incidentFans(mesh, edge, uses, vertices, faces) {
  const edgeMap = buildEdgeMap(mesh.faces);
  const adjacency = mesh.faces.map(() => []);
  const edgeKey = edge.a < edge.b ? `${edge.a}:${edge.b}` : `${edge.b}:${edge.a}`;
  for (const [key, entry] of edgeMap) {
    if (key === edgeKey || entry.uses.length !== 2) continue;
    const [a, b] = entry.uses;
    adjacency[a.face].push(b.face);
    adjacency[b.face].push(a.face);
  }
  const useFaces = new Set(uses.map((use) => use.face));
  const seen = new Set();
  const groups = [];
  for (const use of uses) {
    if (seen.has(use.face)) continue;
    const stack = [use.face];
    seen.add(use.face);
    const component = [];
    const groupUses = [];
    while (stack.length) {
      const face = stack.pop();
      component.push(face);
      if (useFaces.has(face)) groupUses.push(face);
      for (const next of adjacency[face] ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    if (groupUses.length) {
      groups.push({
        uses: groupUses.sort((a, b) => a - b),
        faces: component.sort((a, b) => a - b),
      });
    }
  }
  if (groups.length > 1) {
    return groups.sort((left, right) => left.uses[0] - right.uses[0]);
  }
  return angularFans(vertices, edge.a, edge.b, uses, faces).map((fan) => ({
    uses: fan.map((use) => use.face),
    faces: fan.map((use) => use.face),
  }));
}

function angularFans(vertices, a, b, uses, faces) {
  const pa = vertices[a];
  const pb = vertices[b];
  const axis = normalize({ x: pb.x - pa.x, y: pb.y - pa.y, z: pb.z - pa.z });
  const helper = Math.abs(axis.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const u = normalize(cross(axis, helper));
  const v = cross(axis, u);
  const midpoint = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2, z: (pa.z + pb.z) / 2 };
  const angled = uses.map((use) => {
    const points = (faces[use.face] ?? []).map((index) => vertices[index]);
    const centroid = points.reduce((sum, point) => ({
      x: sum.x + point.x / Math.max(1, points.length),
      y: sum.y + point.y / Math.max(1, points.length),
      z: sum.z + point.z / Math.max(1, points.length),
    }), { x: 0, y: 0, z: 0 });
    const direction = { x: centroid.x - midpoint.x, y: centroid.y - midpoint.y, z: centroid.z - midpoint.z };
    const angle = Math.atan2(dot(direction, v), dot(direction, u));
    return { ...use, angle };
  }).sort((left, right) => left.angle - right.angle || left.face - right.face);

  const fans = [];
  for (let i = 0; i < angled.length; i += 2) {
    fans.push(angled.slice(i, i + 2));
  }
  return fans;
}

function cutEdge(mesh, a, b, report) {
  const vertices = mesh.vertices.map((vertex) => ({ ...vertex }));
  const faces = mesh.faces.map((face) => [...face]);
  const copyA = vertices.length;
  vertices.push({ ...vertices[a] });
  const copyB = vertices.length;
  vertices.push({ ...vertices[b] });
  report.duplicatedVertices += 2;

  // Cut the last incident face on the edge to break the orientation cycle.
  const uses = [];
  for (let index = 0; index < faces.length; index++) {
    const face = faces[index];
    for (let i = 0; i < face.length; i++) {
      const x = face[i];
      const y = face[(i + 1) % face.length];
      if ((x === a && y === b) || (x === b && y === a)) uses.push(index);
    }
  }
  const target = uses[uses.length - 1];
  if (target !== undefined) {
    faces[target] = faces[target].map((index) => (
      index === a ? copyA : (index === b ? copyB : index)
    ));
  }
  return createMesh({
    id: mesh.id,
    vertices,
    faces,
    normals: null,
    faceNormals: null,
    uvs: null,
    meta: { ...mesh.meta, topologyRepair: true },
  });
}

function findOrientationConflict(mesh) {
  const edgeMap = buildEdgeMap(mesh.faces);
  const adjacency = mesh.faces.map(() => []);
  for (const edge of edgeMap.values()) {
    if (edge.uses.length !== 2) continue;
    const [a, b] = edge.uses;
    adjacency[a.face].push({ face: b.face, same: a.forward === b.forward, edge });
    adjacency[b.face].push({ face: a.face, same: a.forward === b.forward, edge });
  }
  const flip = new Array(mesh.faces.length).fill(null);
  for (let start = 0; start < mesh.faces.length; start++) {
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
          return { a: next.edge.a, b: next.edge.b };
        }
      }
    }
  }
  return null;
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

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
