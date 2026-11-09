/**
 * quad-svg-export.test.mjs — Quad layout in SVG and plotter output.
 */

import '../../src/generators/index.js';
import '../../src/operators/index.js';
import '../../src/render/passes/index.js';
import { evaluateDocument } from '../../src/core/engine.js';
import { BUILT_IN_PRESETS } from '../../src/presets/builtins.js';
import { Exporter } from '../../src/export/Exporter.js';

export async function run(assert) {
  const doc = BUILT_IN_PRESETS['Enneper Surface']();
  doc.generator.params.samplesU = 24;
  doc.generator.params.samplesV = 16;
  const evaluation = evaluateDocument(doc, { time: 0 });
  const exporter = new Exporter({
    document: doc,
    evaluation,
    renderer: { size: () => ({ w: doc.view.artboard.width, h: doc.view.artboard.height }) },
  });

  doc.view.layout = 'quad';
  const quad = exporter.buildSVGFromCurrent();
  assert((quad.svg.match(/data-panel=/g) ?? []).length === 4, 'Quad SVG contains four panels');
  assert(quad.svg.includes('data-panel="3d"') && quad.svg.includes('data-panel="xy"'), 'Quad SVG keeps panel identity');
  assert((quad.svg.match(/<svg /g) ?? []).length === 5, 'Quad SVG nests four panel SVGs');
  assert(quad.omitted.length === 0, 'Quad SVG does not report the layout as unsupported');

  const plotter = exporter.buildPlotterSVGFromCurrent();
  assert((plotter.svg.match(/data-panel=/g) ?? []).length === 4, 'Quad plotter contains four panels');

  doc.view.layout = 'single';
  const single = exporter.buildSVGFromCurrent();
  assert((single.svg.match(/data-panel=/g) ?? []).length === 0, 'single SVG has no quad panels');
}
