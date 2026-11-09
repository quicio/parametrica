/**
 * architecture-boundaries.test.mjs — executable Phase A import rules.
 *
 * These checks are intentionally textual: they fail before a bundler or a
 * dependency graph tool is involved, and they document the first boundaries
 * that ADR-0004 makes non-negotiable.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;

function read(path) {
  return readFileSync(new URL(path, `file://${root}`), 'utf8');
}

function importsOf(source) {
  const out = [];
  const re = /(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+[\s\S]*?\s+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(re)) out.push(match[1]);
  return out;
}

function filesUnder(path) {
  const absolute = join(root, path);
  const out = [];
  for (const name of readdirSync(absolute)) {
    const child = join(absolute, name);
    if (statSync(child).isDirectory()) out.push(...filesUnder(relative(root, child)));
    else if (name.endsWith('.js')) out.push(relative(root, child));
  }
  return out;
}

export async function run(assert) {
  const forbiddenDomain = ['render', 'viz', 'ui', 'application', 'workers', 'export', 'geometry'];
  for (const file of filesUnder('src/domain')) {
    const source = read(file);
    for (const spec of importsOf(source)) {
      const forbidden = forbiddenDomain.find((layer) => spec.includes(`/${layer}/`));
      assert(!forbidden, `${file} does not import ${forbidden ?? 'outer layer'}`);
    }
  }

  const documentImports = importsOf(read('src/core/document.js'));
  for (const spec of documentImports) {
    assert(!spec.includes('/render/'), 'core/document does not import render');
    assert(!spec.includes('/viz/'), 'core/document does not import viz');
    assert(!spec.includes('/geometry/'), 'core/document does not import geometry');
  }

  for (const file of ['src/generators/helpers.js', 'src/generators/surfaceLattice.js']) {
    const source = read(file);
    assert(!importsOf(source).some((spec) => spec.includes('/render/')), `${file} does not import render`);
    assert(importsOf(source).some((spec) => spec.includes('/view/camera')), `${file} imports pure view camera`);
  }

  assert(read('src/core/units.js').includes('../domain/units.js'), 'core/units keeps a domain re-export');
  assert(read('src/render/passStyle.js').includes('../domain/passStyle.js'), 'render/passStyle keeps a domain re-export');
  assert(read('src/viz/overlays.js').includes('../domain/overlays.js'), 'viz/overlays keeps a domain re-export');
  assert(read('src/geometry/manufacturingProfile.js').includes('../domain/manufacturingProfile.js'), 'geometry/manufacturingProfile keeps a domain re-export');
  assert(read('src/geometry/repair.js').includes('../domain/fabrication.js'), 'geometry/repair imports domain cap strategies');
}
