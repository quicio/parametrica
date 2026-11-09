/**
 * composition/createApp.js — the only module allowed to choose concrete
 * adapters, stores and UI implementations for the browser app.
 *
 * ADR-0004: composition is the outermost layer. `App` receives services and
 * factories; it does not import P5, Exporter, Controls or localStorage stores.
 */

import { App } from '../application/App.js';
import { createFabricationPort } from './createFabricationPort.js';
import { createLabPort } from './createLabPort.js';
import { createNotebookPort } from './createNotebookPort.js';
import { createPresetPort } from './createPresetPort.js';
import { createRenderPort } from './createRenderPort.js';
import { createUiPort } from './createUiPort.js';
import { createPersistenceRepository, migrateLocalStorage } from '../core/persistence.js';
import { SessionStore } from '../core/session.js';
import { Notebook, NOTEBOOK_STORAGE_KEY } from '../lab/notebook.js';
import { LocalNotebookRepository } from '../lab/notebookRepository.js';
import { NotebookWorkspace } from '../lab/workspace.js';
import { MutationEngine } from '../mutation/MutationEngine.js';
import { PresetManager } from '../presets/PresetManager.js';
import { renderPresetPreview, START_WITH_PREVIEW_SIZE } from '../presets/preview.js';
import { LOOK_PRESETS } from '../render/lookPresets.js';
import { LookPresetStore } from '../render/lookPresetStore.js';
import { P5Adapter } from '../render/p5/P5Adapter.js';
import { Exporter } from '../export/Exporter.js';
import { Controls } from '../ui/Controls.js';
import { StartWithOverlay } from '../ui/StartWithOverlay.js';
import { DialogService } from '../ui/dialogs.js';
import { ParametricOverlay } from '../ui/ParametricOverlay.js';
import { UVDomainInset } from '../ui/UVDomainInset.js';
import { SurfaceInspector } from '../ui/SurfaceInspector.js';
import { SeamLegend } from '../ui/SeamLegend.js';

export function createApp({ canvasContainer, uiContainer, telemetryEl }) {
  const storage = globalThis.localStorage ?? null;
  const persistence = createPersistenceRepository(storage);
  const storageMigration = migrateLocalStorage(storage);

  const services = {
    persistence,
    storageMigration,
    session: new SessionStore({ repository: persistence }),
    presets: new PresetManager(storage, {
      renderPreview: renderPresetPreview,
      repository: persistence,
    }),
    mutator: new MutationEngine(),
    lookStore: new LookPresetStore(storage, {
      reservedNames: LOOK_PRESETS.map((preset) => preset.name),
    }),
    dialogs: new DialogService(),
    notebook: null,
    notebookWorkspace: null,
    renderPresetPreview,
    startWithPreviewSize: START_WITH_PREVIEW_SIZE,
  };

  services.notebook = new Notebook({
    storage,
    repository: new LocalNotebookRepository(
      storage,
      NOTEBOOK_STORAGE_KEY,
      persistence,
    ),
  });
  services.notebookWorkspace = new NotebookWorkspace(services.notebook);

  const createExportPort = (app) => ({
    getDocument: () => app.document,
    getEvaluation: () => app.evaluation,
    rendererSize: () => app.renderer.size(),
    artboardDataURL: () => app.renderer.artboardDataURL(),
    saveCanvas: (name) => app.renderer.p.saveCanvas(name, 'png'),
    renderNow: () => app.renderer.renderNow(),
    artboardImageData: (maxSize) => app.renderer.artboardImageData(maxSize),
    getFabricationReport: () => app.controls?.fabricationReport ?? null,
    productPreviewCapture: () => app.productPreview?.capture?.() ?? null,
    notify: (message, kind) => app.notify(message, kind),
    setTime: (time) => app.setTime(time),
    serializeDocument: (name, doc) => app.presets.serialize(name, doc),
  });

  const adapters = {
    createParametricOverlay: (app) => new ParametricOverlay(canvasContainer, app),
    createUVDomainInset: (app) => new UVDomainInset(canvasContainer, app),
    createSurfaceInspector: (app) => new SurfaceInspector(canvasContainer, app, createRenderPort(app)),
    createSeamLegend: (app) => new SeamLegend(canvasContainer, app),
    createRenderer: (app) => new P5Adapter(canvasContainer, app),
    createExporter: (app) => new Exporter(createExportPort(app)),
    createControls: (app) => new Controls(createUiPort(app), uiContainer, {
      fabrication: createFabricationPort(app),
      render: createRenderPort(app),
      notebook: createNotebookPort(app),
      preset: createPresetPort(app),
      lab: createLabPort(app),
    }),
    createStartWithOverlay: (app, options) => new StartWithOverlay(app, options),
  };

  return new App({
    canvasContainer,
    telemetryEl,
    services,
    adapters,
  });
}
