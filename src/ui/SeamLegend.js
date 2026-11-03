/**
 * SeamLegend — compact UI legend for declared domain borders, seams and
 * reverse/twist seams. It never participates in geometry or render.
 */

const STORAGE_KEY = 'parametrica.seams.v1';

export class SeamLegend {
  constructor(container, app) {
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

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: this.enabled }));
    } catch {
      /* UI-only state */
    }
    this.updateVisibility();
  }

  onLayoutChange(quadActive) {
    this.quad = Boolean(quadActive);
    this.updateVisibility();
  }

  setStatus(status) {
    const labels = {
      declared: 'declared seams',
      borders: 'borders only',
      partial: 'partial data',
      empty: 'no visible seams',
      unavailable: 'mapping unavailable',
    };
    this.status.textContent = labels[status] ?? '—';
  }

  updateVisibility() {
    this.el.hidden = !this.enabled || this.quad;
  }

  destroy() {
    this.el.remove();
  }
}

function legendItem(className, label) {
  const item = document.createElement('span');
  item.className = 'seam-legend-item';
  const line = document.createElement('span');
  line.className = `sl-line ${className}`;
  const text = document.createElement('span');
  text.textContent = label;
  item.append(line, text);
  return item;
}

function loadEnabled() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.enabled === true;
  } catch {
    return false;
  }
}
