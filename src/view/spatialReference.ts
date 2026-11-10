/** Minimal world reference geometry. */

export interface SpatialReference {
  enabled: boolean;
  ground: boolean;
}

export interface WorldBBoxLike {
  width?: unknown;
  height?: unknown;
  depth?: unknown;
  minX?: unknown;
  minY?: unknown;
  minZ?: unknown;
  maxX?: unknown;
  maxY?: unknown;
  maxZ?: unknown;
  [key: string]: unknown;
}

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

export interface ArtboardPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}

export interface SpatialTransform {
  toArtboard(point: WorldPoint): ArtboardPoint | null;
  project(point: WorldPoint): ArtboardPoint | null;
  applyFrame(point: ArtboardPoint): ArtboardPoint;
}

export interface ReferenceAxis {
  id: string;
  label: string;
  end: WorldPoint;
  runs: ArtboardPoint[][];
  labelPoint: ArtboardPoint | null;
}

export interface ReferenceLine {
  id: string;
  runs: ArtboardPoint[][];
}

export interface BuiltSpatialReference {
  extent: number;
  origin: { x: number; y: number } | null;
  axes: ReferenceAxis[];
  ground: ReferenceLine[];
}

export const DEFAULT_REFERENCE: Readonly<SpatialReference> = Object.freeze({
  enabled: false,
  ground: false,
});

export const GROUND_DIVISIONS = 4;

export function createReference(raw: unknown = {}): SpatialReference {
  return { ...DEFAULT_REFERENCE, ...(raw && typeof raw === 'object' ? raw as Partial<SpatialReference> : {}) };
}

export function sanitizeReference(raw: unknown): SpatialReference {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    enabled: Boolean(source.enabled),
    ground: Boolean(source.ground),
  };
}

/**
 * Choose a world-unit extent that keeps the axes legible without changing the
 * artwork frame. The reference follows the visible geometry's size, not its
 * screen framing.
 */
export function referenceExtent(bounds: WorldBBoxLike | null | undefined): number {
  if (!bounds) return 100;
  const width = span(bounds.width, bounds.minX, bounds.maxX);
  const height = span(bounds.height, bounds.minY, bounds.maxY);
  const depth = span(bounds.depth, bounds.minZ, bounds.maxZ);
  const size = Math.max(width, height, depth, 0);
  const horizontal = Math.max(width, height, 0);
  const worldExtent = size > 0 ? size * 0.75 : 100;
  // A deep/thin shape must not push the axes off-screen. Cap by the horizontal
  // world span, never by projected artboard units (which are not world units
  // in perspective). The floor keeps a visible axis for vertical shapes.
  if (horizontal <= 0) return Math.max(1e-3, worldExtent);
  return Math.max(1e-3, Math.min(worldExtent, Math.max(horizontal * 0.9, size * 0.2)));
}

/**
 * Build artboard-space reference polylines. Each entry exposes `runs` so a
 * backend can draw clipped segments without joining across the near plane.
 */
export function buildSpatialReference({
  transform = null,
  worldBBox = null,
  ground = false,
  divisions = GROUND_DIVISIONS,
}: {
  transform?: SpatialTransform | null;
  worldBBox?: WorldBBoxLike | null;
  ground?: boolean;
  divisions?: unknown;
} = {}): BuiltSpatialReference | null {
  if (!transform) return null;
  const extent = referenceExtent(worldBBox);
  const origin = transform.toArtboard({ x: 0, y: 0, z: 0 });
  const axes = ([
    { id: 'x', label: 'X', end: { x: extent, y: 0, z: 0 } },
    { id: 'y', label: 'Y', end: { x: 0, y: extent, z: 0 } },
    { id: 'z', label: 'Z', end: { x: 0, y: 0, z: extent } },
  ] as ReferenceAxis[]).map((axis) => {
    const labelWorld: WorldPoint = {
      x: axis.end.x * 0.86,
      y: axis.end.y * 0.86,
      z: axis.end.z * 0.86,
    };
    const labelProjected = transform.project(labelWorld);
    const labelPoint = labelProjected ? transform.applyFrame(labelProjected) : null;
    return {
      ...axis,
      runs: projectLine(transform, { x: 0, y: 0, z: 0 }, axis.end),
      labelPoint,
    };
  }).filter((axis) => runsLength(axis.runs) > 1e-6);

  const groundLines: ReferenceLine[] = [];
  if (ground) {
    const steps = Math.max(1, Math.min(8, Math.floor(Number(divisions) || GROUND_DIVISIONS)));
    const step = extent / steps;
    for (let i = -steps; i <= steps; i++) {
      const offset = i * step;
      groundLines.push({
        id: `gx-${i}`,
        runs: projectLine(transform, { x: -extent, y: offset, z: 0 }, { x: extent, y: offset, z: 0 }),
      });
      groundLines.push({
        id: `gy-${i}`,
        runs: projectLine(transform, { x: offset, y: -extent, z: 0 }, { x: offset, y: extent, z: 0 }),
      });
    }
  }

  return {
    extent,
    origin: origin ? { x: origin.x, y: origin.y } : null,
    axes,
    ground: groundLines,
  };
}

function projectLine(transform: SpatialTransform, a: WorldPoint, b: WorldPoint, steps = 8): ArtboardPoint[][] {
  const runs: ArtboardPoint[][] = [];
  let run: ArtboardPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const world = {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
    const projected = transform.project(world);
    if (!projected) {
      if (run.length >= 2) runs.push(run);
      run = [];
      continue;
    }
    run.push(transform.applyFrame(projected));
  }
  if (run.length >= 2) runs.push(run);
  return runs;
}

function runsLength(runs: ArtboardPoint[][] | undefined): number {
  let total = 0;
  for (const run of runs ?? []) {
    for (let i = 1; i < run.length; i++) {
      const a = run[i - 1];
      const b = run[i];
      if (!a || !b) continue;
      total += Math.hypot(b.x - a.x, b.y - a.y);
    }
  }
  return total;
}

function span(value: unknown, min: unknown, max: unknown): number {
  if (Number.isFinite(Number(value))) return Math.abs(Number(value));
  if (Number.isFinite(Number(min)) && Number.isFinite(Number(max))) {
    return Math.abs(Number(max) - Number(min));
  }
  return 0;
}
