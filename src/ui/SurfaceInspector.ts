/**
 * SurfaceInspector — compact, read-only surface pick readout for Canvas single.
 * Hover and pinned inspection are UI-only; no geometry or render contract is
 * mutated.
 */

import { validatePickResult } from '../domain/interaction/surfacePicker.ts';
import type { PickResult } from '../domain/interaction/surfacePicker.ts';
import type { DocumentShape } from '../core/documentTypes.ts';

const STORAGE_KEY = 'parametrica.surfaceInspector.v1';

interface InspectorApp {
  document: DocumentShape;
  evaluation: unknown;
  pointerDragging: boolean;
  inspectAtCanvas: (x: number, y: number) => void;
}

interface InspectorRender {
  quadActive?: boolean;
}

export class SurfaceInspector {
  app: InspectorApp;
  render: InspectorRender | null;
  enabled: boolean;
  lastPoint: { x: number; y: number } | null;
  hovering: boolean;
  hoverResult: PickResult | null;
  pinned: boolean;
  pinnedResult: PickResult | null;
  pinnedView: string | null;
  pinnedLayerId: string | null;
  lastMessage: string | null;
  el: HTMLElement;
  head: HTMLDivElement;
  title: HTMLSpanElement;
  status: HTMLSpanElement;
  pinBtn: HTMLButtonElement;
  body: HTMLDivElement;

  constructor(container: HTMLElement, app: InspectorApp, render: InspectorRender | null = null) {
    this.app = app;
    this.render = render;
    this.enabled = loadEnabled();
    this.lastPoint = null;
    this.hovering = false;
    this.hoverResult = null;
    this.pinned = false;
    this.pinnedResult = null;
    this.pinnedView = null;
    this.pinnedLayerId = null;
    this.lastMessage = null;

    this.el = document.createElement('aside');
    this.el.id = 'surface-inspector';
    this.el.className = 'surface-inspector';
    this.el.setAttribute('aria-label', 'Surface inspector');
    this.el.hidden = !this.enabled;

    this.head = document.createElement('div');
    this.head.className = 'si-head';
    this.title = document.createElement('span');
    this.title.className = 'si-title';
    this.title.textContent = 'SURFACE INSPECT';
    this.status = document.createElement('span');
    this.status.className = 'si-status';
    this.pinBtn = document.createElement('button');
    this.pinBtn.type = 'button';
    this.pinBtn.className = 'si-pin';
    this.pinBtn.textContent = 'PIN';
    this.pinBtn.title = 'Pin or release the current inspection';
    this.pinBtn.setAttribute('aria-label', 'Pin or release surface inspection');
    this.pinBtn.setAttribute('aria-pressed', 'false');
    this.pinBtn.addEventListener('click', () => this.togglePin());
    this.head.append(this.title, this.status, this.pinBtn);

    this.body = document.createElement('div');
    this.body.className = 'si-body';

    this.el.append(this.head, this.body);
    container.appendChild(this.el);
    this.updatePinButton();
    this.setMessage(this.enabled ? 'Hover a surface' : '');
  }

  setEnabled(enabled: boolean): void {
    this.enabled = Boolean(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: this.enabled }));
    } catch {
      /* UI-only state */
    }
    this.el.hidden = !this.enabled;
    if (!this.enabled) {
      this.lastPoint = null;
      this.hovering = false;
      this.hoverResult = null;
      this.pinned = false;
      this.pinnedResult = null;
      this.pinnedView = null;
      this.pinnedLayerId = null;
      this.updatePinButton();
      return;
    }
    this.setMessage(this.isQuadActive() ? 'Single view only' : 'Hover a surface');
  }

  setPoint(x: number, y: number): void {
    if (Number.isFinite(x) && Number.isFinite(y)) this.lastPoint = { x, y };
  }

  setResult(result: PickResult | null): void {
    if (!this.enabled) return;
    this.hovering = true;
    this.hoverResult = result;
    this.updatePinButton();
    if (this.pinned) return;
    if (result) this.renderResult(result);
    else this.setMessage('No surface under cursor');
  }

  activeResult(): PickResult | null {
    return this.pinned ? this.pinnedResult : (this.hovering ? this.hoverResult : null);
  }

  togglePin(): void {
    if (this.pinned) this.releasePin();
    else this.pin();
  }

  pin(): void {
    if (!this.enabled || !this.hoverResult) return;
    if (!validatePickResult(this.hoverResult, this.app.evaluation as never)) {
      this.hoverResult = null;
      this.updatePinButton();
      this.setMessage('Hover a surface');
      return;
    }
    this.pinned = true;
    this.pinnedResult = this.hoverResult;
    this.pinnedView = this.viewSignature();
    this.pinnedLayerId = this.activeLayerId();
    this.renderResult(this.pinnedResult);
  }

  releasePin(): void {
    const hadPin = this.pinned;
    this.pinned = false;
    this.pinnedResult = null;
    this.pinnedView = null;
    this.pinnedLayerId = null;
    this.updatePinButton();
    if (!this.enabled) return;
    if (this.hoverResult) this.renderResult(this.hoverResult);
    else if (hadPin) this.setMessage('Hover a surface');
  }

  invalidatePin(message = 'Pinned result invalidated'): void {
    this.pinned = false;
    this.pinnedResult = null;
    this.pinnedView = null;
    this.pinnedLayerId = null;
    this.hoverResult = null;
    this.lastPoint = null;
    this.hovering = false;
    this.updatePinButton();
    if (this.enabled) this.setMessage(message);
  }

  onLayoutChange(quadActive: boolean): void {
    if (!this.enabled) return;
    if (quadActive) {
      if (this.pinned) this.invalidatePin('Single view only');
      else this.setMessage('Single view only');
      return;
    }
    if (this.pinned) {
      this.onEvaluation();
      return;
    }
    if (this.lastPoint) this.app.inspectAtCanvas(this.lastPoint.x, this.lastPoint.y);
    else if (this.hoverResult) this.renderResult(this.hoverResult);
    else this.setMessage('Hover a surface');
  }

  onViewportChange(): void {
    this.onEvaluation();
  }

  onEvaluation(): void {
    if (!this.enabled) return;
    if (this.isQuadActive()) {
      if (this.pinned) this.invalidatePin('Single view only');
      else this.setMessage('Single view only');
      return;
    }
    if (this.app.document.animation.playing) {
      if (this.pinned) this.invalidatePin('Playback — inspection paused');
      else this.setMessage('Playback — inspection paused');
      return;
    }
    if (this.pinned) {
      if (
        this.pinnedView !== this.viewSignature()
        || this.pinnedLayerId !== this.activeLayerId()
        || !validatePickResult(this.pinnedResult, this.app.evaluation as never)
      ) {
        this.invalidatePin();
        return;
      }
      this.renderResult(this.pinnedResult!);
      return;
    }
    if (this.app.pointerDragging) return;
    if (this.lastPoint) {
      this.app.inspectAtCanvas(this.lastPoint.x, this.lastPoint.y);
      return;
    }
    if (this.hoverResult) {
      if (!validatePickResult(this.hoverResult, this.app.evaluation as never)) {
        this.hoverResult = null;
        this.updatePinButton();
        this.setMessage('Hover a surface');
      } else {
        this.renderResult(this.hoverResult);
      }
      return;
    }
    this.setMessage('Hover a surface');
  }

  clear(): void {
    this.lastPoint = null;
    this.hovering = false;
    if (!this.enabled) return;
    if (this.pinned) {
      this.renderResult(this.pinnedResult!);
      return;
    }
    if (this.hoverResult) this.renderResult(this.hoverResult);
    else this.setMessage('Hover a surface');
  }

  renderResult(result: PickResult): void {
    this.lastMessage = null;
    this.status.textContent = [
      result.projection,
      result.mappingStatus === 'ok' ? 'mapping ok' : result.mappingStatus,
    ].join(' · ');
    this.status.classList.toggle('warn', result.mappingStatus !== 'ok');

    const rows: Array<[string, string, string?]> = [
      ['surface', shortId(result.surfaceId), result.surfaceId ?? ''],
      ['layer', result.layerName ?? '—'],
      ...(result.instance ? [['source', result.sourceLayerName ?? result.sourceLayerId ?? '—'] as [string, string]] : []),
      ['triangle', `${result.faceIndex}${result.triangle == null ? '' : ` · tri ${String(result.triangle)}`}`],
      ['cell', result.cell ? `u ${result.cell.u} · v ${result.cell.v}` : '—'],
      ['uv', result.uv ? `u ${fmt(result.uv.u)} · v ${fmt(result.uv.v)}` : '—'],
      ['xyz', `x ${fmt(result.world.x)} · y ${fmt(result.world.y)} · z ${fmt(result.world.z)}`],
      ['depth', result.orthoDepth
        ? `${result.orthoDepth.axis} ${fmt(result.orthoDepth.value)}`
        : `dist ${fmt(result.distance)}`],
      ['mapping', result.mappingStatus],
    ];
    this.body.replaceChildren(...rows.map(([label, value, title]) => row(label, value, title)));
    this.updatePinButton();
  }

  setMessage(message: string): void {
    if (!this.enabled) return;
    if (this.lastMessage === message) return;
    this.lastMessage = message;
    this.status.textContent = '';
    this.status.classList.remove('warn');
    this.body.replaceChildren();
    if (message) {
      const empty = document.createElement('div');
      empty.className = 'si-empty';
      empty.textContent = message;
      this.body.appendChild(empty);
    }
    this.updatePinButton();
  }

  updatePinButton(): void {
    this.pinBtn.textContent = this.pinned ? 'RELEASE' : 'PIN';
    this.pinBtn.disabled = !this.pinned && !this.hoverResult;
    this.pinBtn.setAttribute('aria-pressed', String(this.pinned));
  }

  isQuadActive(): boolean {
    const active = this.render?.quadActive;
    return active === undefined
      ? this.app.document.view.layout === 'quad'
      : Boolean(active);
  }

  activeLayerId(): string | null {
    const doc = this.app.document;
    return doc.layers?.[doc.activeLayer ?? 0]?.id ?? null;
  }

  viewSignature(): string {
    const view = this.app.document.view;
    return JSON.stringify({
      projection: view.projection,
      camera: view.camera,
      frame: view.frame,
      layout: view.layout,
      artboard: view.artboard,
    });
  }

  destroy(): void {
    this.el.remove();
  }
}

function row(label: string, value: string, title = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'si-row';
  const key = document.createElement('span');
  key.className = 'si-key';
  key.textContent = label;
  const val = document.createElement('span');
  val.className = 'si-value';
  val.textContent = value;
  if (title || value) val.title = title || value;
  el.append(key, val);
  return el;
}

function shortId(value: string | null): string {
  if (!value) return '—';
  const text = String(value);
  return text.length > 22 ? `…${text.slice(-21)}` : text;
}

function fmt(value: unknown): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return String(Number(number.toFixed(3)));
}

function loadEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { enabled?: unknown } | null;
    return parsed?.enabled === true;
  } catch {
    return false;
  }
}
