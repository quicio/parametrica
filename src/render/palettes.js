/**
 * palettes.js — artboard presets and curated color pairs.
 *
 * Palettes are data, not themes: applying one writes explicit values into
 * the document so the result stays serialisable and reproducible.
 */

export const ARTBOARD_PRESETS = [
  { id: 'square', name: 'Square', width: 900, height: 900 },
  { id: 'portrait', name: 'Portrait 4:5', width: 1080, height: 1350 },
  { id: 'landscape', name: 'Landscape 16:9', width: 1600, height: 900 },
  { id: 'a4-portrait', name: 'A4 Portrait', width: 1240, height: 1754 },
  { id: 'a4-landscape', name: 'A4 Landscape', width: 1754, height: 1240 },
];

export const PALETTES = [
  {
    id: 'monochrome',
    name: 'Monochrome',
    background: '#000000',
    stroke: '#ffffff',
    fill: '#ffffff',
  },
  {
    id: 'paper',
    name: 'Paper',
    background: '#f2eee3',
    stroke: '#121212',
    fill: '#121212',
  },
  {
    id: 'signal',
    name: 'Signal',
    background: '#0d0d0d',
    stroke: '#e30613',
    fill: '#e30613',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    background: '#12162b',
    stroke: '#e8d7ff',
    fill: '#e8d7ff',
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    background: '#ffffff',
    stroke: '#000000',
    fill: '#000000',
  },
];

export function paletteById(id) {
  return PALETTES.find((palette) => palette.id === id) ?? PALETTES[0];
}

export function artboardPresetById(id) {
  return ARTBOARD_PRESETS.find((preset) => preset.id === id) ?? ARTBOARD_PRESETS[0];
}
