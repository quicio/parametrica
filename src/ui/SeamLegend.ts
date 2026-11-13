/**
 * SeamLegend — compact UI legend for declared domain borders, seams and
 * reverse/twist seams. It never participates in geometry or render.
 */

const STORAGE_KEY = 'parametrica.seams.v1';

export class SeamLegend {
  app: unknown;
  enabled: boolean;
  quad: boolean;
  el: HTMLDivElement;
  title: HTMLSpanElement;
  status: HTMLSpanElement;

  constructor(container: HTMLElement, app: unknown) {
    this.app = app;
    this.enabled = loadEnabled();
    this.quad = false;
    this.el = document.createElement('div');
    this.el.id = 'seam-legend';
    this.el.className = 'seam-legend';
    this.el.setAttribute('aria-label', 'Surface seam legend');

    this.title = document.createElement('span');
    this.title.className = 'seam-legend-title';
    this.title.textContent = 'SEAMS';
    this.status = document.createElement('span');
    this.status.className = 'seam-legend-status';
    this.status.textContent = '—';

    this.el.append(
      this.title,
      legendItem('sl-border', 'border'),
      legendItem('sl-seam', 'seam'),
      legendItem('sl-twist', 'twist'),
      this.status,
    );
    container.appendChild(this.el);
    this.updateVisibility();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = Boolean(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: this.enabled }));
    } catch {
      /* UI-only state */
    }
    this.updateVisibility();
  }

  onLayoutChange(quadActive: boolean): void {
    this.quad = Boolean(quadActive);
    this.updateVisibility();
  }

  setStatus(status: string): void {
    const labels: Record<string, string> = {
      declared: 'declared seams',
      borders: 'borders only',
      partial: 'partial data',
      empty: 'no visible seams',
      unavailable: 'mapping unavailable',
    };
    this.status.textContent = labels[status] ?? '—';
  }

  updateVisibility(): void {
    this.el.hidden = !this.enabled || this.quad;
  }

  destroy(): void {
    this.el.remove();
  }
}

function legendItem(className: string, label: string): HTMLSpanElement {
  const item = document.createElement('span');
  item.className = 'seam-legend-item';
  const line = document.createElement('span');
  line.className = `sl-line ${className}`;
  const text = document.createElement('span');
  text.textContent = label;
  item.append(line, text);
  return item;
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
