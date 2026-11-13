/**
 * workers/fabricationWorker.ts — heavy fabrication jobs off the main thread.
 */

import { runFabricationJob } from '../application/fabricationJobRunner.js';
import type { FabricationJobInput } from '../application/fabricationJobRunner.ts';

interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown) => void;
}

const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = async (event: MessageEvent): Promise<void> => {
  const data = event.data as { type?: string; id?: string; input?: FabricationJobInput } | null | undefined;
  if (!data || data.type !== 'run') return;
  const { id, input } = data;
  try {
    const report = await runFabricationJob(input!, {
      onProgress: (progress) => workerScope.postMessage({ type: 'progress', id, ...progress }),
    });
    workerScope.postMessage({ type: 'result', id, report });
  } catch (error) {
    workerScope.postMessage({ type: 'error', id, message: error instanceof Error ? error.message : String(error) });
  }
};
