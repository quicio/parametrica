/**
 * geometry/uvDomain.js — read-only summaries of a Surface parameter domain.
 *
 * UV Domain belongs to parameter space. This module never projects, frames or
 * mutates geometry; it only exposes what the evaluated Surface already says.
 */

import { isSurface } from './contracts.js';

export function summarizeSurfaceDomain(surface) {
  if (!isSurface(surface)) return null;
  const u = range(surface.domain?.u);
  const v = range(surface.domain?.v);
  if (!u || !v) return null;
  if (u.start === u.end || v.start === v.end) return null;

  const rows = Math.max(0, Math.floor(Number(surface.grid?.rows) || 0));
  const cols = Math.max(0, Math.floor(Number(surface.grid?.cols) || 0));
  if (!rows || !cols) return null;

  const closedU = Boolean(surface.domain?.closedU);
  const closedV = Boolean(surface.domain?.closedV);
  return {
    valid: true,
    surfaceId: surface.id ?? null,
    u: {
      ...u,
      closed: closedU,
      seam: seamOf(surface.domain?.seamU ?? surface.meta?.seamU),
      rows,
    },
    v: {
      ...v,
      closed: closedV,
      seam: seamOf(surface.domain?.seamV ?? surface.meta?.seamV),
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
export function activeSurfaceDomain(evaluation, document, layerIndex = document?.activeLayer ?? 0) {
  const layers = Array.isArray(evaluation?.layers) ? evaluation.layers : null;
  if (layers && layers.length) {
    const layer = layers[layerIndex];
    if (!layer || layer.visible === false) return null;
    const surface = firstSurface(layer.geometry);
    if (!surface) return null;
    const summary = summarizeSurfaceDomain(surface);
    if (!summary) return null;
    return {
      ...summary,
      layerId: layer.id ?? null,
      layerName: layer.name ?? null,
      surfaceCount: surfaceCount(layer.geometry),
    };
  }

  const surface = firstSurface(evaluation?.geometry);
  if (!surface) return null;
  const summary = summarizeSurfaceDomain(surface);
  if (!summary) return null;
  const layer = document?.layers?.[layerIndex] ?? document?.layers?.[0] ?? null;
  return {
    ...summary,
    layerId: layer?.id ?? null,
    layerName: layer?.name ?? document?.name ?? null,
    surfaceCount: surfaceCount(evaluation?.geometry),
  };
}

export function formatDomainValue(value, max = 4) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const rounded = Number(number.toFixed(max));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function range(raw) {
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

function seamOf(value) {
  return value === 'reverse' ? 'reverse' : 'normal';
}

function firstSurface(geometry) {
  if (!Array.isArray(geometry)) return null;
  return geometry.find((item) => isSurface(item)) ?? null;
}

function surfaceCount(geometry) {
  if (!Array.isArray(geometry)) return 0;
  return geometry.filter((item) => isSurface(item)).length;
}
