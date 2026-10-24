/**
 * TimelinePanel.js — visible keyframe editing and sequence export.
 *
 * The pure timeline lives in `src/animation/timeline.js`; this panel edits
 * the active layer's tracks and drives frame export through the renderer.
 */

import {
  EASINGS,
  createTimeline,
  frameTimes,
  resolveTimelineValue,
  upsertKeyframe,
  removeKeyframe,
  removeTrack,
} from '../../animation/timeline.js';
import { numericParameterRefs, pathForRef } from '../../lab/parameters.js';
import { zipStore } from '../../export/zip.js';

export class TimelinePanel {
  constructor(app) {
    this.app = app;
    this.refs = numericParameterRefs(app.document);
    this.selectedTrack = null;
    this.recording = false;
    this.recordTimer = null;
    this.el = document.createElement('div');
    this.el.className = 'timeline-panel';
    this.build();
    this.refresh();
  }

  get timeline() {
    const animation = this.app.document.animation;
    if (!animation.timeline) animation.timeline = createTimeline();
    return animation.timeline;
  }

  build() {
    const settings = document.createElement('div');
    settings.className = 'timeline-settings';
    this.fpsInput = this.numberInput(24, 1, 120, 1, null, 'timeline-fps');
    settings.append(
      this.field('Duration', this.numberInput(this.timeline.duration, 0.1, 600, 0.1, (v) => {
        this.timeline.duration = v;
        this.app.rebuild();
      })),
      this.field('FPS', this.fpsInput),
      this.field('Loop', this.checkbox(this.timeline.loop, (v) => {
        this.timeline.loop = v;
        this.app.rebuild();
      })),
    );

    const trackRow = document.createElement('div');
    trackRow.className = 'timeline-track-add';
    this.trackSelect = document.createElement('select');
    this.trackSelect.className = 'timeline-track-select';
    for (const ref of this.refs) {
      const option = document.createElement('option');
      option.value = pathForRef(ref);
      option.textContent = shortPath(pathForRef(ref));
      this.trackSelect.appendChild(option);
    }
    const addTrack = document.createElement('button');
    addTrack.className = 'lab-button timeline-add-track';
    addTrack.textContent = '+ Track';
    addTrack.addEventListener('click', () => this.addTrack());
    trackRow.append(this.trackSelect, addTrack);

    const actions = document.createElement('div');
    actions.className = 'timeline-actions';
    this.recordToggle = this.checkbox(false, (checked) => this.setRecording(checked));
    const recordLabel = document.createElement('label');
    recordLabel.className = 'timeline-record';
    recordLabel.append(this.recordToggle, document.createTextNode(' Record selected track'));
    const exportBtn = document.createElement('button');
    exportBtn.className = 'lab-button timeline-export';
    exportBtn.textContent = 'Export frames';
    exportBtn.addEventListener('click', () => this.exportFrames());
    actions.append(recordLabel, exportBtn);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'timeline-status';
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.setAttribute('aria-live', 'polite');

    this.tracksEl = document.createElement('div');
    this.tracksEl.className = 'timeline-tracks';

    this.el.append(settings, trackRow, actions, this.statusEl, this.tracksEl);
  }

  field(label, control) {
    const row = document.createElement('label');
    row.className = 'timeline-field';
    const name = document.createElement('span');
    name.className = 'timeline-label';
    name.textContent = label;
    row.append(name, control);
    return row;
  }

  numberInput(value, min, max, step, apply, focusId = null) {
    const input = document.createElement('input');
    input.className = 'timeline-number';
    if (focusId) input.dataset.focusId = focusId;
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    if (apply) {
      input.addEventListener('change', () => {
        const n = Math.min(max, Math.max(min, Number(input.value) || min));
        input.value = String(n);
        apply(n);
      });
    }
    return input;
  }

  checkbox(checked, apply) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(checked);
    input.addEventListener('change', () => apply(input.checked));
    return input;
  }

  refresh() {
    const timeline = this.timeline;
    this.tracksEl.replaceChildren();
    if (!timeline.tracks.length) {
      const empty = document.createElement('div');
      empty.className = 'lab-hint';
      empty.textContent = 'No tracks yet. Add one above.';
      this.tracksEl.appendChild(empty);
      this.selectedTrack = null;
      return;
    }
    if (!this.selectedTrack || !timeline.tracks.some((track) => sameTrack(track, this.selectedTrack))) {
      this.selectedTrack = { path: timeline.tracks[0].path, layer: timeline.tracks[0].layer ?? 0 };
    }
    for (const track of timeline.tracks) this.tracksEl.appendChild(this.renderTrack(track));
  }

  renderTrack(track) {
    const row = document.createElement('div');
    row.className = 'timeline-track';
    if (sameTrack(track, this.selectedTrack)) row.classList.add('active');

    const head = document.createElement('div');
    head.className = 'timeline-track-head';
    const name = document.createElement('span');
    name.className = 'timeline-track-name';
    name.textContent = shortPath(track.path);
    name.title = `${track.path} · layer ${(track.layer ?? 0) + 1}`;
    const add = this.icon('+K', 'Add keyframe at playhead', () => this.addKeyframe(track));
    const remove = this.icon('×', 'Remove track', () => {
      removeTrack(this.timeline, track.path, track.layer ?? 0);
      this.app.rebuild();
      this.refresh();
    });
    head.append(name, add, remove);
    head.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      this.selectedTrack = { path: track.path, layer: track.layer ?? 0 };
      this.refresh();
    });

    const frames = document.createElement('div');
    frames.className = 'timeline-keyframes';
    for (const frame of track.keyframes) frames.appendChild(this.renderKeyframe(track, frame));

    row.append(head, frames);
    return row;
  }

  renderKeyframe(track, frame) {
    const row = document.createElement('div');
    row.className = 'timeline-keyframe';
    const time = this.numberInput(frame.time, 0, this.timeline.duration, 0.01, (v) => {
      frame.time = v;
      sortFrames(track);
      this.app.rebuild();
    });
    const value = this.numberInput(frame.value, -1e9, 1e9, 0.01, (v) => {
      frame.value = v;
      this.app.rebuild();
    });
    const easing = document.createElement('select');
    easing.className = 'timeline-easing';
    for (const kind of EASINGS) {
      const option = document.createElement('option');
      option.value = kind;
      option.textContent = kind;
      if (kind === frame.easing) option.selected = true;
      easing.appendChild(option);
    }
    easing.addEventListener('change', () => {
      frame.easing = easing.value;
      this.app.rebuild();
    });
    const remove = this.icon('×', 'Remove keyframe', () => {
      removeKeyframe(this.timeline, { path: track.path, layer: track.layer ?? 0, time: frame.time });
      this.app.rebuild();
      this.refresh();
    });
    row.append(time, value, easing, remove);
    return row;
  }

  icon(label, title, onClick) {
    const button = document.createElement('button');
    button.className = 'timeline-icon';
    button.textContent = label;
    button.title = title;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  addTrack() {
    const path = this.trackSelect.value;
    if (!path) return;
    const existing = this.timeline.tracks.find((track) => track.path === path && (track.layer ?? 0) === this.app.document.activeLayer);
    if (!existing) {
      this.selectedTrack = { path, layer: this.app.document.activeLayer };
      upsertKeyframe(this.timeline, {
        ...this.selectedTrack,
        time: this.app.document.animation.time,
        value: this.currentValue(this.selectedTrack),
        easing: 'linear',
      });
      this.app.rebuild();
    } else {
      this.selectedTrack = { path, layer: existing.layer ?? 0 };
    }
    this.refresh();
    this.setStatus(`Track ${shortPath(path)} ready`);
  }

  addKeyframe(track) {
    const path = track.path;
    const layer = track.layer ?? 0;
    upsertKeyframe(this.timeline, {
      path, layer,
      time: this.app.document.animation.time,
      value: this.currentValue({ path, layer }),
      easing: 'linear',
    });
    this.selectedTrack = { path, layer };
    this.app.rebuild();
    this.refresh();
  }

  currentValue(track) {
    const timed = resolveTimelineValue(this.timeline, track.path, track.layer ?? 0, this.app.document.animation.time);
    return timed !== null ? timed : this.baseValue(track);
  }

  baseValue(track) {
    const layer = this.app.document.layers?.[track.layer ?? 0];
    if (!layer) return 0;
    const match = /^generator\.params\.(.+)$/.exec(track.path);
    if (match) return Number(layer.generator.params[match[1]]) || 0;
    const op = /^operators\[(\d+)\]\.params\.(.+)$/.exec(track.path);
    if (op) return Number(layer.operators?.[Number(op[1])]?.params?.[op[2]]) || 0;
    return 0;
  }

  setRecording(checked) {
    this.recording = checked;
    if (!checked) {
      this.app.timelineRecorder = null;
      this.setStatus('Recording stopped');
      return;
    }
    if (!this.selectedTrack) {
      this.recordToggle.checked = false;
      this.recording = false;
      this.setStatus('Select a track before recording', true);
      return;
    }
    this.app.timelineRecorder = (time) => this.recordAt(time);
    this.setStatus(`Recording ${shortPath(this.selectedTrack.path)}`);
  }

  recordAt(time) {
    if (!this.recording || !this.selectedTrack) return;
    upsertKeyframe(this.timeline, {
      ...this.selectedTrack,
      time,
      value: this.baseValue(this.selectedTrack),
      easing: 'linear',
    });
    clearTimeout(this.recordTimer);
    this.recordTimer = setTimeout(() => this.refresh(), 250);
  }

  exportFrames() {
    const fps = Number(this.fpsInput?.value) || 24;
    const duration = this.timeline.duration;
    const times = frameTimes(duration, fps);
    if (!this.app.renderer?.artboardDataURL) {
      this.setStatus('Renderer is not ready', true);
      return;
    }
    const oldTime = this.app.document.animation.time;
    const oldPlaying = this.app.document.animation.playing;
    this.setStatus(`Rendering ${times.length} frames…`);
    try {
      this.app.document.animation.playing = false;
      const files = [];
      const manifestFrames = [];
      times.forEach((time, index) => {
        this.app.setTime(time);
        this.app.renderer.renderNow();
        const url = this.app.renderer.artboardDataURL();
        if (!url) throw new Error(`frame ${index} could not be captured`);
        const name = `frame-${String(index).padStart(3, '0')}.png`;
        files.push({ name, data: dataUrlBytes(url) });
        manifestFrames.push({ file: name, time });
      });
      const manifest = {
        version: 1,
        duration,
        fps,
        frameCount: files.length,
        frames: manifestFrames,
      };
      files.push({
        name: 'manifest.json',
        data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
      });
      const zip = zipStore(files);
      downloadBlob('parametrica-sequence.zip', zip);
      this.setStatus(`Exported ${times.length} frames`);
    } catch (error) {
      this.setStatus(`Export failed: ${error.message}`, true);
    } finally {
      this.app.document.animation.playing = oldPlaying;
      this.app.setTime(oldTime);
    }
  }

  setStatus(message, isError = false) {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle('error', isError);
  }

  destroy() {
    clearTimeout(this.recordTimer);
    if (this.app.timelineRecorder) this.app.timelineRecorder = null;
  }
}

function sameTrack(a, b) {
  return a?.path === b?.path && (a?.layer ?? 0) === (b?.layer ?? 0);
}

function sortFrames(track) {
  track.keyframes.sort((a, b) => a.time - b.time);
}

function shortPath(path) {
  return path
    .replace('generator.params.', 'gen.')
    .replace(/operators\\[(\\d+)\\]\\.params\\./, 'op[$1].');
}

function dataUrlBytes(url) {
  const base64 = String(url).split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function downloadBlob(filename, bytes) {
  const blob = new Blob([bytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
