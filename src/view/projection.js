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

/**
 * Pull the camera back far enough that ordinary scene geometry stays in
 * front of it. The document camera has no position: fov is its distance to
 * the projection plane, so a large or scaled figure can otherwise surround
 * the camera and collapse into clipped radial lines.
 */
function cameraForScene(camera, pointLists) {
  const cam = camera ?? cameraFrom(null);
  let radius = 0;
  for (const points of pointLists) {
    for (const point of points ?? []) {
      const x = Number(point?.x);
      const y = Number(point?.y);
      const z = Number(point?.z);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const distance = Math.hypot(x, y, Number.isFinite(z) ? z : 0);
      if (distance > radius) radius = distance;
    }
  }
  const minimum = radius * 1.1;
  return cam.fov >= minimum ? cam : { ...cam, fov: minimum };
}

export function projectWorldCurves(curves, {
  camera = null,
  projection = '3d',
  fit = 0,
  depthFade = true,
  depthStrength = 0.55,
} = {}) {
  if (!Array.isArray(curves) || projection === '3d') {
    const safeCamera = cameraForScene(camera, curves.map((curve) => curve.points));
    const projected = curves.flatMap((curve) => projectCameraCurveSegments(curve, safeCamera, { depthFade, depthStrength }));
    return fit > 0 ? fitCurves(projected, fit) : centerCurves(projected);
  }
  const projected = curves.map((curve) => projectOrthographicCurve(curve, projection));
  return fit > 0 ? fitCurves(projected, fit) : centerCurves(projected);
}

/**
 * Project a camera-space curve, splitting it into visible runs when samples
 * fall behind the camera. A curve that never leaves the frustum keeps its
 * original closed flag; clipped fragments are open.
 */
export function projectCameraCurveSegments(curve, camera, options = {}) {
  const cam = camera ?? cameraFrom(null);
  const runs = [];
  let run = [];
  let broken = false;
  const flush = () => {
    if (run.length >= 2) runs.push({ points: run, closed: false });
    run = [];
  };
  for (const point of curve.points) {
    const projected = project3D(point.x, point.y, point.z, cam, options);
    if (!projected) {
      broken = true;
      flush();
      continue;
    }
    run.push({
      x: projected.x,
      y: projected.y,
      x3: point.x,
      y3: point.y,
      h3: point.z,
      depth: projected.depth,
      depthAlpha: projected.depthAlpha,
    });
  }
  flush();
  if (!runs.length) return [];
  if (runs.length === 1 && !broken) {
    return [{
      id: curve.id,
      closed: curve.closed,
      meta: curve.meta,
      points: runs[0].points,
    }];
  }
  return runs.map((segment, index) => ({
    id: `${curve.id ?? 'curve'}-s${index}`,
    closed: false,
    meta: { ...(curve.meta ?? {}), discontinuity: true, segment: index },
    points: segment.points,
  }));
}

/** Single-run compatibility wrapper; use projectCameraCurveSegments for splits. */
export function projectCameraCurve(curve, camera, options = {}) {
  return projectCameraCurveSegments(curve, camera, options)[0]
    ?? { id: curve.id, closed: false, meta: curve.meta, points: [] };
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
  const source = meshes ?? [];
  const safeCamera = cameraForScene(camera, source.map((mesh) => mesh.vertices));
  return source.map((mesh) => projectMesh(mesh, {
    camera: safeCamera,
    projection,
    fit,
    depthFade,
    depthStrength,
  }));
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
  const fitted = fit > 0 ? fitVertices(projected, fit) : centerVertices(projected);
  return { ...mesh, vertices: fitted, faces: mesh.faces, normals: mesh.normals, faceNormals: mesh.faceNormals };
}

export function projectSurface(surface, _options = {}) {
  if (!isSurface(surface)) return surface;
  // Surfaces are tessellated by the geometry layer; this helper is kept for
  // callers that only need the grid corners projected.
  return surface;
}

function visibleVertices(vertices) {
  return vertices.filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y));
}

function centerVertices(vertices) {
  const visible = visibleVertices(vertices);
  if (!visible.length) return vertices.map(() => null);
  const box = bbox(visible);
  return vertices.map((point) => (
    point ? { ...point, x: point.x - box.cx, y: point.y - box.cy } : null
  ));
}

function fitVertices(vertices, size) {
  const visible = visibleVertices(vertices);
  if (!visible.length) return vertices.map(() => null);
  const box = bbox(visible);
  const scale = size / Math.max(box.width, box.height, 1e-9);
  return vertices.map((point) => (
    point
      ? {
        ...point,
        x: (point.x - box.cx) * scale,
        y: (point.y - box.cy) * scale,
      }
      : null
  ));
}
