/**
 * application/fabricationJobs.js — main-thread controller for fabrication jobs.
 */

import { buildFabricationReport } from './fabricationSource.js';

export function isHeavyFabrication(preparation = {}) {
  return (preparation.boolean && preparation.boolean !== 'none')
    || preparation.repair === true
    || (preparation.selfIntersections && preparation.selfIntersections !== 'none');
}

export class FabricationJobs {
  constructor({
    onProgress = () => {},
    onResult = () => {},
    onError = () => {},
    syncRunner = buildFabricationReport,
    debounceMs = 180,
    useWorker = typeof Worker !== 'undefined',
    workerFactory = null,
  } = {}) {
    this.onProgress = onProgress;
    this.onResult = onResult;
    this.onError = onError;
    this.syncRunner = syncRunner;
    this.debounceMs = debounceMs;
    this.useWorker = useWorker;
    this.workerFactory = workerFactory;
    this.worker = null;
    this.timer = null;
    this.id = 0;
    this.running = false;
    this.pending = null;
  }

  schedule(input) {
    this.cancel();
    this.pending = input;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.run(this.pending);
    }, this.debounceMs);
  }

  run(input) {
    this.cancel();
    const id = ++this.id;
    if (!this.useWorker) {
      try {
        const report = this.syncRunner(input);
        this.running = false;
        this.onResult(report);
      } catch (error) {
        this.running = false;
        this.onError(error?.message ?? String(error));
      }
      return;
    }
    this.running = true;
    const worker = this.workerFactory
      ? this.workerFactory()
      : new Worker(new URL('../workers/fabricationWorker.js', import.meta.url), { type: 'module' });
    this.worker = worker;
    worker.onmessage = (event) => {
      const data = event.data;
      if (!data || data.id !== id) return;
      if (data.type === 'progress') {
        this.onProgress({ phase: data.phase, value: data.value });
      } else if (data.type === 'result') {
        this.running = false;
        this.onResult(data.report);
      } else if (data.type === 'error') {
        this.running = false;
        this.onError(data.message);
      }
    };
    worker.onerror = (event) => {
      if (id !== this.id) return;
      this.running = false;
      this.onError(event.message ?? 'Fabrication worker failed');
    };
    worker.postMessage({ type: 'run', id, input });
  }

  cancel() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.running = false;
    this.pending = null;
    this.id++;
  }

  dispose() {
    this.cancel();
  }
}
