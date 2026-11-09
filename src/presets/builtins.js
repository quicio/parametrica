/**
 * presets/builtins.js — the mathematical preset library (spec §14).
 *
 * Each preset is a complete GlyphDocument: equations + parameters +
 * operator stack. They are families to explore, not logos to admire.
 */

import { createDocument, createLayer, createInstanceLayer } from '../core/document.js';

const PI = Math.PI;

const FABRICATE_UNITS = Object.freeze({
  world: 'mm',
  mmPerWorldUnit: 10,
  artboard: 'unitless',
  mmPerArtboardUnit: null,
});

const FABRICATE_DEFAULTS = Object.freeze({
  format: '3mf',
  quality: 'standard',
  scope: 'single',
  boolean: 'none',
  csgStrategy: 'manifold',
  weld: false,
  cap: false,
  tolerance: 1e-4,
  maxHoleEdges: 256,
  repair: false,
  capStrategy: 'auto',
  topology: 'none',
  nonOrientable: 'cut',
  selfIntersections: 'none',
  remeshResolution: 64,
  lattice: false,
  latticeMode: 'struts',
  latticeCellSize: 20,
  latticeStrut: 3.5,
  latticeWall: 2.5,
  latticeFloor: 3,
  latticeRim: 4,
  latticeSeed: 7,
  latticePreview: 'solid',
  finishQuality: 'standard',
  jointStyle: 'technical',
  curveStyle: 'polyline',
  envelope: 'centerline',
  radiusProfile: 'constant',
  taper: 0.85,
});

function fabricateView(overrides = {}) {
  return {
    guides: false,
    camera: { yaw: -0.6, pitch: 0.6 },
    units: { ...FABRICATE_UNITS },
    ...overrides,
    fabrication: {
      ...FABRICATE_DEFAULTS,
      ...(overrides.fabrication ?? {}),
    },
  };
}

const TORUS_PARAMS = Object.freeze({
  exprX: '(2 + cos(v))*cos(u)',
  exprY: '(2 + cos(v))*sin(u)',
  exprZ: 'sin(v)',
  u0: 0, u1: 2 * PI,
  v0: 0, v1: 2 * PI,
  samplesU: 48, samplesV: 24,
  closedU: true, closedV: true,
  fit: 340,
});

function fabricateTorus(name, params = {}, view = {}) {
  return createDocument('parametric-surface', {
    name,
    generator: { params: { ...TORUS_PARAMS, ...params } },
    view: fabricateView(view),
  });
}

const VASE_PROFILE = '45 + 42.5*e^(-((v-0.42)/0.22)^2) + 22.5*e^(-((v-1.0)/0.12)^2) - 12*e^(-((v-0.75)/0.14)^2)';

function vaseSurface(profile, heightExpression, name) {
  return createLayer('parametric-surface', {
    name,
    generator: {
      params: {
        exprX: `(${profile})*cos(u)`,
        exprY: `(${profile})*sin(u)`,
        exprZ: heightExpression,
        u0: 0, u1: 2 * PI,
        v0: 0, v1: 1,
        samplesU: 96, samplesV: 64,
        closedU: true, closedV: false,
        fit: 340,
      },
    },
  });
}

function mmFabricationView(fabrication) {
  return fabricateView({
    units: { world: 'mm', mmPerWorldUnit: 1, artboard: 'unitless', mmPerArtboardUnit: null },
    fabrication,
  });
}

const HOLLOW_FABRICATION = Object.freeze({
  format: 'stl',
  quality: 'standard',
  scope: 'composition',
  boolean: 'difference',
  csgStrategy: 'manifold',
  repair: true,
  weld: true,
  cap: true,
  capStrategy: 'auto',
  tolerance: 1e-4,
  maxHoleEdges: 512,
});

const SOLID_FABRICATION = Object.freeze({
  format: 'stl',
  quality: 'standard',
  scope: 'single',
  boolean: 'none',
  csgStrategy: 'manifold',
  repair: true,
  weld: true,
  cap: true,
  capStrategy: 'auto',
  tolerance: 1e-4,
  maxHoleEdges: 512,
});

/** Hollow object of revolution with a flat floor and an open mouth. */
function hollowRevolved(name, {
  profile,
  height,
  wall,
  floor,
  innerExtra = 4,
  samplesU = 96,
  samplesV = 64,
}) {
  const doc = createDocument('parametric-surface', {
    name,
    generator: {
      params: {
        exprX: `(${profile})*cos(u)`,
        exprY: `(${profile})*sin(u)`,
        exprZ: `${height}*v`,
        u0: 0, u1: 2 * PI,
        v0: 0, v1: 1,
        samplesU, samplesV,
        closedU: true, closedV: false,
        fit: 340,
      },
    },
    view: mmFabricationView({ ...HOLLOW_FABRICATION }),
  });
  doc.layers[0].name = 'Outer shell';
  const inner = vaseSurface(`${profile} - ${wall}`, `${floor} + ${height + innerExtra}*v`, 'Inner shell');
  inner.style = doc.layers[0].style;
  doc.layers.push(inner);
  doc.activeLayer = 0;
  return doc;
}

/** Closed solid of revolution, capped at both ends. */
function solidRevolved(name, {
  profile,
  z = '200*v',
  samplesU = 96,
  samplesV = 64,
}) {
  return createDocument('parametric-surface', {
    name,
    generator: {
      params: {
        exprX: `(${profile})*cos(u)`,
        exprY: `(${profile})*sin(u)`,
        exprZ: z,
        u0: 0, u1: 2 * PI,
        v0: 0, v1: 1,
        samplesU, samplesV,
        closedU: true, closedV: false,
        fit: 340,
      },
    },
    view: mmFabricationView({ ...SOLID_FABRICATION }),
  });
}

function addTorusInstance(doc, { name, dz = 0, dx = 0, dy = 0 }) {
  const source = doc.layers[0];
  const layer = createInstanceLayer(source.id, {
    name,
    operators: [{
      id: 'translate',
      enabled: true,
      mods: {},
      params: { dx, dy, dz },
    }],
    style: source.style,
  });
  doc.layers.push(layer);
  doc.activeLayer = doc.layers.length - 1;
  return layer;
}


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
          // 13/8 is a Fibonacci convergent of phi: it preserves the golden
          // ratio character while closing the rose exactly after 8 turns.
          exprR: 'cos((13/8)*theta)',
          turns: 8, samples: 2400, closed: true, fit: 360,
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
      generator: {
        params: {
          R1: 250, r1: 90, d1: 130, mode1: 'hypo',
          R2: 150, r2: 45, d2: 80, mode2: 'epi',
          mix: 0.45, samples: 3000, fit: 340,
        },
      },
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

  // ——— Ornamental pattern library ———

  'Guilloché': () =>
    createDocument('hypotrochoid', {
      name: 'Guilloché',
      generator: { params: { R: 260, r: 91, d: 168, samples: 3600, adaptive: true, fit: 360 } },
      operators: [
        { id: 'offset', enabled: true, params: { distance: 2.5, copies: 5 }, mods: {} },
        { id: 'rotate', enabled: true, params: { angle: 8, cx: 0, cy: 0 }, mods: {} },
      ],
    }),

  'Geometric Flower': () =>
    createDocument('rose', {
      name: 'Geometric Flower',
      generator: { params: { n: 6, d: 1, radius: 320, phase: 0, samples: 2200, fit: 340 } },
      operators: [
        { id: 'offset', enabled: true, params: { distance: 4, copies: 3 }, mods: {} },
        { id: 'rotate', enabled: true, params: { angle: 15, cx: 0, cy: 0 }, mods: {} },
      ],
    }),

  'Radial Mandala': () =>
    createDocument('hypotrochoid', {
      name: 'Radial Mandala',
      generator: { params: { R: 270, r: 105, d: 150, samples: 3600, fit: 320 } },
      operators: [
        { id: 'radial-array', enabled: true, params: { count: 12, sweep: 360, radius: 150, rotateCopies: true }, mods: {} },
        { id: 'offset', enabled: true, params: { distance: 2.5, copies: 2 }, mods: {} },
      ],
    }),

  'Interference Patterns': () =>
    createDocument('lissajous', {
      name: 'Interference Patterns',
      generator: { params: { a: 9, b: 11, delta: PI / 2, ampX: 1, ampY: 1, size: 340, samples: 2600 } },
      operators: [
        { id: 'linear-array', enabled: true, params: { count: 9, spacing: 4, angle: 45, rotateStep: 0.35 }, mods: {} },
      ],
    }),

  'Orbital Patterns': () =>
    createDocument('epitrochoid', {
      name: 'Orbital Patterns',
      generator: { params: { R: 120, r: 30, d: 78, samples: 2600, fit: 300 } },
      operators: [
        { id: 'radial-array', enabled: true, params: { count: 6, sweep: 360, radius: 130, rotateCopies: true }, mods: {} },
        { id: 'offset', enabled: true, params: { distance: 2, copies: 2 }, mods: {} },
      ],
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

  // ——— Fabricate examples ———

  'Solid Torus': () => fabricateTorus('Solid Torus', {}, {
    fabrication: { format: '3mf', quality: 'standard', scope: 'single' },
  }),

  'Twin Tori': () => {
    const doc = fabricateTorus('Twin Tori', {}, {
      fabrication: { format: '3mf', quality: 'standard', scope: 'composition' },
    });
    doc.layers[0].name = 'Torus A';
    addTorusInstance(doc, { name: 'Torus B', dz: 5 });
    return doc;
  },

  'Boolean Union': () => {
    const doc = fabricateTorus('Boolean Union', {}, {
      fabrication: {
        format: '3mf',
        scope: 'composition',
        boolean: 'union',
        csgStrategy: 'manifold',
      },
    });
    doc.layers[0].name = 'Torus A';
    addTorusInstance(doc, { name: 'Torus B', dz: 0.5 });
    return doc;
  },

  'Boolean Difference': () => {
    const doc = fabricateTorus('Boolean Difference', {}, {
      fabrication: {
        format: 'stl',
        scope: 'composition',
        boolean: 'difference',
        csgStrategy: 'manifold',
      },
    });
    doc.layers[0].name = 'Torus A';
    addTorusInstance(doc, { name: 'Torus B', dz: 0.5 });
    return doc;
  },

  'Cap Catenoid': () => createDocument('parametric-surface', {
    name: 'Cap Catenoid',
    generator: {
      params: {
        exprX: 'cosh(v)*cos(u)',
        exprY: 'cosh(v)*sin(u)',
        exprZ: 'v',
        u0: 0, u1: 2 * PI,
        v0: -1.1, v1: 1.1,
        samplesU: 48, samplesV: 20,
        closedU: true, closedV: false,
        fit: 330,
      },
    },
    view: fabricateView({
      fabrication: {
        format: 'stl',
        quality: 'standard',
        repair: true,
        weld: true,
        cap: true,
        capStrategy: 'auto',
      },
    }),
  }),

  'Solid Vase 200': () => hollowRevolved('Solid Vase 200', {
    profile: VASE_PROFILE,
    height: 200,
    wall: 2.5,
    floor: 3,
    innerExtra: 7,
  }),

  'Pencil Cup 100': () => hollowRevolved('Pencil Cup 100', {
    profile: '32 - 4*v + 2*sin(pi*v)',
    height: 100,
    wall: 3,
    floor: 4,
  }),

  'Planter 120': () => hollowRevolved('Planter 120', {
    profile: '55 - 14*v + 2*sin(pi*v)',
    height: 120,
    wall: 4,
    floor: 5,
  }),

  'Bud Vase 160': () => hollowRevolved('Bud Vase 160', {
    profile: '18 + 14*sin(pi*v) - 7*exp(-((v-0.72)/0.12)^2)',
    height: 160,
    wall: 2.5,
    floor: 3,
  }),

  'Napkin Ring 50': () => hollowRevolved('Napkin Ring 50', {
    profile: '24',
    height: 30,
    wall: 3,
    floor: -2,
  }),

  'Coaster 90': () => solidRevolved('Coaster 90', {
    profile: '45',
    z: '6*v',
    samplesV: 16,
  }),

  'Twisted Totem 220': () => createDocument('parametric-surface', {
    name: 'Twisted Totem 220',
    generator: {
      params: {
        exprX: '(26 + 6*cos(5*u + 3*v))*cos(u)',
        exprY: '(26 + 6*cos(5*u + 3*v))*sin(u)',
        exprZ: '220*v',
        u0: 0, u1: 2 * PI,
        v0: 0, v1: 1,
        samplesU: 128, samplesV: 96,
        closedU: true, closedV: false,
        fit: 340,
      },
    },
    view: mmFabricationView({ ...SOLID_FABRICATION }),
  }),

  'Lattice Vase 200': () =>
    createDocument('surface-lattice', {
      name: 'Lattice Vase 200',
      generator: {
        params: {
          // Struts are centred half a diameter inside the nominal profile, so
          // the tube envelope keeps the 175 mm outer diameter.
          profile: `(${VASE_PROFILE}) - 1.75`,
          height: 200,
          floor: 3,
          cellSize: 20,
          strut: 3.5,
          rim: 4,
          seed: 7,
          samples: 6,
          fit: 340,
        },
      },
      view: fabricateView({
        units: { world: 'mm', mmPerWorldUnit: 1, artboard: 'unitless', mmPerArtboardUnit: null },
        fabrication: {
          format: 'stl',
          quality: 'standard',
          scope: 'single',
          lattice: true,
          csgStrategy: 'manifold',
          repair: false,
          weld: false,
          cap: false,
          tolerance: 1e-4,
        },
      }),
    }),

  'Organic Lattice Vase 200': () =>
    createDocument('surface-lattice', {
      name: 'Organic Lattice Vase 200',
      generator: {
        params: {
          // The strut envelope is offset inward by half the diameter in the
          // solid builder, so the nominal profile remains the outer size.
          profile: VASE_PROFILE,
          height: 200,
          floor: 3,
          cellSize: 20,
          density: 1,
          irregularity: 0.22,
          relaxation: 4,
          aspect: 1,
          minOpeningWidth: 6,
          strut: 3.5,
          rim: 4,
          seed: 7,
          samples: 6,
          fit: 340,
        },
      },
      view: fabricateView({
        units: { world: 'mm', mmPerWorldUnit: 1, artboard: 'unitless', mmPerArtboardUnit: null },
        fabrication: {
          format: 'stl',
          quality: 'standard',
          scope: 'single',
          lattice: true,
          csgStrategy: 'manifold',
          repair: false,
          weld: false,
          cap: false,
          tolerance: 1e-4,
          finishQuality: 'standard',
          jointStyle: 'auto',
          curveStyle: 'organic',
          envelope: 'outer',
        },
      }),
    }),

  'Perforated Vase 200': () => {
    const doc = BUILT_IN_PRESETS['Solid Vase 200']();
    doc.name = 'Perforated Vase 200';
    doc.view.fabrication = {
      ...doc.view.fabrication,
      lattice: true,
      latticeMode: 'cutouts',
      latticeCellSize: 20,
      latticeStrut: 3.5,
      latticeWall: 2.5,
      latticeFloor: 3,
      latticeRim: 4,
      latticeSeed: 7,
      latticePreview: 'solid',
    };
    return doc;
  },

  // ——— Parametric surfaces ———

  Torus: () =>
    createDocument('parametric-surface', {
      name: 'Torus',
      generator: {
        params: {
          exprX: '(2 + cos(v))*cos(u)',
          exprY: '(2 + cos(v))*sin(u)',
          exprZ: 'sin(v)',
          u0: 0, u1: 2 * PI,
          v0: 0, v1: 2 * PI,
          samplesU: 64, samplesV: 32,
          closedU: true, closedV: true,
          fit: 340,
        },
      },
    }),

  Sphere: () =>
    createDocument('parametric-surface', {
      name: 'Sphere',
      generator: {
        params: {
          exprX: '1.6*sin(v)*cos(u)',
          exprY: '1.6*sin(v)*sin(u)',
          exprZ: '1.6*cos(v)',
          u0: 0, u1: 2 * PI,
          v0: 0.04, v1: PI - 0.04,
          samplesU: 64, samplesV: 32,
          closedU: true, closedV: false,
          fit: 330,
        },
      },
    }),

  'Hyperbolic Saddle': () =>
    createDocument('parametric-surface', {
      name: 'Hyperbolic Saddle',
      generator: {
        params: {
          exprX: 'u',
          exprY: 'v',
          exprZ: '0.35*(u^2 - v^2)',
          u0: -2.2, u1: 2.2,
          v0: -2.2, v1: 2.2,
          samplesU: 44, samplesV: 44,
          closedU: false, closedV: false,
          fit: 340,
        },
      },
    }),

  'Wave Sheet': () =>
    createDocument('parametric-surface', {
      name: 'Wave Sheet',
      generator: {
        params: {
          exprX: 'u',
          exprY: 'v',
          exprZ: '0.5*sin(2*u)*cos(2*v)',
          u0: -PI, u1: PI,
          v0: -PI, v1: PI,
          samplesU: 56, samplesV: 56,
          closedU: false, closedV: false,
          fit: 340,
        },
      },
    }),

  Helicoid: () =>
    createDocument('parametric-surface', {
      name: 'Helicoid',
      generator: {
        params: {
          exprX: 'v*cos(u)',
          exprY: 'v*sin(u)',
          exprZ: '0.55*u',
          u0: 0, u1: 2 * PI,
          v0: -1.2, v1: 1.2,
          samplesU: 64, samplesV: 24,
          closedU: true, closedV: false,
          fit: 330,
        },
      },
    }),

  Catenoid: () =>
    createDocument('parametric-surface', {
      name: 'Catenoid',
      generator: {
        params: {
          exprX: 'cosh(v)*cos(u)',
          exprY: 'cosh(v)*sin(u)',
          exprZ: 'v',
          u0: 0, u1: 2 * PI,
          v0: -1.1, v1: 1.1,
          samplesU: 64, samplesV: 24,
          closedU: true, closedV: false,
          fit: 330,
        },
      },
    }),

  'Enneper Surface': () =>
    createDocument('parametric-surface', {
      name: 'Enneper Surface',
      generator: {
        params: {
          exprX: '0.55*(u - u^3/3 + u*v^2)',
          exprY: '0.55*(v - v^3/3 + v*u^2)',
          exprZ: '0.55*(u^2 - v^2)',
          u0: -1.8, u1: 1.8,
          v0: -1.8, v1: 1.8,
          samplesU: 44, samplesV: 44,
          closedU: false, closedV: false,
          fit: 340,
        },
      },
    }),

  'Möbius Band': () =>
    createDocument('parametric-surface', {
      name: 'Möbius Band',
      generator: {
        params: {
          exprX: '(1.7 + 0.5*v*cos(u/2))*cos(u)',
          exprY: '(1.7 + 0.5*v*cos(u/2))*sin(u)',
          exprZ: '0.5*v*sin(u/2)',
          u0: 0, u1: 2 * PI,
          v0: -1, v1: 1,
          samplesU: 64, samplesV: 16,
          closedU: true, closedV: false,
          seamU: 'reverse',
          fit: 330,
        },
      },
    }),

  Seashell: () =>
    createDocument('parametric-surface', {
      name: 'Seashell',
      generator: {
        params: {
          exprX: '0.45*e^(0.11*v)*(1 + 0.55*cos(u))*cos(v)',
          exprY: '0.45*e^(0.11*v)*(1 + 0.55*cos(u))*sin(v)',
          exprZ: '0.45*e^(0.11*v)*(0.55*sin(u) + 0.28*v)',
          u0: 0, u1: 2 * PI,
          v0: 0, v1: 4 * PI,
          samplesU: 48, samplesV: 48,
          closedU: true, closedV: false,
          fit: 330,
        },
      },
    }),

  'Vortex Stack': () => {
    const doc = createDocument('parametric-surface', {
      name: 'Vortex Stack',
      generator: {
        params: {
          exprX: '(1.2 + 0.25*cos(v))*cos(u)',
          exprY: '(1.2 + 0.25*cos(v))*sin(u)',
          exprZ: '0.65*u + 0.18*sin(v)',
          u0: 0, u1: 4 * PI,
          v0: 0, v1: 2 * PI,
          samplesU: 80, samplesV: 12,
          closedU: false, closedV: true,
          fit: 420,
        },
      },
      view: {
        modes: ['stroke'],
        projection: '3d',
        layout: 'single',
        guides: false,
        camera: { yaw: -0.6, pitch: 0.34 },
      },
    });
    const source = doc.layers[0];
    source.name = 'Vortex Source';
    source.visible = false;
    const specs = [
      { z: -1.8, rot: 0, scale: 1.00, opacity: 1.00 },
      { z: -0.9, rot: 36, scale: 0.92, opacity: 0.85 },
      { z: 0.0, rot: 72, scale: 0.84, opacity: 0.70 },
      { z: 0.9, rot: 108, scale: 0.76, opacity: 0.55 },
      { z: 1.8, rot: 144, scale: 0.68, opacity: 0.40 },
    ];
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const layer = createInstanceLayer(source.id, {
        name: `Vortex / ${String(i + 1).padStart(2, '0')}`,
        operators: [
          { id: 'translate', enabled: true, params: { dx: 0, dy: 0, dz: spec.z }, mods: {} },
          { id: 'rotate', enabled: true, params: { angle: spec.rot, angleExpr: '', cx: 0, cy: 0 }, mods: {} },
          { id: 'scale', enabled: true, params: { sx: spec.scale, sy: spec.scale, sz: spec.scale, scaleExpr: '' }, mods: {} },
        ],
        style: {
          stroke: { color: '#ffffff', width: 1, opacity: spec.opacity, cap: 'round', join: 'round' },
          fill: { enabled: false, color: '#ffffff', opacity: 1 },
          blend: 'normal',
        },
      });
      doc.layers.push(layer);
    }
    doc.activeLayer = 1;
    doc.view.style = doc.layers[1].style;
    doc.view.strokeWeight = 1;
    return doc;
  },

  // ——— Helix Lab variations ———

  'Básica': () =>
    createDocument('helix', {
      name: 'Básica',
      generator: {
        params: {
          r: 120, p: 30, turns: 6, a: 0, k: 3, phi: 0, theta: 0,
          b: 0, m: 2, psi: 0, strands: 1, samples: 1800, adaptive: true, fit: 340,
        },
      },
    }),

  'Radio Variable': () =>
    createDocument('helix', {
      name: 'Radio Variable',
      generator: {
        params: {
          r: 120, p: 30, turns: 6, a: 38, k: 3, phi: 0, theta: 0,
          b: 0, m: 2, psi: 0, strands: 1, samples: 1800, adaptive: true, fit: 340,
        },
      },
    }),

  'Paso Variable': () =>
    createDocument('helix', {
      name: 'Paso Variable',
      generator: {
        params: {
          r: 120, p: 30, turns: 6, a: 0, k: 3, phi: 0, theta: 0,
          b: 28, m: 2, psi: 0, strands: 1, samples: 1800, adaptive: true, fit: 340,
        },
      },
    }),

  'Ondulada': () =>
    createDocument('helix', {
      name: 'Ondulada',
      generator: {
        params: {
          r: 120, p: 30, turns: 6, a: 30, k: 4, phi: 0, theta: 0,
          b: 18, m: 3, psi: 0, strands: 1, samples: 1800, adaptive: true, fit: 340,
        },
      },
    }),

  'Doble Hélice': () =>
    createDocument('helix', {
      name: 'Doble Hélice',
      generator: {
        params: {
          r: 110, p: 28, turns: 6, a: 0, k: 3, phi: 0, theta: 0,
          b: 0, m: 2, psi: 0, strands: 2, samples: 1800, adaptive: true, fit: 340,
        },
      },
    }),

  'Cónica': () =>
    createDocument('helix', {
      name: 'Cónica',
      generator: {
        params: {
          r: 60, p: 24, turns: 5, a: 60, k: 1 / 10, phi: 0, theta: 0,
          b: 0, m: 2, psi: 0, strands: 1, samples: 1800, adaptive: true, fit: 340,
        },
      },
    }),
};
