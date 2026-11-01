/**
 * ui/widgets/OperatorStack.js — procedural operator stack editor.
 *
 * Add / remove / reorder / toggle operators; each item carries its own
 * lil-gui parameter panel plus a modulation folder (any numeric param
 * can be an expression of `time`).
 */

import GUI from 'lil-gui';
import { Operators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { ExpressionField } from './ExpressionField.js';

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

    const bindable = Object.entries(def.params).filter(([, schema]) =>
      [TYPE.NUMBER, TYPE.BOOLEAN, TYPE.SELECT].includes(schema.type));
    const onChange = (key) => {
      def.syncParams?.(op, key);
      this.app.rebuild();
      this.refreshExpressions();
    };
    if (bindable.length) {
      const gui = new GUI({ container: body, title: def.name });
      bindStageParams(gui, Object.fromEntries(bindable), op, onChange);
      this.itemGuis.push(gui);
    }

    const expressions = Object.entries(def.params).filter(([, schema]) =>
      [TYPE.EXPRESSION, TYPE.SOURCE].includes(schema.type));
    if (expressions.length) {
      const wrap = document.createElement('div');
      wrap.className = 'op-expressions';
      for (const [key, schema] of expressions) {
        const field = new ExpressionField({
          label: schema.label ?? key,
          multiline: schema.type === TYPE.SOURCE,
          doc: schema.doc ?? '',
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
        wrap.appendChild(field.el);
        this.itemExprFields.push({ index, key, field });
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

/**
 * Bind a stage's params into a lil-gui instance.
 * Numbers bind through a proxy (base value may be an {expr} object);
 * every numeric param also gets a modulation text field ("key → time").
 */
export function bindStageParams(gui, schema, stage, rebuild, { mods = true } = {}) {
  for (const [key, s] of Object.entries(schema)) {
    if (s.type === TYPE.NUMBER) {
      // Bind DIRECTLY to stage.params[key]. The previous proxy
      // pattern (`{ value: ... }`) desynced the slider from the
      // document because dragging updated only the proxy; the
      // onChange only fired on commit (release) and the copy
      // back to stage.params[key] could fail silently if the
      // stage object was swapped between events. Direct binding
      // makes lil-gui own the lifecycle of the value — drag,
      // release, mutation, all flow through the same property.
      //
      // For AnimatableValue ({expr: ...}) the binding still
      // works: lil-gui will coerce to a number for the slider,
      // and any direct write to stage.params[key] is preserved
      // until the next user interaction. The animation layer
      // resolves the AnimatableValue at evaluation time, not
      // binding time.
      const ctrl = gui.add(stage.params, key, s.min, s.max, s.step)
        .name(s.label ?? key)
        .onChange(() => rebuild(key));
      attachDoc(ctrl, s);
      applyHardBounds(ctrl, s);
    } else if (s.type === TYPE.BOOLEAN) {
      const ctrl = gui.add(stage.params, key)
        .name(s.label ?? key)
        .onChange(() => rebuild(key));
      attachDoc(ctrl, s);
    } else if (s.type === TYPE.SELECT) {
      const ctrl = gui.add(stage.params, key, s.options)
        .name(s.label ?? key)
        .onChange(() => rebuild(key));
      attachDoc(ctrl, s);
    }
    // expression/source/harmonics types get custom widgets elsewhere
  }

  if (mods) bindStageMods(gui, schema, stage, rebuild);
}

/**
 * Add one modulation folder for every numeric parameter in `schema`.
 * Kept separate from the slider builder so a panel split into essential
 * and advanced controls still gets a single complete time folder.
 */
export function bindStageMods(gui, schema, stage, rebuild) {
  const numeric = Object.entries(schema).filter(([, s]) => s.type === TYPE.NUMBER);
  if (!numeric.length) return;
  const modsFolder = gui.addFolder('Modulate (time)');
  for (const [key, s] of numeric) {
    if (typeof stage.mods[key] !== 'string') stage.mods[key] = '';
    // Same label as the slider above — the modulation field refers
    // to the same parameter, so it must read identically.
    const ctrl = modsFolder.add(stage.mods, key)
      .name(s.label ?? key)
      .onFinishChange(() => rebuild(key));
    const doc = s.doc ?? `Time expression for ${s.label ?? key}.`;
    ctrl.domElement.title = doc;
    ctrl.domElement.setAttribute('aria-description', doc);
  }
  modsFolder.close();
}

/** Attach schema documentation to a lil-gui controller. */
function attachDoc(controller, schema) {
  if (!controller?.domElement || !schema?.doc) return;
  controller.domElement.title = schema.doc;
  controller.domElement.setAttribute('aria-description', schema.doc);
}

/**
 * lil-gui clamps typed values to the slider's min/max. Some parameters
 * (the parametric T domain) intentionally have a narrow slider for
 * precision but accept much larger typed values, so widen only the
 * clamping step while leaving the slider bounds untouched.
 */
export function applyHardBounds(controller, schema) {
  // Exact numeric entry: the slider can still use its step, but typed
  // values must not be snapped to it (Duration, T min/max, …).
  if (schema?.snap === false) {
    controller._snap = (value) => value;
  }
  const lo = typeof schema?.hardMin === 'number' ? schema.hardMin : null;
  const hi = typeof schema?.hardMax === 'number' ? schema.hardMax : null;
  if (lo === null && hi === null) return;
  controller._clamp = (value) => {
    let v = Number(value);
    if (!Number.isFinite(v)) return v;
    if (lo !== null) v = Math.max(lo, v);
    if (hi !== null) v = Math.min(hi, v);
    return v;
  };
}

function iconButton(text, title, onClick) {
  const btn = document.createElement('button');
  btn.className = 'op-icon';
  btn.textContent = text;
  btn.title = title;
  btn.addEventListener('click', onClick);
  return btn;
}
