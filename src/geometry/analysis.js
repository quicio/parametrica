/**
 * geometry/analysis.js — world-space analysis for geometry contracts.
 */

import { isCurve2D, isCurve3D, isSurface } from './contracts.js';
import { surfaceArea } from './surfaceTessellation.js';
import { analyzeCurve } from '../analysis/differential.js';

export function analyzeCurve3D(points, closed = false) {
  const n = points.length;
  const at = (i) => points[closed ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i))];
  let arcLength = 0;
  for (let i = 1; i < n; i++) {
    arcLength += distance3(points[i - 1], points[i]);
  }
  if (closed && n > 2) arcLength += distance3(points[n - 1], points[0]);

  const curvature = new Float64Array(n);
  const torsion = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) continue;
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const v1 = sub3(p2, p0);
    const v2 = add3(sub3(p2, scale3(p1, 2)), p0);
    const cross = cross3(v1, v2);
    const speed = length3(v1) || 1e-9;
    curvature[i] = length3(cross) / (speed ** 3);
    const p3 = at(i + 2);
    const p_1 = at(i - 2);
    if (!closed && (i < 2 || i >= n - 2)) continue;
    const v3 = add3(
      sub3(scale3(p3, 2), scale3(p2, 2)),
      add3(scale3(p1, 2), scale3(p_1, -2)),
    );
    const crossLen = length3(cross);
    torsion[i] = crossLen < 1e-9 ? 0 : dot3(cross, v3) / (crossLen * crossLen);
  }

  const box = bbox3(points);
  return {
    kind: 'analysis3d',
    arcLength,
    bbox: box,
    curvature,
    torsion,
    closed: Boolean(closed),
  };
}

export function analyzeGeometry(geometry) {
  return geometry.map((item) => {
    if (isCurve3D(item)) return analyzeCurve3D(item.points, item.closed);
    if (isCurve2D(item)) return { ...analyzeCurve(item.points, item.closed), kind: 'analysis2d' };
    if (isSurface(item)) {
      const points = item.grid.points.flat();
      return {
        kind: 'analysis-surface',
        area: surfaceArea(item),
        bbox: bbox3(points),
        closedU: Boolean(item.domain?.closedU),
        closedV: Boolean(item.domain?.closedV),
        rows: item.grid.rows,
        cols: item.grid.cols,
      };
    }
    return { kind: 'unsupported', geometryKind: item.kind };
  });
}

export function bbox3(points) {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (p.z > maxZ) maxZ = p.z;
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, width: 0, height: 0, depth: 0, diagonal: 0, cx: 0, cy: 0, cz: 0 };
  }
  return {
    minX, minY, minZ, maxX, maxY, maxZ,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
    diagonal: Math.hypot(maxX - minX, maxY - minY, maxZ - minZ),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    cz: (minZ + maxZ) / 2,
  };
}

function distance3(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function sub3(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function add3(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function scale3(a, s) { return { x: a.x * s, y: a.y * s, z: a.z * s }; }
function dot3(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function length3(a) { return Math.hypot(a.x, a.y, a.z); }
function cross3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
