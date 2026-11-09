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
import { repairMesh } from '../geometry/repair.js';
import { repairSelfIntersections } from '../geometry/selfIntersectionRepair.js';
import { validateForFabrication } from '../export/geometryExport.js';
import { buildLatticeSolid } from '../geometry/latticeSolid.js';
import { analyzePrintability } from '../geometry/printChecks.js';
import { buildPerforationCutters, radiusProfileFromSurface } from '../geometry/perforation.js';
import { bboxToMillimetres, millimetresPerUnit } from '../domain/units.ts';
import { sanitizeFabricationGroups } from '../core/document.js';
import { compileExpression } from '../math/expression.js';
import { buildManufacturingReport, sanitizeManufacturingProfile } from '../domain/manufacturingProfile.js';
import { createStdlib } from '../math/stdlib.js';

export function resolveFabricationSource({ evaluation = null, layerIndex = 0, preparation = null } = {}) {
  const prepare = normalizePreparation(preparation);
  const groups = prepare.groups ?? [];
  const useGroups = groups.length > 0;
  const scope = useGroups ? 'composition' : prepare.scope;
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
  const latticeCandidate = prepare.lattice === true && activeLayer
    ? buildLatticeCandidate(activeLayer, activeIndex, prepare)
    : null;
  const add = (item, layer, index) => {
    if (!item || seen.has(item)) return;
    if (!isMesh(item) && !isSolid(item)) return;
    seen.add(item);
    if (isMesh(item) && prepare.repair) {
      const repairOptions = {
        tolerance: prepare.tolerance,
        maxHoleEdges: prepare.maxHoleEdges,
        capStrategy: prepare.capStrategy,
        orient: true,
        topology: prepare.topology,
        nonOrientable: prepare.nonOrientable,
        maxTopologyEdges: prepare.maxTopologyEdges,
        strategy: prepare.selfIntersections,
        remeshResolution: prepare.remeshResolution,
      };
      const repaired = prepare.selfIntersections === 'none'
        ? repairMesh(item, repairOptions)
        : repairSelfIntersections(item, repairOptions);
      const validation = validateForFabrication(repaired.mesh);
      const closed = Boolean(validation.meta?.closed);
      candidates.push({
        geometry: repaired.mesh,
        kind: repaired.mesh?.kind ?? item.kind,
        id: repaired.mesh?.id ?? item.id ?? null,
        validation: {
          ...validation,
          warnings: [...new Set([...(validation.warnings ?? []), ...(repaired.report.warnings ?? [])])],
        },
        closed,
        exportable: validation.ok && closed,
        prepared: true,
        repair: repaired.report,
        preparation: null,
        layerId: layer?.id ?? null,
        layerName: layer?.name ?? null,
        layerIndex: index,
      });
      return;
    }
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
  if (latticeCandidate) {
    candidates.push(latticeCandidate);
  } else {
    for (const { layer, index } of selection) {
      for (const item of layer?.geometry ?? []) add(item, layer, index);
      for (const mesh of layer?.meshes ?? []) add(mesh, layer, index);
    }
  }

  const exportable = candidates.filter((candidate) => candidate.exportable);
  let source = useGroups ? null : (scope === 'single' || exportable.length <= 1 ? exportable[0] ?? null : null);
  let mergedError = null;
  let bodies = source ? 1 : 0;
  let booleanError = null;
  let booleanEmpty = false;
  let groupError = null;
  let groupMetadata = null;

  if (useGroups) {
    const grouped = resolveBooleanGroups(exportable, groups, prepare);
    if (grouped.error) {
      source = null;
      groupError = grouped.error;
      groupMetadata = grouped.metadata ?? null;
    } else {
      source = grouped.source;
      bodies = grouped.bodies;
      groupMetadata = grouped.metadata;
    }
  } else if (scope !== 'single' && prepare.boolean !== 'none') {
    if (exportable.length < 2) {
      source = null;
      booleanError = `Boolean ${prepare.boolean} requires at least two validated bodies`;
    } else {
      const operands = exportable.map((candidate) => (
        isSolid(candidate.geometry) ? candidate.geometry.boundary : candidate.geometry
      ));
      const result = booleanSolids(prepare.boolean, operands, {
        tolerance: prepare.tolerance,
        strategy: prepare.csgStrategy,
        remeshResolution: prepare.remeshResolution,
      });
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
          repair: aggregateRepair(exportable),
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
          repair: aggregateRepair(exportable),
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

  let perforationError = null;
  if (prepare.lattice === true && prepare.latticeMode === 'cutouts' && source?.geometry) {
    const shell = isSolid(source.geometry) ? source.geometry.boundary : source.geometry;
    const outerSurface = (activeLayer?.geometry ?? []).find((item) => Array.isArray(item?.grid?.points));
    const cutters = buildPerforationCutters(shell, {
      cellSize: prepare.latticeCellSize,
      strut: prepare.latticeStrut,
      wall: prepare.latticeWall,
      floor: prepare.latticeFloor,
      rim: prepare.latticeRim,
      seed: prepare.latticeSeed,
      profile: outerSurface ? radiusProfileFromSurface(outerSurface) : null,
    });
    if (!cutters.ok || !cutters.cutters.length) {
      source = null;
      perforationError = cutters.error?.message ?? 'perforation generated no holes';
    } else {
      const result = booleanSolids('difference', [shell, ...cutters.cutters], {
        strategy: 'manifold',
        tolerance: prepare.tolerance,
        maxInputTriangles: 400_000,
      });
      if (!result.ok || !result.geometry) {
        source = null;
        perforationError = `Perforation failed: ${result.error?.message ?? 'unknown error'}`;
      } else {
        const validation = validateForFabrication(result.geometry);
        const closed = Boolean(validation.meta?.closed);
        source = {
          ...source,
          geometry: result.geometry,
          kind: 'mesh',
          id: 'perforated-shell',
          validation,
          closed,
          exportable: validation.ok && closed,
          lattice: { ...cutters.stats },
        };
        if (!source.exportable) {
          perforationError = validation.errors?.[0] ?? 'perforated shell failed validation';
        }
      }
    }
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
    perforationError,
    preparation: source?.preparation ?? null,
    manufacturing: prepare.manufacturing,
    repair: source?.repair ?? null,
    prepared: Boolean(source?.prepared),
    groups: groupMetadata,
    reason: source
      ? null
      : groupError
        ? groupError
        : perforationError
          ? perforationError
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
      lattice: resolved.candidates?.[0]?.lattice ?? null,
      mesh: null,
      triangles: 0,
      vertices: 0,
      volume: null,
      bbox: null,
      physical: null,
      warnings: [],
      errors: resolved.booleanError ? [resolved.booleanError] : (resolved.mergedError ? [resolved.mergedError] : (resolved.candidates?.[0]?.validation?.errors ?? [])),
      preparation: null,
      manufacturing: null,
      repair: null,
      prepared: false,
      unitsReady: millimetresPerUnit(units, 'world') !== null,
      exportable: false,
    };
  }

  const mesh = isSolid(source.geometry) ? source.geometry.boundary : source.geometry;
  const bbox = bboxOf(mesh);
  const physical = bboxToMillimetres(bbox, units);
  const unitsReady = millimetresPerUnit(units, 'world') !== null;
  const minFeature = source.lattice?.radius
    ? source.lattice.radius * 2
    : (source.lattice?.mode === 'cutouts' ? source.lattice.strut : null);
  const printability = analyzePrintability(mesh, { units, minFeature, lattice: source.lattice ?? null });
  const manufacturing = buildManufacturingReport({
    profile: resolved.manufacturing,
    printability,
    lattice: source.lattice ?? null,
    units,
    bbox,
  });
  const manufacturingBlocked = manufacturing.exportAllowed === false;
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
    repair: source.repair ?? null,
    prepared: Boolean(source.prepared),
    lattice: source.lattice ?? null,
    printability,
    manufacturing,
    unitsReady,
    exportable: source.exportable && unitsReady && !manufacturingBlocked,
    reason: !unitsReady
      ? 'Set an explicit world scale (mm per world unit) before exporting'
      : manufacturingBlocked
        ? manufacturing.exportReason
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

function buildLatticeCandidate(layer, index, prepare) {
  if (layer?.generator?.id !== 'surface-lattice') return null;
  const params = layer.generator?.params ?? {};
  const curves = (layer.geometry ?? []).filter((item) => item?.kind === 'curve3d');
  if (!curves.length) return null;
  const height = Number(params.height) || Math.max(...curves.flatMap((curve) => (curve.points ?? []).map((point) => point.z))) || 200;
  const compiled = typeof params.profile === 'string' ? compileExpression(params.profile) : null;
  const profileScope = compiled?.ok
    ? Object.assign(Object.create(null), createStdlib(Number(params.seed) || 1), { v: 0 })
    : null;
  const radiusAt = compiled?.ok
    ? (v) => {
      profileScope.v = v;
      const value = Number(compiled.fn(profileScope));
      return Number.isFinite(value) ? value : null;
    }
    : null;
  const radiusExpression = typeof params.radiusExpression === 'string'
    ? params.radiusExpression.trim()
    : '';
  let radiusAtPoint = null;
  if (radiusExpression) {
    const radiusCompiled = compileExpression(radiusExpression);
    if (radiusCompiled.ok) {
      const baseRadius = (Number(params.strut) || 3.5) / 2;
      const scope = Object.assign(Object.create(null), createStdlib(Number(params.seed) || 1), {
        v: 0,
        t: 0,
        z: 0,
        base: baseRadius,
      });
      radiusAtPoint = (t, point) => {
        scope.v = Math.max(0, Math.min(1, (Number(point?.z) || 0) / height));
        scope.t = t;
        scope.z = Number(point?.z) || 0;
        scope.base = baseRadius;
        const value = Number(radiusCompiled.fn(scope));
        if (!Number.isFinite(value)) return baseRadius;
        return Math.max(0.25, Math.min(2, value)) * baseRadius;
      };
    }
  }
  const openingCurve = curves.find((curve) => Array.isArray(curve.meta?.latticeOpenings));
  const openings = openingCurve?.meta?.latticeOpenings ?? [];
  const meta = openingCurve?.meta ?? curves[0]?.meta ?? {};
  const result = buildLatticeSolid(curves, {
    strut: Number(params.strut) || 3.5,
    floor: Number(params.floor) || 0,
    rim: Number(params.rim) || 4,
    height,
    tolerance: prepare.tolerance,
    finishQuality: prepare.finishQuality,
    jointStyle: prepare.jointStyle,
    curveStyle: prepare.curveStyle,
    envelope: prepare.envelope,
    radiusProfile: prepare.radiusProfile,
    taper: prepare.taper,
    blendBudget: prepare.blendBudget,
    blendEdgeLength: prepare.blendEdgeLength,
    radiusAt,
    radiusAtPoint,
    radiusExpression,
    openings,
    minOpeningWidth: Number(params.minOpeningWidth ?? 2),
    specHash: meta.specHash ?? null,
    networkHash: meta.networkHash ?? null,
    algorithmVersion: meta.algorithmVersion ?? null,
  });
  const validation = result.ok
    ? result.validation
    : {
      ok: false,
      warnings: [],
      errors: [result.error?.message ?? 'lattice solid build failed'],
      meta: { closed: false, manifold: false, volume: null },
    };
  const closed = Boolean(validation?.meta?.closed);
  return {
    geometry: result.geometry ?? null,
    kind: result.geometry?.kind ?? 'mesh',
    id: result.geometry?.id ?? 'lattice-solid',
    validation,
    closed,
    exportable: Boolean(result.ok && validation?.ok && closed),
    prepared: Boolean(result.ok),
    preparation: null,
    lattice: result.stats ?? {},
    layerId: layer.id ?? null,
    layerName: layer.name ?? null,
    layerIndex: index,
  };
}

function numeric(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePreparation(raw) {
  if (!raw || typeof raw !== 'object') return { weld: false, cap: false, scope: 'single' };
  return {
    groups: sanitizeFabricationGroups(raw.groups),
    weld: raw.weld === true,
    cap: raw.cap === true,
    tolerance: raw.tolerance,
    maxHoleEdges: raw.maxHoleEdges,
    scope: ['single', 'active-layer', 'composition'].includes(raw.scope) ? raw.scope : 'single',
    boolean: ['none', 'union', 'difference', 'intersection'].includes(raw.boolean) ? raw.boolean : 'none',
    repair: raw.repair === true,
    capStrategy: ['auto', 'fan', 'planar', 'none'].includes(raw.capStrategy) ? raw.capStrategy : 'auto',
    topology: ['none', 'split', 'remove'].includes(raw.topology) ? raw.topology : 'none',
    nonOrientable: ['cut', 'reject'].includes(raw.nonOrientable) ? raw.nonOrientable : 'cut',
    maxTopologyEdges: raw.maxTopologyEdges,
    csgStrategy: ['auto', 'manifold', 'bsp', 'remesh'].includes(raw.csgStrategy) ? raw.csgStrategy : 'auto',
    selfIntersections: ['none', 'sdf', 'remesh', 'auto'].includes(raw.selfIntersections) ? raw.selfIntersections : 'none',
    remeshResolution: raw.remeshResolution,
    lattice: raw.lattice === true,
    latticeMode: raw.latticeMode === 'cutouts' ? 'cutouts' : 'struts',
    latticeCellSize: numeric(raw.latticeCellSize, 20),
    latticeStrut: numeric(raw.latticeStrut, 3.5),
    latticeWall: numeric(raw.latticeWall, 2.5),
    latticeFloor: numeric(raw.latticeFloor, 3),
    latticeRim: numeric(raw.latticeRim, 4),
    latticeSeed: numeric(raw.latticeSeed, 7),
    latticePreview: raw.latticePreview === 'network' ? 'network' : 'solid',
    finishQuality: raw.finishQuality === 'draft' || raw.finishQuality === 'high' ? raw.finishQuality : 'standard',
    jointStyle: ['technical', 'rounded', 'blend', 'auto'].includes(raw.jointStyle) ? raw.jointStyle : 'technical',
    curveStyle: raw.curveStyle === 'organic' ? 'organic' : 'polyline',
    envelope: raw.envelope === 'outer' ? 'outer' : 'centerline',
    radiusProfile: raw.radiusProfile === 'taper' ? 'taper' : 'constant',
    taper: Number.isFinite(Number(raw.taper)) ? Math.max(0.25, Math.min(1, Number(raw.taper))) : 0.85,
    blendBudget: Number.isFinite(Number(raw.blendBudget)) ? Math.max(0, Math.floor(Number(raw.blendBudget))) : 24,
    blendEdgeLength: Number.isFinite(Number(raw.blendEdgeLength)) && Number(raw.blendEdgeLength) > 0
      ? Number(raw.blendEdgeLength)
      : null,
    manufacturing: sanitizeManufacturingProfile(raw.manufacturing),
    quality: raw.quality,
  };
}

function resolveBooleanGroups(exportable, groups, prepare) {
  const byLayer = new Map();
  for (const candidate of exportable) {
    if (candidate.layerId) byLayer.set(candidate.layerId, candidate);
  }
  const bodies = [];
  const metadata = [];
  const used = new Set();
  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    const members = group.layers.map((id) => byLayer.get(id)).filter(Boolean);
    if (!members.length) {
      return { error: `Boolean group ${index + 1} has no validated body`, metadata };
    }
    if (members.some((member) => used.has(member))) {
      return { error: `Layer reused across boolean groups`, metadata };
    }
    members.forEach((member) => used.add(member));
    if (members.length === 1) {
      bodies.push({ ...members[0], group: { index, name: group.name, operation: group.op, layerIds: group.layers } });
      metadata.push({ index, name: group.name, operation: group.op, layers: group.layers });
      continue;
    }
    const operands = members.map((candidate) => (
      isSolid(candidate.geometry) ? candidate.geometry.boundary : candidate.geometry
    ));
    const result = booleanSolids(group.op, operands, {
      tolerance: prepare.tolerance,
      strategy: prepare.csgStrategy,
      remeshResolution: prepare.remeshResolution,
    });
    if (!result.ok) {
      return { error: `Boolean group ${index + 1} failed: ${result.error?.message ?? 'unknown error'}`, metadata };
    }
    if (result.empty) {
      return { error: `Boolean group ${index + 1} is empty`, metadata };
    }
    const validation = validateForFabrication(result.geometry);
    const closed = Boolean(validation.meta?.closed);
    if (!validation.ok || !closed) {
      return {
        error: `Boolean group ${index + 1} is not a closed solid: ${validation.errors?.[0] ?? 'unknown error'}`,
        metadata,
      };
    }
    bodies.push({
      geometry: result.geometry,
      kind: 'mesh',
      id: `group-${index + 1}`,
      validation,
      closed: true,
      exportable: true,
      prepared: members.some((member) => member.prepared),
      repair: aggregateRepair(members),
      preparation: aggregatePreparation(members),
      boolean: { operation: group.op, operands: members.length, stats: result.stats },
      group: { index, name: group.name, operation: group.op, layerIds: group.layers },
    });
    metadata.push({ index, name: group.name, operation: group.op, layers: group.layers });
  }
  if (!bodies.length) return { error: 'Boolean groups produced no bodies', metadata };
  if (bodies.length === 1) {
    return { source: bodies[0], bodies: 1, multiBody: false, metadata };
  }
  const meshes = bodies.map((body) => (
    isSolid(body.geometry) ? body.geometry.boundary : body.geometry
  ));
  const merged = mergeMeshes(meshes, { id: 'grouped-multi-body' });
  if (!merged.mesh) return { error: 'Grouped multi-body merge failed', metadata };
  const validation = validateForFabrication(merged.mesh);
  const closed = Boolean(validation.meta?.closed);
  if (!validation.ok || !closed) {
    return {
      error: `Grouped multi-body failed validation: ${validation.errors?.[0] ?? 'unknown error'}`,
      metadata,
    };
  }
  return {
    source: {
      geometry: merged.mesh,
      kind: 'mesh',
      id: 'grouped-multi-body',
      validation,
      closed: true,
      exportable: true,
      prepared: bodies.some((body) => body.prepared),
      repair: aggregateRepair(bodies),
      preparation: aggregatePreparation(bodies),
      bodies: bodies.length,
      bodyIds: bodies.map((body) => body.id),
      multiBody: true,
      groups: metadata,
    },
    bodies: bodies.length,
    multiBody: true,
    metadata,
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

function aggregateRepair(candidates) {
  const entries = candidates.map((candidate) => candidate.repair).filter(Boolean);
  if (!entries.length) return null;
  const report = { strategy: entries[0].strategy ?? 'auto', warnings: [], errors: [] };
  for (const key of [
    'removedInvalidFaces', 'removedDegenerateFaces', 'removedDuplicateFaces',
    'weldedVertices', 'cappedLoops', 'planarCaps', 'fanCaps', 'fallbackCaps',
    'skippedLoops', 'flippedFaces', 'flippedShells', 'orientationContradictions',
    'selfIntersectionPairs',
  ]) {
    report[key] = entries.reduce((sum, entry) => sum + (Number(entry[key]) || 0), 0);
  }
  report.selfIntersectionStrategy = entries.find((entry) => entry.selfIntersectionStrategy && entry.selfIntersectionStrategy !== 'none')?.selfIntersectionStrategy ?? 'none';
  report.remeshResolution = entries.find((entry) => entry.remeshResolution)?.remeshResolution ?? null;
  report.changed = entries.some((entry) => entry.changed);
  report.warnings = [...new Set(entries.flatMap((entry) => entry.warnings ?? []))];
  report.errors = [...new Set(entries.flatMap((entry) => entry.errors ?? []))];
  return report;
}
