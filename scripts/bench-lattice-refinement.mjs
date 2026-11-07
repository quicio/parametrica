/**
 * bench-lattice-refinement.mjs — measured 15/20/25 mm refinement baseline.
 *
 * Run with: node scripts/bench-lattice-refinement.mjs
 * Results are provisional and machine-specific; they are not CI gates.
 */

import '../src/generators/index.js';
import '../src/operators/index.js';
import '../src/render/passes/index.js';
import { evaluateDocument } from '../src/core/engine.js';
import { BUILT_IN_PRESETS } from '../src/presets/builtins.js';
import { buildFabricationReport } from '../src/application/fabricationSource.js';
import { initManifold } from '../src/geometry/manifoldEngine.js';
import { mkdirSync, writeFileSync } from 'node:fs';

await initManifold();
const results = [];
for (const preset of ['Lattice Vase 200', 'Organic Lattice Vase 200']) {
  for (const cellSize of [15, 20, 25]) {
    const doc = BUILT_IN_PRESETS[preset]();
    doc.layers[0].generator.params.cellSize = cellSize;
    const evaluation = evaluateDocument(doc, { time: 0 });
    const started = Date.now();
    const report = buildFabricationReport({
      evaluation,
      layerIndex: 0,
      units: doc.view.units,
      preparation: doc.view.fabrication,
    });
    results.push({
      preset,
      cellSize,
      exportable: report.exportable,
      buildMs: report.lattice?.buildMs ?? null,
      gaugeMs: report.lattice?.gaugeMs ?? null,
      triangles: report.triangles ?? 0,
      struts: report.lattice?.struts ?? null,
      refinement: report.lattice?.refinement ?? null,
      opening: report.lattice?.openingGauge ?? null,
      manufacturing: report.manufacturing?.overall ?? null,
      wallMs: Date.now() - started,
    });
    const row = results[results.length - 1];
    console.log(`${preset.padEnd(26)} ${String(cellSize).padStart(2)} mm · build ${String(row.buildMs).padStart(6)} ms · tris ${String(row.triangles).padStart(7)} · chord ${row.refinement?.maxChordDeviation?.toFixed?.(3) ?? '—'} · opening ${row.opening?.minWidth?.toFixed?.(2) ?? '—'} mm · ${row.exportable ? 'ready' : 'FAILED'}`);
  }
}
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/lattice-refinement-benchmark.json', JSON.stringify(results, null, 2));
