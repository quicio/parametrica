/**
 * EvolutionPanel.ts — the user is the fitness function.
 *
 * Select 2–4 notebook checkpoints, breed a bounded generation of numeric
 * crossovers with optional structural operator changes, preview every child
 * and keep only the ones worth keeping. No automatic aesthetic score.
 */

import { evaluateDocument } from '../../core/engine.ts';
import { computeDescriptor } from '../../lab/descriptor.ts';
import {
  createGeneration,
  describeStructuralChange,
  nextGeneration,
  MAX_CHILDREN,
  MAX_PARENTS,
} from '../../lab/evolution.ts';
import type { EvolutionChild } from '../../lab/evolution.ts';
import type { Checkpoint } from '../../lab/notebook.ts';
import type { DocumentShape } from '../../core/documentTypes.ts';
import { boundsOf, curvesDataURL } from '../../render/thumbnail.ts';

type Evaluation = ReturnType<typeof evaluateDocument>;

interface NotebookLike {
  items: Checkpoint[];
  get(id: string): Checkpoint | null;
}

interface EvolutionApp {
  document: DocumentShape;
  notebook: NotebookLike;
  controls?: { notebookPanel?: { refresh?: () => void } | null } | null;
  saveCheckpoint(name: string, options: {
    document: DocumentShape;
    descriptor: unknown;
    thumbnail: string | null | undefined;
    parentId: string | null;
    parents: string[];
    generation: number;
  }): Checkpoint;
}

interface VisibleChild {
  child: EvolutionChild;
  evaluation: Evaluation;
  thumbnail: string | null;
}

export class EvolutionPanel {
  app: EvolutionApp;
  selected: Set<string>;
  userTouchedParents: boolean;
  children: EvolutionChild[];
  thumbnails: Map<string, string | null>;
  generation: number;
  seed: number;
  parentSignature: string;
  el: HTMLDivElement;
  generationEl!: HTMLSpanElement;
  seedInput!: HTMLInputElement;
  childrenSelect!: HTMLSelectElement;
  structureInput!: HTMLInputElement;
  structureValue!: HTMLSpanElement;
  parentsEl!: HTMLDivElement;
  generateBtn!: HTMLButtonElement;
  clearBtn!: HTMLButtonElement;
  statusEl!: HTMLDivElement;
  gridEl!: HTMLDivElement;

  constructor(app: EvolutionApp) {
    this.app = app;
    this.selected = new Set();
    this.userTouchedParents = false;
    this.children = [];
    this.thumbnails = new Map();
    this.generation = 1;
    this.seed = 1;
    this.parentSignature = '';
    this.el = document.createElement('div');
    this.el.className = 'evolution-panel';
    this.build();
    this.refresh();
  }

  build(): void {
    const info = document.createElement('div');
    info.className = 'evolution-info';
    info.textContent = 'Select 2–4 checkpoints. Children inherit numeric values between parents and occasionally gain, lose or reorder an operator.';

    const controls = document.createElement('div');
    controls.className = 'evolution-controls';

    const generationRow = document.createElement('div');
    generationRow.className = 'evolution-row';
    this.generationEl = document.createElement('span');
    this.generationEl.className = 'evolution-generation';
    this.generationEl.textContent = 'G1';
    const seedLabel = document.createElement('label');
    seedLabel.className = 'evolution-label';
    seedLabel.textContent = 'Seed';
    this.seedInput = document.createElement('input');
    this.seedInput.className = 'evolution-seed';
    this.seedInput.type = 'number';
    this.seedInput.min = '1';
    this.seedInput.max = '999999';
    this.seedInput.step = '1';
    this.seedInput.value = '1';
    this.childrenSelect = document.createElement('select');
    this.childrenSelect.className = 'evolution-count';
    for (const count of [4, 6, 8, MAX_CHILDREN]) {
      const option = document.createElement('option');
      option.value = String(count);
      option.textContent = `${count} children`;
      if (count === 6) option.selected = true;
      this.childrenSelect.appendChild(option);
    }
    generationRow.append(this.generationEl, seedLabel, this.seedInput, this.childrenSelect);

    const structureRow = document.createElement('div');
    structureRow.className = 'evolution-row';
    const structureLabel = document.createElement('label');
    structureLabel.className = 'evolution-label';
    structureLabel.textContent = 'Structural';
    this.structureInput = document.createElement('input');
    this.structureInput.className = 'evolution-structure';
    this.structureInput.type = 'range';
    this.structureInput.min = '0';
    this.structureInput.max = '1';
    this.structureInput.step = '0.05';
    this.structureInput.value = '0.35';
    this.structureValue = document.createElement('span');
    this.structureValue.className = 'evolution-value';
    this.structureValue.textContent = '35%';
    this.structureInput.addEventListener('input', () => {
      this.structureValue.textContent = `${Math.round(Number(this.structureInput.value) * 100)}%`;
    });
    structureRow.append(structureLabel, this.structureInput, this.structureValue);
    controls.append(generationRow, structureRow);

    this.parentsEl = document.createElement('div');
    this.parentsEl.className = 'evolution-parents';

    const actions = document.createElement('div');
    actions.className = 'evolution-actions';
    this.generateBtn = document.createElement('button');
    this.generateBtn.className = 'lab-button evolution-generate';
    this.generateBtn.dataset.focusId = 'evolution-generate';
    this.generateBtn.textContent = 'Generate generation';
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn = document.createElement('button');
    this.clearBtn.className = 'lab-button evolution-clear';
    this.clearBtn.textContent = 'Clear children';
    this.clearBtn.addEventListener('click', () => this.clear());
    actions.append(this.generateBtn, this.clearBtn);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'evolution-status';
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.setAttribute('aria-live', 'polite');
    this.statusEl.textContent = 'Save at least two checkpoints to breed.';

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'evolution-grid';

    this.el.append(info, controls, this.parentsEl, actions, this.statusEl, this.gridEl);
  }

  refresh(): void {
    const items = [...this.app.notebook.items].reverse();
    const ids = new Set(items.map((cp) => cp.id));
    for (const id of [...this.selected]) if (!ids.has(id)) this.selected.delete(id);
    if (!this.userTouchedParents && this.selected.size < 2 && items.length) {
      for (const cp of items) {
        if (this.selected.size >= 2) break;
        this.selected.add(cp.id);
      }
    }
    this.generation = nextGeneration(this.app.notebook.items);
    this.generationEl.textContent = `G${this.generation}`;
    this.syncGenerateState();

    const signature = items.map((cp) => `${cp.id}:${cp.name}:${cp.generation}`).join('|');
    if (signature === this.parentSignature) {
      this.syncParents();
      return;
    }
    this.parentSignature = signature;
    this.renderParents(items);
  }

  renderParents(items: Checkpoint[]): void {
    this.parentsEl.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'lab-hint';
      empty.textContent = 'No checkpoints yet. Save forms in the Notebook to use them as parents.';
      this.parentsEl.appendChild(empty);
      return;
    }
    const head = document.createElement('div');
    head.className = 'evolution-parents-head';
    head.textContent = `Parents · ${this.selected.size}/${MAX_PARENTS}`;
    this.parentsEl.appendChild(head);
    for (const cp of items) {
      const row = document.createElement('label');
      row.className = 'evolution-parent';
      row.dataset.id = cp.id;
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'evolution-parent-check';
      check.value = cp.id;
      check.checked = this.selected.has(cp.id);
      check.addEventListener('change', () => this.toggleParent(cp.id, check.checked, check));
      const name = document.createElement('span');
      name.className = 'evolution-parent-name';
      name.textContent = cp.name;
      const meta = document.createElement('span');
      meta.className = 'evolution-parent-meta';
      meta.textContent = cp.generation > 0 ? `G${cp.generation}` : 'base';
      row.append(check, name, meta);
      this.parentsEl.appendChild(row);
    }
    this.syncParents();
  }

  toggleParent(id: string, selected: boolean, check: HTMLInputElement): void {
    this.userTouchedParents = true;
    if (selected) {
      if (this.selected.size >= MAX_PARENTS) {
        check.checked = false;
        this.setStatus(`Select at most ${MAX_PARENTS} parents`, true);
        return;
      }
      this.selected.add(id);
    } else {
      this.selected.delete(id);
    }
    this.syncParents();
    this.syncGenerateState();
  }

  syncParents(): void {
    for (const row of this.parentsEl.querySelectorAll<HTMLElement>('.evolution-parent')) {
      const selected = this.selected.has(row.dataset.id ?? '');
      row.classList.toggle('selected', selected);
      const check = row.querySelector<HTMLInputElement>('.evolution-parent-check');
      if (check) check.checked = selected;
    }
    const head = this.parentsEl.querySelector('.evolution-parents-head');
    if (head) head.textContent = `Parents · ${this.selected.size}/${MAX_PARENTS}`;
  }

  syncGenerateState(): void {
    const enabled = this.selected.size >= 2 && this.selected.size <= MAX_PARENTS;
    this.generateBtn.disabled = !enabled;
    if (!enabled) {
      this.setStatus(
        this.app.notebook.items.length < 2
          ? 'Save at least two checkpoints to breed.'
          : 'Select two to four parents.',
      );
    }
  }

  generate(): void {
    const parents = [...this.selected]
      .map((id) => this.app.notebook.get(id))
      .filter((cp): cp is Checkpoint => Boolean(cp));
    if (parents.length < 2 || parents.length > MAX_PARENTS) {
      this.setStatus(`Select ${2}–${MAX_PARENTS} parents`, true);
      return;
    }
    const seed = Math.max(1, Math.min(999999, Math.floor(Number(this.seedInput.value) || 1)));
    const count = Number(this.childrenSelect.value) || 6;
    const structuralRate = Number(this.structureInput.value) || 0;
    this.setStatus('Breeding…');
    try {
      const result = createGeneration(parents.map((cp) => cp.document), {
        count,
        seed,
        generation: this.generation,
        parentIds: parents.map((cp) => cp.id),
        structuralRate,
      });
      this.children = [];
      this.thumbnails = new Map();
      const visible: VisibleChild[] = [];
      const groups: Evaluation['curves'][] = [];
      for (const child of result.children) {
        const evaluation = evaluateDocument(child.document, {
          time: this.app.document.animation.time,
        });
        if (evaluation.errors.length || !evaluation.curves.length) continue;
        const thumbnail = curvesDataURL(evaluation.curves, { size: 150 });
        this.thumbnails.set(child.id, thumbnail);
        groups.push(evaluation.curves);
        visible.push({ child, evaluation, thumbnail });
        this.children.push(child);
      }
      if (!visible.length) {
        this.gridEl.replaceChildren();
        this.setStatus('No valid child survived evaluation. Try another seed.', true);
        return;
      }
      this.renderChildren(visible, boundsOf(groups));
      this.setStatus(
        `${visible.length} children · ${result.rejected} rejected · G${result.generation} · seed ${seed}`,
      );
    } catch (error) {
      this.setStatus(`Generation failed: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  }

  renderChildren(visible: VisibleChild[], bounds: ReturnType<typeof boundsOf>): void {
    this.gridEl.replaceChildren();
    const columns = visible.length >= 9 ? 3 : 2;
    this.gridEl.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    for (const item of visible) {
      const { child } = item;
      const card = document.createElement('div');
      card.className = 'evolution-child';
      card.dataset.id = child.id;
      const img = document.createElement('img');
      img.className = 'evolution-thumb';
      img.src = item.thumbnail ?? curvesDataURL(item.evaluation.curves, { size: 150, bounds: bounds as never }) ?? '';
      img.alt = '';
      const title = document.createElement('div');
      title.className = 'evolution-child-title';
      title.textContent = `#${child.index + 1} · G${child.generation}`;
      const detail = document.createElement('div');
      detail.className = 'evolution-child-detail';
      detail.textContent = child.structuralChanges.length
        ? child.structuralChanges.map(describeStructuralChange).join(' · ')
        : 'numeric crossover';
      detail.title = child.structuralChanges.length
        ? 'Structural changes applied to this child'
        : 'This child only crossed numeric parameters';
      const keep = document.createElement('button');
      keep.className = 'lab-button evolution-keep';
      keep.textContent = 'Keep';
      keep.addEventListener('click', () => this.keep(child, item.evaluation, item.thumbnail, keep));
      card.append(img, title, detail, keep);
      this.gridEl.appendChild(card);
    }
  }

  keep(child: EvolutionChild, evaluation: Evaluation, thumbnail: string | null, button: HTMLButtonElement | null): void {
    try {
      const descriptor = computeDescriptor(child.document, evaluation.curves, {
        layers: evaluation.layers as never,
      });
      const name = `G${child.generation} · child ${child.index + 1}`;
      const cp = this.app.saveCheckpoint(name, {
        document: child.document,
        descriptor,
        thumbnail,
        parentId: child.primaryParentId,
        parents: child.parents,
        generation: child.generation,
      });
      if (button) {
        button.textContent = 'Kept';
        button.disabled = true;
      }
      this.app.controls?.notebookPanel?.refresh?.();
      this.refresh();
      this.setStatus(`Kept “${cp.name}” · parents: ${child.parents.length}`);
    } catch (error) {
      this.setStatus(`Keep failed: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  }

  clear(): void {
    this.children = [];
    this.thumbnails = new Map();
    this.gridEl.replaceChildren();
    this.setStatus('Children cleared');
  }

  setStatus(message: string, isError = false): void {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle('error', isError);
  }
}
