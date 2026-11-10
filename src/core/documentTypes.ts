/** Structural document/view/layer contracts shared by core and callers. */

import type { Frame } from '../view/transform.ts';
import type { SpatialReference } from '../view/spatialReference.ts';
import type { CoordinateSettings } from '../view/viewportCoordinates.ts';
import type { Units } from '../domain/units.ts';
import type { Timeline } from '../animation/timeline.ts';

export type Rec = Record<string, unknown>;

export interface StrokeStyleShape {
  color: string;
  width: number;
  opacity: number;
  cap: string;
  join: string;
  [key: string]: unknown;
}
export interface FillStyleShape {
  enabled: boolean;
  color: string;
  opacity: number;
  gradient: unknown;
  [key: string]: unknown;
}
export interface StyleShape {
  stroke: StrokeStyleShape;
  fill: FillStyleShape;
  blend: string;
  [key: string]: unknown;
}
export interface ArtboardShape {
  width: number;
  height: number;
  background: string;
  margin: number;
}
export interface CameraShape {
  yaw: number;
  pitch: number;
  fov: number;
}
export interface ViewShape {
  modes: string[];
  overlays: Record<string, boolean>;
  strokeWeight: number;
  guides: boolean;
  camera: CameraShape;
  artboard: ArtboardShape;
  style: StyleShape;
  projection: string;
  layout: string;
  colorMetric: string;
  passOpacity: Record<string, number>;
  colorRamp: string[] | null;
  frame: Frame;
  reference: SpatialReference;
  units: Units;
  coordinates: CoordinateSettings;
  passStyle: Rec;
  preview: Rec;
  fabrication: Rec;
  [key: string]: unknown;
}
export interface GeneratorStageShape {
  id: string;
  params: Record<string, unknown>;
  mods: Record<string, string>;
  [key: string]: unknown;
}
export interface OperatorStageShape extends GeneratorStageShape {
  enabled: boolean;
}
export interface TraceShape {
  group: string;
  hole: boolean;
  depth: number;
}
export interface LayerShape {
  type: string;
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  seed: number | null;
  modes: string[] | null;
  colorMetric: string | null;
  generator: GeneratorStageShape | null;
  operators: OperatorStageShape[];
  style: StyleShape;
  source?: { layerId: string };
  trace?: TraceShape;
  fabricationRole?: string;
  [key: string]: unknown;
}
export interface AnimationShape {
  playing: boolean;
  speed: number;
  time: number;
  timeline: Timeline;
  [key: string]: unknown;
}
export interface DocumentShape {
  version: number;
  name: string;
  seed: number;
  activeLayer: number;
  layers: LayerShape[];
  view: ViewShape;
  animation: AnimationShape;
  generator?: GeneratorStageShape | null;
  operators?: OperatorStageShape[];
  [key: string]: unknown;
}
export interface LayerOverrides {
  id?: unknown;
  name?: unknown;
  visible?: unknown;
  locked?: unknown;
  seed?: unknown;
  modes?: unknown;
  colorMetric?: unknown;
  generator?: unknown;
  operators?: unknown;
  style?: unknown;
  strokeWeight?: unknown;
  trace?: unknown;
  fabricationRole?: unknown;
}
export interface DocumentOverrides {
  name?: string;
  seed?: unknown;
  generator?: unknown;
  operators?: unknown;
  style?: unknown;
  trace?: unknown;
  view?: unknown;
  animation?: unknown;
  [key: string]: unknown;
}
export interface FabricationGroupShape {
  op: string;
  layers: string[];
  name: string;
}
