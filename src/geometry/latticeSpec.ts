/**
 * geometry/latticeSpec.ts — normalized, serializable lattice contract.
 *
 * The document stores generator parameters; this module turns them into a
 * stable spec for the network builder, cache and provenance. It is pure and
 * contains no functions or UI state.
 */

type Rec = Record<string, unknown>;

export type LatticeBoundaryMode = 'flag' | 'clip' | 'pad';

export interface LatticeSpec {
  version: number;
  algorithmVersion: number;
  surface: {
    kind: 'revolution';
    profile: string;
    height: number;
    zMin: number;
    zMax: number;
  };
  cell: {
    targetSize: number;
    density: number;
    densityMode: 'uniform' | 'expression';
    densityExpression: string;
    irregularity: number;
    relaxation: number;
    aspect: number;
    boundaryMode: LatticeBoundaryMode;
    seed: number;
  };
  clearance: {
    strutDiameter: number;
    minOpeningWidth: number;
  };
  budget: {
    maxCells: number;
    maxEdges: number;
  };
}

export const LATTICE_ALGORITHM_VERSION = 1;
export const LATTICE_SPEC_VERSION = 1;

const DEFAULTS = Object.freeze({
  height: 200,
  zMin: 0,
  cellSize: 20,
  density: 1,
  irregularity: 0.15,
  relaxation: 3,
  aspect: 1,
  boundaryMode: 'flag',
  seed: 1,
  strutDiameter: 3.5,
  minOpeningWidth: 2,
  maxCells: 500,
  maxEdges: 2500,
}) as {
  height: number;
  zMin: number;
  cellSize: number;
  density: number;
  irregularity: number;
  relaxation: number;
  aspect: number;
  boundaryMode: string;
  seed: number;
  strutDiameter: number;
  minOpeningWidth: number;
  maxCells: number;
  maxEdges: number;
};

export function normalizeLatticeSpec(raw: unknown = {}): LatticeSpec {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Rec;
  const height = positive(source.height, DEFAULTS.height);
  const zMin = clampNumber(Number(source.zMin ?? source.floor ?? DEFAULTS.zMin), 0, height * 0.5);
  const zMax = clampNumber(
    Number(source.zMax ?? source.top ?? height),
    zMin + 1,
    height,
  );
  const targetSize = clampNumber(
    Number(source.targetSize ?? source.cellSize ?? DEFAULTS.cellSize),
    4,
    200,
  );
  const density = clampNumber(Number(source.density ?? DEFAULTS.density), 0.25, 4);
  const densityExpression = typeof source.densityExpression === 'string'
    ? source.densityExpression.trim()
    : '';
  const irregularity = clampNumber(
    Number(source.irregularity ?? DEFAULTS.irregularity),
    0,
    1,
  );
  const relaxation = Math.round(clampNumber(
    Number(source.relaxation ?? DEFAULTS.relaxation),
    0,
    12,
  ));
  const aspect = clampNumber(Number(source.aspect ?? DEFAULTS.aspect), 0.25, 4);
  const boundaryMode = (['flag', 'clip', 'pad'] as string[]).includes(source.boundaryMode as string)
    ? source.boundaryMode as LatticeBoundaryMode
    : DEFAULTS.boundaryMode as LatticeBoundaryMode;
  const seed = Math.round(clampNumber(Number(source.seed ?? DEFAULTS.seed), 0, 1e9));
  const strutDiameter = clampNumber(
    Number(source.strutDiameter ?? source.strut ?? DEFAULTS.strutDiameter),
    0.5,
    30,
  );
  const minOpeningWidth = clampNumber(
    Number(source.minOpeningWidth ?? source.minOpening ?? DEFAULTS.minOpeningWidth),
    0,
    100,
  );
  const maxCells = Math.round(clampNumber(
    Number(source.maxCells ?? DEFAULTS.maxCells),
    4,
    5000,
  ));
  const maxEdges = Math.round(clampNumber(
    Number(source.maxEdges ?? DEFAULTS.maxEdges),
    8,
    20000,
  ));
  return {
    version: LATTICE_SPEC_VERSION,
    algorithmVersion: LATTICE_ALGORITHM_VERSION,
    surface: {
      kind: 'revolution',
      profile: typeof source.profile === 'string' ? source.profile : '',
      height,
      zMin,
      zMax,
    },
    cell: {
      targetSize,
      density,
      densityMode: densityExpression ? 'expression' : 'uniform',
      densityExpression,
      irregularity,
      relaxation,
      aspect,
      boundaryMode,
      seed,
    },
    clearance: {
      strutDiameter,
      minOpeningWidth,
    },
    budget: {
      maxCells,
      maxEdges,
    },
  };
}

/** Deterministic, dependency-free spec identity for caches and provenance. */
export function latticeSpecHash(spec: LatticeSpec | null | undefined): string {
  const canonical = JSON.stringify({
    version: spec?.version,
    algorithmVersion: spec?.algorithmVersion,
    surface: spec?.surface,
    cell: spec?.cell,
    clearance: spec?.clearance,
    budget: spec?.budget,
  });
  return fnv1a(canonical);
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function positive(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function fnv1a(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
