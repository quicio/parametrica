/**
 * interaction/inspectionOverlay.js — derive UI-only artboard geometry for an
 * inspected surface point, triangle and parametric cell.
 *
 * Nothing here mutates the evaluation or becomes part of RenderScene. The
 * overlay is intentionally disposable and is rebuilt from current data.
 */

export function buildInspectionOverlay({ evaluation, scene, result } = {}) {
  if (!evaluation || !scene || !result) return null;
  const layer = layerFor(evaluation, result.layerId);
  if (!layer || layer.visible === false) return null;
  const mesh = (layer.meshes ?? []).find((entry) => entry.id === result.meshId);
  if (!mesh || !Array.isArray(mesh.vertices) || !Array.isArray(mesh.faces)) return null;
  const face = mesh.faces[result.faceIndex];
  if (!Array.isArray(face) || !sameIndices(face, result.triangleIndices)) return null;
  const sceneLayer = sceneLayerFor(scene, layer);
  const transform = sceneLayer?.transform ?? scene.transform;
  if (!transform) return null;

  const marker = transform.toArtboard(result.world);
  if (!marker) return null;
  const trianglePoints = face.map((index) => (
    mesh.vertices[index] ? transform.toArtboard(mesh.vertices[index]) : null
  ));
  const triangle = trianglePoints.every(Boolean) ? trianglePoints : null;

  let cell = null;
  if (result.mappingStatus === 'ok' && result.cell) {
    const mapping = (layer.surfaceMappings ?? []).find((entry) => entry.meshId === result.meshId);
    const cellFaces = mapping?.faces?.filter((entry) => (
      entry.cell?.u === result.cell.u && entry.cell?.v === result.cell.v
    )) ?? [];
    const first = cellFaces.find((entry) => entry.triangle === 0);
    const second = cellFaces.find((entry) => entry.triangle === 1);
    if (first && second) {
      const order = [first.indices[0], first.indices[1], first.indices[2], second.indices[2]];
      if (new Set(order).size === 4) {
        const points = order.map((index) => (
          mesh.vertices[index] ? transform.toArtboard(mesh.vertices[index]) : null
        ));
        if (points.every(Boolean)) cell = points;
      }
    }
  }

  return {
    marker,
    triangle,
    cell,
    mappingValid: result.mappingStatus === 'ok',
  };
}

function layerFor(evaluation, layerId) {
  if (Array.isArray(evaluation.layers) && evaluation.layers.length) {
    return evaluation.layers.find((layer) => layer.id === layerId) ?? null;
  }
  if (!Array.isArray(evaluation.meshes) || !evaluation.meshes.length) return null;
  return {
    id: layerId ?? 'layer-0',
    visible: true,
    meshes: evaluation.meshes,
    surfaceMappings: evaluation.surfaceMappings ?? [],
  };
}

function sceneLayerFor(scene, layer) {
  if (!Array.isArray(scene.layers) || !scene.layers.length) return null;
  return scene.layers.find((entry) => entry.id === layer.id)
    ?? (scene.layers.length === 1 ? scene.layers[0] : null);
}

function sameIndices(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
