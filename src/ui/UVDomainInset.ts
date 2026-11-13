/**
 * UVDomainInset — a compact, read-only view of the active Surface domain.
 * It is DOM-only: it never touches geometry, the renderer, the frame or an
 * export. The chart has no interaction and does not capture canvas input.
 */

import { activeSurfaceDomain, formatDomainValue } from '../geometry/uvDomain.ts';
import type { ActiveSurfaceSummary, DomainAxis } from '../geometry/uvDomain.ts';

type Rec = Record<string, unknown>;

const STORAGE_KEY = 'parametrica.uvDomain.v1';
const SVG_NS = 'http://www.w3.org/2000/svg';
const CHART = Object.freeze({
  width: 188,
  height: 132,
  left: 26,
  right: 14,
  top: 12,
  bottom: 26,
  divisions: 4,
});

interface UVApp {
  evaluation: Rec | null;
  document: Rec | null;
}

interface AxisArrowOptions {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label: string;
  labelX: number;
  labelY: number;
}

export class UVDomainInset {
  app: UVApp;
  visible: boolean;
  el: HTMLElement;
  head: HTMLDivElement;
  layer: HTMLSpanElement;
  chart: SVGSVGElement;
  foot: HTMLDivElement;

  constructor(container: HTMLElement, app: UVApp) {
    this.app = app;
    this.visible = loadVisible();
    this.el = document.createElement('aside');
    this.el.id = 'uv-domain';
    this.el.className = 'uv-domain';
    this.el.setAttribute('aria-label', 'Active surface UV domain');
    this.el.hidden = true;

    this.head = document.createElement('div');
    this.head.className = 'uv-domain-head';
    const title = document.createElement('span');
    title.className = 'uv-domain-title';
    title.textContent = 'UV DOMAIN';
    this.layer = document.createElement('span');
    this.layer.className = 'uv-domain-layer';
    this.head.append(title, this.layer);

    this.chart = document.createElementNS(SVG_NS, 'svg');
    this.chart.setAttribute('class', 'uv-domain-chart');
    this.chart.setAttribute('role', 'img');
    this.chart.setAttribute('viewBox', `0 0 ${CHART.width} ${CHART.height}`);
    this.chart.setAttribute('aria-label', 'Parameter domain chart');

    this.foot = document.createElement('div');
    this.foot.className = 'uv-domain-foot';

    this.el.append(this.head, this.chart, this.foot);
    container.appendChild(this.el);
    this.refresh();
  }

  setVisible(visible: boolean): void {
    this.visible = Boolean(visible);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ visible: this.visible }));
    } catch {
      /* UI-only state: storage failure must not break the canvas */
    }
    this.refresh();
  }

  refresh(): void {
    const summary = this.visible
      ? activeSurfaceDomain(this.app.evaluation, this.app.document)
      : null;
    this.el.hidden = !summary;
    this.el.dataset.visible = String(this.visible);
    if (!summary) {
      this.chart.replaceChildren();
      this.foot.replaceChildren();
      this.layer.textContent = '';
      return;
    }

    this.layer.textContent = summary.surfaceCount > 1
      ? `${String(summary.layerName ?? 'Surface')} · 1/${summary.surfaceCount}`
      : String(summary.layerName ?? 'Surface');
    this.layer.title = String(summary.layerName ?? '');

    this.chart.replaceChildren(...chartNodes(summary));
    this.chart.setAttribute(
      'aria-label',
      `U ${formatDomainValue(summary.u.start)} to ${formatDomainValue(summary.u.end)}, `
      + `V ${formatDomainValue(summary.v.start)} to ${formatDomainValue(summary.v.end)}`,
    );

    this.foot.replaceChildren();
    const ranges = document.createElement('div');
    ranges.className = 'uv-domain-range';
    ranges.textContent = `u [${formatDomainValue(summary.u.start)} → ${formatDomainValue(summary.u.end)}] · `
      + `v [${formatDomainValue(summary.v.start)} → ${formatDomainValue(summary.v.end)}]`;
    ranges.title = `u min ${formatDomainValue(summary.u.min)} · max ${formatDomainValue(summary.u.max)}; `
      + `v min ${formatDomainValue(summary.v.min)} · max ${formatDomainValue(summary.v.max)}`;
    const meta = document.createElement('div');
    meta.className = 'uv-domain-meta';
    meta.textContent = [
      `${summary.rows}×${summary.cols} samples`,
      closureLabel('U', summary.u),
      closureLabel('V', summary.v),
    ].join(' · ');
    this.foot.append(ranges, meta);

    this.el.dataset.uStart = String(summary.u.start);
    this.el.dataset.uEnd = String(summary.u.end);
    this.el.dataset.uMin = String(summary.u.min);
    this.el.dataset.uMax = String(summary.u.max);
    this.el.dataset.vStart = String(summary.v.start);
    this.el.dataset.vEnd = String(summary.v.end);
    this.el.dataset.vMin = String(summary.v.min);
    this.el.dataset.vMax = String(summary.v.max);
    this.el.dataset.rows = String(summary.rows);
    this.el.dataset.cols = String(summary.cols);
  }

  destroy(): void {
    this.el.remove();
  }
}

function chartNodes(summary: ActiveSurfaceSummary): SVGElement[] {
  const width = CHART.width - CHART.left - CHART.right;
  const height = CHART.height - CHART.top - CHART.bottom;
  const x0 = CHART.left;
  const y0 = CHART.top;
  const x1 = x0 + width;
  const y1 = y0 + height;
  const nodes: SVGElement[] = [];

  const grid = svg('g', { class: 'uv-domain-grid' });
  for (let i = 0; i <= CHART.divisions; i++) {
    const t = i / CHART.divisions;
    grid.appendChild(svg('line', {
      x1: x0 + width * t,
      y1: y0,
      x2: x0 + width * t,
      y2: y1,
    }));
    grid.appendChild(svg('line', {
      x1: x0,
      y1: y0 + height * t,
      x2: x1,
      y2: y0 + height * t,
    }));
  }
  nodes.push(grid);

  nodes.push(svg('rect', {
    class: 'uv-domain-border',
    x: x0,
    y: y0,
    width,
    height,
  }));

  if (summary.u.closed) {
    nodes.push(svg('line', {
      class: 'uv-domain-seam',
      x1: x0, y1: y0, x2: x0, y2: y1,
    }));
    nodes.push(svg('line', {
      class: 'uv-domain-seam',
      x1: x1, y1: y0, x2: x1, y2: y1,
    }));
  }
  if (summary.v.closed) {
    nodes.push(svg('line', {
      class: 'uv-domain-seam',
      x1: x0, y1: y0, x2: x1, y2: y0,
    }));
    nodes.push(svg('line', {
      class: 'uv-domain-seam',
      x1: x0, y1: y1, x2: x1, y2: y1,
    }));
  }

  nodes.push(axisArrow({
    fromX: summary.u.reversed ? x1 : x0,
    fromY: y1 + 10,
    toX: summary.u.reversed ? x0 : x1,
    toY: y1 + 10,
    label: 'U',
    labelX: summary.u.reversed ? x0 - 7 : x1 + 7,
    labelY: y1 + 13,
  }));
  nodes.push(axisArrow({
    fromX: x0 - 9,
    fromY: summary.v.reversed ? y0 : y1,
    toX: x0 - 9,
    toY: summary.v.reversed ? y1 : y0,
    label: 'V',
    labelX: x0 - 12,
    labelY: summary.v.reversed ? y1 + 3 : y0 - 4,
  }));

  nodes.push(svg('text', {
    class: 'uv-domain-corner',
    x: x0,
    y: y1 + 21,
  }, formatDomainValue(summary.u.start)));
  nodes.push(svg('text', {
    class: 'uv-domain-corner',
    x: x1,
    y: y1 + 21,
    'text-anchor': 'end',
  }, formatDomainValue(summary.u.end)));
  nodes.push(svg('text', {
    class: 'uv-domain-corner',
    x: x0 - 3,
    y: y1,
    'text-anchor': 'end',
  }, formatDomainValue(summary.v.start)));
  nodes.push(svg('text', {
    class: 'uv-domain-corner',
    x: x0 - 3,
    y: y0 + 4,
    'text-anchor': 'end',
  }, formatDomainValue(summary.v.end)));

  return nodes;
}

function axisArrow({ fromX, fromY, toX, toY, label, labelX, labelY }: AxisArrowOptions): SVGGElement {
  const group = svg('g', { class: 'uv-domain-axis' }) as SVGGElement;
  group.appendChild(svg('line', { x1: fromX, y1: fromY, x2: toX, y2: toY }));
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = 4;
  group.appendChild(svg('path', {
    d: `M ${toX} ${toY} l ${-size * Math.cos(angle - 0.45)} ${-size * Math.sin(angle - 0.45)} `
      + `M ${toX} ${toY} l ${-size * Math.cos(angle + 0.45)} ${-size * Math.sin(angle + 0.45)}`,
  }));
  group.appendChild(svg('text', {
    x: labelX,
    y: labelY,
    'text-anchor': 'middle',
  }, label));
  return group;
}

function svg(name: string, attrs: Record<string, unknown> = {}, text: string | null = null): SVGElement {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  if (text !== null) node.textContent = text;
  return node;
}

function closureLabel(axis: string, domain: DomainAxis): string {
  if (!domain.closed) return `${axis} open`;
  if (domain.seam === 'reverse') return `${axis} closed ↺`;
  return `${axis} closed`;
}

function loadVisible(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { visible?: unknown } | null;
    return parsed?.visible === true;
  } catch {
    return false;
  }
}
