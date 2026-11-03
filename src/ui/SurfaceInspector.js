/**
 * SurfaceInspector — compact, read-only surface pick readout for Canvas single.
 * It never mutates geometry and does not participate in render or export.
 */

const STORAGE_KEY = 'parametrica.surfaceInspector.v1';

export class SurfaceInspector {
  constructor(container, app) {
    this.app = app;
    this.enabled = loadEnabled();
    this.lastPoint = null;
    this.lastMessage = null;
    this.el = document.createElement('aside');
    this.el.id = 'surface-inspector';
    this.el.className = 'surface-inspector';
    this.el.setAttribute('aria-label', 'Surface inspector');
    this.el.hidden = !this.enabled;

    this.head = document.createElement('div');
    this.head.className = 'si-head';
    this.title = document.createElement('span');
    this.title.className = 'si-title';
    this.title.textContent = 'SURFACE INSPECT';
    this.status = document.createElement('span');
    this.status.className = 'si-status';
    this.head.append(this.title, this.status);

    this.body = document.createElement('div');
    this.body.className = 'si-body';

    this.el.append(this.head, this.body);
    container.appendChild(this.el);
    this.setMessage(this.enabled ? 'Hover a surface' : '');
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: this.enabled }));
    } catch {
      /* UI-only state */
    }
    this.el.hidden = !this.enabled;
    if (!this.enabled) {
      this.lastPoint = null;
      this.setMessage('');
      return;
    }
    if (this.isQuadActive()) {
      this.setMessage('Single view only');
      return;
    }
    if (this.lastPoint) this.app.inspectAtCanvas(this.lastPoint.x, this.lastPoint.y);
    else this.setMessage('Hover a surface');
  }

  isQuadActive() {
    const active = this.app.renderer?.quadActive;
    return active === undefined
      ? this.app.document.view.layout === 'quad'
      : Boolean(active);
  }

  setPoint(x, y) {
    if (Number.isFinite(x) && Number.isFinite(y)) this.lastPoint = { x, y };
  }

  setResult(result) {
    if (!this.enabled) return;
    if (!result) {
      this.setMessage('No surface under cursor');
      return;
    }
    this.lastMessage = null;
    this.status.textContent = [
      result.projection,
      result.mappingStatus === 'ok' ? 'mapping ok' : result.mappingStatus,
    ].join(' · ');
    this.status.classList.toggle('warn', result.mappingStatus !== 'ok');

    const rows = [
      ['surface', shortId(result.surfaceId), result.surfaceId ?? ''],
      ['layer', result.layerName ?? '—'],
      ['triangle', `${result.faceIndex}${result.triangle == null ? '' : ` · tri ${result.triangle}`}`],
      ['cell', result.cell ? `u ${result.cell.u} · v ${result.cell.v}` : '—'],
      ['uv', result.uv ? `u ${fmt(result.uv.u)} · v ${fmt(result.uv.v)}` : '—'],
      ['xyz', `x ${fmt(result.world.x)} · y ${fmt(result.world.y)} · z ${fmt(result.world.z)}`],
      ['depth', result.orthoDepth
        ? `${result.orthoDepth.axis} ${fmt(result.orthoDepth.value)}`
        : `dist ${fmt(result.distance)}`],
      ['mapping', result.mappingStatus],
    ];
    this.body.replaceChildren(...rows.map(([label, value, title]) => row(label, value, title)));
  }

  setMessage(message) {
    if (!this.enabled) return;
    if (this.lastMessage === message) return;
    this.lastMessage = message;
    this.status.textContent = '';
    this.status.classList.remove('warn');
    this.body.replaceChildren();
    if (!message) return;
    const empty = document.createElement('div');
    empty.className = 'si-empty';
    empty.textContent = message;
    this.body.appendChild(empty);
  }

  onLayoutChange(quadActive) {
    if (!this.enabled) return;
    if (quadActive) {
      this.setMessage('Single view only');
      return;
    }
    if (this.lastPoint) this.app.inspectAtCanvas(this.lastPoint.x, this.lastPoint.y);
    else this.setMessage('Hover a surface');
  }

  onViewportChange() {
    this.onEvaluation();
  }

  onEvaluation() {
    if (!this.enabled) return;
    if (this.isQuadActive()) {
      this.setMessage('Single view only');
      return;
    }
    if (this.app.document.animation.playing) {
      this.setMessage('Playback — inspection paused');
      return;
    }
    if (this.app.pointerDragging) return;
    if (this.lastPoint) this.app.inspectAtCanvas(this.lastPoint.x, this.lastPoint.y);
    else this.setMessage('Hover a surface');
  }

  clear() {
    this.lastPoint = null;
    if (this.enabled) this.setMessage('Hover a surface');
  }

  destroy() {
    this.el.remove();
  }
}

function row(label, value, title = '') {
  const el = document.createElement('div');
  el.className = 'si-row';
  const key = document.createElement('span');
  key.className = 'si-key';
  key.textContent = label;
  const val = document.createElement('span');
  val.className = 'si-value';
  val.textContent = value;
  if (title || value) val.title = title || value;
  el.append(key, val);
  return el;
}

function shortId(value) {
  if (!value) return '—';
  const text = String(value);
  return text.length > 22 ? `…${text.slice(-21)}` : text;
}

function fmt(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return String(Number(number.toFixed(3)));
}

function loadEnabled() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.enabled === true;
  } catch {
    return false;
  }
}
