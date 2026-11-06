/**
 * check-preview-bundle.mjs — assert the optional WebGL preview is lazy.
 *
 * The initial app chunk must not contain Three.js or the product-preview
 * controller. A dedicated ProductPreview chunk must exist after `vite build`.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const assets = join(process.cwd(), 'dist', 'assets');
let files;
try {
  files = readdirSync(assets);
} catch {
  console.error('check-preview-bundle: dist/assets is missing; run `npm run build` first.');
  process.exit(1);
}

const mainChunks = files.filter((file) => /^index-.*\.js$/.test(file));
const previewChunks = files.filter((file) => /^ProductPreview-.*\.js$/.test(file));
if (!mainChunks.length) {
  console.error('check-preview-bundle: no initial index chunk found.');
  process.exit(1);
}
if (!previewChunks.length) {
  console.error('check-preview-bundle: no lazy ProductPreview chunk found.');
  process.exit(1);
}

const main = mainChunks.map((file) => readFileSync(join(assets, file), 'utf8')).join('\n');
const preview = previewChunks.map((file) => readFileSync(join(assets, file), 'utf8')).join('\n');
const threeMarkers = ['WebGLRenderer', 'MeshPhysicalMaterial', 'RoomEnvironment'];
const leaked = threeMarkers.filter((marker) => main.includes(marker));
if (leaked.length) {
  console.error(`check-preview-bundle: Three.js leaked into the initial chunk: ${leaked.join(', ')}`);
  process.exit(1);
}
if (!threeMarkers.some((marker) => preview.includes(marker))) {
  console.error('check-preview-bundle: ProductPreview chunk does not look like the Three.js bundle.');
  process.exit(1);
}

const kb = (text) => (Buffer.byteLength(text) / 1024).toFixed(1);
console.log(`check-preview-bundle: initial ${mainChunks.join(', ')} ${kb(main)} kB; lazy ${previewChunks.join(', ')} ${kb(preview)} kB`);
