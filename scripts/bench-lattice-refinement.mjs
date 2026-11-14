/**
 * bench-lattice-refinement.mjs — measured 15/20/25 mm refinement baseline.
 *
 * Run with: node scripts/bench-lattice-refinement.mjs
 * Results are provisional and machine-specific; they are not CI gates.
 */

import '../src/generators/index.ts';
import '../src/operators/index.ts';
import '../src/render/passes/index.ts';
import { evaluateDocument } from '../src/core/engine.ts';
import { BUILT_IN_PRESETS } from '../src/presets/builtins.ts';
import { buildFabricationReport } from '../src/application/fabricationSource.ts';
import { initManifold } from '../src/geometry/manifoldEngine.ts';
import { exportBinarySTL } from '../src/export/stl.ts';
import { export3MF } from '../src/export/3mf.ts';
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
    let stlTriangles = null;
    let mfTriangles = null;
    if (report.exportable && report.source?.geometry) {
      stlTriangles = exportBinarySTL(report.source.geometry, { units: doc.view.units }).triangles;
      mfTriangles = export3MF([report.source.geometry], { units: doc.view.units }).triangles;
    }
    results.push({
      preset,
      cellSize,
      exportable: report.exportable,
      stlTriangles,
      mfTriangles,
      heapMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      cv: evaluation.curves?.[0]?.meta?.lattice?.cellAreaCv ?? null,
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
