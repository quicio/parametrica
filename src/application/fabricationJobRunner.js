/**
 * application/fabricationJobRunner.js — serializable heavy fabrication job.
 *
 * Used by the Web Worker and by synchronous fallback/tests. The input and
 * output are plain data; no DOM or App references cross the worker boundary.
 */

import { buildFabricationReport } from './fabricationSource.js';
import { initManifold } from '../geometry/manifoldEngine.js';

export async function runFabricationJob(input, { onProgress = () => {} } = {}) {
  onProgress({ phase: 'engine', value: 0 });
  await initManifold();
  const preparation = input?.preparation ?? {};
  const phase = preparation.boolean && preparation.boolean !== 'none'
    ? 'boolean'
    : preparation.selfIntersections && preparation.selfIntersections !== 'none'
      ? 'sdf'
      : 'preparing';
  onProgress({ phase, value: 0.15 });
  const report = buildFabricationReport(input);
  onProgress({ phase: 'done', value: 1 });
  return report;
}
