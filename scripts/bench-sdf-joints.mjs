/**
 * bench-sdf-joints.mjs — full-preset local SDF joint comparison.
 *
 * Compares the production `rounded` joints with a budgeted `blend` path that
 * uses local Manifold.levelSet joints for selected nodes and rounded fallback
 * for the rest.
 */

import '../src/generators/index.ts';
import '../src/operators/index.ts';
import '../src/render/passes/index.ts';
import { evaluateDocument } from '../src/core/engine.ts';
import { BUILT_IN_PRESETS } from '../src/presets/builtins.ts';
import { buildFabricationReport } from '../src/application/fabricationSource.ts';
import { initManifold } from '../src/geometry/manifoldEngine.ts';
import { mkdirSync, writeFileSync } from 'node:fs';

await initManifold();
const results = [];
for (const preset of ['Lattice Vase 200', 'Organic Lattice Vase 200']) {
  for (const cellSize of [15, 20, 25]) {
    for (const variant of [
      { jointStyle: 'rounded', blendBudget: 0 },
      { jointStyle: 'blend', blendBudget: 24 },
    ]) {
      const doc = BUILT_IN_PRESETS[preset]();
      doc.layers[0].generator.params.cellSize = cellSize;
      const evaluation = evaluateDocument(doc, { time: 0 });
      const started = Date.now();
      const report = buildFabricationReport({
        evaluation,
        layerIndex: 0,
        units: doc.view.units,
        preparation: {
          ...doc.view.fabrication,
          jointStyle: variant.jointStyle,
          blendBudget: variant.blendBudget,
        },
      });
      const row = {
        preset,
        cellSize,
        variant: `${variant.jointStyle}:${variant.blendBudget}`,
        exportable: report.exportable,
        reason: report.reason,
        wallMs: Date.now() - started,
        buildMs: report.lattice?.buildMs ?? null,
        triangles: report.triangles ?? 0,
        jointStyle: report.lattice?.jointStyle ?? null,
        jointMethod: report.lattice?.jointMethod ?? null,
        jointFallback: report.lattice?.jointFallback ?? null,
        blendedJoints: report.lattice?.blendedJoints ?? null,
        fallbackJoints: report.lattice?.fallbackJoints ?? null,
        sdfJoints: report.lattice?.sdfJoints ?? null,
        opening: report.lattice?.openingGauge?.minWidth ?? null,
        openingTarget: report.lattice?.openingTargetWidth ?? null,
      };
      results.push(row);
      console.log(`${preset.padEnd(26)} ${String(cellSize).padStart(2)} mm ${row.variant.padEnd(10)} · ${row.exportable ? 'ready' : 'FAILED'} · build ${row.buildMs ?? '—'} ms · tris ${row.triangles} · sdf ${row.sdfJoints?.blended ?? 0} · fallback ${row.fallbackJoints ?? 0} · opening ${row.opening?.toFixed?.(2) ?? '—'}`);
    }
  }
}
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/sdf-joint-benchmark.json', JSON.stringify(results, null, 2));
