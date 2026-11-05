/**
 * maintainability.test.mjs — import-boundary and module-ownership checks.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const sectionsDir = join(root, 'src/ui/sections');
const sectionFiles = readdirSync(sectionsDir).filter((name) => name.endsWith('.js'));

export function run(assert) {
  assert(sectionFiles.length >= 4, 'inspector sections are split into domain modules');
  for (const name of sectionFiles) {
    const source = readFileSync(join(sectionsDir, name), 'utf8');
    assert(!/from '\.\/[^']+\.js'/.test(source), `${name} does not import another section module`);
    assert(/export function build\w+Section\(controls\)/.test(source), `${name} exports section builders`);
  }

  const controls = readFileSync(join(root, 'src/ui/Controls.js'), 'utf8');
  const wrappers = controls.match(/^ {2}build\w+Section\(\) \{ build\w+Section\(this\); \}$/gm) ?? [];
  assert(wrappers.length >= 20, 'Controls only delegates section builds');
  assert(!/^ {2}build\w+Section\(\) \{\n/m.test(controls), 'Controls contains no inline section bodies');

  const adapter = readFileSync(join(root, 'src/render/p5/P5Adapter.js'), 'utf8');
  assert(!adapter.includes('buildCoordinateTicks('), 'P5Adapter no longer owns coordinate overlay math');
  assert(!adapter.includes('buildSeamOverlay('), 'P5Adapter no longer owns seam overlay math');
  assert(adapter.includes("from './overlays.js'"), 'P5Adapter routes overlays through the overlay module');
  const overlays = readFileSync(join(root, 'src/render/p5/overlays.js'), 'utf8');
  for (const name of ['drawQuadView', 'drawCoordinates', 'drawReference', 'drawSeamOverlay', 'drawInspectionOverlay']) {
    assert(overlays.includes(`export function ${name}`), `${name} lives in the overlay module`);
  }

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert(pkg.scripts.test.includes('test/lab.smoke.mjs'), 'npm test still runs the core smoke suite');
  assert(pkg.scripts.test.includes('test/domains/run.mjs'), 'npm test runs the domain modules');
}
