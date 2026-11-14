/**
 * composition/createApp.js — the only module allowed to choose concrete
 * adapters, stores and UI implementations for the browser app.
 *
 * ADR-0004: composition is the outermost layer. `App` receives services and
 * factories; it does not import P5, Exporter, Controls or localStorage stores.
 */

import { App } from '../application/App.ts';
import type { AppAdapters, AppServices } from '../application/appPorts.ts';

type Rec = Record<string, unknown>;
export interface CreateAppOptions {
  canvasContainer: HTMLElement;
  uiContainer: HTMLElement;
  telemetryEl: HTMLElement | null;
}
import { createAdvisorPort } from './createAdvisorPort.js';
import { createFabricationPort } from './createFabricationPort.js';
import { createFormPort } from './createFormPort.js';
import { createIngestPort } from './createIngestPort.js';
import { createLabPort } from './createLabPort.js';
import { createKeepPort } from './createKeepPort.js';
import { createLookPort } from './createLookPort.js';
import { createNotebookPort } from './createNotebookPort.js';
import { createPresetPort } from './createPresetPort.js';
import { createStartWithPort } from './createStartWithPort.js';
import { createRenderPort } from './createRenderPort.js';
import { createUiPort } from './createUiPort.js';
import { createPersistenceRepository, migrateLocalStorage } from '../core/persistence.js';
import { SessionStore } from '../core/session.js';
import { Notebook, NOTEBOOK_STORAGE_KEY } from '../lab/notebook.ts';
import { LocalNotebookRepository } from '../lab/notebookRepository.js';
import { NotebookWorkspace } from '../lab/workspace.ts';
import { MutationEngine } from '../mutation/MutationEngine.ts';
import { PresetManager } from '../presets/PresetManager.ts';
import { renderPresetPreview, START_WITH_PREVIEW_SIZE } from '../presets/preview.ts';
import { LOOK_PRESETS } from '../domain/lookPresets.ts';
import { LookPresetStore } from '../render/lookPresetStore.ts';
import { P5Adapter } from '../render/p5/P5Adapter.ts';
import { Exporter } from '../export/Exporter.ts';
import { Controls } from '../ui/Controls.js';
import { StartWithOverlay } from '../ui/StartWithOverlay.js';
import { DialogService } from '../ui/dialogs.js';
import { ParametricOverlay } from '../ui/ParametricOverlay.js';
import { UVDomainInset } from '../ui/UVDomainInset.js';
import { SurfaceInspector } from '../ui/SurfaceInspector.js';
import { SeamLegend } from '../ui/SeamLegend.js';

export function createApp({ canvasContainer, uiContainer, telemetryEl }: CreateAppOptions): App {
  const storage = globalThis.localStorage ?? null;
  const persistence = createPersistenceRepository(storage);
  const storageMigration = migrateLocalStorage(storage);

  const services: Rec = {
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
    loadProductPreview: async (app: App) => {
      if (app.productPreview) return app.productPreview;
      const { ProductPreview } = await import('../render/webgl/ProductPreview.ts');
      return new ProductPreview(app as never, canvasContainer);
    },
  };

  services.notebook = new Notebook({
    storage,
    repository: new LocalNotebookRepository(
      storage,
      NOTEBOOK_STORAGE_KEY,
      persistence,
    ),
  });
  services.notebookWorkspace = new NotebookWorkspace(services.notebook as never);

  const createExportPort = (app: App): Rec => ({
    getDocument: () => app.document,
    getEvaluation: () => app.evaluation,
    rendererSize: () => app.renderer.size?.() ?? { w: 0, h: 0 },
    artboardDataURL: () => app.renderer.artboardDataURL?.() ?? null,
    saveCanvas: (name: string) => (app.renderer as unknown as { p?: { saveCanvas(name: string, type: string): void } }).p?.saveCanvas(name, 'png'),
    renderNow: () => app.renderer.renderNow?.(),
    artboardImageData: (maxSize: number) => app.renderer.artboardImageData?.(maxSize),
    getFabricationReport: () => app.controls?.fabricationReport ?? null,
    productPreviewCapture: () => app.productPreview?.capture?.() ?? null,
    notify: (message: string, kind?: string) => app.notify(message, kind),
    setTime: (time: number) => app.setTime(time),
    serializeDocument: (name: string, doc: unknown) => app.presets.serialize(name, doc),
  });

  const adapters: Rec = {
    createParametricOverlay: (app: App) => new ParametricOverlay(canvasContainer, app),
    createUVDomainInset: (app: App) => new UVDomainInset(canvasContainer, app),
    createSurfaceInspector: (app: App) => new SurfaceInspector(canvasContainer, app, createRenderPort(app) as never),
    createSeamLegend: (app: App) => new SeamLegend(canvasContainer, app),
    createRenderer: (app: App) => new P5Adapter(canvasContainer, app as never),
    createExporter: (app: App) => new Exporter(createExportPort(app)),
    createControls: (app: App) => new Controls(createUiPort(app) as never, uiContainer, {
      fabrication: createFabricationPort(app),
      render: createRenderPort(app),
      notebook: createNotebookPort(app),
      preset: createPresetPort(app),
      lab: createLabPort(app),
      form: createFormPort(app),
      look: createLookPort(app),
      keep: createKeepPort(app),
      ingest: createIngestPort(app),
      advisor: createAdvisorPort(app),
    } as never),
    createStartWithOverlay: (app: App, options: { firstRun: boolean; onClose: () => void }) => new StartWithOverlay(createStartWithPort(app) as never, options as never),
  };

  return new App({
    canvasContainer,
    telemetryEl,
    services: services as unknown as AppServices,
    adapters: adapters as unknown as AppAdapters,
  });
}
