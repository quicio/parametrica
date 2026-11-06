/**
 * application/fabricationSource.js — read-only fabrication source selection.
 *
 * The Fabricate mode never edits geometry. It resolves the active layer's first
 * validated closed Mesh/Solid, reports health and physical bounds, and lets the
 * STL exporter decide whether bytes may be written.
 */

import { isMesh, isSolid } from '../geometry/contracts.js';
import { mergeMeshes, prepareMesh } from '../geometry/solidPrep.js';
import { booleanSolids } from '../geometry/csg.js';
import { validateForFabrication } from '../export/geometryExport.js';
import { bboxToMillimetres, millimetresPerUnit } from '../core/units.js';

export function resolveFabricationSource({ evaluation = null, layerIndex = 0, preparation = null } = {}) {
  const prepare = normalizePreparation(preparation);
  const scope = prepare.scope;
  const layers = Array.isArray(evaluation?.layers) ? evaluation.layers : null;
  const activeIndex = Math.max(0, Math.min((layers?.length ?? 1) - 1, layerIndex));
  const activeLayer = layers ? layers[activeIndex] ?? null : evaluation ?? null;
  const selection = [];
  if (scope === 'composition' && layers) {
    layers.forEach((layer, index) => {
      if (layer?.visible !== false) selection.push({ layer, index });
    });
  } else {
    selection.push({ layer: activeLayer, index: activeIndex });
  }

  const candidates = [];
  const seen = new Set();
  const add = (item, layer, index) => {
    if (!item || seen.has(item)) return;
    if (!isMesh(item) && !isSolid(item)) return;
    seen.add(item);
    if (isMesh(item) && (prepare.weld || prepare.cap)) {
      const prepared = prepareMesh(item, prepare);
      const validation = validateForFabrication(prepared.mesh);
      const closed = Boolean(validation.meta?.closed);
      candidates.push({
        geometry: prepared.mesh,
        kind: prepared.mesh.kind,
        id: prepared.mesh.id ?? item.id ?? null,
        validation: {
          ...validation,
          warnings: [...new Set([...(validation.warnings ?? []), ...(prepared.warnings ?? [])])],
        },
        closed,
        exportable: validation.ok && closed,
        prepared: true,
        preparation: { ...prepared.stats, prepared: true },
        layerId: layer?.id ?? null,
        layerName: layer?.name ?? null,
        layerIndex: index,
      });
      return;
    }
    const validation = validateForFabrication(item);
    const closed = Boolean(validation.meta?.closed);
    candidates.push({
      geometry: item,
      kind: item.kind,
      id: item.id ?? null,
      validation,
      closed,
      exportable: validation.ok && closed,
      prepared: false,
      preparation: null,
      layerId: layer?.id ?? null,
      layerName: layer?.name ?? null,
      layerIndex: index,
    });
  };
  for (const { layer, index } of selection) {
    for (const item of layer?.geometry ?? []) add(item, layer, index);
    for (const mesh of layer?.meshes ?? []) add(mesh, layer, index);
  }

  const exportable = candidates.filter((candidate) => candidate.exportable);
  let source = scope === 'single' || exportable.length <= 1 ? exportable[0] ?? null : null;
  let mergedError = null;
  let bodies = source ? 1 : 0;
  let booleanError = null;
  let booleanEmpty = false;

  if (scope !== 'single' && prepare.boolean !== 'none') {
    if (exportable.length < 2) {
      source = null;
      booleanError = `Boolean ${prepare.boolean} requires at least two validated bodies`;
    } else {
      const operands = exportable.map((candidate) => (
        isSolid(candidate.geometry) ? candidate.geometry.boundary : candidate.geometry
      ));
      const result = booleanSolids(prepare.boolean, operands, { tolerance: prepare.tolerance });
      if (!result.ok) {
        source = null;
        booleanError = `Boolean ${prepare.boolean} failed: ${result.error?.message ?? 'unknown error'}`;
      } else if (result.empty) {
        source = null;
        booleanEmpty = true;
        booleanError = 'Boolean result is empty';
      } else {
        source = {
          geometry: result.geometry,
          kind: 'mesh',
          id: `boolean-${prepare.boolean}`,
          validation: result.validation,
          closed: true,
          exportable: true,
          prepared: exportable.some((candidate) => candidate.prepared),
          preparation: aggregatePreparation(exportable),
          bodies: 1,
          bodyIds: exportable.map((candidate) => candidate.id),
          multiBody: false,
          boolean: { operation: prepare.boolean, operands: exportable.length, stats: result.stats },
        };
        bodies = 1;
      }
    }
  } else if (scope !== 'single' && exportable.length > 1) {
    const meshes = exportable.map((candidate) => (
      isSolid(candidate.geometry) ? candidate.geometry.boundary : candidate.geometry
    ));
    const merged = mergeMeshes(meshes, { id: 'multi-body' });
    if (!merged.mesh) {
      mergedError = merged.warnings[0] ?? 'multi-body merge failed';
      source = null;
    } else {
      const validation = validateForFabrication(merged.mesh);
      const closed = Boolean(validation.meta?.closed);
      if (validation.ok && closed) {
        const prepared = exportable.some((candidate) => candidate.prepared);
        source = {
          geometry: merged.mesh,
          kind: 'mesh',
          id: 'multi-body',
          validation,
          closed: true,
          exportable: true,
          prepared,
          preparation: aggregatePreparation(exportable),
          bodies: exportable.length,
          bodyIds: exportable.map((candidate) => candidate.id),
          multiBody: true,
        };
        bodies = exportable.length;
      } else {
        source = null;
        mergedError = validation.errors?.[0] ?? 'merged bodies failed validation';
      }
    }
  } else if (source) {
    bodies = 1;
  }

  const candidateErrors = candidates[0]?.validation?.errors ?? [];
  const firstError = candidateErrors.find((error) => error.includes('self-intersect')) ?? candidateErrors[0] ?? null;
  return {
    layerId: activeLayer?.id ?? null,
    layerName: scope === 'composition' ? 'Composition' : activeLayer?.name ?? null,
    source,
    candidates,
    total: candidates.length,
    closed: exportable.length,
    bodies,
    scope,
    multiBody: Boolean(source?.multiBody),
    boolean: source?.boolean ?? null,
    booleanError,
    booleanEmpty,
    mergedError,
    preparation: source?.preparation ?? null,
    prepared: Boolean(source?.prepared),
    reason: source
      ? null
      : booleanError
        ? booleanError
        : mergedError
        ? `Multi-body export failed: ${mergedError}`
        : candidates.length
          ? `No validated closed Mesh/Solid in the active layer${firstError ? `: ${firstError}` : ''}`
          : 'The active layer has no Mesh/Solid geometry',
  };
}

export function buildFabricationReport({ evaluation = null, layerIndex = 0, units = null, preparation = null } = {}) {
  const resolved = resolveFabricationSource({ evaluation, layerIndex, preparation });
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
      errors: resolved.booleanError ? [resolved.booleanError] : (resolved.mergedError ? [resolved.mergedError] : (resolved.candidates?.[0]?.validation?.errors ?? [])),
      preparation: null,
      prepared: false,
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
    errors: source.validation.errors ?? [],
    preparation: source.preparation ?? null,
    prepared: Boolean(source.prepared),
    unitsReady,
    exportable: source.exportable && unitsReady,
    reason: !unitsReady
      ? 'Set an explicit world scale (mm per world unit) before exporting'
      : null,
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

function normalizePreparation(raw) {
  if (!raw || typeof raw !== 'object') return { weld: false, cap: false, scope: 'single' };
  return {
    weld: raw.weld === true,
    cap: raw.cap === true,
    tolerance: raw.tolerance,
    maxHoleEdges: raw.maxHoleEdges,
    scope: ['single', 'active-layer', 'composition'].includes(raw.scope) ? raw.scope : 'single',
    boolean: ['none', 'union', 'difference', 'intersection'].includes(raw.boolean) ? raw.boolean : 'none',
  };
}

function aggregatePreparation(candidates) {
  const entries = candidates.map((candidate) => candidate.preparation).filter(Boolean);
  if (!entries.length) return null;
  const stats = {
    inputVertices: 0,
    outputVertices: 0,
    mergedVertices: 0,
    removedFaces: 0,
    cappedLoops: 0,
    addedTriangles: 0,
    prepared: true,
  };
  for (const entry of entries) {
    for (const key of ['inputVertices', 'outputVertices', 'mergedVertices', 'removedFaces', 'cappedLoops', 'addedTriangles']) {
      stats[key] += Number(entry[key]) || 0;
    }
  }
  return stats;
}
