/** Main-thread controller for fabrication jobs. */

import { buildFabricationReport } from './fabricationSource.ts';

export interface FabricationPreparationLike {
  boolean?: string;
  repair?: boolean;
  selfIntersections?: string;
  lattice?: boolean;
  [key: string]: unknown;
}

export interface FabricationProgress {
  phase: string;
  value: number;
}

export type FabricationReportLike = Record<string, unknown>;
export type FabricationRunner = (input: unknown) => FabricationReportLike;

export interface WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}

export function isHeavyFabrication(preparation: FabricationPreparationLike = {}): boolean {
  return (preparation.boolean && preparation.boolean !== 'none')
    || preparation.repair === true
    || (preparation.selfIntersections && preparation.selfIntersections !== 'none')
    || preparation.lattice === true;
}

export class FabricationJobs {
  onProgress: (progress: FabricationProgress) => void;
  onResult: (report: FabricationReportLike) => void;
  onError: (message: string) => void;
  syncRunner: FabricationRunner;
  debounceMs: number;
  useWorker: boolean;
  workerFactory: (() => WorkerLike) | null;
  worker: WorkerLike | null;
  timer: ReturnType<typeof setTimeout> | null;
  id: number;
  running: boolean;
  pending: unknown;

  constructor({
    onProgress = () => {},
    onResult = () => {},
    onError = () => {},
    syncRunner = (input: unknown) => buildFabricationReport(input as Parameters<typeof buildFabricationReport>[0]) as unknown as FabricationReportLike,
    debounceMs = 180,
    useWorker = typeof Worker !== 'undefined',
    workerFactory = null,
  }: {
    onProgress?: (progress: FabricationProgress) => void;
    onResult?: (report: FabricationReportLike) => void;
    onError?: (message: string) => void;
    syncRunner?: FabricationRunner;
    debounceMs?: number;
    useWorker?: boolean;
    workerFactory?: (() => WorkerLike) | null;
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

  schedule(input: unknown): void {
    this.cancel();
    this.pending = input;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.run(this.pending);
    }, this.debounceMs);
  }

  run(input: unknown): void {
    this.cancel();
    const id = ++this.id;
    if (!this.useWorker) {
      try {
        const report = this.syncRunner(input);
        this.running = false;
        this.onResult(report);
      } catch (error) {
        this.running = false;
        this.onError(error instanceof Error ? error.message : String(error));
      }
      return;
    }
    this.running = true;
    const worker = this.workerFactory
      ? this.workerFactory()
      : new Worker(new URL('../workers/fabricationWorker.ts', import.meta.url), { type: 'module' }) as WorkerLike;
    this.worker = worker;
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        id?: number;
        type?: string;
        phase?: string;
        value?: number;
        report?: FabricationReportLike;
        message?: string;
      } | null;
      if (!data || data.id !== id) return;
      if (data.type === 'progress') {
        this.onProgress({ phase: String(data.phase ?? ''), value: Number(data.value) || 0 });
      } else if (data.type === 'result') {
        this.running = false;
        this.onResult(data.report ?? {});
      } else if (data.type === 'error') {
        this.running = false;
        this.onError(String(data.message ?? 'Fabrication failed'));
      }
    };
    worker.onerror = (event: ErrorEvent) => {
      if (id !== this.id) return;
      this.running = false;
      this.onError(event.message ?? 'Fabrication worker failed');
    };
    worker.postMessage({ type: 'run', id, input });
  }

  cancel(): void {
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

  dispose(): void {
    this.cancel();
  }
}
