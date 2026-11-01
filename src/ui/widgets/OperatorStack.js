/**
 * ui/widgets/OperatorStack.js — procedural operator stack editor.
 *
 * Add / remove / reorder / toggle operators; each item carries its own
 * lil-gui parameter panel plus a modulation folder (any numeric param
 * can be an expression of `time`).
 */

import GUI from 'lil-gui';
import { Operators } from '../../core/registry.js';
import { isBindable } from '../params/ParamRegistry.js';
import {
  bindStageParams,
  bindStageMods,
  createExpressionField,
  expressionEntries,
} from '../params/StageEditor.js';

export class OperatorStack {
  /** @param {object} app */
  constructor(app) {
    this.app = app;
    this.el = document.createElement('div');
    this.el.className = 'operator-stack';
    this.itemGuis = [];
    this.itemExprFields = [];
    this.render();
  }

  refresh() {
    this.render();
  }

  render() {
    for (const gui of this.itemGuis) gui.destroy();
    for (const field of this.itemExprFields) field.field.destroy();
    this.itemGuis = [];
    this.itemExprFields = [];
    this.el.innerHTML = '';
    this.el.appendChild(this.renderAddRow());

    this.app.document.operators.forEach((op, index) => {
      this.el.appendChild(this.renderItem(op, index));
    });
  }

  renderAddRow() {
    const row = document.createElement('div');
    row.className = 'op-add-row';

    const select = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'SELECT OPERATOR';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    for (const category of ['geometry', 'topology']) {
      const group = document.createElement('optgroup');
      group.label = category.toUpperCase();
      for (const def of Operators.list()) {
        if (def.category !== category || def.hidden) continue;
        const option = document.createElement('option');
        option.value = def.id;
        option.textContent = def.name;
        group.appendChild(option);
      }
      select.appendChild(group);
    }

    const add = document.createElement('button');
    add.textContent = '+ ADD';
    add.disabled = true;
    add.addEventListener('click', () => {
      if (!select.value) return;
      this.app.addOperator(select.value);
    });
    select.addEventListener('change', () => {
      add.disabled = !select.value;
    });

    row.appendChild(select);
    row.appendChild(add);
    return row;
  }

  renderItem(op, index) {
    const def = Operators.get(op.id);
    const item = document.createElement('div');
    item.className = `op-item${op.enabled ? '' : ' disabled'}`;

    const head = document.createElement('div');
    head.className = 'op-head';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = op.enabled;
    toggle.title = 'Enabled';
    toggle.addEventListener('change', () => this.app.setOperatorEnabled(index, toggle.checked));

    const name = document.createElement('span');
    name.className = 'op-name';
    name.textContent = `${index + 1} · ${def.name}`;

    const up = iconButton('↑', 'Move up', () => this.app.moveOperator(index, -1));
    const down = iconButton('↓', 'Move down', () => this.app.moveOperator(index, 1));
    const remove = iconButton('×', 'Remove', () => this.app.removeOperator(index));
    up.disabled = index === 0;
    down.disabled = index === this.app.document.operators.length - 1;

    head.append(toggle, name, up, down, remove);
    item.appendChild(head);

    const body = document.createElement('div');
    body.className = 'op-body';
    item.appendChild(body);

    const bindable = Object.entries(def.params).filter(([, schema]) => isBindable(schema));
    const onChange = (key) => {
      def.syncParams?.(op, key);
      this.app.rebuild();
      this.refreshExpressions();
    };
    if (bindable.length) {
      const gui = new GUI({ container: body, title: def.name });
      bindStageParams(gui, Object.fromEntries(bindable), op, onChange);
      bindStageMods(gui, def.params, op, onChange);
      this.itemGuis.push(gui);
    }

    const expressions = expressionEntries(def.params);
    if (expressions.length) {
      const wrap = document.createElement('div');
      wrap.className = 'op-expressions';
      for (const [key, schema] of expressions) {
        const entry = createExpressionField({
          key,
          schema,
          stage: op,
          index,
          get: () => {
            const preview = def.previewParams?.(op.params);
            return preview && typeof preview[key] === 'string' ? preview[key] : op.params[key];
          },
          set: (value) => {
            def.onExpressionChange?.(op, key);
            op.params[key] = value;
            this.app.rebuild();
            this.app.controls?.refreshValues?.();
            this.refreshExpressions();
          },
        });
        wrap.appendChild(entry.field.el);
        this.itemExprFields.push(entry);
      }
      body.appendChild(wrap);
    }

    return item;
  }

  /** Refresh generated equations after a control changed. */
  refreshExpressions() {
    for (const entry of this.itemExprFields) entry.field.refresh();
  }

  /** Route engine errors to the matching operator expression field. */
  setErrors(errors = []) {
    const byKey = new Map();
    for (const error of errors) {
      if (error.stage !== 'operator' || !error.key) continue;
      byKey.set(`${error.index}:${error.key}`, error.message);
    }
    for (const entry of this.itemExprFields) {
      entry.field.setError(byKey.get(`${entry.index}:${entry.key}`) ?? null);
    }
  }
}

function iconButton(text, title, onClick) {
  const btn = document.createElement('button');
  btn.className = 'op-icon';
  btn.textContent = text;
  btn.title = title;
  btn.addEventListener('click', onClick);
  return btn;
}
