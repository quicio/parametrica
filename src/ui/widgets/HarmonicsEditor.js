/**
 * ui/widgets/HarmonicsEditor.js — Fourier harmonic table (spec §7).
 *
 * Two tables (x-series, y-series); each harmonic: frequency, amplitude,
 * phase, rotation, offset. Add / remove rows — the user sculpts curves
 * by adding harmonics.
 */

const COLUMNS = [
  { key: 'freq', label: 'FREQ', step: 0.25 },
  { key: 'amp', label: 'AMP', step: 0.01 },
  { key: 'phase', label: 'PHASE', step: 0.01 },
  { key: 'rot', label: 'ROT', step: 0.01 },
  { key: 'ox', label: 'OX', step: 0.01 },
  { key: 'oy', label: 'OY', step: 0.01 },
];

export class HarmonicsEditor {
  /**
   * @param {{getRows: () => Array, onChange: (rows: Array) => void}} opts
   */
  constructor({ getRows, onChange }) {
    this.getRows = getRows;
    this.onChange = onChange;
    this.el = document.createElement('div');
    this.el.className = 'harmonics-editor';
    this.render();
  }

  refresh() {
    this.render();
  }

  render() {
    this.el.innerHTML = '';
    for (const axis of ['harmonicsX', 'harmonicsY']) {
      this.el.appendChild(this.renderTable(axis));
    }
  }

  renderTable(axis) {
    const rows = this.getRows(axis);
    const box = document.createElement('div');
    box.className = 'harm-table';

    const title = document.createElement('div');
    title.className = 'harm-title';
    title.textContent = axis === 'harmonicsX' ? 'x(t) = Σ' : 'y(t) = Σ';
    box.appendChild(title);

    const header = document.createElement('div');
    header.className = 'harm-row harm-head';
    for (const col of COLUMNS) {
      const cell = document.createElement('span');
      cell.textContent = col.label;
      header.appendChild(cell);
    }
    header.appendChild(document.createElement('span'));
    box.appendChild(header);

    rows.forEach((row, index) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'harm-row';
      for (const col of COLUMNS) {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = String(col.step);
        input.value = String(row[col.key]);
        input.addEventListener('change', () => {
          const next = this.getRows(axis).map((r) => ({ ...r }));
          next[index][col.key] = Number(input.value) || 0;
          this.onChange(axis, next);
        });
        rowEl.appendChild(input);
      }
      const remove = document.createElement('button');
      remove.className = 'harm-remove';
      remove.textContent = '×';
      remove.title = 'Remove harmonic';
      remove.disabled = rows.length <= 1;
      remove.addEventListener('click', () => {
        const next = this.getRows(axis).filter((_, i) => i !== index);
        this.onChange(axis, next.length ? next : [defaultHarmonic(axis)]);
      });
      rowEl.appendChild(remove);
      box.appendChild(rowEl);
    });

    const add = document.createElement('button');
    add.className = 'harm-add';
    add.textContent = '+ ADD HARMONIC';
    add.addEventListener('click', () => {
      this.onChange(axis, [...this.getRows(axis).map((r) => ({ ...r })), defaultHarmonic(axis)]);
    });
    box.appendChild(add);

    return box;
  }
}

function defaultHarmonic(axis) {
  return {
    freq: 1,
    amp: 0.1,
    phase: 0,
    rot: axis === 'harmonicsY' ? Math.PI / 2 : 0,
    ox: 0,
    oy: 0,
  };
}
