/**
 * ImagePanel.js — local reference underlay and contour → Fourier tracing.
 *
 * The image never enters the document. It lives as renderer-only UI state
 * (`app.imageUnderlay`) plus the in-memory source used for tracing. Applying
 * a trace replaces the document with an editable `fourier` generator.
 */

import { MAX_IMAGE_EDGE, traceImageData, buildFourierDocument, grayscale, binarize, otsuThreshold } from '../../input/imageTrace.js';

export class ImagePanel {
  constructor(app) {
    this.app = app;
    this.source = app.imageInput ?? null;
    this.trace = null;
    this.loading = false;
    this.maskFrame = null;
    this.el = document.createElement('div');
    this.el.className = 'image-panel';
    this.build();
    this.restoreSource();
  }

  build() {
    const top = document.createElement('div');
    top.className = 'image-top';
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'image/*';
    this.fileInput.className = 'image-file';
    this.fileInput.hidden = true;
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0];
      this.fileInput.value = '';
      if (file) this.loadFile(file);
    });
    this.chooseBtn = document.createElement('button');
    this.chooseBtn.className = 'lab-button image-choose';
    this.chooseBtn.textContent = 'Choose image';
    this.chooseBtn.addEventListener('click', () => this.fileInput.click());
    this.nameEl = document.createElement('span');
    this.nameEl.className = 'image-name';
    this.nameEl.textContent = 'No image';
    top.append(this.fileInput, this.chooseBtn, this.nameEl);

    this.privacyEl = document.createElement('div');
    this.privacyEl.className = 'image-privacy';
    this.privacyEl.textContent = 'Images stay in this browser. Only the resulting harmonics are stored in the document.';

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'image-status';
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.setAttribute('aria-live', 'polite');
    this.statusEl.textContent = 'Upload a high-contrast silhouette to begin.';

    this.underlayEl = document.createElement('div');
    this.underlayEl.className = 'image-underlay';
    this.visibleToggle = document.createElement('label');
    this.visibleToggle.className = 'image-toggle';
    const visibleInput = document.createElement('input');
    visibleInput.type = 'checkbox';
    visibleInput.className = 'image-visible';
    visibleInput.checked = this.app.imageUnderlay?.visible !== false;
    visibleInput.addEventListener('change', () => {
      if (this.app.imageUnderlay) this.app.imageUnderlay.visible = visibleInput.checked;
    });
    const visibleText = document.createElement('span');
    visibleText.textContent = 'Show underlay';
    this.visibleToggle.append(visibleInput, visibleText);
    this.underlayEl.appendChild(this.visibleToggle);

    const underlay = this.app.imageUnderlay ?? {};
    this.opacity = this.slider('Opacity', 0, 1, 0.05, underlay.opacity ?? 0.35, (v) => `${Math.round(v * 100)}%`, (v) => {
      if (this.app.imageUnderlay) this.app.imageUnderlay.opacity = v;
    });
    this.scale = this.slider('Scale', 0.1, 3, 0.05, underlay.scale ?? 1, (v) => `${v.toFixed(2)}×`, (v) => {
      if (this.app.imageUnderlay) this.app.imageUnderlay.scale = v;
    });
    this.offsetX = this.slider('X', -800, 800, 1, underlay.x ?? 0, (v) => `${Math.round(v)}`, (v) => {
      if (this.app.imageUnderlay) this.app.imageUnderlay.x = v;
    });
    this.offsetY = this.slider('Y', -800, 800, 1, underlay.y ?? 0, (v) => `${Math.round(v)}`, (v) => {
      if (this.app.imageUnderlay) this.app.imageUnderlay.y = v;
    });
    this.rotation = this.slider('Rotation', -180, 180, 1, Math.round(((underlay.rotation ?? 0) * 180) / Math.PI), (v) => `${Math.round(v)}°`, (v) => {
      if (this.app.imageUnderlay) this.app.imageUnderlay.rotation = (v * Math.PI) / 180;
    });
    this.underlayEl.append(this.opacity.el, this.scale.el, this.offsetX.el, this.offsetY.el, this.rotation.el);

    this.thresholdEl = document.createElement('div');
    this.thresholdEl.className = 'image-threshold';
    this.threshold = this.slider('Threshold', 0, 255, 1, this.source?.threshold ?? 127, (v) => String(Math.round(v)), (v) => {
      this.source && (this.source.threshold = v);
      this.scheduleMaskPreview();
    });
    this.invertToggle = document.createElement('label');
    this.invertToggle.className = 'image-toggle';
    const invertInput = document.createElement('input');
    invertInput.type = 'checkbox';
    invertInput.className = 'image-invert';
    invertInput.checked = Boolean(this.source?.invert);
    invertInput.addEventListener('change', () => {
      if (this.source) this.source.invert = invertInput.checked;
      this.scheduleMaskPreview();
    });
    const invertText = document.createElement('span');
    invertText.textContent = 'Invert (light shape on dark)';
    this.invertToggle.append(invertInput, invertText);
    this.autoBtn = document.createElement('button');
    this.autoBtn.className = 'lab-button image-auto';
    this.autoBtn.textContent = 'Auto';
    this.autoBtn.title = 'Use the Otsu threshold';
    this.autoBtn.addEventListener('click', () => {
      if (!this.source) return;
      const value = otsuThreshold(grayscale(this.source.imageData));
      this.source.threshold = value;
      this.threshold.input.value = String(value);
      this.threshold.output.textContent = String(value);
      this.scheduleMaskPreview();
    });
    this.traceBtn = document.createElement('button');
    this.traceBtn.className = 'lab-button image-trace';
    this.traceBtn.textContent = 'Trace contour';
    this.traceBtn.addEventListener('click', () => this.runTrace());
    const traceActions = document.createElement('div');
    traceActions.className = 'image-trace-actions';
    traceActions.append(this.traceBtn, this.autoBtn);
    this.thresholdEl.append(this.threshold.el, this.invertToggle, traceActions);

    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.className = 'image-mask';
    this.maskCanvas.width = 160;
    this.maskCanvas.height = 120;
    this.maskCanvas.setAttribute('aria-label', 'Threshold preview');

    this.previewEl = document.createElement('div');
    this.previewEl.className = 'image-preview';
    this.previewEl.hidden = true;

    this.discardBtn = document.createElement('button');
    this.discardBtn.className = 'lab-button image-discard';
    this.discardBtn.textContent = 'Discard trace';
    this.discardBtn.hidden = true;
    this.discardBtn.addEventListener('click', () => this.clearTrace());
    this.applyBtn = document.createElement('button');
    this.applyBtn.className = 'lab-button image-apply';
    this.applyBtn.textContent = 'Apply as Fourier';
    this.applyBtn.hidden = true;
    this.applyBtn.addEventListener('click', () => this.apply());
    const previewActions = document.createElement('div');
    previewActions.className = 'image-preview-actions';
    previewActions.append(this.applyBtn, this.discardBtn);

    this.el.append(
      top,
      this.privacyEl,
      this.statusEl,
      this.underlayEl,
      this.thresholdEl,
      this.maskCanvas,
      this.previewEl,
      previewActions,
    );
    this.setEnabled(Boolean(this.source));
  }

  slider(labelText, min, max, step, value, format, onInput) {
    const el = document.createElement('label');
    el.className = 'image-slider';
    const label = document.createElement('span');
    label.className = 'image-slider-label';
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const output = document.createElement('output');
    output.textContent = format(Number(value));
    input.addEventListener('input', () => {
      const next = Number(input.value);
      output.textContent = format(next);
      onInput(next);
    });
    el.append(label, input, output);
    return { el, input, output };
  }

  setEnabled(enabled) {
    for (const control of [
      this.opacity, this.scale, this.offsetX, this.offsetY, this.rotation,
      this.threshold,
    ]) control.input.disabled = !enabled;
    this.invertToggle.querySelector('input').disabled = !enabled;
    this.autoBtn.disabled = !enabled;
    this.traceBtn.disabled = !enabled;
  }

  async loadFile(file) {
    if (!file.type?.startsWith('image/')) {
      this.setStatus('Unsupported file. Choose an image.', true);
      return;
    }
    if (file.size > 24 * 1024 * 1024) {
      this.setStatus('Image is larger than 24 MB.', true);
      return;
    }
    this.loading = true;
    this.chooseBtn.disabled = true;
    this.setStatus(`Loading ${file.name}…`);
    let url = null;
    try {
      url = URL.createObjectURL(file);
      const image = await loadImage(url);
      const data = drawToImageData(image, MAX_IMAGE_EDGE);
      const preview = drawToImageData(image, 240);
      if (this.source?.url) {
        try { URL.revokeObjectURL(this.source.url); } catch { /* already revoked */ }
      }
      this.source = {
        name: file.name,
        image,
        imageData: data,
        previewData: preview,
        width: data.width,
        height: data.height,
        threshold: otsuThreshold(grayscale(data)),
        invert: false,
        url,
      };
      this.app.imageInput = this.source;
      this.app.imageUnderlay = {
        image,
        visible: true,
        opacity: this.opacity.input.value ? Number(this.opacity.input.value) : 0.35,
        scale: Number(this.scale.input.value) || 1,
        x: Number(this.offsetX.input.value) || 0,
        y: Number(this.offsetY.input.value) || 0,
        rotation: (Number(this.rotation.input.value) || 0) * Math.PI / 180,
      };
      this.visibleToggle.querySelector('input').checked = true;
      this.threshold.input.value = String(this.source.threshold);
      this.threshold.output.textContent = String(this.source.threshold);
      this.invertToggle.querySelector('input').checked = false;
      this.nameEl.textContent = `${file.name} · ${data.width}×${data.height}`;
      this.clearTrace();
      this.setEnabled(true);
      this.renderMaskPreview();
      this.setStatus('Image loaded. Adjust the threshold, then trace.');
    } catch (error) {
      if (url) URL.revokeObjectURL(url);
      this.setStatus(`Could not load image: ${error.message}`, true);
    } finally {
      this.loading = false;
      this.chooseBtn.disabled = false;
    }
  }

  restoreSource() {
    if (!this.source) return;
    this.nameEl.textContent = `${this.source.name} · ${this.source.width}×${this.source.height}`;
    this.threshold.input.value = String(this.source.threshold ?? 127);
    this.threshold.output.textContent = String(this.source.threshold ?? 127);
    this.invertToggle.querySelector('input').checked = Boolean(this.source.invert);
    this.setEnabled(true);
    this.renderMaskPreview();
    this.setStatus('Image loaded. Adjust the threshold, then trace.');
  }

  scheduleMaskPreview() {
    if (this.maskFrame) cancelAnimationFrame(this.maskFrame);
    this.maskFrame = requestAnimationFrame(() => {
      this.maskFrame = null;
      this.renderMaskPreview();
    });
  }

  renderMaskPreview() {
    if (!this.source?.previewData) return;
    const preview = this.source.previewData;
    const ratio = preview.width / preview.height;
    const w = 160;
    const h = Math.max(40, Math.round(w / ratio));
    this.maskCanvas.width = w;
    this.maskCanvas.height = h;
    const ctx = this.maskCanvas.getContext('2d');
    if (!ctx) return;
    const gray = grayscale(preview);
    const mask = binarize(gray, preview.width, preview.height, this.source.threshold ?? 127, {
      invert: Boolean(this.source.invert),
    });
    const image = ctx.createImageData(preview.width, preview.height);
    for (let i = 0; i < mask.length; i++) {
      const value = mask[i] ? 0 : 255;
      const p = i * 4;
      image.data[p] = value;
      image.data[p + 1] = value;
      image.data[p + 2] = value;
      image.data[p + 3] = 255;
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = preview.width;
    offscreen.height = preview.height;
    offscreen.getContext('2d')?.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, 0, 0, w, h);
  }

  async runTrace() {
    if (!this.source) return;
    this.traceBtn.disabled = true;
    this.setStatus('Tracing largest contour…');
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const result = traceImageData(this.source.imageData, {
        threshold: this.source.threshold,
        invert: this.source.invert,
        harmonics: 32,
        samples: 512,
      });
      this.traceBtn.disabled = false;
      if (!result.ok) {
        this.clearTrace();
        this.setStatus(result.reason, true);
        return;
      }
      this.trace = result;
      this.renderPreview(result);
      this.setStatus(
        `Found ${result.pointCount}-point contour · ${result.harmonicCount} harmonics · ` +
        `RMS ${(result.error.relative * 100).toFixed(2)}%`,
      );
    } catch (error) {
      this.traceBtn.disabled = false;
      this.clearTrace();
      this.setStatus(`Trace failed: ${error.message}`, true);
    }
  }

  renderPreview(result) {
    this.previewEl.replaceChildren();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '-1.15 -1.15 2.3 2.3');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Contour and Fourier reconstruction');
    const contour = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    contour.setAttribute('d', pathFromPoints(result.contour));
    contour.setAttribute('fill', 'none');
    contour.setAttribute('stroke', '#565656');
    contour.setAttribute('stroke-width', '0.03');
    const reconstruction = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    reconstruction.setAttribute('d', pathFromPoints(result.reconstruction));
    reconstruction.setAttribute('fill', 'none');
    reconstruction.setAttribute('stroke', '#e8e8e8');
    reconstruction.setAttribute('stroke-width', '0.012');
    svg.append(contour, reconstruction);

    const legend = document.createElement('div');
    legend.className = 'image-legend';
    legend.innerHTML = '<span class="image-legend-contour">contour</span><span class="image-legend-fourier">Fourier</span>';
    const error = document.createElement('div');
    error.className = 'image-error';
    error.textContent = `RMS ${(result.error.relative * 100).toFixed(2)}% · max ${(result.error.max * 100).toFixed(2)}% · ` +
      `${result.harmonicCount} harmonics · ${result.samples} samples`;
    this.previewEl.append(svg, legend, error);
    this.previewEl.hidden = false;
    this.applyBtn.hidden = false;
    this.discardBtn.hidden = false;
  }

  clearTrace() {
    this.trace = null;
    this.previewEl.hidden = true;
    this.previewEl.replaceChildren();
    this.applyBtn.hidden = true;
    this.discardBtn.hidden = true;
  }

  apply() {
    if (!this.trace?.ok) return;
    try {
      const name = `Trace · ${stripExtension(this.source?.name ?? 'contour')}`.slice(0, 80);
      const doc = buildFourierDocument(this.trace, { name });
      this.app.adoptDocument(doc);
      this.app.notify(`Fourier document created with ${this.trace.harmonicCount} harmonics`);
    } catch (error) {
      this.setStatus(`Could not apply trace: ${error.message}`, true);
    }
  }

  setStatus(message, isError = false) {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle('error', isError);
  }

  destroy() {
    if (this.maskFrame) cancelAnimationFrame(this.maskFrame);
    this.maskFrame = null;
    if (this.source?.url) {
      try { URL.revokeObjectURL(this.source.url); } catch { /* already revoked */ }
    }
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('the browser could not decode this file'));
    image.src = url;
  });
}

function drawToImageData(image, maxEdge) {
  const sw = image.naturalWidth || image.width;
  const sh = image.naturalHeight || image.height;
  if (!sw || !sh) throw new Error('image has no dimensions');
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas is unavailable');
  ctx.drawImage(image, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function pathFromPoints(points) {
  if (!Array.isArray(points) || points.length < 2) return '';
  const [first, ...rest] = points;
  let d = `M ${first.x.toFixed(4)} ${first.y.toFixed(4)}`;
  for (const point of rest) d += ` L ${point.x.toFixed(4)} ${point.y.toFixed(4)}`;
  return `${d} Z`;
}

function stripExtension(name) {
  return String(name).replace(/\.[^.]+$/, '') || 'contour';
}
