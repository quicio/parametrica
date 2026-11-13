/**
 * ui/widgets/HarmonicsEditor.ts — Fourier harmonic table (spec §7).
 *
 * Two tables (x-series, y-series); each harmonic: frequency, amplitude,
 * phase, rotation, offset. Add / remove rows — the user sculpts curves
 * by adding harmonics.
 */

import type { Harmonic } from '../../core/schema.ts';

type HarmonicAxis = 'harmonicsX' | 'harmonicsY';
type HarmonicKey = 'freq' | 'amp' | 'phase' | 'rot' | 'ox' | 'oy';

interface HarmonicsOptions {
  getRows: (axis: HarmonicAxis) => Harmonic[];
  onChange: (axis: HarmonicAxis, rows: Harmonic[]) => void;
}

const COLUMNS: Array<{ key: HarmonicKey; label: string; step: number }> = [
  { key: 'freq', label: 'FREQ', step: 0.25 },
  { key: 'amp', label: 'AMP', step: 0.01 },
  { key: 'phase', label: 'PHASE', step: 0.01 },
  { key: 'rot', label: 'ROT', step: 0.01 },
  { key: 'ox', label: 'OX', step: 0.01 },
  { key: 'oy', label: 'OY', step: 0.01 },
];

export class HarmonicsEditor {
  el: HTMLDivElement;
  getRows: (axis: HarmonicAxis) => Harmonic[];
  onChange: (axis: HarmonicAxis, rows: Harmonic[]) => void;

  /**
   * @param opts row accessors and change callback
   */
  constructor({ getRows, onChange }: HarmonicsOptions) {
    this.getRows = getRows;
    this.onChange = onChange;
    this.el = document.createElement('div');
    this.el.className = 'harmonics-editor';
    this.render();
  }

  refresh(): void {
    this.render();
  }

  setDisabled(disabled: boolean): void {
    this.el.classList.toggle('disabled', Boolean(disabled));
    for (const control of this.el.querySelectorAll<HTMLInputElement>('input, button')) {
      control.disabled = Boolean(disabled);
    }
  }

  render(): void {
    this.el.innerHTML = '';
    for (const axis of ['harmonicsX', 'harmonicsY'] as HarmonicAxis[]) {
      this.el.appendChild(this.renderTable(axis));
    }
  }

  renderTable(axis: HarmonicAxis): HTMLDivElement {
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
          next[index]![col.key] = Number(input.value) || 0;
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

function defaultHarmonic(axis: HarmonicAxis): Harmonic {
  return {
    freq: 1,
    amp: 0.1,
    phase: 0,
    rot: axis === 'harmonicsY' ? Math.PI / 2 : 0,
    ox: 0,
    oy: 0,
  };
}
