/**
 * presets/builtins.js — the mathematical preset library (spec §14).
 *
 * Each preset is a complete GlyphDocument: equations + parameters +
 * operator stack. They are families to explore, not logos to admire.
 */

import { createDocument } from '../core/document.js';

const PI = Math.PI;

export const BUILT_IN_PRESETS = {
  'Lissajous 3:5': () =>
    createDocument('lissajous', {
      name: 'Lissajous 3:5',
      generator: { params: { a: 3, b: 5, delta: PI / 2, size: 340 } },
    }),

  'Golden Rose': () =>
    createDocument('polar', {
      name: 'Golden Rose',
      generator: {
        params: {
          exprR: 'cos(phi*theta)',
          turns: 8, samples: 2400, closed: false, fit: 360,
        },
      },
    }),

  Infinity: () =>
    createDocument('parametric', {
      name: 'Infinity',
      generator: {
        params: {
          exprX: 'cos(t) / (1 + sin(t)^2)',
          exprY: 'sin(t)*cos(t) / (1 + sin(t)^2)',
          t0: 0, t1: 2 * PI, fit: 380,
        },
      },
    }),

  Spirograph: () =>
    createDocument('spirograph', {
      name: 'Spirograph',
      generator: { params: {} },
    }),

  Butterfly: () =>
    createDocument('parametric', {
      name: 'Butterfly',
      generator: {
        params: {
          exprX: 'sin(t) * (e^cos(t) - 2*cos(4*t) - sin(t/12)^5)',
          exprY: 'cos(t) * (e^cos(t) - 2*cos(4*t) - sin(t/12)^5)',
          t0: 0, t1: 37.7, samples: 2400, closed: false, fit: 380,
        },
      },
    }),

  'Superformula Star': () =>
    createDocument('superformula', {
      name: 'Superformula Star',
      generator: { params: { m: 5, n1: 0.35, n2: 1.6, n3: 1.6, radius: 300 } },
      operators: [
        { id: 'polar-repeat', enabled: true, params: { rings: 3, ringScale: 0.62, rotate: 36 }, mods: {} },
      ],
    }),

  'Superformula Flower': () =>
    createDocument('superformula', {
      name: 'Superformula Flower',
      generator: { params: { m: 8, n1: 0.7, n2: 1.2, n3: 1.2, radius: 300 } },
    }),

  Hypotrochoid: () =>
    createDocument('hypotrochoid', {
      name: 'Hypotrochoid',
      generator: { params: { R: 210, r: 63, d: 130 } },
    }),

  'Fourier Capsule': () =>
    createDocument('fourier', {
      name: 'Fourier Capsule',
      generator: {
        params: {
          harmonicsX: [
            { freq: 1, amp: 1, phase: 0, rot: 0, ox: 0, oy: 0 },
            { freq: 3, amp: 0.22, phase: 0, rot: 0, ox: 0, oy: 0 },
          ],
          harmonicsY: [
            { freq: 1, amp: 0.55, phase: 0, rot: PI / 2, ox: 0, oy: 0 },
          ],
        },
      },
    }),

  'Fourier Butterfly': () =>
    createDocument('fourier', {
      name: 'Fourier Butterfly',
      generator: {
        params: {
          harmonicsX: [
            { freq: 1, amp: 1, phase: 0, rot: 0, ox: 0, oy: 0 },
            { freq: 6, amp: 0.3, phase: 0.5, rot: 0, ox: 0, oy: 0 },
            { freq: 11, amp: 0.12, phase: 2, rot: 0, ox: 0, oy: 0 },
          ],
          harmonicsY: [
            { freq: 2, amp: 0.9, phase: 1.2, rot: PI / 2, ox: 0, oy: 0 },
            { freq: 7, amp: 0.22, phase: 2.8, rot: PI / 2, ox: 0, oy: 0 },
          ],
        },
      },
    }),

  'Vesica Prime (v1)': () =>
    createDocument('bilateral-spline', {
      name: 'Vesica Prime (v1)',
      generator: { params: {} },
    }),

  // ——— Multi-curve families ———

  'Vesica Piscis': () =>
    createDocument('concentric-ellipses', {
      name: 'Vesica Piscis',
      generator: { params: { count: 2, rx: 100, ry: 200, offset: 100, spread: 'pair', samples: 400 } },
    }),

  'Three Ellipses': () =>
    createDocument('concentric-ellipses', {
      name: 'Three Ellipses',
      generator: { params: { count: 3, rx: 120, ry: 240, offset: 100, spread: 'pair', samples: 400 } },
    }),

  // ——— Strange attractors ———

  'Lorenz Butterfly': () =>
    createDocument('lorenz', {
      name: 'Lorenz Butterfly',
      generator: { params: { samples: 6000, skip: 2000, projection: 'xy' } },
    }),

  'Clifford Web': () =>
    createDocument('clifford', {
      name: 'Clifford Web',
      generator: { params: { samples: 8000, skip: 1000, a: 1.5, b: -1.8, c: 1.6, d: 0.9 } },
    }),

  'De Jong Filament': () =>
    createDocument('dejong', {
      name: 'De Jong Filament',
      generator: { params: { samples: 8000, skip: 1000, a: -2.0, b: -2.0, c: 1.2, d: 0.2 } },
    }),

  'Aizawa Torus': () =>
    createDocument('aizawa', {
      name: 'Aizawa Torus',
      generator: { params: { samples: 8000, skip: 2000 } },
    }),

  // ——— 3D projected ———

  'Helix (Isometric)': () =>
    createDocument('parametric-3d', {
      name: 'Helix (Isometric)',
      generator: {
        params: {
          exprX: '60*cos(t)',
          exprY: '60*sin(t)',
          exprZ: '20*t',
          t0: 0, t1: 6 * Math.PI,
          samples: 1200,
        },
      },
    }),

  'Spiral Helix': () =>
    createDocument('parametric-3d', {
      name: 'Spiral Helix',
      generator: {
        params: {
          exprX: '60*cos(t)',
          exprY: '60*sin(t)',
          exprZ: '12*t + 30*sin(t*0.5)',
          t0: 0, t1: 8 * Math.PI,
          samples: 1500,
        },
      },
    }),

  'Cone (Projected)': () =>
    createDocument('parametric-3d', {
      name: 'Cone (Projected)',
      generator: {
        params: {
          exprX: '(100 - 15*t) * cos(t * 5)',
          exprY: '(100 - 15*t) * sin(t * 5)',
          exprZ: '20*t',
          t0: 0, t1: 6,
          samples: 600,
        },
      },
    }),
};
