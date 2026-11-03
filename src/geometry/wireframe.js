/**
 * geometry/wireframe.js — deterministic iso-line curves for a surface mesh.
 *
 * The mesh may be world-space or already projected; this function only reads
 * vertex x/y plus grid/topology metadata. Keeping it outside the engine lets
 * the render scene builder derive the same wireframe after a shared frame is
 * applied.
 */

export function meshWireframeCurves(meshes) {
  const curves = [];
  for (const mesh of meshes ?? []) {
    const rows = mesh.meta?.gridRows;
    const cols = mesh.meta?.gridCols;
    if (!rows || !cols) continue;
    const closedU = Boolean(mesh.meta?.closedU);
    const closedV = Boolean(mesh.meta?.closedV);
    const twistU = Boolean(mesh.meta?.twistU);
    const twistV = Boolean(mesh.meta?.twistV);
    const point = (u, v) => {
      const p = mesh.vertices[u * cols + v];
      return p ? { x: p.x, y: p.y } : null;
    };
    const push = (id, points, closed, axis) => {
      if (points.length >= 2) {
        curves.push({
          id,
          points,
          closed,
          meta: { source: 'surface-wireframe', meshId: mesh.id, axis },
        });
      }
    };
    // A row or column can cross the camera plane. Keep each visible run as
    // its own open polyline instead of drawing a chord across the gap.
    const pushRuns = (id, rawPoints, closed, axis) => {
      let run = [];
      let runIndex = 0;
      let broken = false;
      const flush = () => {
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
        const points = [];
        for (let u = 0; u < rows; u++) points.push(point(u, v));
        if (mirror !== v) {
          for (let u = 0; u < rows; u++) points.push(point(u, mirror));
        }
        pushRuns(`${mesh.id}-u-${v}`, points, true, 'u');
      }
    } else {
      for (let v = 0; v < cols; v++) {
        const points = [];
        for (let u = 0; u < rows; u++) points.push(point(u, v));
        pushRuns(`${mesh.id}-col-${v}`, points, closedU, 'u');
      }
    }

    // V-direction curves: fixed u, varying v.
    if (twistV && closedV) {
      for (let u = 0; u < rows; u++) {
        const mirror = rows - 1 - u;
        if (mirror < u) continue;
        const points = [];
        for (let v = 0; v < cols; v++) points.push(point(u, v));
        if (mirror !== u) {
          for (let v = 0; v < cols; v++) points.push(point(mirror, v));
        }
        pushRuns(`${mesh.id}-v-${u}`, points, true, 'v');
      }
    } else {
      for (let u = 0; u < rows; u++) {
        const points = [];
        for (let v = 0; v < cols; v++) points.push(point(u, v));
        pushRuns(`${mesh.id}-row-${u}`, points, closedV, 'v');
      }
    }
  }
  return curves;
}
