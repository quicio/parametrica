/**
 * geometry/latticeSolid.js — turn a lattice strut network into one solid.
 *
 * Every Curve3D becomes a closed tube. A solid floor and a rim ring close the
 * ends, then Manifold unions everything into a single watertight body. The
 * builder never mutates the input curves.
 */

import { createMesh, isCurve3D } from './contracts.js';
import { booleanSolids } from './csg.js';
import { validateMesh } from './validate.js';

const TWO_PI = Math.PI * 2;

export function buildLatticeSolid(curves, {
  strut = 3.5,
  floor = 3,
  rim = 4,
  height = null,
  radialSegments = 8,
  tolerance = 1e-4,
} = {}) {
  const radius = Math.max(0.2, (Number(strut) || 3.5) / 2);
  const floorHeight = Math.max(0, Number(floor) || 0);
  const rimWidth = Math.max(radius, (Number(rim) || 4) / 2);
  const ringCount = Math.max(5, Math.min(16, Math.round(radialSegments) || 8));
  const polylines = (Array.isArray(curves) ? curves : [])
    .filter((curve) => isCurve3D(curve) && Array.isArray(curve.points) && curve.points.length >= 2);

  if (!polylines.length) {
    return { ok: false, geometry: null, error: { code: 'empty-network', message: 'lattice network has no curves' } };
  }

  const tubes = [];
  let tubeTriangles = 0;
  for (let i = 0; i < polylines.length; i++) {
    const tube = tubeMesh(polylines[i].points, radius, ringCount, `lattice-strut-${i}`);
    if (!tube) continue;
    tubes.push(tube);
    tubeTriangles += tube.faces.length;
  }
  if (!tubes.length) {
    return { ok: false, geometry: null, error: { code: 'empty-network', message: 'lattice network produced no struts' } };
  }

  const floorMesh = floorSolid(curves, radius, floorHeight);
  const rimMesh = rimSolid(curves, height, radius, rimWidth);
  const operands = [floorMesh, rimMesh, ...tubes].filter(Boolean);
  const result = booleanSolids('union', operands, {
    strategy: 'manifold',
    tolerance,
    maxInputTriangles: 400_000,
  });
  if (result.empty || !result.geometry) {
    return {
      ok: false,
      geometry: null,
      error: result.error ?? { code: 'empty-result', message: 'lattice union produced an empty body' },
      stats: { struts: tubes.length, operands: operands.length, tubeTriangles },
    };
  }
  let geometry = result.geometry;
  let validation = result.validation ?? validateMesh(geometry);
  let microCaps = 0;
  if (!validation.ok) {
    // Manifold's float32 output can leave a micro-triangle open at a
    // near-coincident junction. Cap only microscopic boundary loops; larger
    // holes are real failures and stay surfaced.
    const capped = capMicroHoles(geometry, Math.max(0.1, tolerance * 10));
    if (capped.caps > 0) {
      geometry = capped.mesh;
      validation = validateMesh(geometry);
      microCaps = capped.caps;
    }
  }
  if (!validation.ok) {
    return {
      ok: false,
      geometry: null,
      error: { code: 'invalid-result', message: validation.errors[0] ?? 'lattice union failed validation' },
      stats: { struts: tubes.length, operands: operands.length, tubeTriangles },
    };
  }
  return {
    ok: true,
    geometry,
    validation,
    stats: {
      struts: tubes.length,
      operands: operands.length,
      tubeTriangles,
      triangles: geometry.faces.length,
      vertices: geometry.vertices.length,
      strategy: result.stats?.strategy ?? 'manifold',
      volume: validation.meta?.volume ?? null,
      microCaps,
      radius,
      floor: floorHeight,
      rim: rimWidth,
    },
  };
}

/**
 * Closed tube swept along a polyline with parallel-transport frames.
 */
export function tubeMesh(points, radius, radialSegments = 8, id = 'lattice-strut') {
  const path = dedupePoints(points);
  if (path.length < 2) return null;
  const tangents = path.map((_, index) => {
    const a = path[Math.max(0, index - 1)];
    const b = path[Math.min(path.length - 1, index + 1)];
    return normalize({
      x: b.x - a.x,
      y: b.y - a.y,
      z: b.z - a.z,
    }) ?? { x: 0, y: 0, z: 1 };
  });
  const sides = Math.max(3, Math.floor(radialSegments) || 8);
  const normals = [];
  let normal = perpendicular(tangents[0]);
  for (let i = 0; i < path.length; i++) {
    if (i > 0) {
      const projected = subtract(normal, scale(tangents[i], dot(normal, tangents[i])));
      normal = normalize(projected) ?? perpendicular(tangents[i]);
    }
    normals.push(normal);
  }
  const vertices = [];
  for (let i = 0; i < path.length; i++) {
    const normalI = normals[i];
    const binormal = normalize(cross(tangents[i], normalI)) ?? perpendicular(tangents[i]);
    for (let k = 0; k < sides; k++) {
      const angle = (TWO_PI * k) / sides;
      vertices.push({
        x: path[i].x + radius * (Math.cos(angle) * normalI.x + Math.sin(angle) * binormal.x),
        y: path[i].y + radius * (Math.cos(angle) * normalI.y + Math.sin(angle) * binormal.y),
        z: path[i].z + radius * (Math.cos(angle) * normalI.z + Math.sin(angle) * binormal.z),
      });
    }
  }
  const faces = [];
  for (let i = 0; i < path.length - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const next = (k + 1) % sides;
      const a = i * sides + k;
      const b = i * sides + next;
      const c = (i + 1) * sides + next;
      const d = (i + 1) * sides + k;
      faces.push([a, b, c, d]);
    }
  }
  const startCenter = vertices.length;
  vertices.push({ ...path[0] });
  const endCenter = vertices.length;
  vertices.push({ ...path[path.length - 1] });
  for (let k = 0; k < sides; k++) {
    const next = (k + 1) % sides;
    faces.push([startCenter, next, k]);
    const base = (path.length - 1) * sides;
    faces.push([endCenter, base + k, base + next]);
  }
  const mesh = createMesh({ id, vertices, faces, meta: { source: 'lattice-strut' } });
  const validation = validateMesh(mesh);
  if ((validation.meta?.volume ?? 0) < 0) {
    mesh.faces = mesh.faces.map((face) => [...face].reverse());
    mesh.meta = { ...mesh.meta, flipped: true };
  }
  return mesh;
}

function capMicroHoles(mesh, maxPerimeter) {
  const edges = new Map();
  for (const face of mesh.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const entry = edges.get(key) ?? { count: 0, a: Math.min(a, b), b: Math.max(a, b) };
      entry.count += 1;
      edges.set(key, entry);
    }
  }
  const boundary = [...edges.values()].filter((edge) => edge.count === 1);
  if (!boundary.length) return { mesh, caps: 0 };
  const incident = new Map();
  boundary.forEach((edge, index) => {
    for (const vertex of [edge.a, edge.b]) {
      if (!incident.has(vertex)) incident.set(vertex, []);
      incident.get(vertex).push(index);
    }
  });
  const used = new Set();
  const caps = [];
  for (let i = 0; i < boundary.length; i++) {
    if (used.has(i)) continue;
    const loop = [];
    const start = boundary[i].a;
    let current = start;
    let edgeIndex = i;
    let guard = 0;
    while (edgeIndex !== -1 && guard++ <= boundary.length + 1) {
      used.add(edgeIndex);
      const edge = boundary[edgeIndex];
      const next = edge.a === current ? edge.b : edge.a;
      loop.push(next);
      if (next === start) break;
      current = next;
      edgeIndex = (incident.get(current) ?? []).find((index) => !used.has(index)) ?? -1;
    }
    if (loop.length < 3 || loop[loop.length - 1] !== start) continue;
    let perimeter = 0;
    for (let k = 0; k < loop.length; k++) {
      const a = mesh.vertices[loop[k]];
      const b = mesh.vertices[loop[(k + 1) % loop.length]];
      perimeter += Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }
    if (perimeter <= maxPerimeter) caps.push([...loop].reverse());
  }
  if (!caps.length) return { mesh, caps: 0 };
  const vertices = mesh.vertices.map((point) => ({ ...point }));
  const faces = mesh.faces.map((face) => [...face]);
  for (const cap of caps) faces.push(cap);
  return {
    mesh: createMesh({
      id: mesh.id,
      vertices,
      faces,
      meta: { ...mesh.meta, microCaps: caps.length },
    }),
    caps: caps.length,
  };
}

function floorSolid(curves, radius, floorHeight) {
  const bottom = [];
  for (const curve of curves) {
    for (const point of curve.points ?? []) {
      if (point.z <= floorHeight + 2) bottom.push(point);
    }
  }
  if (!bottom.length) return null;
  const maxRadius = Math.max(...bottom.map((point) => Math.hypot(point.x, point.y)));
  const floorRadius = Math.max(0.5, maxRadius + radius);
  const top = Math.max(floorHeight + radius * 2 + 0.5, radius * 2);
  return cylinderSolid({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: top }, floorRadius, Math.max(10, Math.round(floorRadius)), 'lattice-floor');
}

function rimSolid(curves, height, radius, rimHalfWidth) {
  const top = [];
  let maxZ = -Infinity;
  for (const curve of curves) {
    for (const point of curve.points ?? []) maxZ = Math.max(maxZ, point.z);
  }
  const limit = Number.isFinite(height) ? Math.min(maxZ, height) : maxZ;
  for (const curve of curves) {
    for (const point of curve.points ?? []) {
      if (point.z >= limit - 2) top.push(point);
    }
  }
  if (!top.length) return null;
  const major = Math.max(...top.map((point) => Math.hypot(point.x, point.y)));
  const minor = Math.max(rimHalfWidth, radius * 1.3);
  const centerZ = Number.isFinite(height) ? height - minor : limit;
  return torusSolid(major, minor, centerZ, 96, 10, 'lattice-rim');
}

function cylinderSolid(a, b, radius, segments, id) {
  const axis = normalize({ x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }) ?? { x: 0, y: 0, z: 1 };
  const u = perpendicular(axis);
  const v = normalize(cross(axis, u)) ?? perpendicular(axis);
  const vertices = [];
  for (const center of [a, b]) {
    for (let k = 0; k < segments; k++) {
      const angle = (TWO_PI * k) / segments;
      vertices.push({
        x: center.x + radius * (Math.cos(angle) * u.x + Math.sin(angle) * v.x),
        y: center.y + radius * (Math.cos(angle) * u.y + Math.sin(angle) * v.y),
        z: center.z + radius * (Math.cos(angle) * u.z + Math.sin(angle) * v.z),
      });
    }
  }
  const bottomCenter = vertices.length;
  vertices.push({ ...a });
  const topCenter = vertices.length;
  vertices.push({ ...b });
  const faces = [];
  for (let k = 0; k < segments; k++) {
    const next = (k + 1) % segments;
    faces.push([k, next, segments + next, segments + k]);
    faces.push([bottomCenter, next, k]);
    faces.push([topCenter, segments + k, segments + next]);
  }
  return orientMesh(createMesh({ id, vertices, faces, meta: { source: 'lattice-floor' } }));
}

function torusSolid(major, minor, z, majorSegments = 96, minorSegments = 10, id = 'lattice-rim') {
  const vertices = [];
  for (let i = 0; i < majorSegments; i++) {
    const u = (TWO_PI * i) / majorSegments;
    for (let j = 0; j < minorSegments; j++) {
      const v = (TWO_PI * j) / minorSegments;
      const r = major + minor * Math.cos(v);
      vertices.push({ x: r * Math.cos(u), y: r * Math.sin(u), z: z + minor * Math.sin(v) });
    }
  }
  const faces = [];
  for (let i = 0; i < majorSegments; i++) {
    const iNext = (i + 1) % majorSegments;
    for (let j = 0; j < minorSegments; j++) {
      const jNext = (j + 1) % minorSegments;
      const a = i * minorSegments + j;
      const b = iNext * minorSegments + j;
      const c = iNext * minorSegments + jNext;
      const d = i * minorSegments + jNext;
      faces.push([a, b, c, d]);
    }
  }
  return orientMesh(createMesh({ id, vertices, faces, meta: { source: 'lattice-rim' } }));
}

function orientMesh(mesh) {
  const validation = validateMesh(mesh);
  if ((validation.meta?.volume ?? 0) < 0) {
    mesh.faces = mesh.faces.map((face) => [...face].reverse());
    mesh.meta = { ...mesh.meta, flipped: true };
  }
  return mesh;
}

function dedupePoints(points) {
  const out = [];
  for (const point of points) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y) || !Number.isFinite(point?.z)) continue;
    const previous = out[out.length - 1];
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z) < 1e-6) continue;
    out.push({ x: point.x, y: point.y, z: point.z });
  }
  return out;
}

function perpendicular(axis) {
  const candidate = Math.abs(axis.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  return normalize(cross(axis, candidate)) ?? { x: 1, y: 0, z: 0 };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(a, factor) {
  return { x: a.x * factor, y: a.y * factor, z: a.z * factor };
}

function normalize(v) {
  const length = Math.hypot(v.x, v.y, v.z);
  if (!Number.isFinite(length) || length < 1e-12) return null;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}
