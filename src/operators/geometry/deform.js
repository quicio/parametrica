/**
 * operators/geometry/deform.js — twist · bend · warp · noise displace.
 */

import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { bboxAll } from '../../sampling/sampling.js';
import { compileExpression } from '../../math/expression.js';
import { createNoise2D } from '../../math/noise.js';
import { analyzeCurve } from '../../analysis/differential.js';

let id = 0;
const opId = () => `df-${id++}`;
const DEG = Math.PI / 180;

Operators.register({
  id: 'twist',
  name: 'Twist',
  category: 'geometry',
  params: {
    angle: { label: 'Angle (°)', type: TYPE.NUMBER, min: -720, max: 720, step: 1, default: 90 },
  },
  apply(curves, p) {
    const box = bboxAll(curves);
    const half = Math.max(1e-6, box.height / 2);
    return curves.map((c) => ({
      ...c,
      id: opId(),
      points: c.points.map((pt) => {
        const a = p.angle * DEG * ((pt.y - box.cy) / half);
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const dx = pt.x - box.cx;
        const dy = pt.y - box.cy;
        return { ...pt, x: box.cx + dx * cos - dy * sin, y: box.cy + dx * sin + dy * cos };
      }),
    }));
  },
});

Operators.register({
  id: 'bend',
  name: 'Bend',
  category: 'geometry',
  params: {
    angle: { label: 'Angle (°)', type: TYPE.NUMBER, min: -170, max: 170, step: 1, default: 60 },
  },
  apply(curves, p) {
    const box = bboxAll(curves);
    const arc = Math.max(1e-3, Math.abs(p.angle) * DEG);
    const R = Math.max(box.width, 1e-3) / arc;
    const sign = Math.sign(p.angle) || 1;
    return curves.map((c) => ({
      ...c,
      id: opId(),
      points: c.points.map((pt) => {
        const u = (pt.x - box.cx) / R;
        return {
          x: box.cx + sign * R * Math.sin(u),
          y: pt.y + sign * R * (1 - Math.cos(u)) * 0.5,
        };
      }),
    }));
  },
});

const WARP_WAVELENGTH = 60;
const WARP_INTERFERENCE_WAVELENGTH = 45;

function compactNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return String(Number(n.toFixed(4)));
}

function phaseSuffix(radians) {
  const n = Number(radians);
  if (!Number.isFinite(n) || Math.abs(n) < 1e-9) return '';
  return n > 0 ? ` + ${compactNumber(n)}` : ` - ${compactNumber(-n)}`;
}

function axisWave(axis, frequency) {
  const f = Number(frequency);
  if (!Number.isFinite(f) || Math.abs(f - 1) < 1e-9) return `${axis}/${WARP_WAVELENGTH}`;
  return `${axis}*${compactNumber(f)}/${WARP_WAVELENGTH}`;
}

/**
 * Derive the two warp expressions from the visual controls.
 *
 *   x' = x + Ax·sin(y·Fx/60 + φ) + I·sin((x+y)/45 + 1.5φ)
 *   y' = y + Ay·cos(x·Fy/60 + φ) + I·cos((x−y)/45 − 1.5φ)
 */
export function warpExpressions(p = {}) {
  const ampX = Number(p.ampX ?? 40);
  const ampY = Number(p.ampY ?? 0);
  const freqX = Number(p.freqX ?? 1);
  const freqY = Number(p.freqY ?? 1);
  const interference = Number(p.interference ?? 0);
  const phase = ((Number(p.phase ?? 0) || 0) * Math.PI) / 180;

  const xTerms = [];
  const yTerms = [];
  if (Number.isFinite(ampX) && Math.abs(ampX) > 1e-9) {
    xTerms.push(`${compactNumber(ampX)}*sin(${axisWave('y', freqX)}${phaseSuffix(phase)})`);
  }
  if (Number.isFinite(interference) && interference > 1e-9) {
    xTerms.push(`${compactNumber(interference)}*sin((x+y)/${WARP_INTERFERENCE_WAVELENGTH}${phaseSuffix(phase * 1.5)})`);
  }
  if (Number.isFinite(ampY) && Math.abs(ampY) > 1e-9) {
    yTerms.push(`${compactNumber(ampY)}*cos(${axisWave('x', freqY)}${phaseSuffix(phase)})`);
  }
  if (Number.isFinite(interference) && interference > 1e-9) {
    yTerms.push(`${compactNumber(interference)}*cos((x-y)/${WARP_INTERFERENCE_WAVELENGTH}${phaseSuffix(-phase * 1.5)})`);
  }

  return {
    x: ['x', ...xTerms].join(' + '),
    y: ['y', ...yTerms].join(' + '),
  };
}

Operators.register({
  id: 'warp',
  name: 'Warp (expression)',
  category: 'geometry',
  params: {
    mode: {
      label: 'Mode', type: TYPE.SELECT, options: ['auto', 'manual'], default: 'auto',
      doc: 'Auto derives the equations from the controls. Manual uses the expression fields; editing an expression switches to Manual.',
    },
    ampX: { label: 'Amplitude X', type: TYPE.NUMBER, min: 0, max: 120, step: 1, default: 40,
            doc: 'Horizontal deformation strength.' },
    ampY: { label: 'Amplitude Y', type: TYPE.NUMBER, min: 0, max: 120, step: 1, default: 0,
            doc: 'Vertical deformation strength.' },
    freqX: { label: 'Frequency X', type: TYPE.NUMBER, min: 0.1, max: 8, step: 0.05, default: 1,
             doc: 'Horizontal ripple frequency (1 = base wavelength 60).' },
    freqY: { label: 'Frequency Y', type: TYPE.NUMBER, min: 0.1, max: 8, step: 0.05, default: 1,
             doc: 'Vertical ripple frequency (1 = base wavelength 60).' },
    interference: { label: 'Interference', type: TYPE.NUMBER, min: 0, max: 100, step: 1, default: 0,
                    doc: 'Strength of the secondary cross-waves.' },
    phase: { label: 'Phase (°)', type: TYPE.NUMBER, min: 0, max: 360, step: 1, default: 0,
             doc: 'Phase offset applied to both generated waves.' },
    exprX: { label: "x'(x,y)", type: TYPE.EXPRESSION, default: 'x + 40*sin(y/60)' },
    exprY: { label: "y'(x,y)", type: TYPE.EXPRESSION, default: 'y' },
  },
  /** Displayed equations follow the controls while Mode = auto. */
  previewParams(p) {
    if (p?.mode === 'manual') return null;
    const generated = warpExpressions(p);
    return { exprX: generated.x, exprY: generated.y };
  },
  /** When switching to manual, start from the last generated equations. */
  syncParams(stage, key) {
    if (key === 'mode' && stage?.params?.mode === 'manual') {
      const generated = warpExpressions(stage.params);
      stage.params.exprX = generated.x;
      stage.params.exprY = generated.y;
    }
  },
  /** Editing an equation is a manual override. */
  onExpressionChange(stage) {
    if (!stage?.params || stage.params.mode === 'manual') return;
    const generated = warpExpressions(stage.params);
    stage.params.exprX = generated.x;
    stage.params.exprY = generated.y;
    stage.params.mode = 'manual';
  },
  /** Old documents have no mode: preserve their hand-written equations. */
  migrateParams(params, raw) {
    if (!raw || typeof raw !== 'object' || !Object.prototype.hasOwnProperty.call(raw, 'mode')) {
      params.mode = 'manual';
    }
  },
  apply(curves, p, ctx) {
    const generated = p.mode === 'manual' ? null : warpExpressions(p);
    const fx = compileExpression(p.mode === 'manual' ? p.exprX : generated.x);
    const fy = compileExpression(p.mode === 'manual' ? p.exprY : generated.y);
    if (!fx.ok) {
      const e = new Error(`warp x': ${fx.error.message}`);
      e.key = 'exprX';
      e.span = fx.error;
      throw e;
    }
    if (!fy.ok) {
      const e = new Error(`warp y': ${fy.error.message}`);
      e.key = 'exprY';
      e.span = fy.error;
      throw e;
    }
    const scope = Object.assign(Object.create(null), ctx.scope, { time: ctx.time ?? 0 });
    return curves.map((c) => ({
      ...c,
      id: opId(),
      points: c.points.map((pt, i) => {
        scope.x = pt.x;
        scope.y = pt.y;
        scope.i = i;
        scope.n = c.points.length;
        const x = fx.fn(scope);
        const y = fy.fn(scope);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return pt;
        return { x, y };
      }),
    }));
  },
});

Operators.register({
  id: 'expression-displace',
  name: 'Displace (expression)',
  category: 'geometry',
  params: {
    exprX: {
      label: 'dx(x,y)', type: TYPE.EXPRESSION, default: '30*sin(y/40)',
      doc: 'Horizontal displacement. Uses x, y, i, n and time.',
    },
    exprY: {
      label: 'dy(x,y)', type: TYPE.EXPRESSION, default: '30*cos(x/40)',
      doc: 'Vertical displacement. Uses x, y, i, n and time.',
    },
  },
  apply(curves, p, ctx) {
    const dx = compileExpression(p.exprX);
    const dy = compileExpression(p.exprY);
    if (!dx.ok) {
      const e = new Error(`displace dx: ${dx.error.message}`);
      e.key = 'exprX';
      e.span = dx.error;
      throw e;
    }
    if (!dy.ok) {
      const e = new Error(`displace dy: ${dy.error.message}`);
      e.key = 'exprY';
      e.span = dy.error;
      throw e;
    }
    const scope = Object.assign(Object.create(null), ctx.scope, { time: ctx.time ?? 0 });
    return curves.map((c) => ({
      ...c,
      id: opId(),
      points: c.points.map((pt, i) => {
        scope.x = pt.x;
        scope.y = pt.y;
        scope.i = i;
        scope.n = c.points.length;
        const ox = dx.fn(scope);
        const oy = dy.fn(scope);
        if (!Number.isFinite(ox) || !Number.isFinite(oy)) return pt;
        return { ...pt, x: pt.x + ox, y: pt.y + oy };
      }),
    }));
  },
});

Operators.register({
  id: 'noise-displace',
  name: 'Noise Displace',
  category: 'geometry',
  params: {
    amplitude: { label: 'Amplitude', type: TYPE.NUMBER, min: 0, max: 120, step: 0.5, default: 14 },
    scale: { label: 'Scale', type: TYPE.NUMBER, min: 0.001, max: 0.1, step: 0.001, default: 0.012 },
    seed: { label: 'Seed', type: TYPE.NUMBER, min: 1, max: 9999, step: 1, default: 1 },
  },
  apply(curves, p, ctx) {
    const noise = createNoise2D((p.seed + (ctx.seed ?? 0)) >>> 0);
    return curves.map((c) => {
      const { normals } = analyzeCurve(c.points, c.closed);
      return {
        ...c,
        id: opId(),
        points: c.points.map((pt, i) => {
          const nrm = normals[i] ?? { x: 0, y: 1 };
          const d = noise(pt.x * p.scale, pt.y * p.scale) * p.amplitude;
          return { ...pt, x: pt.x + nrm.x * d, y: pt.y + nrm.y * d };
        }),
      };
    });
  },
});
