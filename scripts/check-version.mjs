/**
 * check-version.mjs — package.json and CHANGELOG must agree.
 *
 * ADR-0001 makes package.json authoritative and requires every delivery to
 * publish a dated changelog entry. This gate runs inside `npm run check`.
 */

import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const changelog = readFileSync(new URL('CHANGELOG.md', root), 'utf8');

const released = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1] ?? null;
if (!released) {
  console.error('check-version: CHANGELOG.md has no released version heading');
  process.exit(1);
}
if (released !== pkg.version) {
  console.error(`check-version: package.json is ${pkg.version} but CHANGELOG.md is ${released}`);
  process.exit(1);
}

const index = readFileSync(new URL('index.html', root), 'utf8');
if (!index.includes('id="app-version"')) {
  console.error('check-version: index.html must expose the dynamic app-version span');
  process.exit(1);
}

console.log(`check-version: ${pkg.version} matches CHANGELOG.md`);
