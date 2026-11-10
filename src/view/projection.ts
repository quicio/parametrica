/** World geometry to render-space geometry. */

import { isCurve3D, isMesh, isSurface } from '../geometry/contracts.js';
import { cameraFrom, project3D } from './camera.ts';
import type { CameraState } from './camera.ts';
import {
  boundsOfProjectedPoints,
  createViewTransform,
  projectPointToView,
  resolveEffectiveCamera,
} from './transform.ts';
import type { ProjectionId, ViewPoint, ViewTransform, BoundsLike } from './transform.ts';

export interface ViewCurve {
  id?: unknown;
  closed?: boolean;
  meta?: Record<string, unknown>;
  points: ViewPoint[];
  [key: string]: unknown;
}
export interface ViewMesh {
  id?: unknown;
  vertices: Array<ViewPoint | null>;
  faces: number[][];
  normals?: unknown;
  faceNormals?: unknown;
  source?: unknown;
  [key: string]: unknown;
}
export interface CurveProjectionOptions {
  camera?: CameraState | null;
  projection?: ProjectionId;
  depthFade?: boolean;
  depthStrength?: number;
  preserveSource?: boolean;
}
export interface MeshProjectionOptions extends CurveProjectionOptions {}
export interface FramedProjectionOptions extends CurveProjectionOptions {
  fit?: number;
  transform?: ViewTransform | null;
}
export interface OrthoDepthAxis {
  axis: 'x' | 'y' | 'z';
  sign: number;
}

export function supportsOrthographicGeometry(geometry: unknown): boolean {
  return Array.isArray(geometry) && geometry.some((item) => isCurve3D(item) || isSurface(item) || isMesh(item));
}

export function projectionForGeometry(geometry: unknown, projection: ProjectionId = '3d'): ProjectionId {
  return projection === '3d' || supportsOrthographicGeometry(geometry) ? projection : '3d';
}

/**
 * Project world curves to view space without framing. Kept separate from
 * framing so a caller can resolve one scene transform and apply it to every
 * layer, curve and mesh consistently.
 */
export function projectWorldCurvesToView<T extends ViewCurve>(
  curves: ReadonlyArray<T> | null | undefined,
  {
    camera = null,
    projection = '3d',
    depthFade = true,
    depthStrength = 0.55,
  }: CurveProjectionOptions = {},
): T[] {
  const source = Array.isArray(curves) ? curves : [];
  const cam = camera ?? cameraFrom(null);
  if (projection === '3d') {
    return source.flatMap((curve) => projectCameraCurveSegments(curve, cam, {
      depthFade,
      fadeStrength: depthStrength,
    }) as T[]);
  }
  return source.map((curve) => projectOrthographicCurve(curve, projection) as T);
}

export function projectWorldMeshesToView(
  meshes: ReadonlyArray<ViewMesh> | null | undefined,
  {
    camera = null,
    projection = '3d',
    depthFade = true,
    depthStrength = 0.55,
    preserveSource = false,
  }: MeshProjectionOptions = {},
): ViewMesh[] {
  const source = Array.isArray(meshes) ? meshes : [];
  const cam = camera ?? cameraFrom(null);
  return source.map((mesh) => projectMeshToView(mesh, {
    camera: cam,
    projection,
    depthFade,
    depthStrength,
    preserveSource,
  }) as ViewMesh);
}

export function projectMeshToView(
  mesh: unknown,
  {
    camera = null,
    projection = '3d',
    depthFade = true,
    depthStrength = 0.55,
    preserveSource = false,
  }: MeshProjectionOptions = {},
): ViewMesh | unknown {
  if (!isMesh(mesh)) return mesh;
  const sourceMesh = mesh as unknown as ViewMesh;
  const cam = camera ?? cameraFrom(null);
  const vertices = sourceMesh.vertices.map((point) => {
    if (!point) return null;
    const projected = projectPointToView(point, projection, cam, {
      depthFade,
      fadeStrength: depthStrength,
    });
    if (!projected) return null;
    return {
      ...point,
      x: projected.x,
      y: projected.y,
      depth: projected.depth,
      depthAlpha: projected.depthAlpha,
    };
  });
  const projectedMesh: ViewMesh = {
    ...sourceMesh,
    vertices,
    faces: sourceMesh.faces,
    normals: sourceMesh.normals,
    faceNormals: sourceMesh.faceNormals,
  };
  if (preserveSource) projectedMesh.source = meshProjectionSource(sourceMesh, projection);
  else delete projectedMesh.source;
  return projectedMesh;
}

/**
 * Orthographic depth is the world coordinate along the dropped axis, signed
 * for an implied eye on the positive side of that axis:
 *
 *   XY (planta)  look from +Z: orthoDepth = -z
 *   XZ (alzado)  look from +Y: orthoDepth = -y
 *   YZ (perfil)  look from +X: orthoDepth = -x
 *
 * Larger values are farther from the implied viewer. The existing vertex
 * `depth` stays 0 in orthographic views so painter behavior is unchanged.
 */
const ORTHO_DEPTH: Readonly<Record<string, Readonly<OrthoDepthAxis>>> = Object.freeze({
  xy: Object.freeze({ axis: 'z', sign: -1 }),
  xz: Object.freeze({ axis: 'y', sign: -1 }),
  yz: Object.freeze({ axis: 'x', sign: -1 }),
});

function meshProjectionSource(mesh: ViewMesh, projection: ProjectionId): Record<string, unknown> {
  const sourceIndices = mesh.vertices.map((_, index) => index);
  const depth = ORTHO_DEPTH[projection] ?? null;
  return {
    kind: 'mesh-projection-source',
    view: projection,
    sourceMeshId: mesh.id ?? null,
    sourceVertices: mesh.vertices,
    sourceIndices,
    sourceVertexCount: sourceIndices.length,
    orthoDepth: depth
      ? {
        axis: depth.axis,
        sign: depth.sign,
        values: mesh.vertices.map((point) => (
          depth.sign * Number(point?.[depth.axis] ?? 0)
        )),
      }
      : null,
  };
}

export function applyViewTransformToCurves<T extends ViewCurve>(
  curves: ReadonlyArray<T> | null | undefined,
  transform: ViewTransform | null | undefined,
): T[] {
  if (!transform) return (curves ?? []) as T[];
  return ((curves ?? []) as T[]).map((curve) => ({
    ...curve,
    points: curve.points.map((point) => transform.applyFrame(point)).filter((point): point is NonNullable<typeof point> => Boolean(point)),
  })) as T[];
}

export function applyViewTransformToMeshes<T extends ViewMesh>(
  meshes: ReadonlyArray<T> | null | undefined,
  transform: ViewTransform | null | undefined,
): T[] {
  if (!transform) return (meshes ?? []) as T[];
  return ((meshes ?? []) as T[]).map((mesh) => ({
    ...mesh,
    vertices: mesh.vertices.map((point: ViewPoint | null) => (point ? transform.applyFrame(point) : null)),
  })) as T[];
}

export function projectWorldCurves<T extends ViewCurve>(
  curves: ReadonlyArray<T> | null | undefined,
  {
    camera = null,
    projection = '3d',
    fit = 0,
    depthFade = true,
    depthStrength = 0.55,
    transform = null,
  }: FramedProjectionOptions = {},
): T[] {
  const source = Array.isArray(curves) ? curves : [];
  const safeCamera = transform?.camera
    ?? resolveEffectiveCamera(camera, source.map((curve) => curve.points));
  const projectionId = (transform?.projection ?? projection) as ProjectionId;
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

export function projectWorldMeshes(
  meshes: ReadonlyArray<ViewMesh> | null | undefined,
  {
    camera = null,
    projection = '3d',
    fit = 0,
    depthFade = true,
    depthStrength = 0.55,
    transform = null,
    preserveSource = false,
  }: FramedProjectionOptions = {},
): ViewMesh[] {
  const source = Array.isArray(meshes) ? meshes : [];
  const safeCamera = transform?.camera
    ?? resolveEffectiveCamera(camera, source.map((mesh) => mesh.vertices.filter((point: ViewPoint | null): point is ViewPoint => Boolean(point))));
  const projectionId = (transform?.projection ?? projection) as ProjectionId;
  const projected = projectWorldMeshesToView(source, {
    camera: safeCamera,
    projection: projectionId,
    depthFade,
    depthStrength,
    preserveSource,
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
export function projectMesh(
  mesh: unknown,
  {
    camera = null,
    projection = '3d',
    fit = 0,
    depthFade = true,
    depthStrength = 0.55,
    transform = null,
    preserveSource = false,
  }: FramedProjectionOptions = {},
): unknown {
  if (!isMesh(mesh)) return mesh;
  const cam = transform?.camera ?? camera ?? cameraFrom(null);
  const projectionId = (transform?.projection ?? projection) as ProjectionId;
  const projected = projectMeshToView(mesh, {
    camera: cam,
    projection: projectionId,
    depthFade,
    depthStrength,
    preserveSource,
  }) as ViewMesh;
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
export function projectCameraCurveSegments<T extends ViewCurve>(
  curve: T,
  camera: CameraState | null,
  options: { depthFade?: boolean; fadeStrength?: number } = {},
): T[] {
  const cam = camera ?? cameraFrom(null);
  const runs: Array<{ points: ViewPoint[]; closed: boolean }> = [];
  let run: ViewPoint[] = [];
  let broken = false;
  const flush = (): void => {
    if (run.length >= 2) runs.push({ points: run, closed: false });
    run = [];
  };
  for (const point of curve.points) {
    const projected = project3D(point.x, point.y, Number(point.z ?? 0), cam, options);
    if (!projected) {
      broken = true;
      flush();
      continue;
    }
    run.push({
      ...point,
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
      ...curve,
      id: curve.id,
      closed: curve.closed,
      meta: curve.meta,
      points: runs[0]?.points ?? [],
    }];
  }
  return runs.map((segment, index) => ({
    ...curve,
    id: `${curve.id ?? 'curve'}-s${index}`,
    closed: false,
    meta: { ...(curve.meta ?? {}), discontinuity: true, segment: index },
    points: segment.points,
  }));
}

/** Single-run compatibility wrapper; use projectCameraCurveSegments for splits. */
export function projectCameraCurve<T extends ViewCurve>(
  curve: T,
  camera: CameraState | null,
  options: { depthFade?: boolean; fadeStrength?: number } = {},
): T {
  return projectCameraCurveSegments(curve, camera, options)[0]
    ?? { ...curve, id: curve.id, closed: false, meta: curve.meta, points: [] };
}

export function projectOrthographicCurve<T extends ViewCurve>(curve: T, projection: ProjectionId): T {
  return {
    ...curve,
    id: curve.id,
    closed: curve.closed,
    meta: curve.meta,
    points: curve.points.map((point) => {
      const projected = projectWorldPoint(point, projection);
      return {
        ...point,
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

export function projectWorldPoint(point: ViewPoint, projection: ProjectionId): { x: number; y: number } {
  const x = point.x;
  const y = point.y;
  const z = Number(point.z ?? 0);
  if (projection === 'xz') return { x, y: -z };
  if (projection === 'yz') return { x: -y, y: -z };
  return { x, y: -y };
}

export function projectSurface<T>(surface: T, _options: Record<string, unknown> = {}): T {
  if (!isSurface(surface)) return surface;
  // Surfaces are tessellated by the geometry layer; this helper is kept for
  // callers that only need the grid corners projected.
  return surface;
}

export type { BoundsLike };
