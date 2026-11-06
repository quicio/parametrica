/**
 * workers/fabricationWorker.js — heavy fabrication jobs off the main thread.
 */

import { runFabricationJob } from '../application/fabricationJobRunner.js';

self.onmessage = async (event) => {
  const data = event.data;
  if (!data || data.type !== 'run') return;
  const { id, input } = data;
  try {
    const report = await runFabricationJob(input, {
      onProgress: (progress) => self.postMessage({ type: 'progress', id, ...progress }),
    });
    self.postMessage({ type: 'result', id, report });
  } catch (error) {
    self.postMessage({ type: 'error', id, message: error?.message ?? String(error) });
  }
};
