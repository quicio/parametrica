/**
 * geometry/wireframe.ts — deterministic iso-line curves for a surface mesh.
 *
 * The mesh may be world-space or already projected; this function only reads
 * vertex x/y plus grid/topology metadata. Keeping it outside the engine lets
 * the render scene builder derive the same wireframe after a shared frame is
 * applied.
 */

type Rec = Record<string, unknown>;
interface Point2D { x: number; y: number }
interface Vertex2D { x: number; y: number }
interface WireMesh {
  id?: string;
  vertices?: Vertex2D[];
  meta?: Rec;
}
export interface WireframeCurve {
  id: string;
  points: Point2D[];
  closed: boolean;
  meta: Rec;
}

export function meshWireframeCurves(meshes: unknown[] | null | undefined): WireframeCurve[] {
  const curves: WireframeCurve[] = [];
  for (const raw of meshes ?? []) {
    const mesh = raw as WireMesh | null | undefined;
    if (!mesh) continue;
    const rows = mesh.meta?.gridRows as number | undefined;
    const cols = mesh.meta?.gridCols as number | undefined;
    if (!rows || !cols) continue;
    const meshId = mesh.id ?? 'mesh';
    const closedU = Boolean(mesh.meta?.closedU);
    const closedV = Boolean(mesh.meta?.closedV);
    const twistU = Boolean(mesh.meta?.twistU);
    const twistV = Boolean(mesh.meta?.twistV);
    const vertices = mesh.vertices ?? [];
    const point = (u: number, v: number): Point2D | null => {
      const p = vertices[u * cols + v];
      return p ? { x: p.x, y: p.y } : null;
    };
    const push = (id: string, points: Point2D[], closed: boolean, axis: 'u' | 'v'): void => {
      if (points.length >= 2) {
        curves.push({
          id,
          points,
          closed,
          meta: { source: 'surface-wireframe', meshId, axis },
        });
      }
    };
    // A row or column can cross the camera plane. Keep each visible run as
    // its own open polyline instead of drawing a chord across the gap.
    const pushRuns = (id: string, rawPoints: Array<Point2D | null>, closed: boolean, axis: 'u' | 'v'): void => {
      let run: Point2D[] = [];
      let runIndex = 0;
      let broken = false;
      const flush = (): void => {
        if (run.length >= 2) {
          const suffix = runIndex ? `-p${runIndex}` : '';
          push(`${id}${suffix}`, run, closed && !broken, axis);
          runIndex++;
        }
        run = [];
      };
      for (const p of rawPoints) {
        if (p) {
          run.push(p);
          continue;
        }
        broken = true;
        flush();
      }
      flush();
    };

    // U-direction curves: fixed v, varying u.
    if (twistU && closedU) {
      for (let v = 0; v < cols; v++) {
        const mirror = cols - 1 - v;
        if (mirror < v) continue;
        const points: Array<Point2D | null> = [];
        for (let u = 0; u < rows; u++) points.push(point(u, v));
        if (mirror !== v) {
          for (let u = 0; u < rows; u++) points.push(point(u, mirror));
        }
        pushRuns(`${meshId}-u-${v}`, points, true, 'u');
      }
    } else {
      for (let v = 0; v < cols; v++) {
        const points: Array<Point2D | null> = [];
        for (let u = 0; u < rows; u++) points.push(point(u, v));
        pushRuns(`${meshId}-col-${v}`, points, closedU, 'u');
      }
    }

    // V-direction curves: fixed u, varying v.
    if (twistV && closedV) {
      for (let u = 0; u < rows; u++) {
        const mirror = rows - 1 - u;
        if (mirror < u) continue;
        const points: Array<Point2D | null> = [];
        for (let v = 0; v < cols; v++) points.push(point(u, v));
        if (mirror !== u) {
          for (let v = 0; v < cols; v++) points.push(point(mirror, v));
        }
        pushRuns(`${meshId}-v-${u}`, points, true, 'v');
      }
    } else {
      for (let u = 0; u < rows; u++) {
        const points: Array<Point2D | null> = [];
        for (let v = 0; v < cols; v++) points.push(point(u, v));
        pushRuns(`${meshId}-row-${u}`, points, closedV, 'v');
      }
    }
  }
  return curves;
}
