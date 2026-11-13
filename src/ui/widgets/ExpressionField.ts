/**
 * ui/widgets/ExpressionField.ts — formula editor component.
 *
 * CodeMirror 6 with a small tokenizer that mirrors the expression engine:
 * numbers, identifiers, operators and punctuation keep the same visual
 * language as the rest of the instrument. Input is live-compiled after a
 * short debounce; errors are surfaced inline below the editor.
 */

import { EditorState } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { EditorView, drawSelection, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

let fieldId = 0;

const mathLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/)) return 'number';
    if (stream.match(/[A-Za-z_][A-Za-z0-9_]*/)) {
      return stream.peek() === '(' ? 'function' : 'variableName';
    }
    if (stream.match(/[+\-*/^%<>=!&|]+/)) return 'operator';
    if (stream.match(/[(),;]/)) return 'punctuation';
    stream.next();
    return null;
  },
});

const mathHighlight = HighlightStyle.define([
  { tag: tags.number, color: 'var(--swiss-red)' },
  { tag: tags.variableName, color: '#e8e8e8' },
  { tag: tags.function(tags.variableName), color: '#e8e8e8', fontWeight: '700' },
  { tag: tags.operator, color: '#777', fontWeight: '700' },
  { tag: tags.punctuation, color: '#4a4a4a' },
]);

const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: 'var(--ink)',
    fontSize: '11px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--mono)',
    lineHeight: '1.6',
  },
  '.cm-content': {
    padding: '8px 10px',
    caretColor: 'var(--swiss-red)',
    minHeight: '34px',
  },
  '.cm-line': { padding: '0' },
  '.cm-cursor': { borderLeftColor: 'var(--swiss-red)' },
});

export interface ExpressionFieldOptions {
  label: string;
  multiline?: boolean;
  doc?: string;
  get: () => string;
  set: (value: string) => void;
}

export class ExpressionField {
  get: () => string;
  set: (value: string) => void;
  multiline: boolean;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  suppressUpdate: boolean;
  id: string;
  el: HTMLDivElement;
  errorEl: HTMLDivElement;
  view: EditorView;

  /**
   * @param opts label, multiline and value accessors
   */
  constructor({ label, multiline = false, doc = '', get, set }: ExpressionFieldOptions) {
    this.get = get;
    this.set = set;
    this.multiline = multiline;
    this.debounceTimer = null;
    this.suppressUpdate = false;
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
    this.el.appendChild(wrap);

    this.errorEl = document.createElement('div');
    this.errorEl.className = 'expr-error';
    this.errorEl.id = `${this.id}-error`;
    this.el.appendChild(this.errorEl);

    const extensions: Extension[] = [
      history(),
      drawSelection(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        {
          key: 'Enter',
          run: () => {
            if (this.multiline) return false;
            this.commit();
            this.view.contentDOM.blur();
            return true;
          },
        },
        {
          key: 'Mod-Enter',
          run: () => {
            this.commit();
            this.view.contentDOM.blur();
            return true;
          },
        },
      ]),
      mathLanguage,
      syntaxHighlighting(mathHighlight),
      editorTheme,
      EditorState.tabSize.of(2),
      EditorView.contentAttributes.of({
        id: this.id,
        'aria-describedby': this.errorEl.id,
        'aria-label': label,
        spellcheck: 'false',
      }),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || this.suppressUpdate) return;
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.commit(), 150);
      }),
    ];
    if (multiline) extensions.push(EditorView.lineWrapping);
    if (!multiline) extensions.push(singleLine());

    this.view = new EditorView({
      state: EditorState.create({
        doc: String(get() ?? ''),
        extensions,
      }),
      parent: wrap,
    });
  }

  /** Re-read value from the document and re-render (after external changes). */
  refresh(): void {
    const next = String(this.get() ?? '');
    if (this.view.state.doc.toString() === next) return;
    this.suppressUpdate = true;
    try {
      this.view.dispatch({
        changes: { from: 0, to: this.view.state.doc.length, insert: next },
      });
    } finally {
      this.suppressUpdate = false;
    }
  }

  commit(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    this.set(this.view.state.doc.toString());
  }

  setError(message: string | null | undefined): void {
    this.errorEl.textContent = message ?? '';
    this.el.classList.toggle('has-error', Boolean(message));
    if (message) this.view.contentDOM.setAttribute('aria-invalid', 'true');
    else this.view.contentDOM.removeAttribute('aria-invalid');
  }

  setDisabled(disabled: boolean): void {
    const next = Boolean(disabled);
    this.el.classList.toggle('disabled', next);
    this.view.contentDOM.contentEditable = next ? 'false' : 'true';
    this.view.contentDOM.tabIndex = next ? -1 : 0;
    if (next) this.view.contentDOM.setAttribute('aria-disabled', 'true');
    else this.view.contentDOM.removeAttribute('aria-disabled');
  }

  destroy(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.view.destroy();
  }
}

/** Single-line fields reject multi-line changes (the Enter key is bound). */
function singleLine(): Extension {
  return EditorState.transactionFilter.of((transaction) => (
    !transaction.docChanged || transaction.newDoc.lines <= 1 ? transaction : []
  ));
}
