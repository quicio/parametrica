/**
 * presets/objectBuilders.ts — reusable construction helpers for Fabricate
 * object presets.
 *
 * The helpers emit ordinary Parametric Surface layers. No geometry contract
 * changes: hollow objects are outer−inner Manifold differences, cutters are
 * additional closed layers marked `fabricationRole: 'cutter'`, and solid
 * objects are capped surfaces.
 */

import { createDocument, createLayer } from '../core/document.ts';
import type { DocumentShape, LayerShape } from '../core/documentTypes.ts';
import type { Units } from '../domain/units.ts';

type Rec = Record<string, unknown>;
export interface SurfaceLayerOptions {
  exprX: string;
  exprY: string;
  exprZ: string;
  samplesU?: number;
  samplesV?: number;
  closedU?: boolean;
  closedV?: boolean;
  fabricationRole?: string | null;
}
export interface RevolvedOptions {
  profile: string;
  height: number;
  wall: number;
  floor: number;
  innerExtra?: number;
  samplesU?: number;
  samplesV?: number;
}
export interface AddRevolvedOptions extends RevolvedOptions {
  name: string;
  x?: number;
  y?: number;
}
export interface SolidRevolvedOptions {
  profile: string;
  z?: string;
  samplesU?: number;
  samplesV?: number;
}
export interface HollowRoundedOptions {
  width: number;
  depth: number;
  height: number;
  wall: number;
  floor: number;
  exponent?: number;
  innerExtra?: number;
  samplesU?: number;
  samplesV?: number;
}
export interface HollowRoundedExprOptions {
  outerX: string;
  outerY: string;
  innerX: string;
  innerY: string;
  height: number;
  floor: number;
  innerExtra?: number;
  samplesU?: number;
  samplesV?: number;
}
export interface RoundedBoxOptions {
  width: number;
  depth: number;
  height: number;
  x?: number;
  y?: number;
  z?: number;
  exponent?: number;
  samplesU?: number;
  samplesV?: number;
  cutter?: boolean;
}
export interface CylinderZOptions {
  radius: number;
  x?: number;
  y?: number;
  z0?: number;
  z1?: number;
  samplesU?: number;
  samplesV?: number;
}
export interface CylinderYOptions {
  radius: number;
  x?: number;
  z?: number;
  y0?: number;
  y1?: number;
  samplesU?: number;
  samplesV?: number;
}

const PI = Math.PI;

export const MM_UNITS: Readonly<Units> = Object.freeze({
  world: 'mm',
  mmPerWorldUnit: 1,
  artboard: 'unitless',
  mmPerArtboardUnit: null,
});

export const HOLLOW_FABRICATION: Readonly<Rec> = Object.freeze({
  format: 'stl',
  quality: 'standard',
  scope: 'composition',
  boolean: 'difference',
  csgStrategy: 'manifold',
  repair: true,
  weld: true,
  cap: true,
  capStrategy: 'auto',
  tolerance: 1e-4,
  maxHoleEdges: 512,
});

export const SOLID_FABRICATION: Readonly<Rec> = Object.freeze({
  ...HOLLOW_FABRICATION,
  scope: 'single',
  boolean: 'none',
});

export function mmView(fabrication: unknown): Rec {
  return {
    guides: false,
    camera: { yaw: -0.6, pitch: 0.6 },
    units: { ...MM_UNITS },
    fabrication: { ...(fabrication as Rec) },
  };
}

export function surfaceLayer(name: string, {
  exprX,
  exprY,
  exprZ,
  samplesU = 96,
  samplesV = 64,
  closedU = true,
  closedV = false,
  fabricationRole = null,
}: SurfaceLayerOptions): LayerShape {
  return createLayer('parametric-surface', {
    name,
    generator: {
      params: {
        exprX,
        exprY,
        exprZ,
        u0: 0, u1: 2 * PI,
        v0: 0, v1: 1,
        samplesU, samplesV,
        closedU, closedV,
        fit: 340,
      },
    },
    ...(fabricationRole === 'cutter' ? { fabricationRole: 'cutter' } : {}),
  });
}

export function addLayer(doc: DocumentShape, layer: LayerShape): LayerShape {
  layer.style = doc.layers[0]!.style;
  doc.layers.push(layer);
  return layer;
}

export function addCutter(doc: DocumentShape, layer: LayerShape): LayerShape {
  return addLayer(doc, layer);
}

/** Hollow object of revolution with a flat floor and an open mouth. */
export function hollowRevolved(name: string, {
  profile,
  height,
  wall,
  floor,
  innerExtra = 4,
  samplesU = 96,
  samplesV = 64,
}: RevolvedOptions): DocumentShape {
  const doc = createDocument('parametric-surface', {
    name,
    generator: {
      params: {
        exprX: `(${profile})*cos(u)`,
        exprY: `(${profile})*sin(u)`,
        exprZ: `${height}*v`,
        u0: 0, u1: 2 * PI,
        v0: 0, v1: 1,
        samplesU, samplesV,
        closedU: true, closedV: false,
        fit: 340,
      },
    },
    view: mmView(HOLLOW_FABRICATION),
  });
  doc.layers[0]!.name = 'Outer shell';
  const inner = surfaceLayer('Inner shell', {
    exprX: `(${profile} - ${wall})*cos(u)`,
    exprY: `(${profile} - ${wall})*sin(u)`,
    exprZ: `${floor} + ${height + innerExtra}*v`,
    samplesU, samplesV,
  });
  addLayer(doc, inner);
  doc.activeLayer = 0;
  return doc;
}

/** Add one hollow shell (outer + inner) to an existing document. */
export function addHollowRevolved(doc: DocumentShape, {
  name,
  profile,
  height,
  wall,
  floor,
  innerExtra = 4,
  samplesU = 96,
  samplesV = 64,
  x = 0,
  y = 0,
}: AddRevolvedOptions): LayerShape[] {
  const outer = surfaceLayer(`${name} outer`, {
    exprX: `(${profile})*cos(u) + ${x}`,
    exprY: `(${profile})*sin(u) + ${y}`,
    exprZ: `${height}*v`,
    samplesU, samplesV,
  });
  const inner = surfaceLayer(`${name} inner`, {
    exprX: `(${profile} - ${wall})*cos(u) + ${x}`,
    exprY: `(${profile} - ${wall})*sin(u) + ${y}`,
    exprZ: `${floor} + ${height + innerExtra}*v`,
    samplesU, samplesV,
  });
  addLayer(doc, outer);
  addLayer(doc, inner);
  return [outer, inner];
}

/** Closed solid of revolution, capped at both ends. */
export function solidRevolved(name: string, {
  profile,
  z = '200*v',
  samplesU = 96,
  samplesV = 64,
}: SolidRevolvedOptions): DocumentShape {
  const doc = createDocument('parametric-surface', {
    name,
    generator: {
      params: {
        exprX: `(${profile})*cos(u)`,
        exprY: `(${profile})*sin(u)`,
        exprZ: z,
        u0: 0, u1: 2 * PI,
        v0: 0, v1: 1,
        samplesU, samplesV,
        closedU: true, closedV: false,
        fit: 340,
      },
    },
    view: mmView(SOLID_FABRICATION),
  });
  doc.layers[0]!.name = 'Body';
  return doc;
}

function superellipseX(radius: number, exponent: number): string {
  return `${radius}*sign(cos(u))*abs(cos(u))^(2/${exponent})`;
}

function superellipseY(radius: number, exponent: number): string {
  return `${radius}*sign(sin(u))*abs(sin(u))^(2/${exponent})`;
}

/** Hollow rounded box: outer and inner superellipse shells with a floor. */
export function hollowRounded(name: string, {
  width,
  depth,
  height,
  wall,
  floor,
  exponent = 4,
  innerExtra = 4,
  samplesU = 128,
  samplesV = 64,
}: HollowRoundedOptions): DocumentShape {
  const doc = createDocument('parametric-surface', {
    name,
    generator: {
      params: {
        exprX: superellipseX(width / 2, exponent),
        exprY: superellipseY(depth / 2, exponent),
        exprZ: `${height}*v`,
        u0: 0, u1: 2 * PI,
        v0: 0, v1: 1,
        samplesU, samplesV,
        closedU: true, closedV: false,
        fit: 340,
      },
    },
    view: mmView(HOLLOW_FABRICATION),
  });
  doc.layers[0]!.name = 'Outer shell';
  const inner = surfaceLayer('Inner shell', {
    exprX: superellipseX(width / 2 - wall, exponent),
    exprY: superellipseY(depth / 2 - wall, exponent),
    exprZ: `${floor} + ${height + innerExtra}*v`,
    samplesU, samplesV,
  });
  addLayer(doc, inner);
  doc.activeLayer = 0;
  return doc;
}

/** Rounded shell with width/depth expressions in v (for lips and steps). */
export function hollowRoundedExpr(name: string, {
  outerX,
  outerY,
  innerX,
  innerY,
  height,
  floor,
  innerExtra = 4,
  samplesU = 128,
  samplesV = 64,
}: HollowRoundedExprOptions): DocumentShape {
  const doc = createDocument('parametric-surface', {
    name,
    generator: {
      params: {
        exprX: `(${outerX})*sign(cos(u))*abs(cos(u))^(2/4)`,
        exprY: `(${outerY})*sign(sin(u))*abs(sin(u))^(2/4)`,
        exprZ: `${height}*v`,
        u0: 0, u1: 2 * PI,
        v0: 0, v1: 1,
        samplesU, samplesV,
        closedU: true, closedV: false,
        fit: 340,
      },
    },
    view: mmView(HOLLOW_FABRICATION),
  });
  doc.layers[0]!.name = 'Outer shell';
  const inner = surfaceLayer('Inner shell', {
    exprX: `(${innerX})*sign(cos(u))*abs(cos(u))^(2/4)`,
    exprY: `(${innerY})*sign(sin(u))*abs(sin(u))^(2/4)`,
    exprZ: `${floor} + ${height + innerExtra}*v`,
    samplesU, samplesV,
  });
  addLayer(doc, inner);
  doc.activeLayer = 0;
  return doc;
}

/** Closed rounded box used as a cutter or a solid part. */
export function roundedBoxLayer(name: string, {
  width,
  depth,
  height,
  x = 0,
  y = 0,
  z = 0,
  exponent = 10,
  samplesU = 64,
  samplesV = 16,
  cutter = false,
}: RoundedBoxOptions): LayerShape {
  return surfaceLayer(name, {
    exprX: `${x} + ${superellipseX(width / 2, exponent)}`,
    exprY: `${y} + ${superellipseY(depth / 2, exponent)}`,
    exprZ: `${z} + ${height}*v`,
    samplesU, samplesV,
    fabricationRole: cutter ? 'cutter' : null,
  });
}

export function cutterBox(name: string, {
  width,
  depth,
  height,
  x = 0,
  y = 0,
  z = 0,
  exponent = 10,
}: Omit<RoundedBoxOptions, 'cutter'>): LayerShape {
  return roundedBoxLayer(name, { width, depth, height, x, y, z, exponent, cutter: true });
}

/** Closed cylinder cutter along the Z axis. */
export function cutterCylinderZ(name: string, {
  radius,
  x = 0,
  y = 0,
  z0 = 0,
  z1 = 10,
  samplesU = 48,
  samplesV = 16,
}: CylinderZOptions): LayerShape {
  return surfaceLayer(name, {
    exprX: `${x} + ${radius}*cos(u)`,
    exprY: `${y} + ${radius}*sin(u)`,
    exprZ: `${z0} + ${z1 - z0}*v`,
    samplesU, samplesV,
    fabricationRole: 'cutter',
  });
}

/** Closed cylinder cutter along the Y axis (wall thickness direction). */
export function cutterCylinderY(name: string, {
  radius,
  x = 0,
  z = 0,
  y0 = 0,
  y1 = 10,
  samplesU = 48,
  samplesV = 16,
}: CylinderYOptions): LayerShape {
  return surfaceLayer(name, {
    exprX: `${x} + ${radius}*cos(u)`,
    exprY: `${y0} + ${y1 - y0}*v`,
    exprZ: `${z} + ${radius}*sin(u)`,
    samplesU, samplesV,
    fabricationRole: 'cutter',
  });
}
