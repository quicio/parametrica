/**
 * interaction/surfacePicker.js — world-space surface picking.
 *
 * The picker intersects the cursor ray with the canonical world meshes, not
 * the projected/painter-ordered triangles. The nearest world hit wins; UVs
 * come from the explicit SurfaceMapping sidecar.
 */

import {
  intersectRayTriangle,
  orthoDepthForPoint,
  pointOnRay,
  rayForArtboardPoint,
} from './ray.js';

const TIE_EPS = 1e-9;

export function pickSurface({ evaluation, scene, artboardPoint, bounds = null, activeLayerId = null } = {}) {
  if (!evaluation || !scene || !artboardPoint) return null;
  if (!Number.isFinite(artboardPoint.x) || !Number.isFinite(artboardPoint.y)) return null;
  const layers = inspectableLayers(evaluation, scene, activeLayerId);
  if (!layers.length) return null;
  const worldBBox = bounds ?? scene.meta?.worldBBox ?? evaluation.worldBBox ?? null;
  let best = null;

  for (const layer of layers) {
    const sceneLayer = sceneLayerFor(scene, layer);
    const transform = sceneLayer?.transform ?? scene.transform ?? null;
    if (!transform) continue;
    const ray = rayForArtboardPoint({ point: artboardPoint, transform, worldBBox });
    if (!ray) continue;
    const mappings = mappingByMesh(layer.surfaceMappings);
    for (const mesh of layer.meshes ?? []) {
      if (!Array.isArray(mesh?.vertices) || !Array.isArray(mesh?.faces)) continue;
      for (let faceIndex = 0; faceIndex < mesh.faces.length; faceIndex++) {
        const face = mesh.faces[faceIndex];
        if (!Array.isArray(face) || face.length !== 3) continue;
        const a = mesh.vertices[face[0]];
        const b = mesh.vertices[face[1]];
        const c = mesh.vertices[face[2]];
        if (!a || !b || !c) continue;
        const hit = intersectRayTriangle(ray, a, b, c);
        if (!hit) continue;
        if (best && hit.t >= best.distance - TIE_EPS) continue;
        const mapping = mappings.get(mesh.id) ?? null;
        const mappingFace = mapping?.faces?.[faceIndex] ?? null;
        let mappingStatus = !mapping
          ? 'missing'
          : (!mappingFace || !sameIndices(mappingFace.indices, face) ? 'mismatch' : 'ok');
        const uv = mappingStatus === 'ok' ? interpolateUV(mappingFace.uv, hit.barycentric) : null;
        const validUV = uv && Number.isFinite(uv.u) && Number.isFinite(uv.v);
        if (mappingStatus === 'ok' && !validUV) mappingStatus = 'mismatch';
        const world = pointOnRay(ray, hit.t);
        best = {
          kind: 'surface-pick',
          layerId: layer.id ?? null,
          layerName: layer.name ?? null,
          meshId: mesh.id ?? null,
          surfaceId: mapping?.surfaceId ?? mesh.meta?.surfaceId ?? null,
          faceIndex,
          triangleIndices: [...face],
          barycentric: hit.barycentric,
          world,
          uv: mappingStatus === 'ok' ? uv : null,
          cell: mappingStatus === 'ok' ? { ...mappingFace.cell } : null,
          triangle: mappingStatus === 'ok' ? mappingFace.triangle : null,
          mappingStatus,
          distance: hit.t,
          orthoDepth: ray.kind === 'orthographic'
            ? orthoDepthForPoint(world, ray.projection)
            : null,
          projection: ray.projection,
        };
      }
    }
  }

  return best;
}

/**
 * Revalidate a stored pick against the current evaluation. This is used by the
 * pinned inspector so stale world/UV/cell data is never displayed.
 */
export function validatePickResult(result, evaluation) {
  if (!result || !evaluation) return false;
  const layer = evaluationLayer(evaluation, result.layerId);
  if (!layer || layer.visible === false) return false;
  const mesh = (layer.meshes ?? []).find((entry) => entry.id === result.meshId);
  if (!mesh || !Array.isArray(mesh.vertices) || !Array.isArray(mesh.faces)) return false;
  const face = mesh.faces[result.faceIndex];
  if (!Array.isArray(face) || !sameIndices(face, result.triangleIndices)) return false;
  const a = mesh.vertices[face[0]];
  const b = mesh.vertices[face[1]];
  const c = mesh.vertices[face[2]];
  const bary = result.barycentric;
  if (!a || !b || !c || !bary) return false;
  const world = {
    x: a.x * bary.a + b.x * bary.b + c.x * bary.c,
    y: a.y * bary.a + b.y * bary.b + c.y * bary.c,
    z: a.z * bary.a + b.z * bary.b + c.z * bary.c,
  };
  if (!samePoint(world, result.world)) return false;

  const mapping = (layer.surfaceMappings ?? []).find((entry) => entry.meshId === result.meshId) ?? null;
  const mappingFace = mapping?.faces?.[result.faceIndex] ?? null;
  const status = !mapping
    ? 'missing'
    : (!mappingFace || !sameIndices(mappingFace.indices, face) ? 'mismatch' : 'ok');
  if (status !== result.mappingStatus) return false;
  if (status !== 'ok') return true;
  const uv = interpolateUV(mappingFace.uv, bary);
  if (!uv || !Number.isFinite(uv.u) || !Number.isFinite(uv.v)) return false;
  if (!result.uv || !sameNumber(uv.u, result.uv.u) || !sameNumber(uv.v, result.uv.v)) return false;
  if (!result.cell || result.cell.u !== mappingFace.cell.u || result.cell.v !== mappingFace.cell.v) return false;
  return result.triangle === mappingFace.triangle;
}

function evaluationLayer(evaluation, layerId) {
  if (Array.isArray(evaluation.layers) && evaluation.layers.length) {
    return evaluation.layers.find((layer) => layer.id === layerId) ?? null;
  }
  if (!Array.isArray(evaluation.meshes) || !evaluation.meshes.length) return null;
  return {
    id: layerId ?? 'layer-0',
    name: evaluation.name ?? 'Surface',
    visible: true,
    meshes: evaluation.meshes,
    surfaceMappings: evaluation.surfaceMappings ?? [],
  };
}

function samePoint(a, b) {
  if (!a || !b) return false;
  const scale = Math.max(1, Math.abs(a.x), Math.abs(a.y), Math.abs(a.z));
  return Math.abs(a.x - b.x) <= 1e-7 * scale
    && Math.abs(a.y - b.y) <= 1e-7 * scale
    && Math.abs(a.z - b.z) <= 1e-7 * scale;
}

function sameNumber(a, b) {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-7 * scale;
}

function inspectableLayers(evaluation, scene, activeLayerId) {
  const layers = Array.isArray(evaluation.layers) && evaluation.layers.length
    ? evaluation.layers.filter((layer) => (
      layer.visible !== false && Array.isArray(layer.meshes) && layer.meshes.length > 0
    ))
    : (Array.isArray(evaluation.meshes) && evaluation.meshes.length
      ? [{
        id: scene.layers?.[0]?.id ?? 'layer-0',
        name: evaluation.name ?? 'Surface',
        visible: true,
        meshes: evaluation.meshes,
        surfaceMappings: evaluation.surfaceMappings ?? [],
      }]
      : []);

  // Composition frames are independent. A cursor point maps to a different
  // world ray per layer, so comparing world distances across layers would be
  // meaningless. Inspection follows the active layer in that mode.
  if (scene.meta?.frame?.mode === 'composition') {
    if (!activeLayerId) return [];
    return layers.filter((layer) => layer.id === activeLayerId);
  }
  return layers;
}

function sceneLayerFor(scene, layer) {
  if (!Array.isArray(scene.layers) || !scene.layers.length) return null;
  return scene.layers.find((entry) => entry.id === layer.id)
    ?? (scene.layers.length === 1 ? scene.layers[0] : null);
}

function mappingByMesh(mappings) {
  const map = new Map();
  for (const mapping of mappings ?? []) {
    if (mapping?.meshId) map.set(mapping.meshId, mapping);
  }
  return map;
}

function interpolateUV(uvs, barycentric) {
  if (!Array.isArray(uvs) || uvs.length !== 3) return null;
  return {
    u: uvs[0].u * barycentric.a + uvs[1].u * barycentric.b + uvs[2].u * barycentric.c,
    v: uvs[0].v * barycentric.a + uvs[1].v * barycentric.b + uvs[2].v * barycentric.c,
  };
}

function sameIndices(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
