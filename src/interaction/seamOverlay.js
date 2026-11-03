/**
 * interaction/seamOverlay.js — UI-only domain/seam overlay.
 *
 * A seam is a declaration from SurfaceMapping.domain, not proof of geometric
 * continuity. A closed seam is drawn at its logical end (u1/v1); an open axis
 * draws its two domain borders. Reverse seams are marked as twists without
 * implying an orientation.
 */

export function buildSeamOverlay({ evaluation, scene } = {}) {
  if (!evaluation || !scene) return { status: 'unavailable', edges: [], seams: 0, borders: 0 };
  const layers = inspectableLayers(evaluation);
  if (!layers.length) return { status: 'unavailable', edges: [], seams: 0, borders: 0 };
  const edges = [];
  const seen = new Set();
  let meshes = 0;
  let mappedMeshes = 0;
  let invalidFaces = 0;
  let seams = 0;
  let borders = 0;

  for (const layer of layers) {
    const sceneLayer = sceneLayerFor(scene, layer);
    const transform = sceneLayer?.transform ?? scene.transform;
    if (!transform) continue;
    const mappings = new Map();
    for (const mapping of layer.surfaceMappings ?? []) {
      if (mapping?.meshId) mappings.set(mapping.meshId, mapping);
    }
    for (const mesh of layer.meshes ?? []) {
      meshes++;
      const mapping = mappings.get(mesh.id);
      if (!mappingUsable(mapping, mesh)) continue;
      mappedMeshes++;
      for (let faceIndex = 0; faceIndex < mesh.faces.length; faceIndex++) {
        const face = mesh.faces[faceIndex];
        const mappingFace = mapping.faces[faceIndex];
        if (!Array.isArray(face) || face.length !== 3 || !mappingFace) continue;
        if (!sameIndices(face, mappingFace.indices) || !Array.isArray(mappingFace.uv) || mappingFace.uv.length !== 3) {
          invalidFaces++;
          continue;
        }
        if (!mappingFace.uv.every((uv) => Number.isFinite(uv?.u) && Number.isFinite(uv?.v))) {
          invalidFaces++;
          continue;
        }
        const domain = mapping.domain;
        for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
          const kind = classifyEdge(mappingFace.uv[a], mappingFace.uv[b], domain);
          if (!kind) continue;
          const first = face[a];
          const second = face[b];
          const key = `${layer.id}:${mesh.id}:${Math.min(first, second)}:${Math.max(first, second)}:${kind}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const pa = mesh.vertices[first];
          const pb = mesh.vertices[second];
          if (!pa || !pb) continue;
          const a2 = transform.toArtboard(pa);
          const b2 = transform.toArtboard(pb);
          if (!a2 || !b2) continue;
          edges.push({ kind, points: [a2, b2] });
          if (kind.startsWith('seam-')) seams++;
          else borders++;
        }
      }
    }
  }

  const status = edges.length
    ? (mappedMeshes === meshes && invalidFaces === 0
      ? (seams > 0 ? 'declared' : 'borders')
      : 'partial')
    : (mappedMeshes === 0 || invalidFaces > 0 ? 'unavailable' : 'empty');
  return { status, edges, seams, borders };
}

function classifyEdge(uvA, uvB, domain) {
  if (sameNumber(uvA.u, uvB.u)) {
    if (sameNumber(uvA.u, domain.u[1])) {
      return domain.closedU
        ? (domain.twistU ? 'seam-u-twist' : 'seam-u')
        : 'border-u1';
    }
    if (sameNumber(uvA.u, domain.u[0])) {
      return domain.closedU ? null : 'border-u0';
    }
  }
  if (sameNumber(uvA.v, uvB.v)) {
    if (sameNumber(uvA.v, domain.v[1])) {
      return domain.closedV
        ? (domain.twistV ? 'seam-v-twist' : 'seam-v')
        : 'border-v1';
    }
    if (sameNumber(uvA.v, domain.v[0])) {
      return domain.closedV ? null : 'border-v0';
    }
  }
  return null;
}

function mappingUsable(mapping, mesh) {
  if (!mapping || !Array.isArray(mapping.faces) || mapping.faces.length !== mesh.faces?.length) return false;
  const domain = mapping.domain;
  if (!Array.isArray(domain?.u) || !Array.isArray(domain?.v) || domain.u.length < 2 || domain.v.length < 2) return false;
  if (!Number.isFinite(domain.u[0]) || !Number.isFinite(domain.u[1])) return false;
  if (!Number.isFinite(domain.v[0]) || !Number.isFinite(domain.v[1])) return false;
  return domain.u[0] !== domain.u[1] && domain.v[0] !== domain.v[1];
}

function inspectableLayers(evaluation) {
  if (Array.isArray(evaluation.layers) && evaluation.layers.length) {
    return evaluation.layers.filter((layer) => (
      layer.visible !== false && Array.isArray(layer.meshes) && layer.meshes.length > 0
    ));
  }
  if (!Array.isArray(evaluation.meshes) || !evaluation.meshes.length) return [];
  return [{
    id: 'layer-0',
    visible: true,
    meshes: evaluation.meshes,
    surfaceMappings: evaluation.surfaceMappings ?? [],
  }];
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

function sameNumber(a, b) {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-9 * scale;
}
