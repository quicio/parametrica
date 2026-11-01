/**
 * view/projection.js — world geometry to render-space geometry.
 *
 * Camera and orthographic projection live here. Generators never project.
 */

import { bbox, centerCurves, fitCurves } from '../sampling/sampling.js';
import { isCurve3D, isMesh, isSurface } from '../geometry/contracts.js';
import { cameraFrom, project3D } from './camera.js';

export function supportsOrthographicGeometry(geometry) {
  return Array.isArray(geometry) && geometry.some((item) => isCurve3D(item) || isSurface(item) || isMesh(item));
}

export function projectionForGeometry(geometry, projection = '3d') {
  return projection === '3d' || supportsOrthographicGeometry(geometry) ? projection : '3d';
}

export function projectWorldCurves(curves, {
  camera = null,
  projection = '3d',
  fit = 0,
  depthFade = true,
  depthStrength = 0.55,
} = {}) {
  if (!Array.isArray(curves) || projection === '3d') {
    const projected = curves.map((curve) => projectCameraCurve(curve, camera, { depthFade, depthStrength }));
    return fit > 0 ? fitCurves(projected, fit) : centerCurves(projected);
  }
  const projected = curves.map((curve) => projectOrthographicCurve(curve, projection));
  return fit > 0 ? fitCurves(projected, fit) : centerCurves(projected);
}

export function projectCameraCurve(curve, camera, options = {}) {
  const cam = camera ?? cameraFrom(null);
  return {
    id: curve.id,
    closed: curve.closed,
    meta: curve.meta,
    points: curve.points.map((point) => {
      const projected = project3D(point.x, point.y, point.z, cam, options);
      if (!projected) return null;
      return {
        x: projected.x,
        y: projected.y,
        x3: point.x,
        y3: point.y,
        h3: point.z,
        depth: projected.depth,
        depthAlpha: projected.depthAlpha,
      };
    }).filter(Boolean),
  };
}

export function projectOrthographicCurve(curve, projection) {
  return {
    id: curve.id,
    closed: curve.closed,
    meta: curve.meta,
    points: curve.points.map((point) => {
      const projected = projectWorldPoint(point, projection);
      return {
        x: projected.x,
        y: projected.y,
        x3: point.x,
        y3: point.y,
        h3: point.z,
        depthAlpha: 1,
      };
    }),
  };
}

export function projectWorldPoint(point, projection) {
  const x = point.x;
  const y = point.y;
  const z = point.z;
  if (projection === 'xz') return { x, y: -z };
  if (projection === 'yz') return { x: -y, y: -z };
  return { x, y: -y };
}

export function projectWorldMeshes(meshes, {
  camera = null,
  projection = '3d',
  fit = 0,
  depthFade = true,
  depthStrength = 0.55,
} = {}) {
  return (meshes ?? []).map((mesh) => projectMesh(mesh, { camera, projection, fit, depthFade, depthStrength }));
}

export function projectMesh(mesh, {
  camera = null,
  projection = '3d',
  fit = 0,
  depthFade = true,
  depthStrength = 0.55,
} = {}) {
  if (!isMesh(mesh)) return mesh;
  const cam = camera ?? cameraFrom(null);
  const projected = mesh.vertices.map((point) => {
    if (projection === '3d') {
      const p = project3D(point.x, point.y, point.z, cam, { depthFade, fadeStrength: depthStrength });
      return p ? { x: p.x, y: p.y, depth: p.depth, depthAlpha: p.depthAlpha } : null;
    }
    const p = projectWorldPoint(point, projection);
    return { x: p.x, y: p.y, depthAlpha: 1 };
  });
  if (projected.some((point) => !point)) {
    return { ...mesh, vertices: [], faces: [], normals: mesh.normals, faceNormals: mesh.faceNormals };
  }
  const fitted = fit > 0 ? fitVertices(projected, fit) : centerVertices(projected);
  return { ...mesh, vertices: fitted, faces: mesh.faces, normals: mesh.normals, faceNormals: mesh.faceNormals };
}

export function projectSurface(surface, _options = {}) {
  if (!isSurface(surface)) return surface;
  // Surfaces are tessellated by the geometry layer; this helper is kept for
  // callers that only need the grid corners projected.
  return surface;
}

function centerVertices(vertices) {
  const box = bbox(vertices);
  return vertices.map((point) => ({ ...point, x: point.x - box.cx, y: point.y - box.cy }));
}

function fitVertices(vertices, size) {
  const box = bbox(vertices);
  const scale = size / Math.max(box.width, box.height, 1e-9);
  return vertices.map((point) => ({
    ...point,
    x: (point.x - box.cx) * scale,
    y: (point.y - box.cy) * scale,
  }));
}
