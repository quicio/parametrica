/**
 * NotebookPanel.js — keep, compare and recover lab checkpoints.
 *
 * The panel is intentionally simple: a name + save row, a project/series
 * selector, a grouped list with thumbnails and A/B selectors, and a
 * comparison drawer.
 */

import { INBOX_PROJECT_ID } from '../../lab/notebook.ts';
import { Generators } from '../../core/registry.ts';

export class NotebookPanel {
  constructor(app) {
    this.app = app;
    this.selectedA = null;
    this.selectedB = null;
    this.editingId = null;
    this.workspace = app.notebookWorkspace;
    this.el = document.createElement('div');
    this.el.className = 'notebook-panel';
    this.build();
    this.refresh();
  }

  get activeProjectId() {
    return this.workspace.activeProjectId;
  }

  set activeProjectId(projectId) {
    this.workspace.setProject(projectId);
  }

  get activeSeriesId() {
    return this.workspace.activeSeriesId;
  }

  set activeSeriesId(seriesId) {
    this.workspace.setSeries(seriesId);
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

    const org = document.createElement('div');
    org.className = 'notebook-org';
    const projectLabel = document.createElement('span');
    projectLabel.className = 'notebook-org-label';
    projectLabel.textContent = 'Project';
    this.projectSelect = document.createElement('select');
    this.projectSelect.className = 'notebook-project';
    this.projectSelect.setAttribute('aria-label', 'Active project');
    this.projectSelect.addEventListener('change', () => {
      this.activeProjectId = this.projectSelect.value;
      this.activeSeriesId = null;
      this.selectedA = null;
      this.selectedB = null;
      this.editingId = null;
      this.refresh();
    });
    this.projectAddBtn = orgButton('+', 'New project', () => this.newProject());
    this.projectRenameBtn = orgButton('✎', 'Rename project', () => this.renameProject());
    this.projectDeleteBtn = orgButton('×', 'Delete project', () => this.deleteProject());

    const seriesLabel = document.createElement('span');
    seriesLabel.className = 'notebook-org-label';
    seriesLabel.textContent = 'Serie';
    this.seriesSelect = document.createElement('select');
    this.seriesSelect.className = 'notebook-series';
    this.seriesSelect.setAttribute('aria-label', 'Active series');
    this.seriesSelect.addEventListener('change', () => {
      this.activeSeriesId = this.seriesSelect.value || null;
    });
    this.seriesAddBtn = orgButton('+', 'New series', () => this.newSeries());

    org.append(
      projectLabel, this.projectSelect, this.projectAddBtn, this.projectRenameBtn, this.projectDeleteBtn,
      seriesLabel, this.seriesSelect, this.seriesAddBtn,
    );

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

    this.el.append(top, org, tools, this.statusEl, this.listEl, this.compareEl);
  }

  refresh() {
    const notebook = this.app.notebook;
    if (this.editingId) {
      const editing = notebook.get(this.editingId);
      if (!editing || editing.projectId !== this.activeProjectId) this.editingId = null;
    }
    this.syncOrganization();
    const project = notebook.getProject(this.activeProjectId);
    const projectItems = notebook.items
      .filter((cp) => cp.projectId === this.activeProjectId)
      .slice()
      .reverse();

    if (!projectItems.length) {
      this.statusEl.textContent = project ? `No creations in “${project.name}”` : 'No checkpoints yet';
      this.statusEl.classList.remove('error');
    } else {
      if (!this.selectedA || !notebook.get(this.selectedA)) this.selectedA = projectItems[0].id;
      if (!this.selectedB || this.selectedB === this.selectedA || !notebook.get(this.selectedB)) {
        this.selectedB = projectItems[1]?.id ?? null;
      }
      this.statusEl.textContent = `${projectItems.length} creation${projectItems.length === 1 ? '' : 's'} · ${project.name}`;
      this.statusEl.classList.remove('error');
    }

    this.listEl.replaceChildren();
    const groups = new Map();
    for (const series of notebook.seriesFor(this.activeProjectId)) {
      groups.set(series.id, { series, items: [] });
    }
    groups.set(null, { series: null, items: [] });
    for (const cp of projectItems) {
      const key = cp.seriesId && groups.has(cp.seriesId) ? cp.seriesId : null;
      groups.get(key).items.push(cp);
    }
    for (const [key, group] of groups) {
      if (key === null && !group.items.length) continue;
      this.listEl.appendChild(this.renderGroup(group));
    }
    this.renderCompare();
    this.app.controls?.evolutionPanel?.refresh?.();
  }

  syncOrganization() {
    const notebook = this.app.notebook;
    this.workspace.ensure();
    const projects = notebook.projects;
    this.projectSelect.replaceChildren(...projects.map((project) => option(project.id, project.name)));
    this.projectSelect.value = this.activeProjectId;

    const series = notebook.seriesFor(this.activeProjectId);
    this.seriesSelect.replaceChildren(
      option('', 'No series'),
      ...series.map((entry) => option(entry.id, entry.name)),
    );
    this.seriesSelect.value = this.activeSeriesId ?? '';

    const inbox = this.activeProjectId === INBOX_PROJECT_ID;
    this.projectRenameBtn.disabled = inbox;
    this.projectDeleteBtn.disabled = inbox;
  }

  renderGroup({ series, items }) {
    const group = document.createElement('div');
    group.className = 'notebook-group';
    const head = document.createElement('div');
    head.className = 'notebook-group-head';
    const title = document.createElement('div');
    title.className = 'notebook-group-title';
    title.textContent = series ? series.name : 'No series';
    const count = document.createElement('span');
    count.className = 'notebook-group-count';
    count.textContent = String(items.length);
    head.append(title, count);
    if (series) {
      head.append(
        orgButton('✎', 'Rename series', () => this.renameSeries(series)),
        orgButton('×', 'Delete series', () => this.deleteSeries(series)),
      );
    }
    group.appendChild(head);
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'lab-hint';
      empty.textContent = 'No creations';
      group.appendChild(empty);
      return group;
    }
    for (const cp of items) group.appendChild(this.renderItem(cp));
    return group;
  }

  async newProject() {
    const name = await this.app.dialogs.prompt({
      title: 'New project', label: 'Project name', value: 'New project', confirmText: 'Create',
    });
    if (name === null) return;
    const project = this.app.notebook.createProject(name);
    if (!project) {
      this.setStatus('Could not create project', true);
      return;
    }
    this.activeProjectId = project.id;
    this.activeSeriesId = null;
    this.selectedA = null;
    this.selectedB = null;
    this.refresh();
    this.setStatus(`Created project “${project.name}”`);
  }

  async renameProject() {
    const project = this.app.notebook.getProject(this.activeProjectId);
    if (!project) return;
    const name = await this.app.dialogs.prompt({
      title: 'Rename project', label: 'Project name', value: project.name, confirmText: 'Rename',
    });
    if (name === null) return;
    const renamed = this.app.notebook.renameProject(project.id, name);
    if (!renamed) {
      this.setStatus('Could not rename project', true);
      return;
    }
    this.refresh();
    this.setStatus(`Renamed to “${renamed.name}”`);
  }

  async deleteProject() {
    if (this.activeProjectId === INBOX_PROJECT_ID) return;
    const project = this.app.notebook.getProject(this.activeProjectId);
    if (!project) return;
    const confirmed = await this.app.dialogs.confirm({
      title: 'Delete project?',
      message: `Delete “${project.name}”? Its creations move to Inbox.`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    if (!this.app.notebook.removeProject(project.id)) {
      this.setStatus('Could not delete project', true);
      return;
    }
    this.activeProjectId = INBOX_PROJECT_ID;
    this.activeSeriesId = null;
    this.selectedA = null;
    this.selectedB = null;
    this.refresh();
    this.setStatus(`Deleted project “${project.name}”`);
  }

  async newSeries() {
    const project = this.app.notebook.getProject(this.activeProjectId);
    if (!project) return;
    const name = await this.app.dialogs.prompt({
      title: 'New series', label: 'Series name', value: 'New series', confirmText: 'Create',
    });
    if (name === null) return;
    const series = this.app.notebook.createSeries(project.id, name);
    if (!series) {
      this.setStatus('Could not create series', true);
      return;
    }
    this.activeSeriesId = series.id;
    this.refresh();
    this.setStatus(`Created series “${series.name}”`);
  }

  async renameSeries(series) {
    const name = await this.app.dialogs.prompt({
      title: 'Rename series', label: 'Series name', value: series.name, confirmText: 'Rename',
    });
    if (name === null) return;
    const renamed = this.app.notebook.renameSeries(series.id, name);
    if (!renamed) {
      this.setStatus('Could not rename series', true);
      return;
    }
    this.refresh();
    this.setStatus(`Renamed series to “${renamed.name}”`);
  }

  async deleteSeries(series) {
    const confirmed = await this.app.dialogs.confirm({
      title: 'Delete series?',
      message: `Delete series “${series.name}”? Its creations stay in the project.`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    if (!this.app.notebook.removeSeries(series.id)) {
      this.setStatus('Could not delete series', true);
      return;
    }
    if (this.activeSeriesId === series.id) this.activeSeriesId = null;
    this.refresh();
    this.setStatus(`Deleted series “${series.name}”`);
  }

  moveHere(cp) {
    const targetSeries = this.activeSeriesId;
    const moved = this.app.notebook.moveCheckpoint(cp.id, {
      projectId: this.activeProjectId,
      seriesId: targetSeries,
    });
    if (!moved) {
      this.setStatus('Could not move creation', true);
      return;
    }
    this.refresh();
    this.setStatus(`Moved “${cp.name}”`);
  }

  save() {
    const name = this.nameInput.value.trim() || this.app.document.name;
    try {
      const cp = this.app.saveCheckpoint(name, {
        projectId: this.activeProjectId,
        seriesId: this.activeSeriesId,
      });
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
    const generatorId = cp.document.generator?.id;
    const model = generatorId && Generators.has(generatorId) ? Generators.get(generatorId).name : '';
    meta.textContent = [
      model,
      formatDate(cp.createdAt),
      cp.generation > 0 ? `G${cp.generation}` : '',
      parentNames.length ? `parent: ${parentNames.join(', ')}` : (parent ? `parent: ${parent.name}` : ''),
      cp.tags.length ? cp.tags.map((tag) => `#${tag}`).join(' ') : '',
    ].filter(Boolean).join(' · ');
    if (parentNames.length) meta.title = `Parents: ${parentNames.join(', ')}`;
    body.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'notebook-item-actions';
    actions.append(
      actionButton('A', 'Select A', () => { this.selectedA = cp.id; this.refresh(); }, cp.id === this.selectedA),
      actionButton('B', 'Select B', () => { this.selectedB = cp.id; this.refresh(); }, cp.id === this.selectedB),
      actionButton('Edit', 'Edit notes and tags', () => {
        this.editingId = this.editingId === cp.id ? null : cp.id;
        this.refresh();
      }),
      actionButton('Move', 'Move to selected project / series', () => this.moveHere(cp)),
      actionButton('Restore', 'Restore checkpoint', () => this.restore(cp)),
      actionButton('Delete', 'Delete checkpoint', () => this.remove(cp)),
    );

    row.append(thumb, body, actions);
    if (this.editingId === cp.id) row.appendChild(this.metadataEditor(cp));
    return row;
  }

  metadataEditor(cp) {
    const box = document.createElement('div');
    box.className = 'notebook-meta-editor';

    const notesRow = document.createElement('label');
    notesRow.className = 'notebook-meta-row';
    const notesLabel = document.createElement('span');
    notesLabel.className = 'notebook-meta-label';
    notesLabel.textContent = 'Notes';
    const notes = document.createElement('textarea');
    notes.className = 'notebook-notes';
    notes.maxLength = 2000;
    notes.value = cp.notes ?? '';
    notesRow.append(notesLabel, notes);

    const tagsRow = document.createElement('label');
    tagsRow.className = 'notebook-meta-row';
    const tagsLabel = document.createElement('span');
    tagsLabel.className = 'notebook-meta-label';
    tagsLabel.textContent = 'Tags (comma separated)';
    const tags = document.createElement('input');
    tags.className = 'notebook-tags';
    tags.type = 'text';
    tags.value = cp.tags.join(', ');
    tagsRow.append(tagsLabel, tags);

    const actions = document.createElement('div');
    actions.className = 'notebook-meta-actions';
    const save = document.createElement('button');
    save.className = 'notebook-action notebook-meta-save';
    save.textContent = 'Save metadata';
    save.addEventListener('click', () => {
      const values = tags.value.split(',').map((tag) => tag.trim()).filter(Boolean);
      const updated = this.app.notebook.update(cp.id, { notes: notes.value, tags: values });
      if (!updated) {
        this.setStatus('Could not save checkpoint metadata', true);
        return;
      }
      this.editingId = null;
      this.refresh();
      this.setStatus(`Metadata saved for “${updated.name}”`);
    });
    const cancel = document.createElement('button');
    cancel.className = 'notebook-action notebook-meta-cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => {
      this.editingId = null;
      this.refresh();
    });
    actions.append(save, cancel);

    box.append(notesRow, tagsRow, actions);
    return box;
  }

  restore(cp) {
    try {
      if (this.app.controls) this.app.controls.focusAfterBuild = 'notebook-save';
      this.app.restoreCheckpoint(cp.id);
    } catch (error) {
      this.setStatus(`Restore failed: ${error.message}`, true);
    }
  }

  async remove(cp) {
    const confirmed = await this.app.dialogs.confirm({
      title: 'Delete creation?',
      message: `Delete “${cp.name}”?`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;
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

function orgButton(label, title, onClick) {
  const button = document.createElement('button');
  button.className = 'notebook-icon';
  button.textContent = label;
  button.title = title;
  button.addEventListener('click', onClick);
  return button;
}

function option(value, label) {
  const el = document.createElement('option');
  el.value = value;
  el.textContent = label;
  return el;
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
