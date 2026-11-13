/**
 * formSections.ts — inspector section builders.
 *
 * Each export receives the Controls coordinator and only talks to shared
 * helpers, registries and App APIs. Sections never import each other.
 */

import { Generators } from '../../core/registry.ts';
import { TYPE } from '../../core/schema.ts';
import type { Harmonic, ParamSchema, SchemaEntry } from '../../core/schema.ts';
import { ExpressionField } from '../widgets/ExpressionField.ts';
import { HarmonicsEditor } from '../widgets/HarmonicsEditor.ts';
import { OperatorStack } from '../widgets/OperatorStack.ts';
import { bindStageParams, bindStageMods } from '../params/StageEditor.ts';
import {
  MAX_INSTANCE_LAYERS,
  MAX_LAYERS,
  canAddInstanceLayer,
  countInstanceLayers,
  instanceSourceCandidates,
  isInstanceLayer,
  sourceGeneratorFor,
  sourceLayerFor,
} from '../../core/layers.ts';

type Rec = Record<string, unknown>;

interface StageLike {
  id?: string;
  params: Rec;
  mods: Rec;
  [key: string]: unknown;
}

interface LayerLike {
  id: string;
  name: string;
  visible?: boolean;
  locked?: boolean;
  generator?: StageLike | null;
  operators?: StageLike[];
  [key: string]: unknown;
}

interface FormDocument {
  layers: LayerLike[];
  activeLayer?: number;
  generator: StageLike;
  [key: string]: unknown;
}

interface FormPortLike {
  document: FormDocument;
  activeLayer: LayerLike;
  activeLayerLocked: boolean;
  activeLayerIsInstance: () => boolean;
  newDocument: () => void;
  addLayer: (kind: string) => void;
  addInstanceLayer: (sourceId: string) => void;
  setLayerVisible: (index: number, visible: boolean) => void;
  setLayerLocked: (index: number, locked: boolean) => void;
  moveLayer: (index: number, direction: number) => void;
  duplicateLayer: (index: number) => void;
  removeLayer: (index: number) => void;
  setActiveLayer: (index: number) => void;
  setInstanceSource: (index: number, sourceId: string) => void;
  setGenerator: (id: string) => void;
  rebuild: () => void;
}

interface GuiLike {
  add: (object: object, property: string, options?: unknown) => {
    name: (value: string) => {
      onChange: (callback: (value: unknown) => void) => { disable: () => void };
    };
    disable: () => void;
  };
}

interface FormControls {
  formPort: FormPortLike;
  section: (title: string, options: { id: string; mode: string }) => HTMLElement;
  panelHint: (message: string) => HTMLElement;
  makeGui: (container: HTMLElement) => GuiLike;
  expressionFields: Map<string, ExpressionField>;
  harmonicsEditor: HarmonicsEditor | null;
  operatorStack: OperatorStack | null;
  advancedToggle: HTMLButtonElement | null;
  uiState: { advancedParams?: boolean; [key: string]: unknown };
  saveUiState: () => void;
  renameLayerPrompt: (index: number) => void;
}

export function buildLayersSection(controls: FormControls): void {
    const body = controls.section('Layers', { id: 'layers', mode: 'form' });
    const layers = controls.formPort.document.layers ?? [];
    const bar = document.createElement('div');
    bar.className = 'layers-bar';
    const newDocument = document.createElement('button');
    newDocument.className = 'layer-add layer-new-document';
    newDocument.textContent = '+ NEW DOCUMENT';
    newDocument.addEventListener('click', () => controls.formPort.newDocument());
    bar.appendChild(newDocument);
    const add = document.createElement('button');
    add.className = 'layer-add layer-add-generator';
    add.textContent = '+ ADD LAYER';
    add.title = 'Add a new layer';
    add.addEventListener('click', () => controls.formPort.addLayer('parametric'));
    bar.appendChild(add);

    const candidates = instanceSourceCandidates(controls.formPort.document as never).filter(({ layer }) => {
      const candidate = layer as unknown as LayerLike;
      return Generators.has(candidate.generator?.id ?? '')
        && Generators.get(candidate.generator?.id ?? '').capabilities?.geometryKind === 'surface';
    });
    const sourceSelect = document.createElement('select');
    sourceSelect.className = 'artboard-input instance-source-picker';
    sourceSelect.title = 'Generator layer used as instance source';
    for (const { layer } of candidates) {
      const candidate = layer as unknown as LayerLike;
      const option = document.createElement('option');
      option.value = candidate.id;
      option.textContent = candidate.name;
      sourceSelect.appendChild(option);
    }
    const addInstance = document.createElement('button');
    addInstance.className = 'layer-add layer-add-instance';
    addInstance.textContent = '+ INSTANCE';
    const instances = countInstanceLayers(controls.formPort.document as never);
    const canAdd = canAddInstanceLayer(controls.formPort.document as never);
    addInstance.disabled = !canAdd || !candidates.length;
    addInstance.title = !candidates.length
      ? 'Add a Surface generator layer first'
      : instances >= MAX_INSTANCE_LAYERS
        ? `Instance limit reached (${MAX_INSTANCE_LAYERS})`
        : controls.formPort.document.layers.length >= MAX_LAYERS
          ? `Layer limit reached (${MAX_LAYERS})`
          : 'Add an instance of the selected generator layer';
    addInstance.addEventListener('click', () => {
      controls.formPort.addInstanceLayer(sourceSelect.value);
    });
    if (candidates.length) bar.append(sourceSelect);
    bar.appendChild(addInstance);
    body.appendChild(bar);
    if (instances > MAX_INSTANCE_LAYERS) {
      body.appendChild(controls.panelHint(
        `Instance limit exceeded (${instances}/${MAX_INSTANCE_LAYERS}). Remove instances before adding more.`,
      ));
    }

    const list = document.createElement('div');
    list.className = 'layers-list';
    layers.forEach((layer, index) => {
      const row = document.createElement('div');
      row.className = 'layer-row';
      row.setAttribute('role', 'button');
      row.tabIndex = index === controls.formPort.document.activeLayer ? 0 : -1;
      row.setAttribute('aria-label', `Select layer ${layer.name}`);
      if (index === controls.formPort.document.activeLayer) row.setAttribute('aria-current', 'true');
      row.classList.toggle('active', index === controls.formPort.document.activeLayer);
      row.classList.toggle('hidden', layer.visible === false);
      row.classList.toggle('locked', Boolean(layer.locked));

      const visibility = document.createElement('button');
      visibility.className = 'layer-icon';
      visibility.textContent = layer.visible === false ? '○' : '●';
      visibility.title = layer.visible === false ? 'Show layer' : 'Hide layer';
      visibility.setAttribute('aria-label', visibility.title);
      visibility.addEventListener('click', (event) => {
        event.stopPropagation();
        const next = layer.visible === false;
        controls.formPort.setLayerVisible(index, next);
        visibility.textContent = next ? '●' : '○';
        row.classList.toggle('hidden', !next);
      });

      const lock = document.createElement('button');
      lock.className = 'layer-icon';
      lock.textContent = layer.locked ? 'L' : '·';
      lock.title = layer.locked ? 'Unlock layer content' : 'Lock layer content';
      lock.setAttribute('aria-label', lock.title);
      lock.addEventListener('click', (event) => {
        event.stopPropagation();
        controls.formPort.setLayerLocked(index, !layer.locked);
      });

      const name = document.createElement('span');
      name.className = 'layer-name';
      name.textContent = layer.name;
      name.title = layer.name;

      const isInstance = isInstanceLayer(layer as never);
      const badge = isInstance ? document.createElement('span') : null;
      if (badge) {
        badge.className = 'layer-kind-badge';
        badge.textContent = 'INSTANCE';
        row.classList.add('instance');
      }
      const source = isInstance ? sourceLayerFor(controls.formPort.document as never, layer as never) as LayerLike | null : null;
      const sourceLabel = isInstance ? document.createElement('span') : null;
      if (sourceLabel) {
        sourceLabel.className = 'layer-source-label';
        sourceLabel.textContent = source ? `↳ ${source.name}` : '↳ missing source';
        sourceLabel.title = source ? `Source: ${source.name}` : 'Source layer is missing';
      }
      const nameWrap = isInstance ? document.createElement('span') : null;
      if (nameWrap && sourceLabel) {
        nameWrap.className = 'layer-name-wrap';
        nameWrap.append(name, sourceLabel);
      }

      const rename = layerButton('✎', 'Rename layer', () => controls.renameLayerPrompt(index));
      const up = layerButton('↑', 'Move layer up', () => controls.formPort.moveLayer(index, -1), index === 0);
      const down = layerButton('↓', 'Move layer down', () => controls.formPort.moveLayer(index, 1), index === layers.length - 1);
      const duplicate = layerButton('⧉', 'Duplicate layer', () => controls.formPort.duplicateLayer(index));
      const remove = layerButton('×', 'Remove layer', () => controls.formPort.removeLayer(index), layers.length <= 1);

      if (badge && nameWrap) row.append(visibility, lock, badge, nameWrap, rename, up, down, duplicate, remove);
      else row.append(visibility, lock, name, rename, up, down, duplicate, remove);
      const selectRow = (): void => {
        if (index !== controls.formPort.document.activeLayer) controls.formPort.setActiveLayer(index);
      };
      row.addEventListener('click', selectRow);
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectRow();
      });
      list.appendChild(row);
    });
    body.appendChild(list);
}

export function buildInstanceSection(controls: FormControls): void {
    const layer = controls.formPort.activeLayer;
    if (!isInstanceLayer(layer as never)) return;
    const body = controls.section('Instance', { id: 'instance', mode: 'form' });
    const source = sourceLayerFor(controls.formPort.document as never, layer as never) as LayerLike | null;
    const generator = sourceGeneratorFor(controls.formPort.document as never, layer as never) as { id?: string } | null;
    body.appendChild(controls.panelHint(
      'Active instance · source parameters are read-only · transforms apply before tessellation.',
    ));
    if (!source) {
      body.appendChild(controls.panelHint('Source layer is missing. Select another generator layer.'));
    }

    const grid = document.createElement('div');
    grid.className = 'artboard-grid instance-grid';
    const row = (label: string, control: HTMLElement): HTMLElement => {
      const el = document.createElement('label');
      el.className = 'artboard-row';
      const name = document.createElement('span');
      name.className = 'artboard-label';
      name.textContent = label;
      el.append(name, control);
      grid.appendChild(el);
      return el;
    };

    const candidates = instanceSourceCandidates(controls.formPort.document as never).filter(({ layer }) => {
      const candidate = layer as unknown as LayerLike;
      return Generators.has(candidate.generator?.id ?? '')
        && Generators.get(candidate.generator?.id ?? '').capabilities?.geometryKind === 'surface';
    });
    const sourceSelect = document.createElement('select');
    sourceSelect.className = 'artboard-input instance-source-select';
    for (const { layer } of candidates) {
      const candidate = layer as unknown as LayerLike;
      const option = document.createElement('option');
      option.value = candidate.id;
      option.textContent = candidate.name;
      sourceSelect.appendChild(option);
    }
    if (source?.id) sourceSelect.value = source.id;
    sourceSelect.disabled = Boolean(layer.locked) || !candidates.length;
    sourceSelect.addEventListener('change', () => {
      controls.formPort.setInstanceSource(controls.formPort.document.activeLayer ?? 0, sourceSelect.value);
    });
    row('Source', sourceSelect);

    const selectSource = document.createElement('button');
    selectSource.type = 'button';
    selectSource.className = 'lab-button instance-select-source';
    selectSource.textContent = 'SELECT SOURCE LAYER';
    selectSource.disabled = !source;
    selectSource.addEventListener('click', () => {
      const sourceId = source?.id;
      const index = controls.formPort.document.layers.findIndex((entry) => entry.id === sourceId);
      if (index >= 0) controls.formPort.setActiveLayer(index);
    });
    grid.appendChild(selectSource);

    if (generator && generator.id && Generators.has(generator.id)) {
      const definition = Generators.get(generator.id);
      const params = document.createElement('div');
      params.className = 'instance-source-params';
      for (const [key, schema] of Object.entries(definition.params) as Array<[string, SchemaEntry]>) {
        if (schema.type === TYPE.SOURCE) continue;
        const value = source?.generator?.params?.[key];
        if (value === undefined || value === null || value === '') continue;
        const paramRow = document.createElement('div');
        paramRow.className = 'instance-param-row';
        const label = document.createElement('span');
        label.className = 'instance-param-label';
        label.textContent = schema.label ?? key;
        const display = document.createElement('span');
        display.className = 'instance-param-value';
        display.textContent = formatInstanceParam(value);
        paramRow.append(label, display);
        params.appendChild(paramRow);
      }
      if (params.childElementCount) grid.appendChild(params);
    }

    grid.appendChild(controls.panelHint('Instance operators: Translate, Rotate, Scale only.'));
    body.appendChild(grid);
}

export function buildGeneratorSection(controls: FormControls): void {
    if (controls.formPort.activeLayerIsInstance()) return;
    const gui = controls.makeGui(controls.section('Generator', { id: 'generator', mode: 'form' }));
    const options: Record<string, string> = {};
    for (const def of Generators.list()) options[def.name] = def.id;
    const proxy = { id: controls.formPort.document.generator.id };
    const control = gui.add(proxy, 'id', options)
      .name('Mathematical Model')
      .onChange((id) => controls.formPort.setGenerator(String(id)));
    if (controls.formPort.activeLayerLocked) control.disable();
}

export function buildParamsSection(controls: FormControls): void {
    if (controls.formPort.activeLayerIsInstance()) return;
    const body = controls.section('Parameters', { id: 'parameters', mode: 'form' });
    const gen = Generators.get(controls.formPort.document.generator.id as string);
    const stage = controls.formPort.document.generator;
    const plain = Object.entries(gen.params).filter(([, schema]) =>
      [TYPE.NUMBER, TYPE.BOOLEAN, TYPE.SELECT].includes(schema.type as never));
    if (!plain.length) return;
    const numericSchema = Object.fromEntries(
      Object.entries(gen.params).filter(([, schema]) => schema.type === TYPE.NUMBER),
    ) as ParamSchema;

    const essential: Array<[string, SchemaEntry]> = [];
    const advanced: Array<[string, SchemaEntry]> = [];
    for (const entry of plain as Array<[string, SchemaEntry]>) {
      if (isAdvancedParam(entry[1])) advanced.push(entry);
      else essential.push(entry);
    }

    if (essential.length) {
      const essentialGui = controls.makeGui(body);
      bindStageParams(essentialGui as never, Object.fromEntries(essential), stage, () => controls.formPort.rebuild(), { disabled: controls.formPort.activeLayerLocked });
    }

    if (advanced.length) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'advanced-toggle';
      const wrap = document.createElement('div');
      wrap.className = 'advanced-params';
      const advancedGui = controls.makeGui(wrap);
      bindStageParams(advancedGui as never, Object.fromEntries(advanced), stage, () => controls.formPort.rebuild(), { disabled: controls.formPort.activeLayerLocked });
      body.append(toggle, wrap);
      controls.advancedToggle = toggle;

      const apply = (open: boolean, persist = true): void => {
        wrap.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = `${open ? '▾' : '▸'} Advanced parameters (${advanced.length})`;
        if (persist) {
          controls.uiState.advancedParams = open;
          controls.saveUiState();
        }
      };
      toggle.addEventListener('click', () => {
        apply(Boolean(wrap.hidden));
      });
      // When every control is advanced, open the group so the panel is
      // not an empty section with a single toggle. Do not persist controls
      // automatic default into other generators.
      apply(essential.length === 0 ? true : Boolean(controls.uiState.advancedParams), essential.length !== 0);
    }

    const modsGui = controls.makeGui(body);
    bindStageMods(modsGui as never, numericSchema, stage, () => controls.formPort.rebuild(), { disabled: controls.formPort.activeLayerLocked });
}

export function buildEquationsSection(controls: FormControls): void {
    if (controls.formPort.activeLayerIsInstance()) return;
    const gen = Generators.get(controls.formPort.document.generator.id as string);
    const exprEntries = Object.entries(gen.params).filter(([, s]) =>
      [TYPE.EXPRESSION, TYPE.SOURCE].includes(s.type as never));
    if (!exprEntries.length) return;

    const body = controls.section('Equations', { id: 'equations', mode: 'form' });
    const stage = controls.formPort.document.generator;
    for (const [key, s] of exprEntries as Array<[string, SchemaEntry]>) {
      const field = new ExpressionField({
        label: s.label ?? key,
        multiline: s.type === TYPE.SOURCE,
        doc: s.doc ?? '',
        get: () => String(stage.params[key] ?? ''),
        set: (v) => {
          stage.params[key] = v;
          controls.formPort.rebuild();
        },
      });
      body.appendChild(field.el);
      if (controls.formPort.activeLayerLocked) field.setDisabled(true);
      controls.expressionFields.set(key, field);
    }
}

export function buildHarmonicsSection(controls: FormControls): void {
    if (controls.formPort.activeLayerIsInstance()) return;
    const gen = Generators.get(controls.formPort.document.generator.id as string);
    const hasHarmonics = Object.keys(gen.params).some((k) => k === 'harmonicsX' || k === 'harmonicsY');
    if (!hasHarmonics) return;
    const body = controls.section('Harmonics', { id: 'harmonics', mode: 'form' });
    controls.harmonicsEditor = new HarmonicsEditor({
      getRows: (axis) => (controls.formPort.document.generator.params[axis] as Harmonic[] | undefined) ?? [],
      onChange: (axis, rows) => {
        controls.formPort.document.generator.params[axis] = rows;
        controls.formPort.rebuild();
      },
    });
    body.appendChild(controls.harmonicsEditor.el);
    if (controls.formPort.activeLayerLocked) controls.harmonicsEditor.setDisabled(true);
}

export function buildOperatorsSection(controls: FormControls): void {
    const body = controls.section('Operators', { id: 'operators', mode: 'form' });
    controls.operatorStack = new OperatorStack(controls.formPort as never);
    body.appendChild(controls.operatorStack.el);
}

function layerButton(label: string, title: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'layer-icon';
  button.textContent = label;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.disabled = disabled;
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function isAdvancedParam(schema: SchemaEntry | null | undefined): boolean {
  return schema?.advanced === true;
}

function formatInstanceParam(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (value && typeof value === 'object' && typeof (value as { expr?: unknown }).expr === 'string') {
    return `ƒ ${(value as { expr: string }).expr}`;
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return Number.isFinite(value) ? String(Number(value.toFixed(4))) : '—';
  if (typeof value === 'string') return value.length > 32 ? `${value.slice(0, 31)}…` : value;
  return String(value);
}
