/** Read-only fabrication source selection and report assembly. */

import { isMesh, isSolid } from '../geometry/contracts.js';
import { mergeMeshes, prepareMesh } from '../geometry/solidPrep.js';
import { booleanSolids } from '../geometry/csg.js';
import { repairMesh } from '../geometry/repair.js';
import { repairSelfIntersections } from '../geometry/selfIntersectionRepair.js';
import { validateForFabrication } from '../export/geometryExport.ts';
import { buildLatticeSolid } from '../geometry/latticeSolid.js';
import { analyzePrintability } from '../geometry/printChecks.js';
import { buildPerforationCutters, radiusProfileFromSurface } from '../geometry/perforation.js';
import { bboxToMillimetres, millimetresPerUnit } from '../domain/units.ts';
import { sanitizeFabricationGroups } from '../core/document.js';
import { compileExpression } from '../math/expression.js';
import { buildManufacturingReport, sanitizeManufacturingProfile } from '../domain/manufacturingProfile.ts';
import type { ManufacturingProfile, ManufacturingReport } from '../domain/manufacturingProfile.ts';
import { createStdlib } from '../math/stdlib.js';

type Rec = Record<string, unknown>;
interface VectorLike { x?: unknown; y?: unknown; z?: unknown; [key: string]: unknown }
interface MeshLike { kind?: string; id?: string; vertices?: VectorLike[]; faces?: unknown[]; meta?: Rec; [key: string]: unknown }
interface SolidLike { kind?: string; boundary?: MeshLike; [key: string]: unknown }
type GeometryLike = MeshLike | SolidLike;
interface LayerLike {
  id?: string;
  name?: string;
  visible?: boolean;
  geometry?: GeometryLike[];
  meshes?: MeshLike[];
  generator?: { id?: string; params?: Rec; [key: string]: unknown };
  [key: string]: unknown;
}
interface EvaluationLike { layers?: LayerLike[]; [key: string]: unknown }
interface ValidationLike {
  ok: boolean;
  errors?: string[];
  warnings?: string[];
  meta?: { closed?: boolean; volume?: number | null; [key: string]: unknown };
  [key: string]: unknown;
}
interface Candidate {
  geometry: GeometryLike | null;
  kind?: string;
  id?: string | null;
  validation: ValidationLike;
  closed: boolean;
  exportable: boolean;
  prepared: boolean;
  repair?: Rec | null;
  preparation?: Rec | null;
  layerId?: string | null;
  layerName?: string | null;
  layerIndex?: number;
  lattice?: Rec | null;
  bodies?: number;
  bodyIds?: Array<string | null>;
  multiBody?: boolean;
  boolean?: Rec;
  group?: Rec;
  [key: string]: unknown;
}
interface FabricationPreparation {
  groups: Array<{ op: string; layers: string[]; name?: string }>;
  weld: boolean;
  cap: boolean;
  tolerance: unknown;
  maxHoleEdges: unknown;
  scope: string;
  boolean: string;
  repair: boolean;
  capStrategy: string;
  topology: string;
  nonOrientable: string;
  maxTopologyEdges: unknown;
  csgStrategy: string;
  selfIntersections: string;
  remeshResolution: unknown;
  lattice: boolean;
  latticeMode: string;
  latticeCellSize: number;
  latticeStrut: number;
  latticeWall: number;
  latticeFloor: number;
  latticeRim: number;
  latticeSeed: number;
  latticePreview: string;
  finishQuality: string;
  jointStyle: string;
  curveStyle: string;
  envelope: string;
  radiusProfile: string;
  taper: number;
  blendBudget: number;
  blendEdgeLength: number | null;
  manufacturing: ManufacturingProfile;
  quality: unknown;
}
export interface ResolvedFabricationSource {
  layerId: string | null;
  layerName: string | null;
  source: Candidate | null;
  candidates: Candidate[];
  total: number;
  closed: number;
  bodies: number;
  scope: string;
  multiBody: boolean;
  boolean: Rec | null;
  booleanError: string | null;
  booleanEmpty: boolean;
  mergedError: string | null;
  perforationError: string | null;
  preparation: Rec | null;
  manufacturing: ManufacturingProfile;
  repair: Rec | null;
  prepared: boolean;
  groups: Array<Rec> | null;
  reason: string | null;
}
export interface FabricationReport extends Omit<ResolvedFabricationSource, 'manufacturing'> {
  mesh: MeshLike | null;
  triangles: number;
  vertices: number;
  volume: number | null;
  bbox: Rec | null;
  physical: Rec | null;
  warnings: string[];
  errors: string[];
  lattice: Rec | null;
  printability: Rec;
  manufacturing: ManufacturingReport | null;
  unitsReady: boolean;
  exportable: boolean;
}

export function resolveFabricationSource({
  evaluation = null,
  layerIndex = 0,
  preparation = null,
}: {
  evaluation?: EvaluationLike | null;
  layerIndex?: number;
  preparation?: unknown;
} = {}): ResolvedFabricationSource {
  const prepare = normalizePreparation(preparation);
  const groups = prepare.groups ?? [];
  const useGroups = groups.length > 0;
  const scope = useGroups ? 'composition' : prepare.scope;
  const layers = Array.isArray(evaluation?.layers) ? evaluation.layers : null;
  const activeIndex = Math.max(0, Math.min((layers?.length ?? 1) - 1, layerIndex));
  const activeLayer = layers ? layers[activeIndex] ?? null : evaluation as LayerLike | null;
  const selection: Array<{ layer: LayerLike | null; index: number }> = [];
  if (scope === 'composition' && layers) {
    layers.forEach((layer, index) => {
      if (layer?.visible !== false) selection.push({ layer, index });
    });
  } else {
    selection.push({ layer: activeLayer, index: activeIndex });
  }

  const candidates: Candidate[] = [];
  const seen = new Set<GeometryLike>();
  const latticeCandidate = prepare.lattice === true && activeLayer
    ? buildLatticeCandidate(activeLayer, activeIndex, prepare)
    : null;
  const add = (item: unknown, layer: LayerLike | null, index: number): void => {
    if (!item || seen.has(item as GeometryLike)) return;
    if (!isMesh(item) && !isSolid(item)) return;
    seen.add(item as GeometryLike);
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
      const repaired = (prepare.selfIntersections === 'none'
        ? repairMesh(item, repairOptions as never)
        : repairSelfIntersections(item, repairOptions as never)) as unknown as { mesh: MeshLike | null; validation?: ValidationLike; report: Rec };
      const validation = validateForFabrication(repaired.mesh as never) as ValidationLike;
      const closed = Boolean(validation.meta?.closed);
      candidates.push({
        geometry: repaired.mesh,
        kind: repaired.mesh?.kind ?? (item as MeshLike).kind ?? 'mesh',
        id: repaired.mesh?.id ?? (item as MeshLike).id ?? null,
        validation: {
          ...validation,
          warnings: [...new Set([...(validation.warnings ?? []), ...((repaired.report.warnings as string[] | undefined) ?? [])])],
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
      const prepared = prepareMesh(item, prepare as never) as { mesh: MeshLike; warnings?: string[]; stats: Rec };
      const validation = validateForFabrication(prepared.mesh) as ValidationLike;
      const closed = Boolean(validation.meta?.closed);
      candidates.push({
        geometry: prepared.mesh,
        kind: prepared.mesh.kind ?? 'mesh',
        id: prepared.mesh.id ?? (item as MeshLike).id ?? null,
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
    const geometry = item as GeometryLike;
    const validation = validateForFabrication(geometry) as ValidationLike;
    const closed = Boolean(validation.meta?.closed);
    candidates.push({
      geometry,
      kind: geometry.kind ?? 'mesh',
      id: typeof geometry.id === 'string' ? geometry.id : null,
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
  let source: Candidate | null = useGroups
    ? null
    : (scope === 'single' || exportable.length <= 1 ? exportable[0] ?? null : null);
  let mergedError: string | null = null;
  let bodies = source ? 1 : 0;
  let booleanError: string | null = null;
  let booleanEmpty = false;
  let groupError: string | null = null;
  let groupMetadata: Array<Rec> | null = null;

  if (useGroups) {
    const grouped = resolveBooleanGroups(exportable, groups, prepare);
    if (grouped.error) {
      source = null;
      groupError = grouped.error;
      groupMetadata = grouped.metadata ?? null;
    } else {
      source = grouped.source ?? null;
      bodies = grouped.bodies ?? 0;
      groupMetadata = grouped.metadata ?? null;
    }
  } else if (scope !== 'single' && prepare.boolean !== 'none') {
    if (exportable.length < 2) {
      source = null;
      booleanError = `Boolean ${prepare.boolean} requires at least two validated bodies`;
    } else {
      const operands = exportable
        .map((candidate) => {
          const geometry = candidate.geometry;
          if (!geometry) return null;
          return isSolid(geometry) ? geometry.boundary : geometry;
        })
        .filter((operand): operand is GeometryLike => Boolean(operand));
      const result = booleanSolids(prepare.boolean as never, operands as never, {
        tolerance: prepare.tolerance,
        strategy: prepare.csgStrategy as never,
        remeshResolution: prepare.remeshResolution,
      } as never) as unknown as { ok: boolean; empty?: boolean; geometry?: GeometryLike; validation?: ValidationLike; stats?: Rec; error?: { message?: string } };
      if (!result.ok) {
        source = null;
        booleanError = `Boolean ${prepare.boolean} failed: ${result.error?.message ?? 'unknown error'}`;
      } else if (result.empty) {
        source = null;
        booleanEmpty = true;
        booleanError = 'Boolean result is empty';
      } else {
        source = {
          geometry: result.geometry ?? null,
          kind: 'mesh',
          id: `boolean-${prepare.boolean}`,
          validation: result.validation ?? { ok: false, errors: ['missing validation'] },
          closed: true,
          exportable: true,
          prepared: exportable.some((candidate) => candidate.prepared),
          repair: aggregateRepair(exportable),
          preparation: aggregatePreparation(exportable),
          bodies: 1,
          bodyIds: exportable.map((candidate) => candidate.id ?? null),
          multiBody: false,
          boolean: { operation: prepare.boolean, operands: exportable.length, stats: result.stats },
        };
        bodies = 1;
      }
    }
  } else if (scope !== 'single' && exportable.length > 1) {
    const meshes = exportable
      .map((candidate) => {
        const geometry = candidate.geometry;
        if (!geometry) return null;
        return isSolid(geometry) ? geometry.boundary : geometry;
      })
      .filter((mesh): mesh is GeometryLike => Boolean(mesh));
    const merged = mergeMeshes(meshes as never, { id: 'multi-body' }) as { mesh?: MeshLike; warnings?: string[] };
    if (!merged.mesh) {
      mergedError = merged.warnings?.[0] ?? 'multi-body merge failed';
      source = null;
    } else {
      const validation = validateForFabrication(merged.mesh as never) as ValidationLike;
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
          bodyIds: exportable.map((candidate) => candidate.id ?? null),
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

  let perforationError: string | null = null;
  if (prepare.lattice === true && prepare.latticeMode === 'cutouts' && source?.geometry) {
    const shell = isSolid(source.geometry) ? source.geometry.boundary : source.geometry;
    const outerSurface = (activeLayer?.geometry ?? []).find((item) => Array.isArray((item as Rec).grid
      && ((item as Rec).grid as Rec).points));
    const cutters = buildPerforationCutters(shell as never, {
      cellSize: prepare.latticeCellSize,
      strut: prepare.latticeStrut,
      wall: prepare.latticeWall,
      floor: prepare.latticeFloor,
      rim: prepare.latticeRim,
      seed: prepare.latticeSeed,
      profile: outerSurface ? radiusProfileFromSurface(outerSurface as never) : null,
    } as never) as { ok: boolean; cutters?: GeometryLike[]; stats?: Rec; error?: { message?: string } };
    if (!cutters.ok || !(cutters.cutters?.length)) {
      source = null;
      perforationError = cutters.error?.message ?? 'perforation generated no holes';
    } else {
      const result = booleanSolids('difference', [shell as never, ...(cutters.cutters ?? []) as never], {
        strategy: 'manifold',
        tolerance: prepare.tolerance,
        maxInputTriangles: 400_000,
      } as never) as unknown as { ok: boolean; geometry?: GeometryLike; validation?: ValidationLike; error?: { message?: string } };
      if (!result.ok || !result.geometry) {
        source = null;
        perforationError = `Perforation failed: ${result.error?.message ?? 'unknown error'}`;
      } else {
        const validation = validateForFabrication(result.geometry as never) as ValidationLike;
        const closed = Boolean(validation.meta?.closed);
        source = {
          ...source,
          geometry: result.geometry,
          kind: 'mesh',
          id: 'perforated-shell',
          validation,
          closed,
          exportable: validation.ok && closed,
          lattice: { ...(cutters.stats ?? {}) },
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
    boolean: (source?.boolean as Rec | undefined) ?? null,
    booleanError,
    booleanEmpty,
    mergedError,
    perforationError,
    preparation: (source?.preparation as Rec | undefined) ?? null,
    manufacturing: prepare.manufacturing,
    repair: (source?.repair as Rec | undefined) ?? null,
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

export function buildFabricationReport({
  evaluation = null,
  layerIndex = 0,
  units = null,
  preparation = null,
}: {
  evaluation?: EvaluationLike | null;
  layerIndex?: number;
  units?: unknown;
  preparation?: unknown;
} = {}): FabricationReport {
  const resolved = resolveFabricationSource({ evaluation, layerIndex, preparation });
  const source = resolved.source;
  if (!source) {
    return {
      ...resolved,
      lattice: (resolved.candidates?.[0]?.lattice as Rec | undefined) ?? null,
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
      printability: {},
      unitsReady: millimetresPerUnit(units, 'world') !== null,
      exportable: false,
    };
  }

  if (!source.geometry) throw new Error('Fabrication source has no geometry');
  const mesh = (isSolid(source.geometry) ? source.geometry.boundary : source.geometry) as MeshLike;
  const bbox = bboxOf(mesh);
  const physical = bboxToMillimetres(bbox, units);
  const unitsReady = millimetresPerUnit(units, 'world') !== null;
  const lattice = (source.lattice as Rec | null | undefined) ?? null;
  const minFeature = lattice?.radius
    ? Number(lattice.radius) * 2
    : (lattice?.mode === 'cutouts' ? Number(lattice.strut) : null);
  const printability = analyzePrintability(mesh as never, { units, minFeature, lattice } as never) as Rec;
  const manufacturing = buildManufacturingReport({
    profile: resolved.manufacturing,
    printability,
    lattice,
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
    preparation: (source.preparation as Rec | undefined) ?? null,
    repair: (source.repair as Rec | undefined) ?? null,
    prepared: Boolean(source.prepared),
    lattice,
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

function bboxOf(mesh: MeshLike | null): Rec {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const point of mesh?.vertices ?? []) {
    const x = Number(point?.x);
    const y = Number(point?.y);
    const z = Number(point?.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, width: 0, height: 0, depth: 0 };
  return { minX, minY, minZ, maxX, maxY, maxZ, width: maxX - minX, height: maxY - minY, depth: maxZ - minZ };
}

function buildLatticeCandidate(layer: LayerLike, index: number, prepare: FabricationPreparation): Candidate | null {
  if (layer?.generator?.id !== 'surface-lattice') return null;
  const params = layer.generator?.params ?? {};
  const curves = (layer.geometry ?? []).filter((item) => (item as Rec).kind === 'curve3d');
  if (!curves.length) return null;
  const height = Number(params.height) || Math.max(...curves.flatMap((curve) => ((curve as Rec).points as VectorLike[] ?? []).map((point) => Number(point.z)))) || 200;
  const compiled = typeof params.profile === 'string' ? compileExpression(params.profile) as { ok: boolean; fn: (scope: Rec) => unknown } : null;
  const profileScope = compiled?.ok
    ? Object.assign(Object.create(null) as Rec, createStdlib(Number(params.seed) || 1), { v: 0 })
    : null;
  const radiusAt = compiled?.ok && profileScope
    ? (v: number) => {
      profileScope.v = v;
      const value = Number(compiled.fn(profileScope));
      return Number.isFinite(value) ? value : null;
    }
    : null;
  const radiusExpression = typeof params.radiusExpression === 'string' ? params.radiusExpression.trim() : '';
  let radiusAtPoint: ((t: number, point: Rec) => number) | null = null;
  if (radiusExpression) {
    const radiusCompiled = compileExpression(radiusExpression) as { ok: boolean; fn: (scope: Rec) => unknown };
    if (radiusCompiled.ok) {
      const baseRadius = (Number(params.strut) || 3.5) / 2;
      const scope = Object.assign(Object.create(null) as Rec, createStdlib(Number(params.seed) || 1), {
        v: 0, t: 0, z: 0, base: baseRadius,
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
  const openingCurve = curves.find((curve) => Array.isArray((curve as Rec).meta && ((curve as Rec).meta as Rec).latticeOpenings));
  const openings = (((openingCurve as Rec | undefined)?.meta as Rec | undefined)?.latticeOpenings ?? []) as unknown[];
  const meta = ((openingCurve as Rec | undefined)?.meta ?? (curves[0] as Rec | undefined)?.meta ?? {}) as Rec;
  const result = buildLatticeSolid(curves as never, {
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
  } as never) as unknown as { ok: boolean; geometry?: GeometryLike; validation?: ValidationLike; stats?: Rec; error?: { message?: string } };
  const validation = result.ok
    ? result.validation ?? { ok: false, errors: ['missing lattice validation'] }
    : { ok: false, warnings: [], errors: [result.error?.message ?? 'lattice solid build failed'], meta: { closed: false, manifold: false, volume: null } };
  const closed = Boolean(validation?.meta?.closed);
  return {
    geometry: result.geometry ?? null,
    kind: result.geometry?.kind ?? 'mesh',
    id: (result.geometry as Rec | undefined)?.id as string | undefined ?? 'lattice-solid',
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

function numeric(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePreparation(raw: unknown): FabricationPreparation {
  const source = raw && typeof raw === 'object' ? raw as Rec : {};
  return {
    groups: sanitizeFabricationGroups(source.groups) as Array<{ op: string; layers: string[]; name?: string }>,
    weld: source.weld === true,
    cap: source.cap === true,
    tolerance: source.tolerance,
    maxHoleEdges: source.maxHoleEdges,
    scope: ['single', 'active-layer', 'composition'].includes(String(source.scope)) ? String(source.scope) : 'single',
    boolean: ['none', 'union', 'difference', 'intersection'].includes(String(source.boolean)) ? String(source.boolean) : 'none',
    repair: source.repair === true,
    capStrategy: ['auto', 'fan', 'planar', 'none'].includes(String(source.capStrategy)) ? String(source.capStrategy) : 'auto',
    topology: ['none', 'split', 'remove'].includes(String(source.topology)) ? String(source.topology) : 'none',
    nonOrientable: ['cut', 'reject'].includes(String(source.nonOrientable)) ? String(source.nonOrientable) : 'cut',
    maxTopologyEdges: source.maxTopologyEdges,
    csgStrategy: ['auto', 'manifold', 'bsp', 'remesh'].includes(String(source.csgStrategy)) ? String(source.csgStrategy) : 'auto',
    selfIntersections: ['none', 'sdf', 'remesh', 'auto'].includes(String(source.selfIntersections)) ? String(source.selfIntersections) : 'none',
    remeshResolution: source.remeshResolution,
    lattice: source.lattice === true,
    latticeMode: source.latticeMode === 'cutouts' ? 'cutouts' : 'struts',
    latticeCellSize: numeric(source.latticeCellSize, 20),
    latticeStrut: numeric(source.latticeStrut, 3.5),
    latticeWall: numeric(source.latticeWall, 2.5),
    latticeFloor: numeric(source.latticeFloor, 3),
    latticeRim: numeric(source.latticeRim, 4),
    latticeSeed: numeric(source.latticeSeed, 7),
    latticePreview: source.latticePreview === 'network' ? 'network' : 'solid',
    finishQuality: source.finishQuality === 'draft' || source.finishQuality === 'high' ? String(source.finishQuality) : 'standard',
    jointStyle: ['technical', 'rounded', 'blend', 'auto'].includes(String(source.jointStyle)) ? String(source.jointStyle) : 'technical',
    curveStyle: source.curveStyle === 'organic' ? 'organic' : 'polyline',
    envelope: source.envelope === 'outer' ? 'outer' : 'centerline',
    radiusProfile: source.radiusProfile === 'taper' ? 'taper' : 'constant',
    taper: Number.isFinite(Number(source.taper)) ? Math.max(0.25, Math.min(1, Number(source.taper))) : 0.85,
    blendBudget: Number.isFinite(Number(source.blendBudget)) ? Math.max(0, Math.floor(Number(source.blendBudget))) : 24,
    blendEdgeLength: Number.isFinite(Number(source.blendEdgeLength)) && Number(source.blendEdgeLength) > 0
      ? Number(source.blendEdgeLength)
      : null,
    manufacturing: sanitizeManufacturingProfile(source.manufacturing),
    quality: source.quality,
  };
}

interface GroupedResult {
  source?: Candidate | null;
  bodies?: number;
  multiBody?: boolean;
  metadata?: Array<Rec>;
  error?: string;
}

function resolveBooleanGroups(exportable: Candidate[], groups: Array<{ op: string; layers: string[]; name?: string }>, prepare: FabricationPreparation): GroupedResult {
  const byLayer = new Map<string, Candidate>();
  for (const candidate of exportable) {
    if (candidate.layerId) byLayer.set(candidate.layerId, candidate);
  }
  const bodies: Candidate[] = [];
  const metadata: Array<Rec> = [];
  const used = new Set<Candidate>();
  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    if (!group) continue;
    const members = group.layers.map((id) => byLayer.get(id)).filter((member): member is Candidate => Boolean(member));
    if (!members.length) return { error: `Boolean group ${index + 1} has no validated body`, metadata };
    if (members.some((member) => used.has(member))) return { error: 'Layer reused across boolean groups', metadata };
    members.forEach((member) => used.add(member));
    if (members.length === 1) {
          if (!members[0]) continue;
      bodies.push({ ...members[0], group: { index, name: group.name, operation: group.op, layerIds: group.layers } });
      metadata.push({ index, name: group.name, operation: group.op, layers: group.layers });
      continue;
    }
    const operands = members
      .map((candidate) => {
        const geometry = candidate.geometry;
        if (!geometry) return null;
        return isSolid(geometry) ? geometry.boundary : geometry;
      })
      .filter((operand): operand is GeometryLike => Boolean(operand));
    const result = booleanSolids(group.op as never, operands as never, {
      tolerance: prepare.tolerance,
      strategy: prepare.csgStrategy as never,
      remeshResolution: prepare.remeshResolution,
    } as never) as unknown as { ok: boolean; empty?: boolean; geometry?: GeometryLike; validation?: ValidationLike; stats?: Rec; error?: { message?: string } };
    if (!result.ok) return { error: `Boolean group ${index + 1} failed: ${result.error?.message ?? 'unknown error'}`, metadata };
    if (result.empty) return { error: `Boolean group ${index + 1} is empty`, metadata };
    const validation = validateForFabrication(result.geometry as never) as ValidationLike;
    const closed = Boolean(validation.meta?.closed);
    if (!validation.ok || !closed) {
      return { error: `Boolean group ${index + 1} is not a closed solid: ${validation.errors?.[0] ?? 'unknown error'}`, metadata };
    }
    bodies.push({
      geometry: result.geometry ?? null,
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
  if (bodies.length === 1) return { source: bodies[0] ?? null, bodies: 1, multiBody: false, metadata };
  const meshes = bodies
    .map((body) => {
      const geometry = body.geometry;
      if (!geometry) return null;
      return isSolid(geometry) ? geometry.boundary : geometry;
    })
    .filter((mesh): mesh is GeometryLike => Boolean(mesh));
  const merged = mergeMeshes(meshes as never, { id: 'grouped-multi-body' }) as { mesh?: MeshLike; warnings?: string[] };
  if (!merged.mesh) return { error: 'Grouped multi-body merge failed', metadata };
  const validation = validateForFabrication(merged.mesh as never) as ValidationLike;
  const closed = Boolean(validation.meta?.closed);
  if (!validation.ok || !closed) {
    return { error: `Grouped multi-body failed validation: ${validation.errors?.[0] ?? 'unknown error'}`, metadata };
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
      bodyIds: bodies.map((body) => body.id ?? null),
      multiBody: true,
      groups: metadata,
    },
    bodies: bodies.length,
    multiBody: true,
    metadata,
  };
}

function aggregatePreparation(candidates: Candidate[]): Rec | null {
  const entries = candidates.map((candidate) => candidate.preparation).filter((entry): entry is Rec => Boolean(entry));
  if (!entries.length) return null;
  const stats: Rec = {
    inputVertices: 0, outputVertices: 0, mergedVertices: 0,
    removedFaces: 0, cappedLoops: 0, addedTriangles: 0, prepared: true,
  };
  for (const entry of entries) {
    for (const key of ['inputVertices', 'outputVertices', 'mergedVertices', 'removedFaces', 'cappedLoops', 'addedTriangles']) {
      stats[key] = Number(stats[key]) + (Number(entry[key]) || 0);
    }
  }
  return stats;
}

function aggregateRepair(candidates: Candidate[]): Rec | null {
  const entries = candidates.map((candidate) => candidate.repair).filter((entry): entry is Rec => Boolean(entry));
  if (!entries.length) return null;
  const report: Rec = { strategy: entries[0]?.strategy ?? 'auto', warnings: [], errors: [] };
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
  report.warnings = [...new Set(entries.flatMap((entry) => entry.warnings as string[] ?? []))];
  report.errors = [...new Set(entries.flatMap((entry) => entry.errors as string[] ?? []))];
  return report;
}
