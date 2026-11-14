/**
 * fabrication-preview.test.mjs — optional PBR preview contracts.
 */

import '../../src/generators/index.ts';
import '../../src/operators/index.ts';
import { createDocument, sanitizeDocument } from '../../src/core/document.ts';
import { createMesh } from '../../src/geometry/contracts.ts';
import { buildSpatialScene } from '../../src/application/renderSceneBuilder.ts';
import { Exporter } from '../../src/export/Exporter.ts';

function cube() {
  const vertices = [];
  for (const x of [0, 10]) {
    for (const y of [0, 10]) {
      for (const z of [0, 10]) vertices.push({ x, y, z });
    }
  }
  return createMesh({
    id: 'preview-cube',
    vertices,
    faces: [
      [0, 1, 3, 2], [4, 6, 7, 5],
      [0, 2, 6, 4], [1, 5, 7, 3],
      [0, 4, 5, 1], [2, 3, 7, 6],
    ],
  });
}

export async function run(assert) {
  const doc = createDocument('parametric');
  assert(doc.view.preview.backend === 'p5', 'product preview defaults to technical');
  assert(doc.view.preview.material === 'ceramic', 'product preview has a material default');
  assert(doc.view.preview.quality === 'standard', 'product preview has a detail default');
  assert(doc.view.preview.shadow === true, 'product preview casts shadows by default');

  const raw = {
    ...doc,
    view: {
      ...doc.view,
      preview: {
        backend: 'webgl',
        material: 'clay',
        quality: 'high',
        exposure: 9,
        background: '#123456',
        shadow: false,
        contactShadow: false,
      },
    },
  };
  const sanitized = sanitizeDocument(raw);
  assert(sanitized.view.preview.backend === 'webgl', 'product backend survives sanitization');
  assert(sanitized.view.preview.material === 'clay', 'preview material survives sanitization');
  assert(sanitized.view.preview.quality === 'high', 'preview quality survives sanitization');
  assert(sanitized.view.preview.exposure === 2, 'preview exposure is clamped');
  assert(sanitized.view.preview.shadow === false, 'preview shadow toggle survives sanitization');

  const mesh = cube();
  const sceneDoc = {
    ...doc,
    layers: [{ ...doc.layers[0], id: 'preview-layer', name: 'Preview layer' }],
  };
  const view = {
    ...doc.view,
    preview: sanitized.view.preview,
    camera: { yaw: 0.4, pitch: 0.3, fov: 320 },
  };
  const spatial = buildSpatialScene({
    doc: sceneDoc,
    view,
    preview: { mesh, layerId: 'preview-layer' },
  });
  assert(spatial?.source === 'fabrication-preview', 'spatial sidecar identifies its source');
  assert(spatial.layers[0].meshes[0] === mesh, 'spatial sidecar reuses the prepared mesh');
  assert(spatial.layers[0].material.material === 'clay', 'spatial sidecar carries the material');
  assert(spatial.camera.yaw === 0.4, 'spatial sidecar carries the camera');
  assert(Math.abs(spatial.bbox.width - 10) < 1e-6, 'spatial sidecar carries the world bounds');

  const noPreview = buildSpatialScene({ doc: sceneDoc, view, preview: null });
  assert(noPreview === null, 'spatial sidecar is optional without a prepared mesh');

  let noticed = null;
  const exporter = new Exporter({
    document: doc,
    productPreview: null,
    notify: (message, kind) => { noticed = { message, kind }; },
  });
  assert(exporter.exportProductPreviewPNG() === null, 'product PNG export refuses an inactive preview');
  assert(noticed?.kind === 'error', 'inactive product export reports an error');
}
