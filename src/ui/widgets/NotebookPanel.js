/**
 * NotebookPanel.js — keep, compare and recover lab checkpoints.
 *
 * The panel is intentionally simple: a name + save row, a newest-first list
 * with thumbnails and A/B selectors, and a comparison drawer.
 */

export class NotebookPanel {
  constructor(app) {
    this.app = app;
    this.selectedA = null;
    this.selectedB = null;
    this.el = document.createElement('div');
    this.el.className = 'notebook-panel';
    this.build();
    this.refresh();
  }

  build() {
    const top = document.createElement('div');
    top.className = 'notebook-top';
    this.nameInput = document.createElement('input');
    this.nameInput.className = 'notebook-name';
    this.nameInput.dataset.focusId = 'notebook-name';
    this.nameInput.type = 'text';
    this.nameInput.maxLength = 80;
    this.nameInput.value = this.app.document.name;
    this.nameInput.setAttribute('aria-label', 'Checkpoint name');

    this.saveBtn = document.createElement('button');
    this.saveBtn.className = 'lab-button notebook-save';
    this.saveBtn.dataset.focusId = 'notebook-save';
    this.saveBtn.textContent = 'Save checkpoint';
    this.saveBtn.addEventListener('click', () => this.save());

    top.append(this.nameInput, this.saveBtn);

    const tools = document.createElement('div');
    tools.className = 'notebook-tools';
    this.compareBtn = document.createElement('button');
    this.compareBtn.className = 'lab-button notebook-compare';
    this.compareBtn.dataset.focusId = 'notebook-compare';
    this.compareBtn.textContent = 'Compare A/B';
    this.compareBtn.addEventListener('click', () => this.compare());
    this.exportBtn = document.createElement('button');
    this.exportBtn.className = 'lab-button notebook-export';
    this.exportBtn.dataset.focusId = 'notebook-export';
    this.exportBtn.textContent = 'Export';
    this.exportBtn.addEventListener('click', () => this.exportNotebook());
    this.importBtn = document.createElement('button');
    this.importBtn.className = 'lab-button notebook-import-button';
    this.importBtn.dataset.focusId = 'notebook-import';
    this.importBtn.textContent = 'Import';
    this.importBtn.addEventListener('click', () => this.importInput.click());
    this.importInput = document.createElement('input');
    this.importInput.className = 'notebook-import';
    this.importInput.type = 'file';
    this.importInput.accept = 'application/json,.json';
    this.importInput.style.display = 'none';
    this.importInput.addEventListener('change', () => this.importNotebook());
    tools.append(this.compareBtn, this.exportBtn, this.importBtn, this.importInput);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'notebook-status';
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.setAttribute('aria-live', 'polite');
    this.statusEl.textContent = this.app.notebook.lastError
      ? `Storage: ${this.app.notebook.lastError}`
      : 'No checkpoints yet';

    this.listEl = document.createElement('div');
    this.listEl.className = 'notebook-list';

    this.compareEl = document.createElement('div');
    this.compareEl.className = 'notebook-compare-view';

    this.el.append(top, tools, this.statusEl, this.listEl, this.compareEl);
  }

  refresh() {
    const items = [...this.app.notebook.items].reverse();
    if (!items.length) {
      this.statusEl.textContent = 'No checkpoints yet';
      this.statusEl.classList.remove('error');
      this.selectedA = null;
      this.selectedB = null;
    } else {
      if (!this.selectedA || !this.app.notebook.get(this.selectedA)) this.selectedA = items[0].id;
      if (!this.selectedB || this.selectedB === this.selectedA || !this.app.notebook.get(this.selectedB)) {
        this.selectedB = items[1]?.id ?? null;
      }
      this.statusEl.textContent = `${items.length} checkpoint${items.length === 1 ? '' : 's'}`;
      this.statusEl.classList.remove('error');
    }

    this.listEl.replaceChildren();
    for (const cp of items) this.listEl.appendChild(this.renderItem(cp));
    this.renderCompare();
    this.app.controls?.evolutionPanel?.refresh?.();
  }

  save() {
    const name = this.nameInput.value.trim() || this.app.document.name;
    try {
      const previous = this.selectedA ?? this.app.notebook.latest()?.id ?? null;
      const cp = this.app.saveCheckpoint(name, { parentId: previous });
      if (!cp) return;
      this.selectedB = this.selectedA;
      this.selectedA = cp.id;
      this.nameInput.value = cp.name;
      this.refresh();
      this.setStatus(`Saved “${cp.name}”`);
    } catch (error) {
      this.setStatus(`Save failed: ${error.message}`, true);
    }
  }

  renderItem(cp) {
    const row = document.createElement('div');
    row.className = 'notebook-item';
    if (cp.id === this.selectedA) row.classList.add('selected-a');
    if (cp.id === this.selectedB) row.classList.add('selected-b');

    const thumb = document.createElement('div');
    thumb.className = 'notebook-thumb';
    if (cp.thumbnail) {
      const img = document.createElement('img');
      img.src = cp.thumbnail;
      img.alt = '';
      thumb.appendChild(img);
    } else {
      thumb.textContent = '—';
    }

    const body = document.createElement('div');
    body.className = 'notebook-item-body';
    const title = document.createElement('div');
    title.className = 'notebook-item-name';
    title.textContent = cp.name;
    const meta = document.createElement('div');
    meta.className = 'notebook-item-meta';
    const parent = cp.parentId ? this.app.notebook.get(cp.parentId) : null;
    const parentIds = cp.parents?.length ? cp.parents : (cp.parentId ? [cp.parentId] : []);
    const parentNames = parentIds
      .map((id) => this.app.notebook.get(id)?.name)
      .filter(Boolean);
    meta.textContent = [
      formatDate(cp.createdAt),
      cp.generation > 0 ? `G${cp.generation}` : '',
      parentNames.length ? `↳ ${parentNames.join(', ')}` : (parent ? `↳ ${parent.name}` : ''),
      cp.tags.length ? cp.tags.map((tag) => `#${tag}`).join(' ') : '',
    ].filter(Boolean).join(' · ');
    if (parentNames.length) meta.title = `Parents: ${parentNames.join(', ')}`;
    body.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'notebook-item-actions';
    actions.append(
      actionButton('A', 'Select A', () => { this.selectedA = cp.id; this.refresh(); }, cp.id === this.selectedA),
      actionButton('B', 'Select B', () => { this.selectedB = cp.id; this.refresh(); }, cp.id === this.selectedB),
      actionButton('Restore', 'Restore checkpoint', () => this.restore(cp)),
      actionButton('Delete', 'Delete checkpoint', () => this.remove(cp)),
    );

    row.append(thumb, body, actions);
    return row;
  }

  restore(cp) {
    try {
      if (this.app.controls) this.app.controls.focusAfterBuild = 'notebook-save';
      this.app.restoreCheckpoint(cp.id);
    } catch (error) {
      this.setStatus(`Restore failed: ${error.message}`, true);
    }
  }

  remove(cp) {
    if (!window.confirm(`Delete “${cp.name}”?`)) return;
    if (this.app.notebook.remove(cp.id)) {
      if (this.selectedA === cp.id) this.selectedA = null;
      if (this.selectedB === cp.id) this.selectedB = null;
      this.refresh();
      this.setStatus(`Deleted “${cp.name}”`);
    }
  }

  compare() {
    if (!this.selectedA || !this.selectedB) {
      this.setStatus('Select two checkpoints as A and B', true);
      return;
    }
    const result = this.app.notebook.compare(this.selectedA, this.selectedB);
    if (!result) {
      this.setStatus('Could not compare those checkpoints', true);
      return;
    }
    this.renderComparison(result);
    this.setStatus(`Compared “${result.a.name}” with “${result.b.name}”`);
  }

  renderCompare() {
    if (!this.selectedA || !this.selectedB) {
      this.compareEl.replaceChildren();
      return;
    }
    const result = this.app.notebook.compare(this.selectedA, this.selectedB);
    if (result) this.renderComparison(result);
  }

  renderComparison(result) {
    this.compareEl.replaceChildren();
    const heading = document.createElement('div');
    heading.className = 'lab-subhead';
    heading.textContent = 'A / B comparison';
    const pair = document.createElement('div');
    pair.className = 'notebook-ab';
    pair.append(this.renderCompareCard('A', result.a), this.renderCompareCard('B', result.b));

    const params = document.createElement('div');
    params.className = 'notebook-diff';
    params.appendChild(diffTitle(`Parameters (${result.parameterDiff.length})`));
    params.appendChild(diffRows(result.parameterDiff, false));

    const metrics = document.createElement('div');
    metrics.className = 'notebook-diff';
    metrics.appendChild(diffTitle(`Descriptor (${result.descriptorDiff.length})`));
    metrics.appendChild(diffRows(result.descriptorDiff, true));

    this.compareEl.append(heading, pair, params, metrics);
  }

  renderCompareCard(label, cp) {
    const card = document.createElement('div');
    card.className = 'notebook-compare-card';
    const tag = document.createElement('div');
    tag.className = 'notebook-compare-label';
    tag.textContent = `${label} · ${cp.name}`;
    const thumb = document.createElement('div');
    thumb.className = 'notebook-thumb large';
    if (cp.thumbnail) {
      const img = document.createElement('img');
      img.src = cp.thumbnail;
      img.alt = '';
      thumb.appendChild(img);
    } else {
      thumb.textContent = '—';
    }
    card.append(tag, thumb);
    return card;
  }

  exportNotebook() {
    const json = this.app.notebook.exportJSON();
    download('parametrica-notebook.json', json);
    this.setStatus('Notebook exported');
  }

  importNotebook() {
    const file = this.importInput.files?.[0];
    this.importInput.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = this.app.importNotebook(String(reader.result));
        this.refresh();
        this.setStatus(`Imported ${result.added} checkpoint(s), skipped ${result.skipped}`);
      } catch (error) {
        this.setStatus(`Import failed: ${error.message}`, true);
      }
    };
    reader.onerror = () => this.setStatus('Import failed: could not read the file', true);
    reader.readAsText(file);
  }

  setStatus(message, isError = false) {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle('error', isError);
  }
}

function actionButton(label, title, onClick, selected = false) {
  const button = document.createElement('button');
  button.className = 'notebook-action';
  button.textContent = label;
  button.title = title;
  if (selected) button.classList.add('active');
  button.addEventListener('click', onClick);
  return button;
}

function diffTitle(text) {
  const el = document.createElement('div');
  el.className = 'notebook-diff-title';
  el.textContent = text;
  return el;
}

function diffRows(entries, withDelta) {
  const box = document.createElement('div');
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'lab-hint';
    empty.textContent = 'No changes';
    box.appendChild(empty);
    return box;
  }
  for (const entry of entries.slice(0, 24)) {
    const row = document.createElement('div');
    row.className = 'notebook-diff-row';
    const path = document.createElement('span');
    path.className = 'notebook-diff-path';
    path.textContent = shortPath(entry.path);
    path.title = entry.path;
    const value = document.createElement('span');
    value.className = 'notebook-diff-value';
    value.textContent = `${formatValue(entry.from)} → ${formatValue(entry.to)}${withDelta && entry.delta !== undefined ? ` (${entry.delta > 0 ? '+' : ''}${formatValue(entry.delta)})` : ''}`;
    row.append(path, value);
    box.appendChild(row);
  }
  if (entries.length > 24) {
    const more = document.createElement('div');
    more.className = 'lab-hint';
    more.textContent = `+${entries.length - 24} more changes`;
    box.appendChild(more);
  }
  return box;
}

function shortPath(path) {
  return path
    .replace('generator.params.', 'gen.')
    .replace(/operators\.(\d+)\.params\./, 'op[$1].');
}

function formatValue(value) {
  if (value === undefined) return '—';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    return Number(value.toFixed(4)).toString();
  }
  return String(value);
}

function formatDate(timestamp) {
  try {
    return new Date(timestamp).toLocaleDateString();
  } catch {
    return '';
  }
}

function download(filename, content) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
