/**
 * Fail when an archived spec's Purpose section still contains the archive
 * placeholder. Requirement text may quote the placeholder, so only the
 * section between `## Purpose` and the next heading is inspected.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'openspec/specs';
const offenders = [];
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = join(root, entry.name, 'spec.md');
  try {
    const text = readFileSync(file, 'utf8');
    const start = text.indexOf('## Purpose');
    if (start < 0) continue;
    const rest = text.slice(start + '## Purpose'.length);
    const next = rest.search(/^## /m);
    const purpose = next < 0 ? rest : rest.slice(0, next);
    if (purpose.includes('TBD - created by archiving')) offenders.push(file);
  } catch {
    // Ignore directories without a spec.md.
  }
}
if (offenders.length) {
  console.error(`Spec purposes still contain TBD placeholders:\n${offenders.join('\n')}`);
  process.exit(1);
}
console.log(`Spec purposes: ${readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length} specs checked`);
