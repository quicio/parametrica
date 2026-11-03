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
