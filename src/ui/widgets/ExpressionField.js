/**
 * ui/widgets/ExpressionField.js — formula editor component.
 *
 * Lightweight, dependency-free: a transparent <textarea> over a
 * token-highlighted <pre>, live-compiled (debounced), errors inline.
 * Highlighting reuses the expression engine's own tokenizer — the
 * grammar you see is exactly the grammar that runs.
 */

import { tokenize, TOKEN } from '../../math/expression.js';

let fieldId = 0;

export class ExpressionField {
  /**
   * @param {{label: string, multiline?: boolean, get: () => string, set: (v:string) => void}} opts
   */
  constructor({ label, multiline = false, doc = '', get, set }) {
    this.get = get;
    this.set = set;
    this.debounceTimer = null;
    this.id = `expr-field-${fieldId++}`;

    this.el = document.createElement('div');
    this.el.className = `expr-field${multiline ? ' multiline' : ''}`;

    const labelEl = document.createElement('label');
    labelEl.className = 'expr-label';
    labelEl.htmlFor = this.id;
    labelEl.textContent = label;
    if (doc) {
      labelEl.title = doc;
      labelEl.setAttribute('aria-description', doc);
    }
    this.el.appendChild(labelEl);

    const wrap = document.createElement('div');
    wrap.className = 'expr-editor';

    this.highlight = document.createElement('pre');
    this.highlight.className = 'expr-highlight';
    this.highlight.setAttribute('aria-hidden', 'true');

    this.input = document.createElement('textarea');
    this.input.id = this.id;
    this.input.className = 'expr-input';
    this.input.spellcheck = false;
    this.input.rows = multiline ? 5 : 1;
    this.input.value = get();

    wrap.appendChild(this.highlight);
    wrap.appendChild(this.input);
    this.el.appendChild(wrap);

    this.errorEl = document.createElement('div');
    this.errorEl.className = 'expr-error';
    this.errorEl.id = `${this.id}-error`;
    this.input.setAttribute('aria-describedby', this.errorEl.id);
    this.el.appendChild(this.errorEl);

    this.input.addEventListener('input', () => {
      this.renderHighlight();
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.set(this.input.value), 150);
    });
    this.input.addEventListener('scroll', () => {
      this.highlight.scrollTop = this.input.scrollTop;
      this.highlight.scrollLeft = this.input.scrollLeft;
    });

    this.renderHighlight();
  }

  /** Re-read value from the document and re-render (after external changes). */
  refresh() {
    if (this.input.value !== this.get()) this.input.value = this.get();
    this.renderHighlight();
  }

  setError(message) {
    this.errorEl.textContent = message ?? '';
    this.el.classList.toggle('has-error', Boolean(message));
    if (message) this.input.setAttribute('aria-invalid', 'true');
    else this.input.removeAttribute('aria-invalid');
  }

  renderHighlight() {
    const source = this.input.value;
    let html = '';
    try {
      const tokens = tokenize(source);
      for (const tok of tokens) {
        if (tok.type === TOKEN.EOF) continue;
        const text = escapeHtml(source.slice(tok.start, tok.end));
        html += `<span class="${tokenClass(tok)}">${text}</span>`;
      }
    } catch {
      html = escapeHtml(source);
    }
    // trailing newline keeps pre height in sync with textarea
    this.highlight.innerHTML = `${html}\n`;
  }
}

function tokenClass(tok) {
  switch (tok.type) {
    case TOKEN.NUM: return 'tok-num';
    case TOKEN.IDENT: return 'tok-ident';
    case TOKEN.OP: return 'tok-op';
    case TOKEN.ASSIGN: return 'tok-op';
    case TOKEN.LPAREN:
    case TOKEN.RPAREN:
    case TOKEN.COMMA:
    case TOKEN.SEMI: return 'tok-punct';
    default: return 'tok-ident';
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
