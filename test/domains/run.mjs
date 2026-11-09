/**
 * run.mjs — domain test modules for the Node suite.
 *
 * Each module exports run(assert); the aggregate command keeps the same
 * failure semantics as the main smoke suite.
 */

import { run as coordinates } from './coordinates.test.mjs';
import { run as orbitCamera } from './orbit-camera.test.mjs';
import { run as surfaceLattice } from './surface-lattice.test.mjs';
import { run as printChecks } from './print-checks.test.mjs';
import { run as appearance } from './appearance.test.mjs';
import { run as surfaceSeams } from './surface-seams.test.mjs';
import { run as maintainability } from './maintainability.test.mjs';
import { run as solidPreparation } from './solid-preparation.test.mjs';
import { run as selfIntersection } from './self-intersection.test.mjs';
import { run as multiBody } from './multi-body.test.mjs';
import { run as solidBooleans } from './solid-booleans.test.mjs';
import { run as advancedRepair } from './advanced-repair.test.mjs';
import { run as threeMf } from './3mf-export.test.mjs';
import { run as topologyRepair } from './topology-repair.test.mjs';
import { run as selfIntersectionRepair } from './self-intersection-repair.test.mjs';
import { run as csgRobustness } from './csg-robustness.test.mjs';
import { run as robustPredicates } from './robust-predicates.test.mjs';
import { run as adaptiveRemesh } from './adaptive-remesh.test.mjs';
import { run as manifoldEngine } from './manifold-engine.test.mjs';
import { run as fabricationWorker } from './fabrication-worker.test.mjs';
import { run as fabricatePresets } from './fabricate-presets.test.mjs';
import { run as fabricationPreview } from './fabrication-preview.test.mjs';
import { run as exportIntegrity } from './export-integrity.test.mjs';
import { run as manufacturingProfile } from './manufacturing-profile.test.mjs';
import { run as quadSvgExport } from './quad-svg-export.test.mjs';
import { run as persistence } from './persistence.test.mjs';
import { run as imageEvenOdd } from './image-evenodd.test.mjs';
import { run as architectureBoundaries } from './architecture-boundaries.test.mjs';

let failures = 0;
let checks = 0;

function assert(cond, msg) {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
}

await coordinates(assert);
await orbitCamera(assert);
await surfaceLattice(assert);
await printChecks(assert);
await appearance(assert);
await surfaceSeams(assert);
await maintainability(assert);
await solidPreparation(assert);
await selfIntersection(assert);
await multiBody(assert);
await solidBooleans(assert);
await advancedRepair(assert);
await threeMf(assert);
await topologyRepair(assert);
await selfIntersectionRepair(assert);
await csgRobustness(assert);
await robustPredicates(assert);
await adaptiveRemesh(assert);
await await manifoldEngine(assert);
await fabricationWorker(assert);
await fabricatePresets(assert);
await fabricationPreview(assert);
await exportIntegrity(assert);
await manufacturingProfile(assert);
await quadSvgExport(assert);
await persistence(assert);
await imageEvenOdd(assert);
await architectureBoundaries(assert);

console.log(`\n${checks - failures}/${checks} domain checks passed`);
process.exit(failures ? 1 : 0);
