/**
 * LabPanel.js — the observation surface of the lab.
 *
 * Shows the deterministic descriptor, lets the user run parameter
 * sensitivity on demand and keeps the last result visible while the
 * figure changes. No AI, no persistence: those belong to later slices.
 */

export class LabPanel {
  constructor(app) {
    this.app = app;
    this.autoTimer = null;
    this.analysisTimer = null;
    this.lastDescriptor = null;
    this.el = document.createElement('div');
    this.el.className = 'lab-panel';
    this.build();
    this.scheduleAuto(0);
  }

  build() {
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'lab-status';
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.setAttribute('aria-live', 'polite');
    this.statusEl.textContent = 'Ready';

    const actions = document.createElement('div');
    actions.className = 'lab-actions';
    this.analyzeBtn = document.createElement('button');
    this.analyzeBtn.className = 'lab-button';
    this.analyzeBtn.dataset.focusId = 'lab-analyze';
    this.analyzeBtn.textContent = 'Analyze influence';
    this.analyzeBtn.addEventListener('click', () => this.analyze(true));
    actions.append(this.analyzeBtn);

    this.metricsEl = document.createElement('div');
    this.metricsEl.className = 'lab-metrics';

    this.influenceTitle = document.createElement('div');
    this.influenceTitle.className = 'lab-subhead';
    this.influenceTitle.textContent = 'Parameter influence';

    this.influenceEl = document.createElement('div');
    this.influenceEl.className = 'lab-influence';

    this.el.append(this.statusEl, actions, this.metricsEl, this.influenceTitle, this.influenceEl);
  }

  /** Debounced automatic metric refresh after a stable commit. */
  scheduleAuto(delay = 300) {
    clearTimeout(this.autoTimer);
    if (this.app.document?.animation?.playing) return;
    this.autoTimer = setTimeout(() => this.analyze(false), delay);
  }

  destroy() {
    clearTimeout(this.autoTimer);
    clearTimeout(this.analysisTimer);
    this.autoTimer = null;
    this.analysisTimer = null;
  }

  analyze(withSensitivity) {
    clearTimeout(this.autoTimer);
    this.autoTimer = null;
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.setStatus(withSensitivity ? 'Analyzing influence…' : 'Updating metrics…');
    // Let the status paint before the synchronous computation.
    this.analysisTimer = setTimeout(() => {
      this.analysisTimer = null;
      try {
        const result = this.app.analyzeFigure({ sensitivity: withSensitivity });
        if (!result) {
          this.setStatus('No figure to analyze');
          return;
        }
        this.render(result.descriptor);
        if (withSensitivity) this.renderSensitivity(result.sensitivity);
        else this.renderSensitivity(null);
        this.setStatus(
          withSensitivity
            ? `Analyzed ${result.sensitivity.entries.length} parameters`
            : 'Metrics updated',
        );
      } catch (error) {
        this.setStatus(`Analysis failed: ${error.message}`, true);
      }
    }, 0);
  }

  setStatus(message, isError = false) {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle('error', isError);
  }

  render(descriptor) {
    this.lastDescriptor = descriptor;
    this.metricsEl.replaceChildren();
    if (!descriptor || descriptor.curveCount === 0) {
      const empty = document.createElement('div');
      empty.className = 'lab-empty';
      empty.textContent = 'No curves to measure';
      this.metricsEl.appendChild(empty);
      return;
    }

    const rows = [
      ['Curves', descriptor.curveCount],
      ['Points', descriptor.pointCount],
      ['Aspect', format(descriptor.bbox.aspect)],
      ['Area', `${format(descriptor.area)} px²`],
      ['Perimeter', `${format(descriptor.perimeter)} px`],
      ['Compactness', format(descriptor.compactness, 3)],
      ['Symmetry', `${descriptor.symmetry.folds}-fold · ${format(descriptor.symmetry.score, 2)}`],
      ['Curv. entropy', format(descriptor.curvature.entropy, 3)],
      ['Inflections', descriptor.inflections],
      [`Crossings${descriptor.analysis?.intersectionsSampled ? ' (est.)' : ''}`, descriptor.crossings],
      ['Coverage', `${format(descriptor.coverage * 100, 1)}%`],
      ['Turning', format(descriptor.complexity.turningNumber, 2)],
      ['Fractal', format(descriptor.complexity.fractalDimension, 2)],
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'lab-metric';
      const name = document.createElement('span');
      name.className = 'lab-metric-name';
      name.textContent = label;
      const val = document.createElement('span');
      val.className = 'lab-metric-value';
      val.textContent = String(value);
      row.append(name, val);
      this.metricsEl.appendChild(row);
    }
  }

  renderSensitivity(report) {
    this.influenceEl.replaceChildren();
    if (!report) {
      const hint = document.createElement('div');
      hint.className = 'lab-hint';
      hint.textContent = 'Analyze influence to rank parameters for the current figure.';
      this.influenceEl.appendChild(hint);
      return;
    }
    const entries = report.entries.filter((entry) => entry.impact > 0).slice(0, 8);
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'lab-hint';
      empty.textContent = 'No influential numeric parameters found.';
      this.influenceEl.appendChild(empty);
      return;
    }
    const max = Math.max(...entries.map((entry) => entry.impact), 1e-9);
    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'lab-influence-row';
      const name = document.createElement('span');
      name.className = 'lab-influence-name';
      name.textContent = shortPath(entry.path);
      name.title = `${entry.path} · current ${format(entry.current, 3)} · ±${format(entry.delta, 3)}`;
      const bar = document.createElement('span');
      bar.className = 'lab-influence-bar';
      const fill = document.createElement('span');
      fill.style.width = `${Math.max(2, (entry.impact / max) * 100)}%`;
      bar.appendChild(fill);
      const value = document.createElement('span');
      value.className = 'lab-influence-value';
      value.textContent = format(entry.impact, 3);
      row.append(name, bar, value);
      this.influenceEl.appendChild(row);
    }
  }
}

function shortPath(path) {
  return path
    .replace('generator.params.', 'gen.')
    .replace(/operators\[(\d+)\]\.params\./, 'op[$1].');
}

function format(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  if (Number.isInteger(value)) return String(value);
  return Number(value).toFixed(digits);
}
