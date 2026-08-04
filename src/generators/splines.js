/**
 * splines.js — spline-family generators: Catmull-Rom, Bézier, cubic spline.
 *
 * Control polygons are PROCEDURAL (golden-ratio node placement + seeded
 * radial wobble) — never hand-edited. The spline mathematics lives in
 * math/curves.js.
 */

import { Generators } from '../core/registry.js';
import { TYPE } from '../core/schema.js';
import { catmullRomToBezier, bezierToPoints, cubicSplinePoints } from '../math/curves.js';
import { createNoise1D } from '../math/noise.js';
import { genId, TAU } from './helpers.js';

/** Procedural control polygon: n nodes, golden-angle option, seeded radial wobble. */
function proceduralNodes({ count, radius, wobble, seed, golden, phase = 0 }) {
  const noise = createNoise1D(seed);
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const angle = phase + (golden ? i * Math.PI * (3 - Math.sqrt(5)) : (i / count) * TAU);
    const r = radius * (1 + wobble * noise(i * 0.7));
    nodes.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  return nodes;
}

Generators.register({
  id: 'catmull-rom',
  name: 'Catmull-Rom Spline',
  category: 'spline',
  params: {
    points: { label: 'Control Points', type: TYPE.NUMBER, min: 3, max: 32, step: 1, default: 7 },
    radius: { label: 'Radius', type: TYPE.NUMBER, min: 40, max: 600, step: 1, default: 250 },
    wobble: { label: 'Radial Wobble', type: TYPE.NUMBER, min: 0, max: 0.9, step: 0.01, default: 0.35 },
    tension: { label: 'Tension', type: TYPE.NUMBER, min: 0, max: 0.9, step: 0.01, default: 0.25 },
    seed: { label: 'Seed', type: TYPE.NUMBER, min: 1, max: 9999, step: 1, default: 3 },
    closed: { label: 'Closed', type: TYPE.BOOLEAN, default: true },
    samplesPer: { label: 'Samples / Segment', type: TYPE.NUMBER, min: 4, max: 64, step: 1, default: 24 },
  },
  domain: (p) => ({ t0: 0, t1: 1, closed: p.closed }),
  sample(p) {
    const nodes = proceduralNodes({ count: p.points, radius: p.radius, wobble: p.wobble, seed: p.seed, golden: false });
    const segments = catmullRomToBezier(nodes, { tension: p.tension, closed: p.closed });
    const points = bezierToPoints(segments, p.samplesPer, { dropLast: p.closed });
    return [{
      id: genId('cr'), points, closed: p.closed,
      meta: { source: 'catmull-rom', controlPoints: nodes },
    }];
  },
});

Generators.register({
  id: 'bezier',
  name: 'Bézier Chain',
  category: 'spline',
  params: {
    nodes: { label: 'Nodes', type: TYPE.NUMBER, min: 2, max: 24, step: 1, default: 6 },
    radius: { label: 'Radius', type: TYPE.NUMBER, min: 40, max: 600, step: 1, default: 240 },
    spread: { label: 'Spread', type: TYPE.NUMBER, min: 0, max: 0.9, step: 0.01, default: 0.4 },
    curl: { label: 'Curl (handle length)', type: TYPE.NUMBER, min: 0.05, max: 1, step: 0.01, default: 0.55 },
    seed: { label: 'Seed', type: TYPE.NUMBER, min: 1, max: 9999, step: 1, default: 5 },
    closed: { label: 'Closed', type: TYPE.BOOLEAN, default: false },
    samplesPer: { label: 'Samples / Segment', type: TYPE.NUMBER, min: 4, max: 64, step: 1, default: 28 },
  },
  domain: (p) => ({ t0: 0, t1: 1, closed: p.closed }),
  sample(p) {
    // golden-angle spiral node placement — an open, exploratory polygon
    const nodes = proceduralNodes({ count: p.nodes, radius: p.radius, wobble: p.spread, seed: p.seed, golden: true });
    const segments = catmullRomToBezier(nodes, { tension: 1 - p.curl, closed: p.closed });
    const points = bezierToPoints(segments, p.samplesPer, { dropLast: p.closed });
    return [{
      id: genId('bezier'), points, closed: p.closed,
      meta: { source: 'bezier', controlPoints: nodes },
    }];
  },
});

Generators.register({
  id: 'cubic-spline',
  name: 'Cubic Spline',
  category: 'spline',
  params: {
    nodes: { label: 'Nodes', type: TYPE.NUMBER, min: 3, max: 32, step: 1, default: 8 },
    radius: { label: 'Radius', type: TYPE.NUMBER, min: 40, max: 600, step: 1, default: 240 },
    wobble: { label: 'Radial Wobble', type: TYPE.NUMBER, min: 0, max: 0.9, step: 0.01, default: 0.4 },
    seed: { label: 'Seed', type: TYPE.NUMBER, min: 1, max: 9999, step: 1, default: 11 },
    closed: { label: 'Closed', type: TYPE.BOOLEAN, default: true },
    samplesPer: { label: 'Samples / Segment', type: TYPE.NUMBER, min: 4, max: 64, step: 1, default: 24 },
  },
  domain: (p) => ({ t0: 0, t1: 1, closed: p.closed }),
  sample(p) {
    const nodes = proceduralNodes({ count: p.nodes, radius: p.radius, wobble: p.wobble, seed: p.seed, golden: false });
    const points = cubicSplinePoints(nodes, { closed: p.closed, perSegment: p.samplesPer });
    return [{
      id: genId('cs'), points, closed: p.closed,
      meta: { source: 'cubic-spline', controlPoints: nodes },
    }];
  },
});
