/**
 * ExplorePanel.js — 1D exploration of a mathematical family.
 *
 * The panel owns UI state (selection/locks/axis) but delegates all candidate
 * generation to the pure ExplorationSession. Candidate thumbnails are rendered
 * on a separate 2D canvas, so previewing never mutates the live document.
 */

import { evaluateDocument } from '../../core/engine.js';
import { ExplorationSession, morphDocuments } from '../../lab/exploration.js';
import { attachLayerAliases } from '../../core/document.js';
import {
  numericParameterRefs,
  pathForRef,
  refKey,
} from '../../lab/parameters.js';
import { boundsOf, curvesDataURL } from '../../render/thumbnail.js';

const TECHNICAL = new Set([
  'samples', 'adaptive', 'fit', 'size', 'seed', 'steps', 'skip', 'dt',
  'duration', 't0', 't1', 'theta0', 'turns', 'depthAttenuation',
]);

export class ExplorePanel {
  constructor(app) {
    this.app = app;
    this.refs = numericParameterRefs(app.document);
    this.axisPath = this.preferredAxis();
    this.selectedPaths = new Set(this.axisPath ? [this.axisPath] : []);
    this.lockedPaths = new Set();
    this.randomSeed = 1;
    this.candidates = [];
    this.mode = 'strip';
    this.gridXPath = this.axisPath;
    this.gridYPath = this.nextAxis(this.axisPath);
    this.gridCols = 6;
    this.gridRows = 4;
    this.morphA = null;
    this.morphB = null;
    this.el = document.createElement('div');
    this.el.className = 'explore-panel';
    this.build();
  }

  preferredAxis() {
    const preferred = this.refs.find((ref) => !TECHNICAL.has(ref.key)) ?? this.refs[0];
    return preferred ? refKey(preferred) : null;
  }

  nextAxis(exclude) {
    const preferred = this.refs.find((ref) => refKey(ref) !== exclude && !TECHNICAL.has(ref.key));
    const fallback = this.refs.find((ref) => refKey(ref) !== exclude);
    return (preferred || fallback) ? refKey(preferred || fallback) : null;
  }

  build() {
    const modeRow = document.createElement('div');
    modeRow.className = 'explore-row explore-mode-row';
    const modeLabel = document.createElement('label');
    modeLabel.className = 'explore-label';
    modeLabel.textContent = 'Mode';
    this.modeSelect = document.createElement('select');
    this.modeSelect.className = 'explore-mode';
    for (const [value, label] of [['strip', '1D strip'], ['grid', '2D grid'], ['morph', 'Morph A→B']]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      this.modeSelect.appendChild(option);
    }
    this.modeSelect.addEventListener('change', () => this.setMode(this.modeSelect.value));
    modeRow.append(modeLabel, this.modeSelect);

    const axisRow = document.createElement('div');
    axisRow.className = 'explore-row';
    const axisLabel = document.createElement('label');
    axisLabel.className = 'explore-label';
    axisLabel.textContent = 'Axis';
    this.axisSelect = document.createElement('select');
    this.axisSelect.className = 'explore-axis';
    this.axisSelect.dataset.focusId = 'explore-axis';
    for (const ref of this.refs) {
      const option = document.createElement('option');
      option.value = refKey(ref);
      option.textContent = `${shortPath(refKey(ref))} · ${formatValue(currentValue(this.app.document, ref))}`;
      this.axisSelect.appendChild(option);
    }
    this.axisSelect.value = this.axisPath ?? '';
    this.axisSelect.addEventListener('change', () => {
      this.axisPath = this.axisSelect.value;
      this.selectedPaths.add(this.axisPath);
      this.syncScope();
    });
    this.stepsSelect = document.createElement('select');
    this.stepsSelect.className = 'explore-steps';
    this.stepsSelect.dataset.focusId = 'explore-steps';
    for (const n of [8, 12, 16, 24]) {
      const option = document.createElement('option');
      option.value = String(n);
      option.textContent = `${n} steps`;
      if (n === 12) option.selected = true;
      this.stepsSelect.appendChild(option);
    }
    axisRow.append(axisLabel, this.axisSelect, this.stepsSelect);

    const actions = document.createElement('div');
    actions.className = 'explore-actions';
    this.generateBtn = document.createElement('button');
    this.generateBtn.className = 'lab-button explore-generate';
    this.generateBtn.dataset.focusId = 'explore-generate';
    this.generateBtn.textContent = 'Generate strip';
    this.generateBtn.addEventListener('click', () => this.generateStrip());
    this.randomizeBtn = document.createElement('button');
    this.randomizeBtn.className = 'lab-button explore-randomize';
    this.randomizeBtn.dataset.focusId = 'explore-randomize';
    this.randomizeBtn.textContent = 'Randomize selected';
    this.randomizeBtn.addEventListener('click', () => this.randomize());
    actions.append(this.generateBtn, this.randomizeBtn);

    const intensityRow = document.createElement('div');
    intensityRow.className = 'explore-row';
    const intensityLabel = document.createElement('label');
    intensityLabel.className = 'explore-label';
    intensityLabel.textContent = 'Intensity';
    this.intensity = document.createElement('input');
    this.intensity.className = 'explore-intensity';
    this.intensity.dataset.focusId = 'explore-intensity';
    this.intensity.type = 'range';
    this.intensity.min = '0.02';
    this.intensity.max = '0.5';
    this.intensity.step = '0.01';
    this.intensity.value = '0.15';
    this.intensityValue = document.createElement('span');
    this.intensityValue.className = 'explore-intensity-value';
    this.intensityValue.textContent = '0.15';
    this.intensity.addEventListener('input', () => {
      this.intensityValue.textContent = this.intensity.value;
    });
    intensityRow.append(intensityLabel, this.intensity, this.intensityValue);

    this.scopeEl = document.createElement('details');
    this.scopeEl.className = 'explore-scope';
    this.scopeSummary = document.createElement('summary');
    this.scopeEl.appendChild(this.scopeSummary);
    this.scopeList = document.createElement('div');
    this.scopeList.className = 'explore-scope-list';
    this.scopeEl.appendChild(this.scopeList);
    for (const ref of this.refs) this.scopeList.appendChild(this.renderScopeRow(ref));

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'explore-status';
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.setAttribute('aria-live', 'polite');
    this.statusEl.textContent = 'Generate a strip or randomize the selected parameters.';

    this.stripEl = document.createElement('div');
    this.stripEl.className = 'explore-strip';

    this.stripControls = document.createElement('div');
    this.stripControls.className = 'explore-mode-panel';
    this.stripControls.append(axisRow, actions, intensityRow, this.scopeEl);

    this.gridControls = this.buildGridControls();
    this.morphControls = this.buildMorphControls();

    this.el.append(modeRow, this.stripControls, this.gridControls, this.morphControls, this.statusEl, this.stripEl);
    this.setMode('strip');
    this.syncScope();
  }

  buildGridControls() {
    const box = document.createElement('div');
    box.className = 'explore-mode-panel';

    const axes = document.createElement('div');
    axes.className = 'explore-row explore-grid-axes';
    const xLabel = document.createElement('span');
    xLabel.className = 'explore-label';
    xLabel.textContent = 'X / Y';
    this.gridXSelect = this.axisSelectFor(this.gridXPath, (value) => { this.gridXPath = value; });
    this.gridYSelect = this.axisSelectFor(this.gridYPath, (value) => { this.gridYPath = value; });
    axes.append(xLabel, this.gridXSelect, this.gridYSelect);

    const sizes = document.createElement('div');
    sizes.className = 'explore-row';
    const sizeLabel = document.createElement('span');
    sizeLabel.className = 'explore-label';
    sizeLabel.textContent = 'Grid';
    this.gridColsSelect = sizeSelect([4, 6, 8, 12], this.gridCols);
    this.gridRowsSelect = sizeSelect([3, 4, 6, 8], this.gridRows);
    this.gridColsSelect.addEventListener('change', () => { this.gridCols = Number(this.gridColsSelect.value); });
    this.gridRowsSelect.addEventListener('change', () => { this.gridRows = Number(this.gridRowsSelect.value); });
    sizes.append(sizeLabel, this.gridColsSelect, this.gridRowsSelect);

    this.gridGenerateBtn = document.createElement('button');
    this.gridGenerateBtn.className = 'lab-button explore-generate-grid';
    this.gridGenerateBtn.dataset.focusId = 'explore-generate-grid';
    this.gridGenerateBtn.textContent = 'Generate grid';
    this.gridGenerateBtn.addEventListener('click', () => this.generateGrid());

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'explore-grid';

    box.append(axes, sizes, this.gridGenerateBtn, this.gridEl);
    return box;
  }

  buildMorphControls() {
    const box = document.createElement('div');
    box.className = 'explore-mode-panel';

    const capture = document.createElement('div');
    capture.className = 'explore-actions';
    const captureA = document.createElement('button');
    captureA.className = 'lab-button explore-capture-a';
    captureA.textContent = 'Set A';
    captureA.addEventListener('click', () => {
      this.morphA = attachLayerAliases(structuredClone(this.app.document));
      this.updateMorphStatus();
    });
    const captureB = document.createElement('button');
    captureB.className = 'lab-button explore-capture-b';
    captureB.textContent = 'Set B';
    captureB.addEventListener('click', () => {
      this.morphB = attachLayerAliases(structuredClone(this.app.document));
      this.updateMorphStatus();
    });
    capture.append(captureA, captureB);

    const row = document.createElement('div');
    row.className = 'explore-row';
    const label = document.createElement('span');
    label.className = 'explore-label';
    label.textContent = 'Steps';
    this.morphSteps = sizeSelect([5, 10, 20], 10);
    const generate = document.createElement('button');
    generate.className = 'lab-button explore-generate-morph';
    generate.textContent = 'Generate morph';
    generate.addEventListener('click', () => this.generateMorph());
    row.append(label, this.morphSteps, generate);

    this.morphStatus = document.createElement('div');
    this.morphStatus.className = 'explore-status';
    this.morphStatus.textContent = 'Capture A and B from the current figure.';

    this.morphEl = document.createElement('div');
    this.morphEl.className = 'explore-strip explore-morph-strip';

    box.append(capture, row, this.morphStatus, this.morphEl);
    return box;
  }

  axisSelectFor(value, apply) {
    const select = document.createElement('select');
    select.className = 'explore-grid-axis';
    for (const ref of this.refs) {
      const option = document.createElement('option');
      option.value = refKey(ref);
      option.textContent = shortPath(refKey(ref));
      select.appendChild(option);
    }
    select.value = value ?? '';
    select.addEventListener('change', () => apply(select.value));
    return select;
  }

  setMode(mode) {
    this.mode = mode;
    this.modeSelect.value = mode;
    this.stripControls.style.display = mode === 'strip' ? '' : 'none';
    this.gridControls.style.display = mode === 'grid' ? '' : 'none';
    this.morphControls.style.display = mode === 'morph' ? '' : 'none';
    this.stripEl.style.display = mode === 'strip' ? '' : 'none';
    if (mode !== 'strip') this.setStatus('', false);
  }

  generateGrid() {
    const refX = this.refs.find((ref) => refKey(ref) === this.gridXPath);
    const refY = this.refs.find((ref) => refKey(ref) === this.gridYPath);
    if (!refX || !refY) return this.setStatus('Choose two axes', true);
    if (refKey(refX) === refKey(refY)) return this.setStatus('Choose two different axes', true);
    this.setStatus('Generating grid…');
    try {
      const candidates = this.session().grid2D(refX, refY, {
        cols: this.gridCols,
        rows: this.gridRows,
      });
      this.renderGrid(candidates);
      this.setStatus(`${candidates.length} grid cells`);
    } catch (error) {
      this.setStatus(`Grid failed: ${error.message}`, true);
    }
  }

  renderGrid(candidates) {
    const scrollTop = this.app.controls?.container?.scrollTop ?? 0;
    const groups = [];
    const visible = [];
    for (const candidate of candidates) {
      const evaluation = evaluateDocument(candidate.document, {
        time: this.app.document.animation.time,
      });
      if (evaluation.errors.length || !evaluation.curves.length) continue;
      groups.push(evaluation.curves);
      visible.push({ candidate, curves: evaluation.curves });
    }
    this.gridEl.replaceChildren();
    if (!visible.length) {
      this.setStatus('No valid grid cell was produced', true);
      return;
    }
    const bounds = boundsOf(groups);
    this.gridEl.style.gridTemplateColumns = `repeat(${this.gridCols}, minmax(0, 1fr))`;
    for (const item of visible) {
      const button = document.createElement('button');
      button.className = 'explore-grid-cell';
      button.title = `Adopt ${formatValue(item.candidate.x)} × ${formatValue(item.candidate.y)}`;
      const img = document.createElement('img');
      const url = curvesDataURL(item.curves, { bounds, size: 96 });
      if (url) img.src = url;
      img.alt = '';
      const label = document.createElement('span');
      label.textContent = `${formatValue(item.candidate.x)} / ${formatValue(item.candidate.y)}`;
      button.append(img, label);
      button.addEventListener('pointerdown', () => {
        this.adoptScrollTop = this.app.controls?.container?.scrollTop ?? 0;
      });
      button.addEventListener('click', () => this.adopt(item.candidate));
      this.gridEl.appendChild(button);
    }
    if (this.app.controls?.container) this.app.controls.container.scrollTop = scrollTop;
  }

  generateMorph() {
    if (!this.morphA || !this.morphB) return this.setStatus('Capture A and B first', true);
    this.setStatus('Generating morph…');
    try {
      const candidates = morphDocuments(this.morphA, this.morphB, { steps: Number(this.morphSteps.value) });
      this.renderMorph(candidates);
      this.setStatus(`${candidates.length} morph frames`);
    } catch (error) {
      this.setStatus(`Morph unavailable: ${error.message}`, true);
    }
  }

  renderMorph(candidates) {
    const scrollTop = this.app.controls?.container?.scrollTop ?? 0;
    const groups = [];
    const visible = [];
    for (const candidate of candidates) {
      const evaluation = evaluateDocument(candidate.document, {
        time: this.app.document.animation.time,
      });
      if (evaluation.errors.length || !evaluation.curves.length) continue;
      groups.push(evaluation.curves);
      visible.push({ candidate, curves: evaluation.curves });
    }
    this.morphEl.replaceChildren();
    if (!visible.length) {
      this.setStatus('No valid morph frame was produced', true);
      return;
    }
    const bounds = boundsOf(groups);
    for (const item of visible) {
      const button = document.createElement('button');
      button.className = 'explore-candidate explore-morph-frame';
      button.title = `Adopt morph frame ${item.candidate.index}`;
      const img = document.createElement('img');
      const url = curvesDataURL(item.curves, { bounds, size: 120 });
      if (url) img.src = url;
      img.alt = '';
      const label = document.createElement('span');
      label.textContent = `t ${Number(item.candidate.t).toFixed(2)}`;
      button.append(img, label);
      button.addEventListener('pointerdown', () => {
        this.adoptScrollTop = this.app.controls?.container?.scrollTop ?? 0;
      });
      button.addEventListener('click', () => this.adopt(item.candidate));
      this.morphEl.appendChild(button);
    }
    if (this.app.controls?.container) this.app.controls.container.scrollTop = scrollTop;
  }

  updateMorphStatus() {
    this.morphStatus.textContent = `A: ${this.morphA ? 'captured' : 'none'} · B: ${this.morphB ? 'captured' : 'none'}`;
  }

  renderScopeRow(ref) {
    const path = refKey(ref);
    const row = document.createElement('div');
    row.className = 'explore-scope-row';
    row.dataset.path = path;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'explore-select';
    check.checked = this.selectedPaths.has(path);
    check.addEventListener('change', () => {
      if (check.checked) this.selectedPaths.add(path);
      else this.selectedPaths.delete(path);
      this.syncScope();
    });

    const label = document.createElement('span');
    label.className = 'explore-scope-name';
    label.textContent = shortPath(path);
    label.title = path;

    const solo = document.createElement('button');
    solo.className = 'explore-solo';
    solo.textContent = 'S';
    solo.title = 'Solo this parameter';
    solo.addEventListener('click', () => this.solo(path));

    const lock = document.createElement('button');
    lock.className = 'explore-lock';
    lock.textContent = 'L';
    lock.title = 'Lock this parameter';
    lock.addEventListener('click', () => this.toggleLock(path));

    row.append(check, label, solo, lock);
    return row;
  }

  solo(path) {
    this.selectedPaths = new Set([path]);
    this.lockedPaths = new Set(this.refs.map((ref) => refKey(ref)).filter((other) => other !== path));
    this.syncScope();
  }

  toggleLock(path) {
    if (this.lockedPaths.has(path)) this.lockedPaths.delete(path);
    else {
      this.lockedPaths.add(path);
      this.selectedPaths.delete(path);
    }
    this.syncScope();
  }

  syncScope() {
    for (const row of this.scopeList.querySelectorAll('.explore-scope-row')) {
      const path = row.dataset.path;
      const selected = this.selectedPaths.has(path);
      const locked = this.lockedPaths.has(path);
      const check = row.querySelector('.explore-select');
      check.checked = selected;
      check.disabled = locked;
      row.classList.toggle('locked', locked);
      row.classList.toggle('selected', selected);
      row.querySelector('.explore-lock').classList.toggle('active', locked);
      row.querySelector('.explore-solo').classList.toggle('active', selected && !locked && this.selectedPaths.size === 1);
    }
    this.scopeSummary.textContent =
      `${this.selectedPaths.size} selected · ${this.lockedPaths.size} locked`;
  }

  /** Refresh axis labels after a non-structural parameter adoption. */
  refresh() {
    this.refs.forEach((ref, index) => {
      const option = this.axisSelect.options[index];
      if (option) {
        option.textContent = `${shortPath(refKey(ref))} · ${formatValue(currentValue(this.app.document, ref))}`;
      }
    });
    this.syncScope();
  }

  session() {
    const session = new ExplorationSession(this.app.document);
    session.setSelection(this.refs.filter((ref) => this.selectedPaths.has(refKey(ref))));
    session.setLocks(this.refs.filter((ref) => this.lockedPaths.has(refKey(ref))));
    return session;
  }

  generateStrip() {
    const ref = this.refs.find((candidate) => refKey(candidate) === this.axisPath);
    if (!ref) return this.setStatus('Choose a parameter axis', true);
    this.setStatus('Generating variations…');
    try {
      const candidates = this.session().sweep1D(ref, { steps: Number(this.stepsSelect.value) });
      this.renderCandidates(candidates);
      this.setStatus(`${candidates.length} variations along ${shortPath(this.axisPath)}`);
    } catch (error) {
      this.setStatus(`Strip failed: ${error.message}`, true);
    }
  }

  randomize() {
    if (!this.selectedPaths.size) return this.setStatus('Select at least one parameter', true);
    this.setStatus('Generating random variations…');
    try {
      const candidates = this.session().randomize({
        intensity: Number(this.intensity.value),
        count: 6,
        seed: this.randomSeed++,
      });
      this.renderCandidates(candidates);
      this.setStatus(`${candidates.length} random variations`);
    } catch (error) {
      this.setStatus(`Randomize failed: ${error.message}`, true);
    }
  }

  renderCandidates(candidates) {
    const scrollTop = this.app.controls?.container?.scrollTop ?? 0;
    const stripLeft = this.stripEl.scrollLeft;
    const groups = [];
    const visible = [];
    for (const candidate of candidates) {
      const evaluation = evaluateDocument(candidate.document, {
        time: this.app.document.animation.time,
      });
      if (evaluation.errors.length || !evaluation.curves.length) continue;
      groups.push(evaluation.curves);
      visible.push({ candidate, curves: evaluation.curves });
    }
    this.candidates = visible;
    this.stripEl.replaceChildren();
    if (!visible.length) {
      this.setStatus('No valid candidate was produced', true);
      return;
    }
    const bounds = boundsOf(groups);
    for (const item of visible) {
      const button = document.createElement('button');
      button.className = 'explore-candidate';
      button.title = `Adopt ${item.candidate.path} = ${formatValue(item.candidate.value)}`;
      const img = document.createElement('img');
      const url = curvesDataURL(item.curves, { bounds, size: 132 });
      if (url) img.src = url;
      img.alt = '';
      const label = document.createElement('span');
      label.textContent = item.candidate.value == null
        ? item.candidate.id
        : formatValue(item.candidate.value);
      button.append(img, label);
      button.addEventListener('pointerdown', () => {
        // Capture the context before focus/scrollIntoView can move the
        // inspector; adoption rebuilds Controls afterwards.
        this.adoptScrollTop = this.app.controls?.container?.scrollTop ?? 0;
      });
      button.addEventListener('click', () => this.adopt(item.candidate));
      this.stripEl.appendChild(button);
    }
    this.stripEl.scrollLeft = stripLeft;
    if (this.app.controls?.container) this.app.controls.container.scrollTop = scrollTop;
  }

  adopt(candidate) {
    try {
      // The adoption rebuilds Controls; return focus to the explore
      // controls instead of dropping it on <body>, and restore the
      // scroll position captured before the click.
      if (this.app.controls) {
        this.app.controls.focusAfterBuild = 'explore-generate';
        this.app.controls.forcedScrollTop = this.adoptScrollTop;
      }
      this.app.adoptCandidate(candidate.document);
    } catch (error) {
      this.setStatus(`Adopt failed: ${error.message}`, true);
    }
  }

  setStatus(message, isError = false) {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle('error', isError);
  }
}

function currentValue(document, ref) {
  if (ref.stage === 'generator') return document.generator.params[ref.key];
  return document.operators?.[ref.index]?.params?.[ref.key];
}

function shortPath(path) {
  return path
    .replace('generator.params.', 'gen.')
    .replace(/operators\[(\d+)\]\.params\./, 'op[$1].');
}

function formatValue(value) {
  if (!Number.isFinite(value)) return '—';
  if (Number.isInteger(value)) return String(value);
  return Number(value.toFixed(3)).toString();
}


function sizeSelect(values, current) {
  const select = document.createElement('select');
  select.className = 'explore-steps';
  for (const value of values) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = String(value);
    if (value === current) option.selected = true;
    select.appendChild(option);
  }
  return select;
}
