/**
 * application/appPorts.ts — structural contracts between the App controller
 * and the services/adapters injected by the composition root.
 *
 * ADR-0004: the application layer must not import concrete adapters, so these
 * are structural views of what App actually uses.
 */

import type { MigrationResult, PersistenceRepository } from '../core/persistence.ts';
import type { SessionStore } from '../core/session.ts';

export interface VectorLike {
  x?: unknown;
  y?: unknown;
  z?: unknown;
  [key: string]: unknown;
}

export interface LayerGeneratorLike {
  id: string;
  params: Record<string, unknown>;
  mods: Record<string, unknown>;
}

export interface LayerOperatorLike {
  id: string;
  enabled: boolean;
  params: Record<string, unknown>;
  mods: Record<string, unknown>;
}

export interface LayerStyleLike {
  stroke?: { width?: number; [key: string]: unknown };
  fill?: unknown;
  [key: string]: unknown;
}

export interface AppLayer {
  type?: string;
  id: string;
  name: string;
  visible?: boolean;
  locked?: boolean;
  seed?: number | null;
  modes?: string[] | null;
  colorMetric?: string | null;
  generator?: LayerGeneratorLike | null;
  operators?: LayerOperatorLike[];
  style: LayerStyleLike;
  source?: { layerId: string } | null;
  fabricationRole?: string;
  trace?: unknown;
  meshes?: unknown[];
  geometry?: unknown[];
  [key: string]: unknown;
}

export interface CameraLike {
  yaw?: number;
  pitch?: number;
  fov?: number;
  [key: string]: unknown;
}

export interface AnimationTimelineLike {
  loop?: boolean;
  duration?: number;
  [key: string]: unknown;
}

export interface AppAnimation {
  time: number;
  playing: boolean;
  timeline?: AnimationTimelineLike;
  [key: string]: unknown;
}

export interface AppView {
  projection?: string;
  layout?: string;
  style?: LayerStyleLike;
  strokeWeight?: number | undefined;
  camera?: CameraLike;
  modes?: string[];
  overlays?: unknown;
  colorMetric?: string;
  guides?: unknown;
  reference?: unknown;
  artboard?: unknown;
  preview?: { backend?: string; [key: string]: unknown };
  fabrication?: { latticePreview?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface AppDocument {
  name: string;
  seed: number;
  activeLayer: number;
  layers: AppLayer[];
  view: AppView;
  animation: AppAnimation;
  generator?: LayerGeneratorLike;
  operators?: LayerOperatorLike[];
  version?: number;
  [key: string]: unknown;
}

export interface EvaluationLayer {
  curves?: Array<{ closed?: boolean; [key: string]: unknown }>;
  meshes?: unknown[];
  geometry?: Array<{ kind?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface EvaluationError {
  message: string;
  [key: string]: unknown;
}

export interface EvaluationStats {
  curveCount: number;
  pointCount: number;
  peakPoints?: number;
  arcLength: number;
  evalMs: number;
  [key: string]: unknown;
}

export interface EvaluationLike {
  curves: Array<{ points?: VectorLike[]; closed?: boolean; [key: string]: unknown }>;
  layers?: EvaluationLayer[];
  meshes?: unknown[];
  geometry?: Array<{ kind?: string; [key: string]: unknown }>;
  errors: EvaluationError[];
  stats: EvaluationStats;
  bbox?: unknown;
  worldBBox?: unknown;
  [key: string]: unknown;
}

export interface RectLike {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FabricationPreviewLike {
  mesh?: unknown;
  layerId?: string;
  [key: string]: unknown;
}

export interface ImageUnderlayLike {
  visible: boolean;
  opacity: number;
  scale: number;
  x: number;
  y: number;
  rotation: number;
  image?: unknown;
  [key: string]: unknown;
}

export interface ImageInputLike {
  width?: number;
  height?: number;
  threshold?: number;
  invert?: boolean;
  url?: string;
  [key: string]: unknown;
}

export interface ProductPreviewLike {
  ready?: boolean;
  mount(): void;
  update(scene: unknown): void;
  setActive(active: boolean): void;
  capture?(): unknown;
}

export interface RendererLike {
  quadActive?: boolean;
  invalidateCoordinatePin?(): void;
  artboardRect(): RectLike;
  thumbnailDataURL?(): string | null;
  setProductPreviewActive?(active: boolean): void;
}

export interface OverlayLike {
  visible?: boolean;
  refresh?(): void;
  setVisible(visible: boolean): void;
}

export interface SurfaceInspectorLike {
  enabled?: boolean;
  onEvaluation(): void;
  setEnabled(enabled: boolean): void;
  setPoint(x: number, y: number): void;
  setMessage(message: string): void;
  setResult(result: unknown): void;
  clear(): void;
}

export interface SeamLegendLike {
  enabled?: boolean;
  setEnabled(enabled: boolean): void;
}

export interface PanelLike {
  scheduleAuto?(): void;
  refresh?(): void;
}

export interface ControlsLike {
  mode?: string;
  fabricationReport?: unknown;
  labPanel?: PanelLike;
  advisorPanel?: PanelLike;
  notebookPanel?: PanelLike;
  evolutionPanel?: PanelLike;
  rebuildAll(): void;
  sync(): void;
  showErrors(errors: unknown): void;
  refreshStatus?(): void;
  refreshRenderModes?(): void;
  refreshCoordinatePin?(): void;
  refreshFabricate?(): void;
  refreshLookPresets?(): void;
  refreshValues?(): void;
  refreshUserLooks?(): void;
  syncTimeRange?(time: number): void;
  syncParametricsToggle?(): void;
  syncUVDomainToggle?(): void;
  syncSurfaceInspectorToggle?(): void;
  syncSeamsToggle?(): void;
}

export interface StartWithOverlayLike {
  el?: HTMLElement;
  open(): void;
  focusFirst(): void;
}

export interface PresetService {
  get(name: string): AppDocument | null;
  parse(json: string): { name: string; document: AppDocument };
  markUsed(name: string): void;
  ensureLargePreview(name: string, size: number): string | null;
}

export interface MutatorLike {
  mutate(document: AppDocument): AppDocument;
}

export interface UserLookLike {
  id: string;
  name: string;
  modes: string[];
  overlays: Record<string, boolean>;
  colorMetric: string;
  guides: boolean;
  passOpacity?: Record<string, number>;
  [key: string]: unknown;
}

export type LookSaveResult =
  | { ok: true; look: UserLookLike }
  | { ok: false; error: string };

export interface LookStoreLike {
  get(id: string): UserLookLike | null;
  save(name: string, view: AppView): LookSaveResult;
  remove(id: string): boolean;
}

export interface CheckpointLike {
  id: string;
  name: string;
  document?: unknown;
  [key: string]: unknown;
}

export interface NotebookLike {
  lastError?: string | null;
  add(entry: Record<string, unknown>): CheckpointLike;
  get(id: string): CheckpointLike | null;
  importJSON(text: string): { added: number; skipped: number };
}

export interface NotebookWorkspaceLike {
  target: { projectId: string | null; seriesId: string | null };
}

export interface AppServices {
  persistence: PersistenceRepository;
  storageMigration: MigrationResult;
  session: SessionStore;
  presets: PresetService;
  mutator: MutatorLike;
  lookStore: LookStoreLike;
  dialogs: unknown;
  notebook: NotebookLike;
  notebookWorkspace: NotebookWorkspaceLike;
  renderPresetPreview: (document: AppDocument, options: { size: number }) => string | null;
  startWithPreviewSize: number;
  loadProductPreview: (app: unknown) => Promise<ProductPreviewLike>;
}

export interface StartWithOptions {
  firstRun: boolean;
  onClose: () => void;
}

export interface AppAdapters {
  createParametricOverlay: (app: unknown) => OverlayLike;
  createUVDomainInset: (app: unknown) => OverlayLike;
  createSurfaceInspector: (app: unknown) => SurfaceInspectorLike;
  createSeamLegend: (app: unknown) => SeamLegendLike;
  createRenderer: (app: unknown) => RendererLike;
  createExporter: (app: unknown) => unknown;
  createControls: (app: unknown) => ControlsLike;
  createStartWithOverlay: (app: unknown, options: StartWithOptions) => StartWithOverlayLike;
}

export interface AppOptions {
  canvasContainer: HTMLElement;
  telemetryEl: HTMLElement | null;
  services: AppServices;
  adapters: AppAdapters;
}

export interface SaveCheckpointOptions {
  parentId?: string | null;
  parents?: unknown[];
  generation?: number;
  document?: AppDocument | null;
  descriptor?: unknown;
  thumbnail?: string | null;
  projectId?: string | null;
  seriesId?: string | null;
}
