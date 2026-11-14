/**
 * image-evenodd.test.mjs — contour nesting and even-odd fill/export.
 */

import '../../src/generators/index.ts';
import '../../src/operators/index.ts';
import '../../src/render/passes/index.ts';
import { traceImageContours, buildFourierDocuments } from '../../src/input/imageTrace.ts';
import { evaluateDocument } from '../../src/core/engine.ts';
import { Exporter } from '../../src/export/Exporter.ts';

function makeImage(width, height, inside) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const value = inside(x, y) ? 0 : 255;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  return { width, height, data };
}

function exportSVG(doc) {
  const evaluation = evaluateDocument(doc, { time: 0 });
  const exporter = new Exporter({
    document: doc,
    evaluation,
    renderer: { size: () => ({ w: doc.view.artboard.width, h: doc.view.artboard.height }) },
  });
  return exporter.buildSVGFromCurrent().svg;
}

function enableFill(doc, layerIndex = 0) {
  doc.layers[layerIndex].style.fill = {
    ...doc.layers[layerIndex].style.fill,
    enabled: true,
    color: '#ffffff',
    opacity: 1,
  };
  doc.view.style = doc.layers[layerIndex].style;
}

export async function run(assert) {
  const ring = makeImage(240, 240, (x, y) => {
    const distance = Math.hypot(x - 120, y - 120);
    return distance > 42 && distance < 90;
  });
  const trace = traceImageContours(ring, { harmonics: 16, samples: 256 });
  assert(trace.ok && trace.count === 2 && trace.holeCount === 1, 'ring trace keeps outer and hole contours');

  const outer = trace.contours.find((entry) => !entry.hole);
  const hole = trace.contours.find((entry) => entry.hole);
  assert(outer.depth === 0 && outer.parent === null, 'outer contour is depth zero');
  assert(hole.depth === 1 && hole.parent === trace.contours.indexOf(outer), 'hole nests under the outer contour');

  const doc = buildFourierDocuments(trace, { name: 'Ring' });
  assert(doc.layers.length === 2, 'each contour remains an editable Fourier layer');
  assert(doc.layers.every((layer) => layer.trace?.group), 'traced layers keep a shared fill group');
  assert(doc.layers[0].trace.hole === false && doc.layers[1].trace.hole === true, 'hole metadata survives into the document');

  enableFill(doc);
  const svg = exportSVG(doc);
  const fillPath = svg.match(/<path[^>]*fill-rule="evenodd"[^>]*>/)?.[0] ?? '';
  assert(svg.includes('class="svg-trace-fill"'), 'SVG emits a shared trace fill group');
  assert(fillPath.includes('fill-rule="evenodd"'), 'trace fill uses the even-odd rule');
  assert((fillPath.match(/M /g) ?? []).length === 2, 'ring fill contains outer and hole subpaths');
  assert((svg.match(/<path[^>]*fill="none"/g) ?? []).length === 2, 'strokes do not paint over the hole');

  const nested = makeImage(240, 240, (x, y) => {
    const distance = Math.hypot(x - 120, y - 120);
    return (distance > 50 && distance < 100) || distance < 20;
  });
  const nestedTrace = traceImageContours(nested, { harmonics: 16, samples: 256 });
  assert(nestedTrace.ok && nestedTrace.count === 3, 'nested ring and island are traced separately');
  const depths = nestedTrace.contours.map((entry) => entry.depth);
  assert(Math.min(...depths) === 0, 'nested scene has an outer contour');
  assert(Math.max(...depths) >= 2, 'an island inside a hole nests at depth two');
  const nestedDoc = buildFourierDocuments(nestedTrace, { name: 'Nested ring' });
  enableFill(nestedDoc);
  const nestedSvg = exportSVG(nestedDoc);
  const nestedFill = nestedSvg.match(/<path[^>]*fill-rule="evenodd"[^>]*>/)?.[0] ?? '';
  assert((nestedFill.match(/M /g) ?? []).length === 3, 'nested fill keeps three alternating subpaths');
  assert(nestedDoc.layers.length === 3, 'nested contours stay editable');

  const circle = makeImage(200, 200, (x, y) => Math.hypot(x - 100, y - 100) < 70);
  const circleDoc = buildFourierDocuments(traceImageContours(circle, { harmonics: 20, samples: 256 }), { name: 'Circle' });
  enableFill(circleDoc);
  const circleSvg = exportSVG(circleDoc);
  const circleFill = circleSvg.match(/<path[^>]*fill-rule="evenodd"[^>]*>/)?.[0] ?? '';
  assert((circleFill.match(/M /g) ?? []).length === 1, 'a solid contour still exports one filled subpath');
}
