/**
 * ParametricOverlay — a minimal, toggleable property readout at the canvas edge.
 * It is UI-only; it never mutates the document.
 */

import { buildParametricSummary } from '../lab/parametricSummary.ts';

const STORAGE_KEY = 'parametrica.parametrics.v1';

export class ParametricOverlay {
  constructor(container, app) {
    this.app = app;
    this.visible = loadVisible();
    this.el = document.createElement('aside');
    this.el.id = 'parametrics';
    this.el.className = 'parametrics';
    this.el.setAttribute('aria-label', 'Parametric properties');
    this.el.dataset.visible = String(this.visible);

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.type = 'button';
    this.toggleBtn.className = 'parametrics-toggle';
    this.toggleBtn.textContent = 'ƒ';
    this.toggleBtn.title = 'Show or hide parametric properties';
    this.toggleBtn.setAttribute('aria-label', 'Show or hide parametric properties');
    this.toggleBtn.addEventListener('click', () => this.app.setParametricsVisible(!this.visible));

    this.body = document.createElement('div');
    this.body.className = 'parametrics-body';
    this.body.setAttribute('role', 'region');
    this.body.setAttribute('aria-label', 'Active layer parametric properties');

    this.el.append(this.toggleBtn, this.body);
    container.appendChild(this.el);
    this.setVisible(this.visible);
    this.refresh();
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.el.dataset.visible = String(this.visible);
    this.body.hidden = !this.visible;
    this.toggleBtn.setAttribute('aria-expanded', String(this.visible));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ visible: this.visible }));
    } catch {
      /* UI-only state: storage failure must not break the canvas */
    }
    if (this.visible) this.refresh();
  }

  toggle() {
    this.app.setParametricsVisible(!this.visible);
  }

  refresh() {
    if (!this.visible) return;
    const summary = buildParametricSummary(this.app.document);
    this.body.replaceChildren();
    if (!summary) {
      const empty = document.createElement('div');
      empty.className = 'parametrics-empty';
      empty.textContent = 'No active layer';
      this.body.appendChild(empty);
      return;
    }

    const head = document.createElement('div');
    head.className = 'parametrics-head';
    const title = document.createElement('span');
    title.className = 'parametrics-title';
    title.textContent = summary.layerName;
    const generator = document.createElement('span');
    generator.className = 'parametrics-generator';
    generator.textContent = summary.generatorName;
    head.append(title, generator);
    this.body.appendChild(head);

    const list = document.createElement('div');
    list.className = 'parametrics-list';
    for (const param of summary.params) {
      const row = document.createElement('div');
      row.className = 'parametrics-row';
      if (param.advanced) row.classList.add('advanced');
      const label = document.createElement('span');
      label.className = 'parametrics-key';
      label.textContent = param.label;
      label.title = param.key;
      const value = document.createElement('span');
      value.className = 'parametrics-value';
      value.textContent = param.value;
      value.title = param.value;
      row.append(label, value);
      list.appendChild(row);
    }
    this.body.appendChild(list);

    const foot = document.createElement('div');
    foot.className = 'parametrics-foot';
    const ops = summary.operators.length
      ? summary.operators.map((operator) => operator.name).join(' · ')
      : 'no operators';
    foot.textContent = `seed ${summary.seed} · ${ops}`;
    this.body.appendChild(foot);
  }

  destroy() {
    this.el.remove();
  }
}

function loadVisible() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return parsed?.visible !== false;
  } catch {
    return true;
  }
}
