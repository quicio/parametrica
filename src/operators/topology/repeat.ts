/**
 * operators/topology/repeat.ts — structure-multiplying operators:
 * duplicate · radial repeat · polar repeat · grid repeat · recursive repeat.
 */

import { Operators } from '../../core/registry.ts';
import { TYPE } from '../../core/schema.ts';
import { mapGeometryPoints } from '../../geometry/transformGeometry.ts';

type Rec = Record<string, unknown>;
interface Vec2 { x: number; y: number }
interface CurveLike extends Rec { points: Vec2[]; closed?: boolean; id?: string }

let id = 0;
const opId = (): string => `rp-${id++}`;

const SPATIAL_KINDS = ['curve2d', 'curve3d', 'surface', 'mesh'];
const transform = (item: CurveLike, fn: (point: Vec2) => Vec2): unknown =>
  mapGeometryPoints(item, fn, { id: opId() });

Operators.register(({
  id: 'duplicate',
  name: 'Duplicate',
  category: 'topology',
  space: 'world',
  accepts: SPATIAL_KINDS,
  produces: SPATIAL_KINDS,
  params: {
    count: { label: 'Copies', type: TYPE.NUMBER, min: 1, max: 24, step: 1, default: 3 },
    dx: { label: 'Δx / copy', type: TYPE.NUMBER, min: -300, max: 300, step: 1, default: 60 },
    dy: { label: 'Δy / copy', type: TYPE.NUMBER, min: -300, max: 300, step: 1, default: 0 },
    rotate: { label: 'Δangle / copy (°)', type: TYPE.NUMBER, min: -180, max: 180, step: 1, default: 0 },
    scale: { label: 'Δscale / copy', type: TYPE.NUMBER, min: 0.5, max: 1.5, step: 0.01, default: 1 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const out: unknown[] = [];
    const count = Number(p.count);
    const dxStep = Number(p.dx);
    const dyStep = Number(p.dy);
    const rotate = Number(p.rotate);
    const scale = Number(p.scale);
    for (let k = 0; k < count; k++) {
      const a = (rotate * k * Math.PI) / 180;
      const cos = Math.cos(a); const sin = Math.sin(a);
      const s = Math.pow(scale, k);
      for (const c of curves) {
        out.push(transform(c, (pt) => ({
          x: (pt.x * cos - pt.y * sin) * s + dxStep * k,
          y: (pt.x * sin + pt.y * cos) * s + dyStep * k,
        })));
      }
    }
    return out;
  },
}) as never);

const DEG = Math.PI / 180;

Operators.register(({
  id: 'radial-repeat',
  name: 'Radial Repeat (legacy)',
  category: 'topology',
  hidden: true,
  params: {
    count: { label: 'Copies', type: TYPE.NUMBER, min: 2, max: 48, step: 1, default: 6 },
    radius: { label: 'Orbit Radius', type: TYPE.NUMBER, min: 0, max: 600, step: 1, default: 0 },
    rotateCopies: { label: 'Rotate Copies', type: TYPE.BOOLEAN, default: true },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    return radialArray(curves, {
      count: Number(p.count),
      radius: Number(p.radius),
      rotateCopies: Boolean(p.rotateCopies),
      sweep: 360,
      startAngle: 0,
      cx: 0,
      cy: 0,
    });
  },
}) as never);

Operators.register(({
  id: 'radial-array',
  name: 'Radial Array',
  category: 'topology',
  space: 'world',
  accepts: SPATIAL_KINDS,
  produces: SPATIAL_KINDS,
  params: {
    count: { label: 'Copies', type: TYPE.NUMBER, min: 2, max: 48, step: 1, default: 8 },
    sweep: { label: 'Sweep (°)', type: TYPE.NUMBER, min: -720, max: 720, step: 1, default: 360,
             doc: 'Total angle covered by the copies. 360 distributes them evenly around a full turn.' },
    startAngle: { label: 'Start Angle (°)', type: TYPE.NUMBER, min: -360, max: 360, step: 1, default: 0 },
    radius: { label: 'Orbit Radius', type: TYPE.NUMBER, min: 0, max: 600, step: 1, default: 0 },
    cx: { label: 'Center X', type: TYPE.NUMBER, min: -500, max: 500, step: 1, default: 0 },
    cy: { label: 'Center Y', type: TYPE.NUMBER, min: -500, max: 500, step: 1, default: 0 },
    rotateCopies: { label: 'Rotate Copies', type: TYPE.BOOLEAN, default: true },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    return radialArray(curves, p);
  },
}) as never);

function radialArray(curves: CurveLike[], p: Rec): unknown[] {
  const count = Math.max(1, Math.round(Number(p.count)));
  const sweep = Number(p.sweep ?? 360);
  const full = Math.abs(sweep) >= 360 - 1e-9;
  const step = full ? sweep / count : sweep / Math.max(1, count - 1);
  const start = Number(p.startAngle ?? 0) * DEG;
  const radius = Number(p.radius) || 0;
  const cx = Number(p.cx) || 0;
  const cy = Number(p.cy) || 0;
  const rotateCopies = Boolean(p.rotateCopies);
  const out: unknown[] = [];
  for (let k = 0; k < count; k++) {
    const a = start + k * step * DEG;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const ox = cx + Math.cos(a) * radius;
    const oy = cy + Math.sin(a) * radius;
    for (const c of curves) {
      out.push(transform(c, (pt) => {
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        const x = rotateCopies ? dx * cos - dy * sin : dx;
        const y = rotateCopies ? dx * sin + dy * cos : dy;
        return { ...pt, x: ox + x, y: oy + y };
      }));
    }
  }
  return out;
}

Operators.register(({
  id: 'linear-array',
  name: 'Linear Array',
  category: 'topology',
  space: 'world',
  accepts: SPATIAL_KINDS,
  produces: SPATIAL_KINDS,
  params: {
    count: { label: 'Copies', type: TYPE.NUMBER, min: 1, max: 64, step: 1, default: 5 },
    spacing: { label: 'Spacing', type: TYPE.NUMBER, min: -400, max: 400, step: 1, default: 60 },
    angle: { label: 'Direction (°)', type: TYPE.NUMBER, min: -180, max: 180, step: 1, default: 0 },
    rotateStep: { label: 'Rotate / Copy (°)', type: TYPE.NUMBER, min: -180, max: 180, step: 0.1, default: 0 },
    scaleStep: { label: 'Scale / Copy', type: TYPE.NUMBER, min: 0.5, max: 1.5, step: 0.01, default: 1 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const count = Math.max(1, Math.round(Number(p.count)));
    const dir = Number(p.angle) * DEG;
    const dx = Math.cos(dir) * Number(p.spacing);
    const dy = Math.sin(dir) * Number(p.spacing);
    const center = (count - 1) / 2;
    const rotateStep = Number(p.rotateStep);
    const scaleStep = Number(p.scaleStep);
    const out: unknown[] = [];
    for (let k = 0; k < count; k++) {
      const offset = k - center;
      const a = rotateStep * DEG * k;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const s = Math.pow(scaleStep, k);
      for (const c of curves) {
        out.push(transform(c, (pt) => ({
          ...pt,
          x: (pt.x * cos - pt.y * sin) * s + dx * offset,
          y: (pt.x * sin + pt.y * cos) * s + dy * offset,
        })));
      }
    }
    return out;
  },
}) as never);

Operators.register(({
  id: 'polar-repeat',
  name: 'Polar Repeat (rings)',
  category: 'topology',
  space: 'world',
  accepts: SPATIAL_KINDS,
  produces: SPATIAL_KINDS,
  params: {
    rings: { label: 'Rings', type: TYPE.NUMBER, min: 1, max: 12, step: 1, default: 3 },
    ringScale: { label: 'Scale / Ring', type: TYPE.NUMBER, min: 0.3, max: 1.5, step: 0.01, default: 0.75 },
    rotate: { label: 'Rotate / Ring (°)', type: TYPE.NUMBER, min: -180, max: 180, step: 1, default: 15 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const out: unknown[] = [];
    const rings = Number(p.rings);
    const ringScale = Number(p.ringScale);
    const rotate = Number(p.rotate);
    for (let ring = 0; ring < rings; ring++) {
      const s = Math.pow(ringScale, ring);
      const a = (rotate * ring * Math.PI) / 180;
      const cos = Math.cos(a); const sin = Math.sin(a);
      for (const c of curves) {
        out.push(transform(c, (pt) => ({
          x: (pt.x * cos - pt.y * sin) * s,
          y: (pt.x * sin + pt.y * cos) * s,
        })));
      }
    }
    return out;
  },
}) as never);

Operators.register(({
  id: 'grid-repeat',
  name: 'Grid Repeat',
  category: 'topology',
  space: 'world',
  accepts: SPATIAL_KINDS,
  produces: SPATIAL_KINDS,
  params: {
    cols: { label: 'Columns', type: TYPE.NUMBER, min: 1, max: 12, step: 1, default: 3 },
    rows: { label: 'Rows', type: TYPE.NUMBER, min: 1, max: 12, step: 1, default: 1 },
    dx: { label: 'Cell Width', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 260 },
    dy: { label: 'Cell Height', type: TYPE.NUMBER, min: 20, max: 800, step: 1, default: 260 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const out: unknown[] = [];
    const cols = Number(p.cols);
    const rows = Number(p.rows);
    const dx = Number(p.dx);
    const dy = Number(p.dy);
    const ox = ((cols - 1) * dx) / 2;
    const oy = ((rows - 1) * dy) / 2;
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const tx = q * dx - ox;
        const ty = r * dy - oy;
        for (const c of curves) {
          out.push(transform(c, (pt) => ({ ...pt, x: pt.x + tx, y: pt.y + ty })));
        }
      }
    }
    return out;
  },
}) as never);

Operators.register(({
  id: 'recursive-repeat',
  name: 'Recursive Repeat',
  category: 'topology',
  space: 'world',
  accepts: SPATIAL_KINDS,
  produces: SPATIAL_KINDS,
  params: {
    depth: { label: 'Depth', type: TYPE.NUMBER, min: 1, max: 8, step: 1, default: 3 },
    scale: { label: 'Scale / Level', type: TYPE.NUMBER, min: 0.2, max: 0.95, step: 0.01, default: 0.6 },
    rotate: { label: 'Rotate / Level (°)', type: TYPE.NUMBER, min: -180, max: 180, step: 1, default: 20 },
    dx: { label: 'Δx / Level', type: TYPE.NUMBER, min: -200, max: 200, step: 1, default: 0 },
    dy: { label: 'Δy / Level', type: TYPE.NUMBER, min: -200, max: 200, step: 1, default: -60 },
  },
  apply(curves: CurveLike[], p: Rec): unknown[] {
    const depth = Number(p.depth);
    const dx = Number(p.dx);
    const dy = Number(p.dy);
    const rotate = Number(p.rotate);
    const scale = Number(p.scale);
    let level: unknown[] = curves.map((c) => ({ ...c, id: opId() }));
    const out: unknown[] = [...level];
    let tx = 0; let ty = 0; let angle = 0; let s = 1;
    for (let d = 1; d < depth; d++) {
      tx += dx; ty += dy;
      angle += (rotate * Math.PI) / 180;
      s *= scale;
      const cos = Math.cos(angle); const sin = Math.sin(angle);
      const cx = tx; const cy = ty; const cs = cos; const sn = sin; const sc = s;
      level = curves.map((c) => transform(c, (pt) => ({
        x: (pt.x * cs - pt.y * sn) * sc + cx,
        y: (pt.x * sn + pt.y * cs) * sc + cy,
      })));
      out.push(...level);
    }
    return out;
  },
}) as never);
