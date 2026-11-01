/**
 * ui/dialogs.js — injectable prompt/confirm service.
 *
 * Panels never call window.prompt/window.confirm. The production service draws
 * a small accessible modal; tests can inject a fake with the same Promise API.
 */

export class DialogService {
  constructor(host = globalThis.document?.body ?? null) {
    this.host = host;
  }

  prompt({
    title = 'Edit',
    label = 'Value',
    value = '',
    confirmText = 'Accept',
    cancelText = 'Cancel',
  } = {}) {
    return this.#open({ title, label, value, confirmText, cancelText, input: true })
      .then((result) => (result === null ? null : String(result)));
  }

  confirm({
    title = 'Confirm',
    message = '',
    confirmText = 'Accept',
    cancelText = 'Cancel',
  } = {}) {
    return this.#open({ title, message, confirmText, cancelText, input: false })
      .then((result) => result !== null);
  }

  #open({ title, label = '', message = '', value = '', confirmText, cancelText, input }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'parametrica-dialog-overlay';
      overlay.setAttribute('role', 'presentation');

      const dialog = document.createElement('div');
      dialog.className = 'parametrica-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'parametrica-dialog-title');

      const titleEl = document.createElement('div');
      titleEl.className = 'parametrica-dialog-title';
      titleEl.id = 'parametrica-dialog-title';
      titleEl.textContent = title;
      dialog.appendChild(titleEl);

      if (message) {
        const messageEl = document.createElement('div');
        messageEl.className = 'parametrica-dialog-message';
        messageEl.textContent = message;
        dialog.appendChild(messageEl);
      }

      let inputEl = null;
      if (input) {
        const labelEl = document.createElement('label');
        labelEl.className = 'parametrica-dialog-label';
        labelEl.textContent = label;
        inputEl = document.createElement('input');
        inputEl.className = 'parametrica-dialog-input';
        inputEl.type = 'text';
        inputEl.value = value;
        labelEl.appendChild(inputEl);
        dialog.appendChild(labelEl);
      }

      const actions = document.createElement('div');
      actions.className = 'parametrica-dialog-actions';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'lab-button parametrica-dialog-cancel';
      cancel.textContent = cancelText;
      const accept = document.createElement('button');
      accept.type = 'button';
      accept.className = 'lab-button parametrica-dialog-confirm';
      accept.textContent = confirmText;
      actions.append(cancel, accept);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);

      const close = (result) => {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        resolve(result);
      };

      const onKey = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close(null);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          close(input ? inputEl.value : true);
        }
      };

      cancel.addEventListener('click', () => close(null));
      accept.addEventListener('click', () => close(input ? inputEl.value : true));
      overlay.addEventListener('mousedown', (event) => {
        if (event.target === overlay) close(null);
      });
      document.addEventListener('keydown', onKey, true);

      (this.host ?? document.body).appendChild(overlay);
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      } else {
        accept.focus();
      }
    });
  }
}

/** Deterministic fake for unit tests and panel tests. */
export class FakeDialogService {
  constructor({ prompts = [], confirms = [] } = {}) {
    this.prompts = [...prompts];
    this.confirms = [...confirms];
    this.promptCalls = [];
    this.confirmCalls = [];
  }

  async prompt(options = {}) {
    this.promptCalls.push(options);
    return this.prompts.length ? this.prompts.shift() : null;
  }

  async confirm(options = {}) {
    this.confirmCalls.push(options);
    return this.confirms.length ? Boolean(this.confirms.shift()) : false;
  }
}
