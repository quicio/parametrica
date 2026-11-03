/**
 * view/projection.js — world geometry to render-space geometry.
 *
 * Camera and orthographic projection live here. Generators never project.
 * The framing step is delegated to view/transform.js so curves, meshes,
 * references and exporters share one transform contract.
 */

import { isCurve3D, isMesh, isSurface } from '../geometry/contracts.js';
import { cameraFrom, project3D } from './camera.js';
import {
  boundsOfProjectedPoints,
  createViewTransform,
  projectPointToView,
  resolveEffectiveCamera,
} from './transform.js';

export function supportsOrthographicGeometry(geometry) {
  return Array.isArray(geometry) && geometry.some((item) => isCurve3D(item) || isSurface(item) || isMesh(item));
}

export function projectionForGeometry(geometry, projection = '3d') {
  return projection === '3d' || supportsOrthographicGeometry(geometry) ? projection : '3d';
}

/**
 * Project world curves to view space without framing. Kept separate from
 * framing so a caller can resolve one scene transform and apply it to every
 * layer, curve and mesh consistently.
 */
export function projectWorldCurvesToView(curves, {
  camera = null,
  projection = '3d',
  depthFade = true,
  depthStrength = 0.55,
} = {}) {
  const source = Array.isArray(curves) ? curves : [];
  const cam = camera ?? cameraFrom(null);
  if (projection === '3d') {
    return source.flatMap((curve) => projectCameraCurveSegments(curve, cam, {
      depthFade,
      fadeStrength: depthStrength,
    }));
  }
  return source.map((curve) => projectOrthographicCurve(curve, projection));
}

export function projectWorldMeshesToView(meshes, {
  camera = null,
  projection = '3d',
  depthFade = true,
  depthStrength = 0.55,
} = {}) {
  const source = Array.isArray(meshes) ? meshes : [];
  const cam = camera ?? cameraFrom(null);
  return source.map((mesh) => projectMeshToView(mesh, {
    camera: cam,
    projection,
    depthFade,
    depthStrength,
  }));
}

export function projectMeshToView(mesh, {
  camera = null,
  projection = '3d',
  depthFade = true,
  depthStrength = 0.55,
} = {}) {
  if (!isMesh(mesh)) return mesh;
  const cam = camera ?? cameraFrom(null);
  const vertices = mesh.vertices.map((point) => {
    const projected = projectPointToView(point, projection, cam, {
      depthFade,
      fadeStrength: depthStrength,
    });
    if (!projected) return null;
    return {
      x: projected.x,
      y: projected.y,
      depth: projected.depth,
      depthAlpha: projected.depthAlpha,
    };
  });
  return { ...mesh, vertices, faces: mesh.faces, normals: mesh.normals, faceNormals: mesh.faceNormals };
}

export function applyViewTransformToCurves(curves, transform) {
  if (!transform) return curves;
  return (curves ?? []).map((curve) => ({
    ...curve,
    points: curve.points.map((point) => transform.applyFrame(point)),
  }));
}

export function applyViewTransformToMeshes(meshes, transform) {
  if (!transform) return meshes;
  return (meshes ?? []).map((mesh) => ({
    ...mesh,
    vertices: mesh.vertices.map((point) => (point ? transform.applyFrame(point) : null)),
  }));
}

export function projectWorldCurves(curves, {
  camera = null,
  projection = '3d',
  fit = 0,
  depthFade = true,
  depthStrength = 0.55,
  transform = null,
} = {}) {
  const source = Array.isArray(curves) ? curves : [];
  const safeCamera = transform?.camera
    ?? resolveEffectiveCamera(camera, source.map((curve) => curve.points));
  const projectionId = transform?.projection ?? projection;
  const projected = projectWorldCurvesToView(source, {
    camera: safeCamera,
    projection: projectionId,
    depthFade,
    depthStrength,
  });
  const resolved = transform ?? createViewTransform({
    projection: projectionId,
    camera: safeCamera,
    frame: { mode: 'composition', anchor: 'bbox', fit },
    bounds: boundsOfProjectedPoints(projected.flatMap((curve) => curve.points ?? [])),
    depthFade,
    depthStrength,
  });
  return applyViewTransformToCurves(projected, resolved);
}

export function projectWorldMeshes(meshes, {
  camera = null,
  projection = '3d',
  fit = 0,
  depthFade = true,
  depthStrength = 0.55,
  transform = null,
} = {}) {
  const source = Array.isArray(meshes) ? meshes : [];
  const safeCamera = transform?.camera
    ?? resolveEffectiveCamera(camera, source.map((mesh) => mesh.vertices));
  const projectionId = transform?.projection ?? projection;
  const projected = projectWorldMeshesToView(source, {
    camera: safeCamera,
    projection: projectionId,
    depthFade,
    depthStrength,
  });
  const resolved = transform ?? createViewTransform({
    projection: projectionId,
    camera: safeCamera,
    frame: { mode: 'composition', anchor: 'bbox', fit },
    bounds: boundsOfProjectedPoints(projected.flatMap((mesh) => mesh.vertices ?? [])),
    depthFade,
    depthStrength,
  });
  return applyViewTransformToMeshes(projected, resolved);
}

/**
 * One mesh with its own frame. This is a compatibility helper; scene builders
 * should use `projectWorldMeshes` or a shared ViewTransform so multiple meshes
 * keep their relative positions.
 *
 * Unlike `projectWorldMeshes`, this does not pull the camera back: callers use
 * it to test clipping against the document camera as authored.
 */
export function projectMesh(mesh, {
  camera = null,
  projection = '3d',
  fit = 0,
  depthFade = true,
  depthStrength = 0.55,
  transform = null,
} = {}) {
  if (!isMesh(mesh)) return mesh;
  const cam = transform?.camera ?? camera ?? cameraFrom(null);
  const projectionId = transform?.projection ?? projection;
  const projected = projectMeshToView(mesh, {
    camera: cam,
    projection: projectionId,
    depthFade,
    depthStrength,
  });
  const resolved = transform ?? createViewTransform({
    projection: projectionId,
    camera: cam,
    frame: { mode: 'composition', anchor: 'bbox', fit },
    bounds: boundsOfProjectedPoints(projected.vertices ?? []),
    depthFade,
    depthStrength,
  });
  return applyViewTransformToMeshes([projected], resolved)[0] ?? projected;
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

export function projectSurface(surface, _options = {}) {
  if (!isSurface(surface)) return surface;
  // Surfaces are tessellated by the geometry layer; this helper is kept for
  // callers that only need the grid corners projected.
  return surface;
}
