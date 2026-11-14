import { test, expect } from '@playwright/test';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__parametrica?.evaluation));
  await page.evaluate(() => document.querySelector('.start-with-cancel')?.click());
}

test('traced ring renders and exports with an even-odd hole', async ({ page }) => {
  await boot(page);

  const result = await page.evaluate(async () => {
    const { traceImageContours, buildFourierDocuments } = await import('/src/input/imageTrace.ts');
    const width = 240;
    const height = 240;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const distance = Math.hypot(x - width / 2, y - height / 2);
        const value = distance > 42 && distance < 90 ? 0 : 255;
        data[index] = value;
        data[index + 1] = value;
        data[index + 2] = value;
        data[index + 3] = 255;
      }
    }
    const trace = traceImageContours(new ImageData(data, width, height), {
      harmonics: 24,
      samples: 512,
    });
    const doc = buildFourierDocuments(trace, { name: 'Ring' });
    doc.layers[0].style.fill = {
      ...doc.layers[0].style.fill,
      enabled: true,
      color: '#ffffff',
      opacity: 1,
    };
    doc.view.style = doc.layers[0].style;
    window.__parametrica.adoptDocument(doc);
    window.__parametrica.rebuild();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const app = window.__parametrica;
    const renderer = app.renderer;
    const rect = renderer.artboardRect();
    const canvas = renderer.p.drawingContext.canvas;
    const kx = canvas.width / renderer.p.width;
    const ky = canvas.height / renderer.p.height;
    const context = renderer.p.drawingContext;
    const sample = (dx, dy) => {
      const x = Math.round((rect.x + rect.w / 2 + dx * rect.scale) * kx);
      const y = Math.round((rect.y + rect.h / 2 + dy * rect.scale) * ky);
      return [...context.getImageData(x, y, 1, 1).data];
    };
    const svg = app.exporter.buildSVGFromCurrent().svg;
    const fillPath = svg.match(/<path[^>]*fill-rule="evenodd"[^>]*>/)?.[0] ?? '';
    return {
      layers: doc.layers.length,
      traces: doc.layers.map((layer) => layer.trace),
      center: sample(0, 0),
      probe: Array.from({ length: 50 }, (_, index) => sample(0, -(index + 1) * 5)),
      svgTrace: svg.includes('svg-trace-fill'),
      fillSubpaths: (fillPath.match(/M /g) ?? []).length,
      strokeFills: (svg.match(/class="svg-pass" data-pass="stroke"/g) ?? []).length,
    };
  });

  expect(result.layers).toBe(2);
  expect(result.traces[0]).toMatchObject({ hole: false, depth: 0 });
  expect(result.traces[1]).toMatchObject({ hole: true, depth: 1 });
  expect(result.center.slice(0, 3).every((value) => value < 20)).toBe(true);
  expect(result.probe.some((pixel) => pixel.slice(0, 3).every((value) => value > 200))).toBe(true);
  expect(result.svgTrace).toBe(true);
  expect(result.fillSubpaths).toBe(2);
  expect(result.strokeFills).toBe(2);
});
