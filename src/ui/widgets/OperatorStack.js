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

export class OperatorStack {
  /** @param {object} app */
  constructor(app) {
    this.app = app;
    this.el = document.createElement('div');
    this.el.className = 'operator-stack';
    this.itemGuis = [];
    this.render();
  }

  refresh() {
    this.render();
  }

  render() {
    for (const gui of this.itemGuis) gui.destroy();
    this.itemGuis = [];
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
    for (const category of ['geometry', 'topology']) {
      const group = document.createElement('optgroup');
      group.label = category.toUpperCase();
      for (const def of Operators.list()) {
        if (def.category !== category) continue;
        const option = document.createElement('option');
        option.value = def.id;
        option.textContent = def.name;
        group.appendChild(option);
      }
      select.appendChild(group);
    }

    const add = document.createElement('button');
    add.textContent = '+ ADD';
    add.addEventListener('click', () => this.app.addOperator(select.value));

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

    const gui = new GUI({ container: body, title: def.name });
    bindStageParams(gui, def.params, op, () => this.app.rebuild());
    this.itemGuis.push(gui);

    return item;
  }
}

/**
 * Bind a stage's params into a lil-gui instance.
 * Numbers bind through a proxy (base value may be an {expr} object);
 * every numeric param also gets a modulation text field ("key → time").
 */
export function bindStageParams(gui, schema, stage, rebuild) {
  const numericKeys = [];
  const labels = {};
  for (const [key, s] of Object.entries(schema)) {
    if (s.type === TYPE.NUMBER) {
      numericKeys.push(key);
      labels[key] = s.label ?? key;
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
      gui.add(stage.params, key, s.min, s.max, s.step)
        .name(s.label ?? key)
        .onChange(rebuild);
    } else if (s.type === TYPE.BOOLEAN) {
      gui.add(stage.params, key).name(s.label ?? key).onChange(rebuild);
    } else if (s.type === TYPE.SELECT) {
      gui.add(stage.params, key, s.options).name(s.label ?? key).onChange(rebuild);
    }
    // expression/source/harmonics types get custom widgets elsewhere
  }

  if (numericKeys.length) {
    const modsFolder = gui.addFolder('Modulate (time)');
    for (const key of numericKeys) {
      if (typeof stage.mods[key] !== 'string') stage.mods[key] = '';
      // Same label as the slider above — the modulation field refers
      // to the same parameter, so it must read identically.
      modsFolder.add(stage.mods, key).name(labels[key]).onFinishChange(rebuild);
    }
    modsFolder.close();
  }
}

function toBaseNumber(value, dflt) {
  if (value && typeof value === 'object') return dflt;
  const n = Number(value);
  return Number.isFinite(n) ? n : dflt;
}

function iconButton(text, title, onClick) {
  const btn = document.createElement('button');
  btn.className = 'op-icon';
  btn.textContent = text;
  btn.title = title;
  btn.addEventListener('click', onClick);
  return btn;
}
