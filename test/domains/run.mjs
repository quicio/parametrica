/**
 * run.mjs — domain test modules for the Node suite.
 *
 * Each module exports run(assert); the aggregate command keeps the same
 * failure semantics as the main smoke suite.
 */

import { run as coordinates } from './coordinates.test.mjs';
import { run as appearance } from './appearance.test.mjs';
import { run as surfaceSeams } from './surface-seams.test.mjs';
import { run as maintainability } from './maintainability.test.mjs';
import { run as solidPreparation } from './solid-preparation.test.mjs';
import { run as selfIntersection } from './self-intersection.test.mjs';

let failures = 0;
let checks = 0;

function assert(cond, msg) {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
}

coordinates(assert);
appearance(assert);
surfaceSeams(assert);
maintainability(assert);
solidPreparation(assert);
selfIntersection(assert);

console.log(`\n${checks - failures}/${checks} domain checks passed`);
process.exit(failures ? 1 : 0);
