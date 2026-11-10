/** Structural contracts shared by render passes. */

import type { FillContext } from '../fill.ts';

export interface PassPoint {
  x: number;
  y: number;
  x3?: number;
  y3?: number;
  h3?: number;
  depth?: number;
  depthAlpha?: number;
  [key: string]: unknown;
}

export interface PassCurve {
  points: PassPoint[];
  closed?: boolean;
  meta?: { controlPoints?: PassPoint[]; [key: string]: unknown };
  [key: string]: unknown;
}

export interface PassMesh {
  vertices: PassPoint[];
  faces: number[][];
  [key: string]: unknown;
}

export interface PassStrokeStyle {
  color?: string;
  width?: unknown;
  opacity?: unknown;
  cap?: string;
  join?: string;
  [key: string]: unknown;
}

export interface PassFillStyle {
  enabled?: boolean;
  color?: string;
  opacity?: number;
  gradient?: unknown;
  [key: string]: unknown;
}

export interface PassStyle {
  stroke?: PassStrokeStyle;
  fill?: PassFillStyle;
  [key: string]: unknown;
}

export interface PassView {
  style?: PassStyle;
  strokeWeight?: number;
  projection?: string;
  colorMetric?: string;
  colorRamp?: string[];
  [key: string]: unknown;
}

export interface PassAnalysisCurve {
  tangents?: PassPoint[];
  normals?: PassPoint[];
  curvatures?: number[];
  [key: string]: unknown;
}

export interface PassAnalysis {
  perCurve?: PassAnalysisCurve[];
  [key: string]: unknown;
}

export interface PassGenerator {
  id?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PassDocument {
  generator?: PassGenerator | null;
  [key: string]: unknown;
}

export interface PassData {
  curves?: PassCurve[];
  meshes?: PassMesh[];
  view?: PassView;
  bbox?: unknown;
  analysis?: PassAnalysis | null;
  document?: PassDocument;
  time?: number;
  [key: string]: unknown;
}

export interface PassImage {
  width: number;
  height: number;
  pixels: Uint8ClampedArray | number[];
  loadPixels(): void;
  updatePixels(): void;
}

export interface PassContext extends FillContext {
  width: number;
  height: number;
  CLOSE: string;
  LINES: string;
  TRIANGLES: string;
  ROUND: string;
  BUTT: string;
  SQUARE: string;
  MITER: string;
  BEVEL: string;
  noStroke(): unknown;
  fill(...args: unknown[]): unknown;
  stroke(...args: unknown[]): unknown;
  strokeWeight(value: number): unknown;
  strokeCap(value: string): unknown;
  strokeJoin(value: string): unknown;
  beginShape(kind?: string | null): unknown;
  vertex(x: number, y: number): unknown;
  endShape(mode?: string | null): unknown;
  line(x1: number, y1: number, x2: number, y2: number): unknown;
  circle(x: number, y: number, diameter: number): unknown;
  square(x: number, y: number, size: number): unknown;
  point(x: number, y: number): unknown;
  textSize(value: number): unknown;
  text(value: unknown, x: number, y: number): unknown;
  image(image: PassImage, x: number, y: number, width: number, height: number): unknown;
  createImage(width: number, height: number): PassImage;
}

export type Rgb = [number, number, number];
