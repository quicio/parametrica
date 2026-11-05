/**
 * ui/StartWithOverlay.js — first-run and new-document starting chooser.
 *
 * The overlay is a modal presentation layer. It never mutates the document
 * itself; the App resolves the chosen starting document and saves the session.
 */

const START_CHOICES = Object.freeze([
  {
    id: 'composition',
    name: 'Composition',
    description: 'A shared source with independent instance layers.',
    meta: 'Instance layers · Vortex Stack example',
    featured: true,
  },
  {
    id: 'classic',
    name: 'Parametric',
    description: 'Two equations tracing a 2D line.',
    meta: '2D curves',
    featured: false,
  },
  {
    id: 'surface',
    name: 'Parametric Surface',
    description: 'A U/V equation map in world space.',
    meta: '3D surfaces',
    featured: false,
  },
]);

export class StartWithOverlay {
  constructor(app, { firstRun = false, onClose = null } = {}) {
    this.app = app;
    this.firstRun = firstRun;
    this.onClose = onClose;
    this.el = null;
    this.errorEl = null;
    this.previousFocus = null;
    this.onKey = null;
  }

  open() {
    if (this.el) {
      this.focusFirst();
      return this;
    }
    this.previousFocus = globalThis.document?.activeElement ?? null;

    const overlay = document.createElement('div');
    overlay.className = 'start-with-overlay';
    overlay.setAttribute('role', 'presentation');

    const dialog = document.createElement('div');
    dialog.className = 'start-with-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'start-with-title');

    const header = document.createElement('div');
    header.className = 'start-with-header';
    const eyebrow = document.createElement('div');
    eyebrow.className = 'start-with-eyebrow';
    eyebrow.textContent = this.firstRun ? 'First run' : 'New document';
    const title = document.createElement('h2');
    title.className = 'start-with-title';
    title.id = 'start-with-title';
    title.textContent = 'Start with';
    const hint = document.createElement('div');
    hint.className = 'start-with-hint';
    hint.textContent = 'Choose a starting figure. You can change everything later.';
    header.append(eyebrow, title, hint);

    const grid = document.createElement('div');
    grid.className = 'start-with-grid';
    const cards = new Map();
    for (const choice of START_CHOICES) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `start-with-card${choice.featured ? ' featured' : ''}`;
      card.dataset.choice = choice.id;
      card.setAttribute('aria-label', choice.name);

      const thumb = document.createElement('span');
      thumb.className = 'start-with-thumb';
      const img = document.createElement('img');
      img.alt = '';
      img.hidden = true;
      thumb.appendChild(img);
      const placeholder = document.createElement('span');
      placeholder.className = 'start-with-placeholder';
      placeholder.textContent = choice.featured ? 'INSTANCE COMPOSITION' : choice.name.toUpperCase();
      thumb.appendChild(placeholder);

      const copy = document.createElement('span');
      copy.className = 'start-with-copy';
      if (choice.featured) {
        const kicker = document.createElement('span');
        kicker.className = 'start-with-kicker';
        kicker.textContent = 'Featured';
        copy.appendChild(kicker);
      }
      const name = document.createElement('span');
      name.className = 'start-with-name';
      name.textContent = choice.name;
      const description = document.createElement('span');
      description.className = 'start-with-desc';
      description.textContent = choice.description;
      const meta = document.createElement('span');
      meta.className = 'start-with-meta';
      meta.textContent = choice.meta;
      copy.append(name, description, meta);
      card.append(thumb, copy);
      card.addEventListener('click', () => this.choose(choice.id));
      grid.appendChild(card);
      cards.set(choice.id, { card, img, placeholder });
    }

    const error = document.createElement('div');
    error.className = 'start-with-error';
    error.setAttribute('role', 'status');
    error.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'start-with-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'lab-button start-with-cancel';
    cancel.textContent = this.firstRun ? 'START WITH PARAMETRIC' : 'CANCEL';
    cancel.addEventListener('click', () => this.cancel());
    actions.appendChild(cancel);

    dialog.append(header, grid, error, actions);
    overlay.appendChild(dialog);
    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay) this.cancel();
    });

    this.el = overlay;
    this.errorEl = error;
    this.cards = cards;
    this.cancelButton = cancel;
    this.onKey = (event) => this.handleKey(event);
    document.addEventListener('keydown', this.onKey, true);
    (globalThis.document?.body ?? document.body).appendChild(overlay);

    // Previews are optional and must never block a choice.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.loadPreviews());
    } else {
      this.loadPreviews();
    }

    this.focusFirst();
    return this;
  }

  loadPreviews() {
    if (!this.el) return;
    for (const choice of START_CHOICES) {
      const entry = this.cards.get(choice.id);
      if (!entry) continue;
      try {
        const dataUrl = this.app.startWithPreview?.(choice.id);
        if (dataUrl) {
          entry.img.src = dataUrl;
          entry.img.hidden = false;
          entry.placeholder.hidden = true;
        }
      } catch {
        // Keep the stable placeholder.
      }
    }
  }

  choose(id) {
    if (this.busy) return;
    this.busy = true;
    try {
      this.app.setStartWithChoice?.(id);
      this.close();
    } catch (error) {
      this.busy = false;
      if (this.errorEl) {
        this.errorEl.textContent = error?.message || 'Could not start that figure';
        this.errorEl.hidden = false;
      }
    }
  }

  cancel() {
    if (this.firstRun) {
      this.choose('classic');
      return;
    }
    this.close();
  }

  close() {
    if (!this.el) return;
    if (this.onKey) document.removeEventListener('keydown', this.onKey, true);
    this.onKey = null;
    this.el.remove();
    this.el = null;
    this.busy = false;
    const focus = this.previousFocus;
    this.previousFocus = null;
    this.onClose?.();
    if (focus?.focus) focus.focus({ preventScroll: true });
  }

  focusFirst() {
    this.cards?.get('composition')?.card.focus({ preventScroll: true });
  }

  handleKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancel();
      return;
    }
    if (event.key !== 'Tab' || !this.el) return;
    const focusables = [...this.el.querySelectorAll('button')].filter((button) => !button.disabled);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

export { START_CHOICES };
