/** Serializable heavy fabrication job used by the worker and sync fallback. */

import { buildFabricationReport } from './fabricationSource.js';
import { initManifold } from '../geometry/manifoldEngine.js';

export interface FabricationPreparationLike {
  boolean?: string;
  repair?: boolean;
  selfIntersections?: string;
  lattice?: boolean;
  [key: string]: unknown;
}

export interface FabricationJobInput {
  preparation?: FabricationPreparationLike | null;
  [key: string]: unknown;
}

export interface FabricationJobProgress {
  phase: string;
  value: number;
}

export async function runFabricationJob(
  input: FabricationJobInput,
  { onProgress = () => {} }: { onProgress?: (progress: FabricationJobProgress) => void } = {},
): Promise<Record<string, unknown>> {
  onProgress({ phase: 'engine', value: 0 });
  await initManifold();
  const preparation = input?.preparation ?? {};
  const phase = preparation.boolean && preparation.boolean !== 'none'
    ? 'boolean'
    : preparation.selfIntersections && preparation.selfIntersections !== 'none'
      ? 'sdf'
      : 'preparing';
  onProgress({ phase, value: 0.15 });
  const report = buildFabricationReport(input as Parameters<typeof buildFabricationReport>[0]) as unknown as Record<string, unknown>;
  onProgress({ phase: 'done', value: 1 });
  return report;
}
