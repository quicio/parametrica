/**
 * presets/catalog.js — discovery metadata for the built-in preset library.
 *
 * Facts live next to the presets they describe. The UI reads this catalog to
 * group, search and explain presets without inspecting their documents.
 */

export const PRESET_CATEGORIES = [
  { id: 'curves', label: 'Curves', hint: '2D parametric figures' },
  { id: 'patterns', label: 'Patterns', hint: 'Ornamental repetitions' },
  { id: 'fourier', label: 'Fourier', hint: 'Harmonic epicycles' },
  { id: 'attractors', label: 'Attractors', hint: 'Strange attractors' },
  { id: 'space', label: '3D Curves', hint: 'Projected spatial curves' },
  { id: 'surfaces', label: 'Surfaces', hint: 'U/V parametric surfaces' },
  { id: 'fabricate', label: 'Fabricate', hint: 'Functional, decorative and technical solids' },
  { id: 'compositions', label: 'Compositions', hint: 'Layered and instanced forms' },
  { id: 'helix', label: 'Helix Lab', hint: 'Helix variations' },
  { id: 'legacy', label: 'Legacy', hint: 'Classical and migrated figures' },
];

export const CATEGORY_USER = {
  id: 'user',
  label: 'My Presets',
  hint: 'Saved in this workspace',
};

export const PRESET_META = {
  /* ——— Curves ——— */
  'Lissajous 3:5': {
    category: 'curves',
    description: 'Orthogonal sine ratios tracing a 3:5 harmonic figure.',
    tags: ['lissajous', 'harmonic', '2d'],
  },
  'Golden Rose': {
    category: 'curves',
    description: 'Closed polar rose using the 13/8 Fibonacci approximation of φ.',
    tags: ['polar', 'rose', 'golden'],
  },
  Infinity: {
    category: 'curves',
    description: 'Lemniscate-style loop from a rational parametric pair.',
    tags: ['parametric', 'loop'],
  },
  Spirograph: {
    category: 'curves',
    description: 'Two trochoid layers mixed into a spirograph.',
    tags: ['spirograph', 'trochoid'],
  },
  Butterfly: {
    category: 'curves',
    description: 'Fay’s butterfly curve sampled over twelve turns.',
    tags: ['butterfly', 'natural'],
  },
  'Superformula Star': {
    category: 'curves',
    description: 'Superformula star repeated in three rotated rings.',
    tags: ['superformula', 'star', 'radial'],
  },
  'Superformula Flower': {
    category: 'curves',
    description: 'Eight-lobed superformula flower.',
    tags: ['superformula', 'flower'],
  },
  Hypotrochoid: {
    category: 'curves',
    description: 'Hypotrochoid traced by a circle rolling inside another.',
    tags: ['hypotrochoid', 'rolling'],
  },

  /* ——— Patterns ——— */
  'Guilloché': {
    category: 'patterns',
    description: 'Fine engine-turning with repeated offsets.',
    tags: ['guilloche', 'ornament', 'offset'],
  },
  'Geometric Flower': {
    category: 'patterns',
    description: 'Six-petal rose with offset and rotation layers.',
    tags: ['rose', 'flower', 'rotate'],
  },
  'Radial Mandala': {
    category: 'patterns',
    description: 'Hypotrochoid repeated radially into a mandala.',
    tags: ['mandala', 'radial', 'array'],
  },
  'Interference Patterns': {
    category: 'patterns',
    description: 'Lissajous waves arrayed as an interference field.',
    tags: ['interference', 'lissajous', 'array'],
  },
  'Orbital Patterns': {
    category: 'patterns',
    description: 'Radial array of offset orbital curves.',
    tags: ['orbital', 'radial', 'array'],
  },

  /* ——— Fourier ——— */
  'Fourier Capsule': {
    category: 'fourier',
    description: 'Epicycle stack drawing a rounded capsule contour.',
    tags: ['fourier', 'epicycles', 'harmonics'],
  },
  'Fourier Butterfly': {
    category: 'fourier',
    description: 'Epicycle stack drawing a butterfly contour.',
    tags: ['fourier', 'epicycles', 'butterfly'],
  },

  /* ——— Attractors ——— */
  'Lorenz Butterfly': {
    category: 'attractors',
    description: 'Projection of the Lorenz strange attractor.',
    tags: ['lorenz', 'attractor', 'chaos'],
  },
  'Clifford Web': {
    category: 'attractors',
    description: 'Clifford attractor sampled into a dense web.',
    tags: ['clifford', 'attractor', 'chaos'],
  },
  'De Jong Filament': {
    category: 'attractors',
    description: 'De Jong attractor drawn as a single filament.',
    tags: ['dejong', 'attractor', 'chaos'],
  },
  'Aizawa Torus': {
    category: 'attractors',
    description: 'Aizawa attractor orbiting a toroidal core.',
    tags: ['aizawa', 'attractor', 'torus'],
  },

  /* ——— 3D curves ——— */
  'Helix (Isometric)': {
    category: 'space',
    description: 'Projected 3D helix read from an isometric camera.',
    tags: ['helix', '3d', 'projection'],
  },
  'Spiral Helix': {
    category: 'space',
    description: 'Helix with a sinusoidal radial spiral.',
    tags: ['helix', 'spiral', '3d'],
  },
  'Cone (Projected)': {
    category: 'space',
    description: 'Projected cone-like curve with a shrinking radius.',
    tags: ['cone', '3d', 'projection'],
  },

  /* ——— Surfaces ——— */
  Torus: {
    category: 'surfaces',
    description: 'Closed torus: U sweeps the ring, V sweeps the tube.',
    tags: ['surface', 'torus', 'closed'],
  },
  Sphere: {
    category: 'surfaces',
    description: 'Spherical patch sampled over azimuth and polar angle.',
    tags: ['surface', 'sphere', 'closed'],
  },
  'Hyperbolic Saddle': {
    category: 'surfaces',
    description: 'Hyperbolic paraboloid z = u² − v².',
    tags: ['surface', 'saddle', 'open'],
  },
  'Wave Sheet': {
    category: 'surfaces',
    description: 'Two orthogonal sine waves on a flat patch.',
    tags: ['surface', 'wave', 'open'],
  },
  Helicoid: {
    category: 'surfaces',
    description: 'Minimal ruled surface swept like a screw thread.',
    tags: ['surface', 'helicoid', 'minimal'],
  },
  Catenoid: {
    category: 'surfaces',
    description: 'Minimal surface of revolution between two rings.',
    tags: ['surface', 'catenoid', 'minimal'],
  },
  'Enneper Surface': {
    category: 'surfaces',
    description: 'Classic self-intersecting minimal surface.',
    tags: ['surface', 'enneper', 'minimal'],
  },
  'Möbius Band': {
    category: 'surfaces',
    description: 'Half-twisted strip welded across a reversed U seam.',
    tags: ['surface', 'mobius', 'twist', 'seam'],
  },
  Seashell: {
    category: 'surfaces',
    description: 'Logarithmic spiral tube with a growing radius.',
    tags: ['surface', 'shell', 'spiral'],
  },

  /* ——— Fabricate examples ——— */
  'Solid Torus': {
    category: 'fabricate',
    description: 'Closed torus with a millimetre scale and 3MF output ready for Fabricate.',
    tags: ['fabricate', 'solid', 'torus', '3mf', 'export'],
  },
  'Twin Tori': {
    category: 'fabricate',
    description: 'Two disjoint closed tori exported as two 3MF objects.',
    tags: ['fabricate', 'multi-body', '3mf', 'instances'],
  },
  'Boolean Union': {
    category: 'fabricate',
    description: 'Two overlapping tori combined with a Manifold union.',
    tags: ['fabricate', 'boolean', 'union', 'manifold'],
  },
  'Boolean Difference': {
    category: 'fabricate',
    description: 'A torus with a bite cut by a second overlapping torus.',
    tags: ['fabricate', 'boolean', 'difference', 'manifold'],
  },
  'Cap Catenoid': {
    category: 'fabricate',
    description: 'Open catenoid prepared with automatic caps for STL export.',
    tags: ['fabricate', 'repair', 'cap', 'catenoid'],
  },
  'Solid Vase 200': {
    category: 'fabricate',
    description: 'Hollow vase of revolution: 200 mm tall, 175 mm diameter, 135 mm mouth, 2.5 mm wall.',
    tags: ['fabricate', 'vase', 'solid', 'wall', 'boolean', 'difference'],
  },
  'Lattice Vase 200': {
    category: 'fabricate',
    description: 'Openwork vase of revolution: 200 mm tall, 20 mm Voronoi cells and 3.5 mm struts.',
    tags: ['fabricate', 'vase', 'lattice', 'voronoi', 'strut', 'openwork'],
  },
  'Organic Lattice Vase 200': {
    category: 'fabricate',
    description: 'Sculptural openwork vase: 200 mm tall, organic 20 mm cells, rounded joints and a 3.5 mm strut envelope.',
    tags: ['fabricate', 'vase', 'lattice', 'organic', 'organic-struts', 'openwork'],
  },
  'Perforated Vase 200': {
    category: 'fabricate',
    description: 'Hollow solid-wall vase with a seeded pattern of 16.5 mm through-holes.',
    tags: ['fabricate', 'vase', 'perforated', 'holes', 'wall', 'openwork'],
  },

  'Pencil Cup 100': {
    category: 'fabricate',
    description: 'Open-top desk cup: 100 mm tall, 65 mm wide, 3 mm wall and a flat base.',
    tags: ['fabricate', 'functional', 'cup', 'desk', 'hollow'],
  },
  'Planter 120': {
    category: 'fabricate',
    description: 'Tapered plant pot: 120 mm tall, 110 mm base, 4 mm wall and a flat foot.',
    tags: ['fabricate', 'functional', 'planter', 'pot', 'hollow'],
  },
  'Bud Vase 160': {
    category: 'fabricate',
    description: 'Slim bud vase: 160 mm tall, a soft waist, 2.5 mm wall and a stable base.',
    tags: ['fabricate', 'decorative', 'vase', 'bud', 'hollow'],
  },
  'Napkin Ring 50': {
    category: 'fabricate',
    description: 'Through-hole napkin ring: 48 mm wide, 30 mm tall, 3 mm wall.',
    tags: ['fabricate', 'functional', 'table', 'ring', 'hollow'],
  },
  'Coaster 90': {
    category: 'fabricate',
    description: 'Solid 90 mm coaster with a 6 mm profile and a flat face.',
    tags: ['fabricate', 'functional', 'coaster', 'table', 'solid'],
  },
  'Twisted Totem 220': {
    category: 'fabricate',
    description: 'Abstract five-lobed totem: 220 mm tall, solid, with a flat base.',
    tags: ['fabricate', 'decorative', 'abstract', 'totem', 'solid'],
  },

  /* ——— Compositions ——— */
  'Vortex Stack': {
    category: 'compositions',
    description: 'A helical Surface instanced into a five-layer vortex.',
    tags: ['composition', 'instance', 'surface', 'vortex', 'helix'],
  },

  /* ——— Helix Lab ——— */
  'Básica': {
    category: 'helix',
    description: 'Reference helix with constant radius and pitch.',
    tags: ['helix', 'reference'],
  },
  'Radio Variable': {
    category: 'helix',
    description: 'Helix with a sinusoidally modulated radius.',
    tags: ['helix', 'radius'],
  },
  'Paso Variable': {
    category: 'helix',
    description: 'Helix with a modulated pitch.',
    tags: ['helix', 'pitch'],
  },
  'Ondulada': {
    category: 'helix',
    description: 'Helix with combined radius and pitch waves.',
    tags: ['helix', 'wave'],
  },
  'Doble Hélice': {
    category: 'helix',
    description: 'Two intertwined helix strands.',
    tags: ['helix', 'strands'],
  },
  'Cónica': {
    category: 'helix',
    description: 'Helix whose radius tapers into a cone.',
    tags: ['helix', 'cone'],
  },

  /* ——— Legacy ——— */
  'Vesica Prime (v1)': {
    category: 'legacy',
    description: 'Legacy v1 vesica construction.',
    tags: ['legacy', 'vesica'],
  },
  'Vesica Piscis': {
    category: 'legacy',
    description: 'Two intersecting circles and their vesica.',
    tags: ['classical', 'vesica'],
  },
  'Three Ellipses': {
    category: 'legacy',
    description: 'Three rotated ellipses in a classical rosette.',
    tags: ['classical', 'ellipse'],
  },
};

const FALLBACK = {
  category: 'legacy',
  description: '',
  tags: [],
};

const FALLBACK_CATEGORY = { id: 'legacy', label: 'Legacy', hint: 'Other figures' };

export function presetInfo(name) {
  return PRESET_META[name] ?? FALLBACK;
}

export function categoryInfo(id) {
  if (id === CATEGORY_USER.id) return CATEGORY_USER;
  return PRESET_CATEGORIES.find((category) => category.id === id) ?? FALLBACK_CATEGORY;
}
