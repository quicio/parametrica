/**
 * application/fabricationSource.js — read-only fabrication source selection.
 *
 * The Fabricate mode never edits geometry. It resolves the active layer's first
 * validated closed Mesh/Solid, reports health and physical bounds, and lets the
 * STL exporter decide whether bytes may be written.
 */

import { isMesh, isSolid } from '../geometry/contracts.js';
import { validateForFabrication } from '../export/geometryExport.js';
import { bboxToMillimetres, millimetresPerUnit } from '../core/units.js';

export function resolveFabricationSource({ evaluation = null, layerIndex = 0 } = {}) {
  const layer = evaluation?.layers?.[layerIndex] ?? evaluation ?? null;
  const candidates = [];
  const seen = new Set();
  const add = (item) => {
    if (!item || seen.has(item)) return;
    if (!isMesh(item) && !isSolid(item)) return;
    seen.add(item);
    const validation = validateForFabrication(item);
    const closed = Boolean(validation.meta?.closed);
    candidates.push({
      geometry: item,
      kind: item.kind,
      id: item.id ?? null,
      validation,
      closed,
      exportable: validation.ok && closed,
    });
  };
  for (const item of layer?.geometry ?? []) add(item);
  for (const mesh of layer?.meshes ?? []) add(mesh);

  const source = candidates.find((candidate) => candidate.exportable) ?? null;
  return {
    layerId: layer?.id ?? null,
    layerName: layer?.name ?? null,
    source,
    candidates,
    total: candidates.length,
    closed: candidates.filter((candidate) => candidate.exportable).length,
    reason: source
      ? null
      : candidates.length
        ? 'No validated closed Mesh/Solid in the active layer'
        : 'The active layer has no Mesh/Solid geometry',
  };
}

export function buildFabricationReport({ evaluation = null, layerIndex = 0, units = null } = {}) {
  const resolved = resolveFabricationSource({ evaluation, layerIndex });
  const source = resolved.source;
  if (!source) {
    return {
      ...resolved,
      mesh: null,
      triangles: 0,
      vertices: 0,
      volume: null,
      bbox: null,
      physical: null,
      warnings: [],
      unitsReady: millimetresPerUnit(units, 'world') !== null,
      exportable: false,
    };
  }

  const mesh = isSolid(source.geometry) ? source.geometry.boundary : source.geometry;
  const bbox = bboxOf(mesh);
  const physical = bboxToMillimetres(bbox, units);
  const unitsReady = millimetresPerUnit(units, 'world') !== null;
  return {
    ...resolved,
    mesh,
    triangles: Array.isArray(mesh.faces) ? mesh.faces.length : 0,
    vertices: Array.isArray(mesh.vertices) ? mesh.vertices.length : 0,
    volume: source.validation.meta?.volume ?? null,
    bbox,
    physical,
    warnings: source.validation.warnings ?? [],
    unitsReady,
    exportable: source.exportable && unitsReady,
    reason: !unitsReady ? 'Set an explicit world scale (mm per world unit) before exporting' : null,
  };
}

function bboxOf(mesh) {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const point of mesh?.vertices ?? []) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y) || !Number.isFinite(point?.z)) continue;
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.z < minZ) minZ = point.z;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
    if (point.z > maxZ) maxZ = point.z;
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, width: 0, height: 0, depth: 0 };
  }
  return {
    minX, minY, minZ, maxX, maxY, maxZ,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  };
}
