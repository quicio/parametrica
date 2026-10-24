/**
 * AdvisorPanel.js — grounded advice, offline by default.
 *
 * Deterministic observation is always computed locally. An optional provider
 * (fake, Ollama, OpenAI-compatible) can add language, but the response is
 * parsed, path/schema validated and never applied automatically. Suggestions
 * are previewed and committed through history only when the user clicks
 * Apply.
 */

import { evaluateDocument } from '../../core/engine.js';
import { documentDiff, descriptorDiff } from '../../lab/diff.js';
import { validateSuggestion } from '../../ai/offline.js';
import { createProvider, runAdvisor, shouldAutoAnalyze, PROVIDERS } from '../../ai/provider.js';
import { AdvisorCache } from '../../ai/cache.js';
import { curvesDataURL, boundsOf } from '../../render/thumbnail.js';

const SETTINGS_KEY = 'parametrica.ai.settings';
const AUTO_DELAY = 700;

export class AdvisorPanel {
  constructor(app) {
    this.app = app;
    this.response = null;
    this.previousId = '';
    this.analyzing = false;
    this.analyzeCount = 0;
    this.autoTimer = null;
    this.cache = new AdvisorCache(50);
    this.settings = loadSettings();
    this.apiKey = '';
    this.el = document.createElement('div');
    this.el.className = 'advisor-panel';
    this.build();
    this.refresh();
  }

  build() {
    const top = document.createElement('div');
    top.className = 'advisor-top';
    this.previousSelect = document.createElement('select');
    this.previousSelect.className = 'advisor-previous';
    this.previousSelect.setAttribute('aria-label', 'Compare with checkpoint');
    this.previousSelect.addEventListener('change', () => {
      this.previousId = this.previousSelect.value;
    });
    this.analyzeBtn = document.createElement('button');
    this.analyzeBtn.className = 'lab-button advisor-analyze';
    this.analyzeBtn.dataset.focusId = 'advisor-analyze';
    this.analyzeBtn.textContent = 'Analyze';
    this.analyzeBtn.addEventListener('click', () => this.analyze({ auto: false }));
    top.append(this.previousSelect, this.analyzeBtn);

    this.providerSelect = document.createElement('select');
    this.providerSelect.className = 'advisor-provider';
    this.providerSelect.setAttribute('aria-label', 'AI provider');
    for (const provider of PROVIDERS) {
      const option = document.createElement('option');
      option.value = provider.id;
      option.textContent = provider.network ? `${provider.name} · network` : provider.name;
      this.providerSelect.appendChild(option);
    }
    this.providerSelect.value = this.settings.provider;
    this.providerSelect.addEventListener('change', () => {
      this.settings.provider = this.providerSelect.value;
      this.persistSettings();
      this.syncProviderFields();
      this.updatePrivacy();
      this.setStatus('Provider selected. Analyze explicitly or wait for the next edit.');
    });

    this.endpointInput = document.createElement('input');
    this.endpointInput.className = 'advisor-input advisor-endpoint';
    this.endpointInput.type = 'url';
    this.endpointInput.placeholder = 'http://localhost:11434';
    this.endpointInput.value = this.settings.endpoint;
    this.endpointInput.setAttribute('aria-label', 'Provider endpoint');
    this.endpointInput.addEventListener('input', () => {
      this.settings.endpoint = this.endpointInput.value.trim();
      this.persistSettings();
      this.updatePrivacy();
    });

    this.modelInput = document.createElement('input');
    this.modelInput.className = 'advisor-input advisor-model';
    this.modelInput.type = 'text';
    this.modelInput.placeholder = 'llama3.2';
    this.modelInput.value = this.settings.model;
    this.modelInput.setAttribute('aria-label', 'Provider model');
    this.modelInput.addEventListener('input', () => {
      this.settings.model = this.modelInput.value.trim();
      this.persistSettings();
    });

    this.keyInput = document.createElement('input');
    this.keyInput.className = 'advisor-input advisor-key';
    this.keyInput.type = 'password';
    this.keyInput.autocomplete = 'off';
    this.keyInput.placeholder = 'Kept in memory only';
    this.keyInput.setAttribute('aria-label', 'Provider API key');
    this.keyInput.addEventListener('input', () => {
      this.apiKey = this.keyInput.value;
    });

    this.endpointLabel = this.field('Endpoint', this.endpointInput);
    this.modelLabel = this.field('Model', this.modelInput);
    this.keyLabel = this.field('API key (memory only)', this.keyInput);

    this.imageToggle = checkbox('Send thumbnail', this.settings.image);
    this.imageToggle.input.className = 'advisor-image';
    this.imageToggle.input.addEventListener('change', () => {
      this.settings.image = this.imageToggle.input.checked;
      this.persistSettings();
      this.updatePrivacy();
    });
    this.autoToggle = checkbox('Auto after edits', this.settings.auto);
    this.autoToggle.input.className = 'advisor-auto';
    this.autoToggle.input.addEventListener('change', () => {
      this.settings.auto = this.autoToggle.input.checked;
      this.persistSettings();
      if (!this.settings.auto) this.cancelAuto();
    });

    const settingsEl = document.createElement('div');
    settingsEl.className = 'advisor-settings';
    settingsEl.append(
      this.field('Provider', this.providerSelect),
      this.endpointLabel,
      this.modelLabel,
      this.keyLabel,
      this.imageToggle.label,
      this.autoToggle.label,
    );

    this.privacyEl = document.createElement('div');
    this.privacyEl.className = 'advisor-privacy';
    this.privacyEl.setAttribute('role', 'note');

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'advisor-status';
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.setAttribute('aria-live', 'polite');
    this.statusEl.textContent = 'Offline by default. Compare the figure with a checkpoint.';

    this.summaryEl = document.createElement('div');
    this.summaryEl.className = 'advisor-summary';

    this.changesEl = document.createElement('div');
    this.changesEl.className = 'advisor-changes';

    this.suggestionsEl = document.createElement('div');
    this.suggestionsEl.className = 'advisor-suggestions';

    this.caveatsEl = document.createElement('div');
    this.caveatsEl.className = 'advisor-caveats';

    this.el.append(
      top,
      settingsEl,
      this.privacyEl,
      this.statusEl,
      this.summaryEl,
      this.changesEl,
      this.suggestionsEl,
      this.caveatsEl,
    );
    this.syncProviderFields();
    this.updatePrivacy();
  }

  field(labelText, control) {
    const label = document.createElement('label');
    label.className = 'advisor-field';
    const span = document.createElement('span');
    span.className = 'advisor-field-label';
    span.textContent = labelText;
    label.append(span, control);
    return label;
  }

  syncProviderFields() {
    const id = this.providerSelect.value;
    const network = id === 'ollama' || id === 'openai-compatible';
    this.endpointLabel.hidden = !network;
    this.modelLabel.hidden = !network;
    this.keyLabel.hidden = id !== 'openai-compatible';
    if (network && !this.endpointInput.value) {
      this.endpointInput.value = id === 'ollama'
        ? 'http://localhost:11434'
        : 'http://localhost:8000/v1/chat/completions';
      this.settings.endpoint = this.endpointInput.value;
    }
    if (network && !this.modelInput.value) {
      this.modelInput.value = id === 'ollama' ? 'llama3.2' : 'gpt-4o-mini';
      this.settings.model = this.modelInput.value;
    }
    this.imageToggle.label.hidden = id === 'offline';
    this.persistSettings();
  }

  updatePrivacy() {
    const id = this.providerSelect.value;
    let text;
    if (id === 'offline') {
      text = 'Offline rules only. No descriptor, image or query leaves this browser.';
    } else if (id === 'fake') {
      text = 'Fake provider: deterministic fixture, no network. Descriptor, diffs and document summary stay in memory.';
    } else {
      const endpoint = this.endpointInput.value || (id === 'ollama' ? 'http://localhost:11434' : 'the configured endpoint');
      text = `Sends the descriptor, diffs, sensitivity and a document summary to ${endpoint}. ` +
        `Parameter paths and values are included. ${this.imageToggle.input.checked ? 'The current thumbnail is included.' : 'No image is sent.'} ` +
        `${id === 'openai-compatible' ? 'The API key is kept in memory only. ' : ''}No telemetry.`;
    }
    this.privacyEl.textContent = text;
  }

  provider() {
    return createProvider({
      id: this.providerSelect.value,
      endpoint: this.endpointInput.value.trim(),
      model: this.modelInput.value.trim(),
      apiKey: this.apiKey,
    });
  }

  refresh() {
    const items = [...this.app.notebook.items].reverse();
    const current = this.previousId;
    this.previousSelect.replaceChildren();
    const currentOnly = document.createElement('option');
    currentOnly.value = '';
    currentOnly.textContent = 'Current figure only';
    this.previousSelect.appendChild(currentOnly);
    for (const cp of items) {
      const option = document.createElement('option');
      option.value = cp.id;
      option.textContent = cp.name;
      this.previousSelect.appendChild(option);
    }
    if (current && items.some((cp) => cp.id === current)) this.previousSelect.value = current;
    else if (items.length) {
      this.previousId = items[0].id;
      this.previousSelect.value = items[0].id;
    } else {
      this.previousId = '';
    }
  }

  /** Debounced automatic analysis after a stable, non-playing commit. */
  scheduleAuto(delay = AUTO_DELAY) {
    this.cancelAuto();
    const provider = this.provider();
    if (!shouldAutoAnalyze({
      playing: Boolean(this.app.document?.animation?.playing),
      auto: this.autoToggle.input.checked,
      provider,
    })) return;
    this.autoTimer = setTimeout(() => {
      this.autoTimer = null;
      this.analyze({ auto: true });
    }, delay);
  }

  cancelAuto() {
    if (this.autoTimer) clearTimeout(this.autoTimer);
    this.autoTimer = null;
  }

  destroy() {
    this.cancelAuto();
  }

  async analyze({ auto = false } = {}) {
    this.cancelAuto();
    if (this.analyzing) return;
    this.analyzing = true;
    this.analyzeCount += 1;
    this.analyzeBtn.disabled = true;
    this.analyzeBtn.setAttribute('aria-busy', 'true');
    try {
      this.setStatus(auto ? 'Analyzing after edit…' : 'Analyzing…');
      const current = this.app.analyzeFigure({ sensitivity: false }).descriptor;
      const previousCheckpoint = this.previousId ? this.app.notebook.get(this.previousId) : null;
      const previous = previousCheckpoint?.descriptor ?? null;
      const parameterDiff = previousCheckpoint
        ? documentDiff(previousCheckpoint.document, this.app.document)
        : [];
      const descriptorDiffEntries = previousCheckpoint
        ? descriptorDiff(previousCheckpoint.descriptor, current)
        : [];
      const provider = this.provider();
      const image = this.imageToggle.input.checked && provider.id !== 'offline'
        ? this.app.renderer?.thumbnailDataURL?.(160, 30_000) ?? null
        : null;
      this.response = await runAdvisor(provider, {
        current,
        previous,
        parameterDiff,
        descriptorDiff: descriptorDiffEntries,
        document: this.app.document,
      }, {
        document: this.app.document,
        cache: this.cache,
        image,
      });
      this.render();
      if (this.response.providerError) {
        this.setStatus(`Provider failed: ${this.response.providerError}. Showing offline analysis.`, true);
      } else {
        const count = this.response.suggestions.length;
        const cached = this.response.fromCache ? ' · cached' : '';
        this.setStatus(
          `${count} grounded suggestion${count === 1 ? '' : 's'} · ${providerLabel(provider.id)}${cached}`,
        );
      }
    } catch (error) {
      this.setStatus(`Analysis failed: ${error.message}`, true);
    } finally {
      this.analyzing = false;
      this.analyzeBtn.disabled = false;
      this.analyzeBtn.removeAttribute('aria-busy');
    }
  }

  render() {
    this.summaryEl.textContent = this.response?.summary ?? '';
    this.changesEl.replaceChildren();
    for (const change of this.response?.changes ?? []) {
      const row = document.createElement('div');
      row.className = 'advisor-change';
      const path = document.createElement('span');
      path.className = 'advisor-change-path';
      path.textContent = shortPath(change.path);
      path.title = change.path;
      const value = document.createElement('span');
      value.className = 'advisor-change-value';
      value.textContent = change.reading ?? `${format(change.from)} → ${format(change.to)}`;
      row.append(path, value);
      this.changesEl.appendChild(row);
    }
    this.renderSuggestions();
    this.renderCaveats();
  }

  renderSuggestions() {
    this.suggestionsEl.replaceChildren();
    if (!this.response?.suggestions?.length) {
      const empty = document.createElement('div');
      empty.className = 'lab-hint';
      empty.textContent = 'Suggestions are hypotheses. Explore a variation in the lab and analyze again.';
      this.suggestionsEl.appendChild(empty);
      return;
    }
    for (const suggestion of this.response.suggestions) {
      const card = document.createElement('div');
      card.className = 'advisor-suggestion';
      const head = document.createElement('div');
      head.className = 'advisor-suggestion-head';
      const title = document.createElement('span');
      title.className = 'advisor-suggestion-title';
      title.textContent = `${shortPath(suggestion.path)}: ${format(suggestion.from)} → ${format(suggestion.to)}`;
      title.title = suggestion.path;
      const kind = document.createElement('span');
      kind.className = 'advisor-kind';
      kind.textContent = suggestion.clamped ? `${suggestion.kind} · clamped` : suggestion.kind;
      kind.title = suggestion.clamped ? 'The model value was clamped to the schema range.' : '';
      head.append(title, kind);

      const rationale = document.createElement('div');
      rationale.className = 'advisor-rationale';
      rationale.textContent = suggestion.rationale;

      const effect = document.createElement('div');
      effect.className = 'advisor-effect';
      effect.textContent = suggestion.expectedEffect;

      const actions = document.createElement('div');
      actions.className = 'advisor-actions';
      const preview = document.createElement('button');
      preview.className = 'lab-button advisor-preview';
      preview.textContent = 'Preview';
      preview.addEventListener('click', () => this.preview(suggestion, card));
      const apply = document.createElement('button');
      apply.className = 'lab-button advisor-apply';
      apply.textContent = 'Apply';
      apply.addEventListener('click', () => this.apply(suggestion));
      const dismiss = document.createElement('button');
      dismiss.className = 'lab-button advisor-dismiss';
      dismiss.textContent = 'Dismiss';
      dismiss.addEventListener('click', () => this.dismiss(suggestion));
      actions.append(preview, apply, dismiss);

      card.append(head, rationale, effect, actions);
      this.suggestionsEl.appendChild(card);
    }
  }

  renderCaveats() {
    this.caveatsEl.replaceChildren();
    const caveats = this.response?.caveats ?? [];
    for (const caveat of caveats) {
      const item = document.createElement('div');
      item.className = 'advisor-caveat';
      item.textContent = caveat;
      this.caveatsEl.appendChild(item);
    }
  }

  preview(suggestion, card) {
    try {
      card.querySelector('.advisor-preview-view')?.remove();
      const validated = validateSuggestion(this.app.document, suggestion);
      if (!validated.ok) {
        this.setStatus(validated.reason, true);
        return;
      }
      const candidate = this.app.suggestCandidate(suggestion);
      if (!candidate) {
        this.setStatus('Preview could not be generated', true);
        return;
      }
      const currentEval = this.app.evaluation;
      const nextEval = evaluateDocument(candidate, { time: this.app.document.animation.time });
      if (nextEval.errors.length) {
        this.setStatus(`Preview invalid: ${nextEval.errors[0].message}`, true);
        return;
      }
      const bounds = boundsOf([currentEval.curves, nextEval.curves]);
      const view = document.createElement('div');
      view.className = 'advisor-preview-view';
      const before = document.createElement('figure');
      const after = document.createElement('figure');
      const beforeImg = document.createElement('img');
      beforeImg.src = curvesDataURL(currentEval.curves, { bounds, size: 110 }) ?? '';
      const afterImg = document.createElement('img');
      afterImg.src = curvesDataURL(nextEval.curves, { bounds, size: 110 }) ?? '';
      const beforeCap = document.createElement('figcaption');
      beforeCap.textContent = 'Now';
      const afterCap = document.createElement('figcaption');
      afterCap.textContent = 'After';
      before.append(beforeImg, beforeCap);
      after.append(afterImg, afterCap);
      view.append(before, after);
      card.appendChild(view);
      this.setStatus('Preview is read-only; Apply commits it.');
    } catch (error) {
      this.setStatus(`Preview failed: ${error.message}`, true);
    }
  }

  apply(suggestion) {
    try {
      this.app.applySuggestion(suggestion);
      this.analyze({ auto: false });
    } catch (error) {
      this.setStatus(`Apply failed: ${error.message}`, true);
    }
  }

  dismiss(suggestion) {
    if (!this.response) return;
    this.response.suggestions = this.response.suggestions.filter((item) => item.id !== suggestion.id);
    this.renderSuggestions();
    this.setStatus('Suggestion dismissed');
  }

  setStatus(message, isError = false) {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle('error', isError);
  }

  persistSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        provider: this.settings.provider,
        endpoint: this.settings.endpoint,
        model: this.settings.model,
        image: Boolean(this.settings.image),
        auto: Boolean(this.settings.auto),
      }));
    } catch {
      // Settings are optional; a blocked localStorage must not break the lab.
    }
  }
}

function loadSettings() {
  const defaults = { provider: 'offline', endpoint: '', model: '', image: false, auto: true };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      provider: PROVIDERS.some((provider) => provider.id === parsed.provider) ? parsed.provider : defaults.provider,
      endpoint: typeof parsed.endpoint === 'string' ? parsed.endpoint : '',
      model: typeof parsed.model === 'string' ? parsed.model : '',
      image: Boolean(parsed.image),
      auto: parsed.auto !== false,
    };
  } catch {
    return defaults;
  }
}

function checkbox(labelText, checked) {
  const label = document.createElement('label');
  label.className = 'advisor-toggle';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = Boolean(checked);
  const span = document.createElement('span');
  span.textContent = labelText;
  label.append(input, span);
  return { label, input };
}

function providerLabel(id) {
  return PROVIDERS.find((provider) => provider.id === id)?.name ?? id;
}

function shortPath(path) {
  return String(path ?? '')
    .replace('generator.params.', 'gen.')
    .replace(/operators\[(\d+)\]\.params\./, 'op[$1].');
}

function format(value) {
  if (!Number.isFinite(value)) return '—';
  if (Number.isInteger(value)) return String(value);
  return Number(value.toFixed(3)).toString();
}
