/**
 * fabrication-worker.test.mjs — runner, fallback and job controller.
 */

import { createMesh } from '../../src/geometry/contracts.js';
import { runFabricationJob } from '../../src/application/fabricationJobRunner.js';
import { FabricationJobs, isHeavyFabrication } from '../../src/application/fabricationJobs.js';

const UNITS = { world: 'mm', mmPerWorldUnit: 1, artboard: 'unitless', mmPerArtboardUnit: null };

function cube(offset = 0, id = `cube-${offset}`) {
  const h = 1;
  const vertices = [
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
  ].map(([x, y, z]) => ({ x: x + offset, y, z }));
  const faces = [
    [4, 5, 6], [4, 6, 7], [1, 0, 3], [1, 3, 2], [1, 2, 6], [1, 6, 5],
    [0, 4, 7], [0, 7, 3], [3, 7, 6], [3, 6, 2], [0, 1, 5], [0, 5, 4],
  ];
  return createMesh({ id, vertices, faces });
}

export async function run(assert) {
  assert(isHeavyFabrication({ boolean: 'union' }), 'boolean is heavy');
  assert(isHeavyFabrication({ repair: true }), 'repair is heavy');
  assert(isHeavyFabrication({ selfIntersections: 'sdf' }), 'self-intersection repair is heavy');
  assert(!isHeavyFabrication({ scope: 'composition', boolean: 'none' }), 'multi-body selection alone is light');

  const evaluation = {
    layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, geometry: [], meshes: [cube(0), cube(1)] }],
  };
  const progress = [];
  const report = await runFabricationJob({
    evaluation,
    layerIndex: 0,
    units: UNITS,
    preparation: { scope: 'active-layer', boolean: 'union', tolerance: 1e-4 },
  }, { onProgress: (entry) => progress.push(entry) });
  assert(report.exportable === true, 'worker runner returns an exportable report');
  assert(progress.some((entry) => entry.phase === 'engine'), 'worker runner reports engine initialization');
  assert(progress.some((entry) => entry.phase === 'boolean'), 'worker runner reports the boolean phase');
  assert(progress.some((entry) => entry.phase === 'done' && entry.value === 1), 'worker runner reports completion');

  let fallbackResult = null;
  const fallback = new FabricationJobs({
    useWorker: false,
    syncRunner: (input) => ({ marker: input.marker }),
    onResult: (result) => { fallbackResult = result; },
  });
  fallback.run({ marker: 7 });
  assert(fallbackResult?.marker === 7, 'controller falls back to synchronous execution');

  let fake = null;
  const messages = [];
  const events = { results: [], progress: [], errors: [] };
  const fakeFactory = () => {
    fake = {
      terminated: false,
      postMessage(message) { messages.push(message); },
      terminate() { this.terminated = true; },
      onmessage: null,
      onerror: null,
    };
    return fake;
  };
  const jobs = new FabricationJobs({
    useWorker: true,
    workerFactory: fakeFactory,
    onResult: (result) => events.results.push(result),
    onProgress: (entry) => events.progress.push(entry),
    onError: (message) => events.errors.push(message),
  });
  jobs.run({ marker: 1 });
  const id = messages[0]?.id;
  assert(messages[0]?.type === 'run' && Number.isInteger(id), 'controller sends a run message');
  fake.onmessage({ data: { type: 'progress', id, phase: 'boolean', value: 0.5 } });
  fake.onmessage({ data: { type: 'result', id, report: { exportable: true } } });
  assert(events.progress[0]?.phase === 'boolean', 'controller forwards progress');
  assert(events.results[0]?.exportable === true, 'controller forwards results');
  jobs.cancel();
  assert(fake.terminated === true, 'cancel terminates the worker');
  assert(jobs.running === false, 'cancel clears the running state');
}
