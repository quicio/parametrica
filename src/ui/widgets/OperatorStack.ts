/**
 * ui/widgets/OperatorStack.ts — procedural operator stack editor.
 *
 * Add / remove / reorder / toggle operators; each item carries its own
 * lil-gui parameter panel plus a modulation folder (any numeric param
 * can be an expression of `time`).
 */

import GUI from 'lil-gui';
import { Generators, Operators } from '../../core/registry.ts';
import { supportsSpatial } from '../../core/capabilities.ts';
import { isBindable } from '../params/ParamRegistry.ts';
import {
  bindStageParams,
  bindStageMods,
  createExpressionField,
  expressionEntries,
} from '../params/StageEditor.ts';
import type { ExpressionFieldHandle } from '../params/StageEditor.ts';

interface OperatorStage {
  id: string;
  enabled: boolean;
  params: Record<string, unknown>;
  mods: Record<string, unknown>;
}

interface OperatorDocument {
  operators: OperatorStage[];
}

interface OperatorApp {
  document: OperatorDocument;
  activeLayerLocked?: boolean;
  activeLayer?: { generator?: { id?: string } } | null;
  activeLayerIsInstance?: () => boolean;
  controls?: { refreshValues?: () => void } | null;
  addOperator: (id: string) => void;
  setOperatorEnabled: (index: number, enabled: boolean) => void;
  moveOperator: (index: number, direction: number) => void;
  removeOperator: (index: number) => void;
  rebuild: () => void;
}

interface EngineErrorLike {
  stage?: string;
  key?: string;
  index?: number;
  message?: string;
}

export class OperatorStack {
  app: OperatorApp;
  el: HTMLDivElement;
  itemGuis: GUI[];
  itemExprFields: ExpressionFieldHandle[];

  /** @param app host app */
  constructor(app: OperatorApp) {
    this.app = app;
    this.el = document.createElement('div');
    this.el.className = 'operator-stack';
    this.itemGuis = [];
    this.itemExprFields = [];
    this.render();
  }

  refresh(): void {
    this.render();
  }

  render(): void {
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

  renderAddRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'op-add-row';
    const locked = Boolean(this.app.activeLayerLocked);

    const select = document.createElement('select');
    select.disabled = locked;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'SELECT OPERATOR';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    const activeGeneratorId = this.app.activeLayer?.generator?.id;
    const activeGenerator = activeGeneratorId && Generators.has(activeGeneratorId)
      ? Generators.get(activeGeneratorId)
      : null;
    const instance = this.app.activeLayerIsInstance?.() ?? false;
    const instanceOperators = new Set(['translate', 'rotate', 'scale']);
    const geometryKind = instance
      ? 'surface'
      : (activeGenerator?.capabilities?.geometryKind
        ?? (supportsSpatial(activeGenerator) ? 'curve3d' : 'curve2d'));
    const spatialLayer = ['surface', 'mesh', 'solid'].includes(geometryKind);
    for (const category of ['geometry', 'topology']) {
      const group = document.createElement('optgroup');
      group.label = category.toUpperCase();
      for (const def of Operators.list()) {
        if (def.category !== category || def.hidden) continue;
        if (instance && !instanceOperators.has(def.id)) continue;
        if (spatialLayer && Array.isArray(def.accepts) && !def.accepts.includes(geometryKind)) continue;
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
    if (locked) add.title = 'Layer content is locked';
    add.addEventListener('click', () => {
      if (!select.value) return;
      this.app.addOperator(select.value);
    });
    select.addEventListener('change', () => {
      add.disabled = locked || !select.value;
    });

    row.appendChild(select);
    row.appendChild(add);
    return row;
  }

  renderItem(op: OperatorStage, index: number): HTMLDivElement {
    const def = Operators.get(op.id);
    const locked = Boolean(this.app.activeLayerLocked);
    const item = document.createElement('div');
    item.className = `op-item${op.enabled ? '' : ' disabled'}${locked ? ' locked' : ''}`;

    const head = document.createElement('div');
    head.className = 'op-head';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = op.enabled;
    toggle.title = 'Enabled';
    toggle.disabled = locked;
    toggle.addEventListener('change', () => this.app.setOperatorEnabled(index, toggle.checked));

    const name = document.createElement('span');
    name.className = 'op-name';
    name.textContent = `${index + 1} · ${def.name}`;

    const up = iconButton('↑', 'Move up', () => this.app.moveOperator(index, -1));
    const down = iconButton('↓', 'Move down', () => this.app.moveOperator(index, 1));
    const remove = iconButton('×', 'Remove', () => this.app.removeOperator(index));
    up.disabled = locked || index === 0;
    down.disabled = locked || index === this.app.document.operators.length - 1;
    remove.disabled = locked;

    head.append(toggle, name, up, down, remove);
    item.appendChild(head);

    const body = document.createElement('div');
    body.className = 'op-body';
    item.appendChild(body);

    const bindable = Object.entries(def.params).filter(([, schema]) => isBindable(schema));
    const syncParams = def.syncParams as ((stage: OperatorStage, key: string) => unknown) | undefined;
    const previewParams = def.previewParams as ((params: Record<string, unknown>) => unknown) | undefined;
    const onExpressionChange = def.onExpressionChange as ((stage: OperatorStage, key: string) => unknown) | undefined;
    const onChange = (key: string): void => {
      syncParams?.(op, key);
      this.app.rebuild();
      this.refreshExpressions();
    };
    if (bindable.length) {
      const gui = new GUI({ container: body, title: def.name });
      bindStageParams(gui, Object.fromEntries(bindable), op, onChange, { disabled: locked });
      bindStageMods(gui, def.params, op, onChange, { disabled: locked });
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
            const preview = previewParams?.(op.params);
            const value = preview && typeof preview === 'object'
              ? (preview as Record<string, unknown>)[key]
              : undefined;
            return typeof value === 'string' ? value : String(op.params[key] ?? '');
          },
          set: (value: string) => {
            onExpressionChange?.(op, key);
            op.params[key] = value;
            this.app.rebuild();
            this.app.controls?.refreshValues?.();
            this.refreshExpressions();
          },
        });
        if (locked) entry.field.setDisabled(true);
        wrap.appendChild(entry.field.el);
        this.itemExprFields.push(entry);
      }
      body.appendChild(wrap);
    }

    return item;
  }

  /** Refresh generated equations after a control changed. */
  refreshExpressions(): void {
    for (const entry of this.itemExprFields) entry.field.refresh();
  }

  /** Route engine errors to the matching operator expression field. */
  setErrors(errors: EngineErrorLike[] = []): void {
    const byKey = new Map<string, string>();
    for (const error of errors) {
      if (error.stage !== 'operator' || !error.key) continue;
      byKey.set(`${error.index}:${error.key}`, error.message ?? '');
    }
    for (const entry of this.itemExprFields) {
      entry.field.setError(byKey.get(`${entry.index}:${entry.key}`) ?? null);
    }
  }
}

function iconButton(text: string, title: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'op-icon';
  btn.textContent = text;
  btn.title = title;
  btn.addEventListener('click', onClick);
  return btn;
}
