/** Fail when an archived spec still contains the TBD Purpose placeholder. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'openspec/specs';
const offenders = [];
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = join(root, entry.name, 'spec.md');
  try {
    if (readFileSync(file, 'utf8').includes('TBD - created by archiving')) {
      offenders.push(file);
    }
  } catch {
    // Ignore directories without a spec.md.
  }
}
if (offenders.length) {
  console.error(`Spec purposes still contain TBD placeholders:\n${offenders.join('\n')}`);
  process.exit(1);
}
console.log(`Spec purposes: ${readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length} specs checked`);
