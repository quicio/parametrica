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
