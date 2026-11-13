/**
 * geometry/surfaceTessellation.ts — deterministic Surface → Mesh.
 *
 * The tessellation also builds an explicit SurfaceMapping sidecar. The mapping
 * preserves logical parameter cells and per-corner UVs before wrap/flip, which
 * is the information a welded mesh cannot represent by itself.
 */

import { createMesh } from './contracts.ts';
import type { Mesh, Point3D, Surface } from './contracts.ts';
import { validateSurface } from './validate.ts';

type UV = { u: number; v: number };

interface TessellationOptions {
  id?: string | undefined;
  smooth?: boolean;
  mapping?: boolean;
}

interface DomainMap {
  u: [number, number];
  v: [number, number];
  closedU: boolean;
  closedV: boolean;
  seamU: unknown;
  seamV: unknown;
  twistU: boolean;
  twistV: boolean;
}

interface Corner {
  index: number;
  uv: UV | null;
}

interface MappingFace {
  indices: number[];
  cell: { u: number; v: number };
  triangle: number;
  uv: Array<UV | null>;
}

export interface SurfaceMapping {
  kind: 'surface-mapping';
  surfaceId: string | null;
  meshId: string | undefined;
  domain: DomainMap | null;
  grid: {
    rows: number;
    cols: number;
    uCells: number;
    vCells: number;
  };
  faces: MappingFace[];
}

export interface TessellationResult {
  mesh: Mesh;
  mapping: SurfaceMapping | null;
}

/**
 * Tessellate a Surface grid. Closed axes are welded by wrapping face indices
 * to the first unique row/column. A reversed seam (`seamU`/`seamV` =
 * `'reverse'`) additionally mirrors the opposite coordinate at the wrap,
 * which produces a half-twisted but crack-free mesh (Möbius band).
 */
export function tessellateSurface(surface: Surface, options: TessellationOptions = {}): Mesh {
  return buildSurfaceTessellation(surface, { ...options, mapping: false }).mesh;
}

/**
 * Tessellate and return the explicit parameter mapping alongside the mesh.
 * Both are produced in the same logical-cell loop so they cannot drift.
 */
export function tessellateSurfaceWithMapping(surface: Surface, options: TessellationOptions = {}): TessellationResult {
  return buildSurfaceTessellation(surface, { ...options, mapping: true });
}

function buildSurfaceTessellation(
  surface: Surface,
  { id = surface.id, smooth = true, mapping = true }: TessellationOptions = {},
): TessellationResult {
  const validation = validateSurface(surface);
  if (!validation.ok) {
    const error = new Error(`surface tessellation: ${validation.errors[0]}`) as Error & { validation?: unknown };
    error.validation = validation;
    throw error;
  }
  const rows = surface.grid.points;
  const gridRows = rows.length;
  const gridCols = rows[0]!.length;
  const closedU = Boolean(surface.domain.closedU);
  const closedV = Boolean(surface.domain.closedV);
  const seamU = surface.domain?.seamU ?? surface.meta?.seamU ?? 'normal';
  const seamV = surface.domain?.seamV ?? surface.meta?.seamV ?? 'normal';
  const twistU = closedU && seamU === 'reverse';
  const twistV = closedV && seamV === 'reverse';
  const uniqueRows = closedU ? gridRows - 1 : gridRows;
  const uniqueCols = closedV ? gridCols - 1 : gridCols;
  const uCells = closedU ? uniqueRows : uniqueRows - 1;
  const vCells = closedV ? uniqueCols : uniqueCols - 1;
  if (uCells < 1 || vCells < 1) {
    throw new Error('surface tessellation: grid needs at least one cell in U and V');
  }

  const mappingEnabled = mapping !== false;
  const domain: DomainMap | null = mappingEnabled
    ? domainOf(surface, { seamU, seamV, twistU, twistV })
    : null;

  const vertices: Point3D[] = [];
  for (let u = 0; u < uniqueRows; u++) {
    for (let v = 0; v < uniqueCols; v++) vertices.push({ ...rows[u]![v]! });
  }
  const indexOf = (u: number, v: number): number => u * uniqueCols + v;

  // Resolve a logical grid coordinate to the welded index. Wrapping a twisted
  // axis mirrors the opposite coordinate, which is the topological half twist.
  const wrap = (index: number, size: number, twist: unknown): { index: number; flip: boolean } => {
    if (index >= 0 && index < size) return { index, flip: false };
    return { index: ((index % size) + size) % size, flip: Boolean(twist) };
  };
  const cornerIndex = (u: number, v: number): number => {
    const cu = wrap(u, uniqueRows, twistU);
    const cv = wrap(v, uniqueCols, twistV);
    let ui = cu.index;
    let vi = cv.index;
    if (cu.flip) vi = uniqueCols - 1 - vi;
    if (cv.flip) ui = uniqueRows - 1 - ui;
    return indexOf(ui, vi);
  };

  const mappingDomain = domain as DomainMap | null;
  const uStep = mappingEnabled ? (mappingDomain!.u[1] - mappingDomain!.u[0]) / uCells : 0;
  const vStep = mappingEnabled ? (mappingDomain!.v[1] - mappingDomain!.v[0]) / vCells : 0;
  const uvAt: ((u: number, v: number) => UV) | null = mappingEnabled
    ? (u, v) => ({
      u: mappingDomain!.u[0] + uStep * u,
      v: mappingDomain!.v[0] + vStep * v,
    })
    : null;
  const corner = (u: number, v: number): Corner => ({
    index: cornerIndex(u, v),
    uv: uvAt ? uvAt(u, v) : null,
  });

  const faces: number[][] = [];
  const mappingFaces: MappingFace[] = [];
  const faceNormals: Point3D[] = [];
  for (let u = 0; u < uCells; u++) {
    for (let v = 0; v < vCells; v++) {
      const a = corner(u, v);
      const b = corner(u + 1, v);
      const c = corner(u + 1, v + 1);
      const d = corner(u, v + 1);

      const tri0 = [a, b, c];
      const tri1 = [a, c, d];
      faces.push(tri0.map((cornerPoint) => cornerPoint.index), tri1.map((cornerPoint) => cornerPoint.index));
      if (mappingEnabled) {
        mappingFaces.push(
          mappingFace(tri0, u, v, 0),
          mappingFace(tri1, u, v, 1),
        );
      }
      faceNormals.push(faceNormal(vertices[a.index]!, vertices[b.index]!, vertices[c.index]!));
      faceNormals.push(faceNormal(vertices[a.index]!, vertices[c.index]!, vertices[d.index]!));
    }
  }

  const mesh = createMesh({
    id,
    vertices,
    faces,
    normals: smooth ? vertexNormals(vertices, faces) : null,
    faceNormals,
    meta: {
      source: 'surface-tessellation',
      surfaceId: surface.id,
      smooth: Boolean(smooth),
      uCells,
      vCells,
      closedU,
      closedV,
      seamU,
      seamV,
      twistU,
      twistV,
      gridRows: uniqueRows,
      gridCols: uniqueCols,
    },
  });

  const surfaceMapping: SurfaceMapping | null = mappingEnabled
    ? {
      kind: 'surface-mapping',
      surfaceId: surface.id ?? null,
      meshId: mesh.id,
      domain,
      grid: {
        rows: uniqueRows,
        cols: uniqueCols,
        uCells,
        vCells,
      },
      faces: mappingFaces,
    }
    : null;

  return { mesh, mapping: surfaceMapping };
}

function mappingFace(tri: Corner[], cellU: number, cellV: number, triangle: number): MappingFace {
  return {
    indices: tri.map((cornerPoint) => cornerPoint.index),
    cell: { u: cellU, v: cellV },
    triangle,
    uv: tri.map((cornerPoint) => cornerPoint.uv),
  };
}

function domainOf(
  surface: Surface,
  { seamU, seamV, twistU, twistV }: { seamU: unknown; seamV: unknown; twistU: boolean; twistV: boolean },
): DomainMap {
  const u = range(surface.domain?.u, 'u');
  const v = range(surface.domain?.v, 'v');
  return {
    u,
    v,
    closedU: Boolean(surface.domain?.closedU),
    closedV: Boolean(surface.domain?.closedV),
    seamU,
    seamV,
    twistU,
    twistV,
  };
}

function range(raw: unknown, axis: string): [number, number] {
  const values = raw as [unknown, unknown] | null | undefined;
  const start = Number(values?.[0]);
  const end = Number(values?.[1]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error(`surface mapping: non-finite ${axis} domain`);
  }
  return [start, end];
}

function faceNormal(a: Point3D, b: Point3D, c: Point3D): Point3D {
  const abx = b.x - a.x; const aby = b.y - a.y; const abz = b.z - a.z;
  const acx = c.x - a.x; const acy = c.y - a.y; const acz = c.z - a.z;
  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;
  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

function vertexNormals(vertices: Point3D[], faces: number[][]): Point3D[] {
  const sums = vertices.map((): Point3D => ({ x: 0, y: 0, z: 0 }));
  for (const face of faces) {
    const a = vertices[face[0]!]!;
    const b = vertices[face[1]!]!;
    const c = vertices[face[2]!]!;
    const normal = faceNormal(a, b, c);
    const area = triangleArea(a, b, c);
    for (const index of face) {
      const sum = sums[index]!;
      sum.x += normal.x * area;
      sum.y += normal.y * area;
      sum.z += normal.z * area;
    }
  }
  return sums.map((sum) => {
    const len = Math.hypot(sum.x, sum.y, sum.z) || 1;
    return { x: sum.x / len, y: sum.y / len, z: sum.z / len };
  });
}

function triangleArea(a: Point3D, b: Point3D, c: Point3D): number {
  const abx = b.x - a.x; const aby = b.y - a.y; const abz = b.z - a.z;
  const acx = c.x - a.x; const acy = c.y - a.y; const acz = c.z - a.z;
  const cx = aby * acz - abz * acy;
  const cy = abz * acx - abx * acz;
  const cz = abx * acy - aby * acx;
  return 0.5 * Math.hypot(cx, cy, cz);
}

export function surfaceArea(surface: Surface): number {
  try {
    const mesh = tessellateSurface(surface);
    return mesh.faces.reduce((sum, face) => (
      sum + triangleArea(mesh.vertices[face[0]!]!, mesh.vertices[face[1]!]!, mesh.vertices[face[2]!]!)
    ), 0);
  } catch {
    return 0;
  }
}
