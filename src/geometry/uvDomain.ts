/**
 * geometry/uvDomain.ts — read-only summaries of a Surface parameter domain.
 *
 * UV Domain belongs to parameter space. This module never projects, frames or
 * mutates geometry; it only exposes what the evaluated Surface already says.
 */

import { isSurface } from './contracts.ts';
import type { Surface } from './contracts.ts';

type Rec = Record<string, unknown>;

export interface DomainRange {
  start: number;
  end: number;
  min: number;
  max: number;
  reversed: boolean;
  span: number;
}

export interface DomainAxis extends DomainRange {
  closed: boolean;
  seam: 'normal' | 'reverse';
  rows?: number;
  cols?: number;
}

export interface SurfaceDomainSummary {
  valid: true;
  surfaceId: string | null;
  u: DomainAxis;
  v: DomainAxis;
  closedU: boolean;
  closedV: boolean;
  rows: number;
  cols: number;
}

export interface ActiveSurfaceSummary extends SurfaceDomainSummary {
  layerId: string | null;
  layerName: unknown;
  surfaceCount: number;
}

export function summarizeSurfaceDomain(surface: unknown): SurfaceDomainSummary | null {
  if (!isSurface(surface)) return null;
  const typed: Surface = surface;
  const u = range(typed.domain?.u);
  const v = range(typed.domain?.v);
  if (!u || !v) return null;
  if (u.start === u.end || v.start === v.end) return null;

  const rows = Math.max(0, Math.floor(Number(typed.grid?.rows) || 0));
  const cols = Math.max(0, Math.floor(Number(typed.grid?.cols) || 0));
  if (!rows || !cols) return null;

  const closedU = Boolean(typed.domain?.closedU);
  const closedV = Boolean(typed.domain?.closedV);
  return {
    valid: true,
    surfaceId: typed.id ?? null,
    u: {
      ...u,
      closed: closedU,
      seam: seamOf(typed.domain?.seamU ?? typed.meta?.seamU),
      rows,
    },
    v: {
      ...v,
      closed: closedV,
      seam: seamOf(typed.domain?.seamV ?? typed.meta?.seamV),
      cols,
    },
    closedU,
    closedV,
    rows,
    cols,
  };
}

/**
 * Resolve the first valid surface in the active, visible layer. Returns null
 * for planar, hidden or non-surface layers.
 */
export function activeSurfaceDomain(
  evaluation: Rec | null | undefined,
  document: Rec | null | undefined,
  layerIndex: number = Number(document?.activeLayer ?? 0),
): ActiveSurfaceSummary | null {
  const layers = Array.isArray(evaluation?.layers) ? evaluation.layers as Rec[] : null;
  if (layers && layers.length) {
    const layer = layers[layerIndex];
    if (!layer || layer.visible === false) return null;
    const surface = firstSurface(layer.geometry);
    if (!surface) return null;
    const summary = summarizeSurfaceDomain(surface);
    if (!summary) return null;
    return {
      ...summary,
      layerId: (layer.id as string | undefined) ?? null,
      layerName: layer.name ?? null,
      surfaceCount: surfaceCount(layer.geometry),
    };
  }

  const surface = firstSurface(evaluation?.geometry);
  if (!surface) return null;
  const summary = summarizeSurfaceDomain(surface);
  if (!summary) return null;
  const layersList = Array.isArray(document?.layers) ? document.layers as Rec[] : [];
  const layer = layersList[layerIndex] ?? layersList[0] ?? null;
  return {
    ...summary,
    layerId: (layer?.id as string | undefined) ?? null,
    layerName: layer?.name ?? document?.name ?? null,
    surfaceCount: surfaceCount(evaluation?.geometry),
  };
}

export function formatDomainValue(value: unknown, max = 4): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const rounded = Number(number.toFixed(max));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function range(raw: unknown): DomainRange | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const a = Number(raw[0]);
  const b = Number(raw[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return {
    start: a,
    end: b,
    min: Math.min(a, b),
    max: Math.max(a, b),
    reversed: b < a,
    span: Math.abs(b - a),
  };
}

function seamOf(value: unknown): 'normal' | 'reverse' {
  return value === 'reverse' ? 'reverse' : 'normal';
}

function firstSurface(geometry: unknown): Surface | null {
  if (!Array.isArray(geometry)) return null;
  return (geometry as unknown[]).find((item) => isSurface(item)) as Surface | undefined ?? null;
}

function surfaceCount(geometry: unknown): number {
  if (!Array.isArray(geometry)) return 0;
  return (geometry as unknown[]).filter((item) => isSurface(item)).length;
}
