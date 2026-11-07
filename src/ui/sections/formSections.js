/**
 * formSections.js — inspector section builders.
 *
 * Each export receives the Controls coordinator and only talks to shared
 * helpers, registries and App APIs. Sections never import each other.
 */

import { Generators } from '../../core/registry.js';
import { TYPE } from '../../core/schema.js';
import { ExpressionField } from '../widgets/ExpressionField.js';
import { HarmonicsEditor } from '../widgets/HarmonicsEditor.js';
import { OperatorStack } from '../widgets/OperatorStack.js';
import { bindStageParams, bindStageMods } from '../params/StageEditor.js';
import {
  MAX_INSTANCE_LAYERS,
  MAX_LAYERS,
  canAddInstanceLayer,
  countInstanceLayers,
  instanceSourceCandidates,
  isInstanceLayer,
  sourceGeneratorFor,
  sourceLayerFor,
} from '../../core/layers.js';

export function buildLayersSection(controls) {
    const body = controls.section('Layers', { id: 'layers', mode: 'form' });
    const layers = controls.app.document.layers ?? [];
    const bar = document.createElement('div');
    bar.className = 'layers-bar';
    const newDocument = document.createElement('button');
    newDocument.className = 'layer-add layer-new-document';
    newDocument.textContent = '+ NEW DOCUMENT';
    newDocument.addEventListener('click', () => controls.app.newDocument());
    bar.appendChild(newDocument);
    const add = document.createElement('button');
    add.className = 'layer-add layer-add-generator';
    add.textContent = '+ ADD LAYER';
    add.title = 'Add a new layer';
    add.addEventListener('click', () => controls.app.addLayer('parametric'));
    bar.appendChild(add);

    const candidates = instanceSourceCandidates(controls.app.document).filter(({ layer }) => (
      Generators.has(layer.generator?.id)
      && Generators.get(layer.generator.id).capabilities?.geometryKind === 'surface'
    ));
    const sourceSelect = document.createElement('select');
    sourceSelect.className = 'artboard-input instance-source-picker';
    sourceSelect.title = 'Generator layer used as instance source';
    for (const { layer: candidate } of candidates) {
      const option = document.createElement('option');
      option.value = candidate.id;
      option.textContent = candidate.name;
      sourceSelect.appendChild(option);
    }
    const addInstance = document.createElement('button');
    addInstance.className = 'layer-add layer-add-instance';
    addInstance.textContent = '+ INSTANCE';
    const instances = countInstanceLayers(controls.app.document);
    const canAdd = canAddInstanceLayer(controls.app.document);
    addInstance.disabled = !canAdd || !candidates.length;
    addInstance.title = !candidates.length
      ? 'Add a Surface generator layer first'
      : instances >= MAX_INSTANCE_LAYERS
        ? `Instance limit reached (${MAX_INSTANCE_LAYERS})`
        : controls.app.document.layers.length >= MAX_LAYERS
          ? `Layer limit reached (${MAX_LAYERS})`
          : 'Add an instance of the selected generator layer';
    addInstance.addEventListener('click', () => {
      controls.app.addInstanceLayer(sourceSelect.value);
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
      row.tabIndex = index === controls.app.document.activeLayer ? 0 : -1;
      row.setAttribute('aria-label', `Select layer ${layer.name}`);
      if (index === controls.app.document.activeLayer) row.setAttribute('aria-current', 'true');
      row.classList.toggle('active', index === controls.app.document.activeLayer);
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
        controls.app.setLayerVisible(index, next);
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
        const next = !layer.locked;
        controls.app.setLayerLocked(index, next);
      });

      const name = document.createElement('span');
      name.className = 'layer-name';
      name.textContent = layer.name;
      name.title = layer.name;

      const isInstance = isInstanceLayer(layer);
      const badge = isInstance ? document.createElement('span') : null;
      if (badge) {
        badge.className = 'layer-kind-badge';
        badge.textContent = 'INSTANCE';
        row.classList.add('instance');
      }
      const source = isInstance ? sourceLayerFor(controls.app.document, layer) : null;
      const sourceLabel = isInstance ? document.createElement('span') : null;
      if (sourceLabel) {
        sourceLabel.className = 'layer-source-label';
        sourceLabel.textContent = source ? `↳ ${source.name}` : '↳ missing source';
        sourceLabel.title = source ? `Source: ${source.name}` : 'Source layer is missing';
      }
      const nameWrap = isInstance ? document.createElement('span') : null;
      if (nameWrap) {
        nameWrap.className = 'layer-name-wrap';
        nameWrap.append(name, sourceLabel);
      }

      const rename = layerButton('✎', 'Rename layer', () => controls.renameLayerPrompt(index));
      const up = layerButton('↑', 'Move layer up', () => controls.app.moveLayer(index, -1), index === 0);
      const down = layerButton('↓', 'Move layer down', () => controls.app.moveLayer(index, 1), index === layers.length - 1);
      const duplicate = layerButton('⧉', 'Duplicate layer', () => controls.app.duplicateLayer(index));
      const remove = layerButton('×', 'Remove layer', () => controls.app.removeLayer(index), layers.length <= 1);

      if (badge) row.append(visibility, lock, badge, nameWrap, rename, up, down, duplicate, remove);
      else row.append(visibility, lock, name, rename, up, down, duplicate, remove);
      const selectRow = () => {
        if (index !== controls.app.document.activeLayer) controls.app.setActiveLayer(index);
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

export function buildInstanceSection(controls) {
    const layer = controls.app.activeLayer;
    if (!isInstanceLayer(layer)) return;
    const body = controls.section('Instance', { id: 'instance', mode: 'form' });
    const source = sourceLayerFor(controls.app.document, layer);
    const generator = sourceGeneratorFor(controls.app.document, layer);
    body.appendChild(controls.panelHint(
      'Active instance · source parameters are read-only · transforms apply before tessellation.',
    ));
    if (!source) {
      body.appendChild(controls.panelHint('Source layer is missing. Select another generator layer.'));
    }

    const grid = document.createElement('div');
    grid.className = 'artboard-grid instance-grid';
    const row = (label, control) => {
      const el = document.createElement('label');
      el.className = 'artboard-row';
      const name = document.createElement('span');
      name.className = 'artboard-label';
      name.textContent = label;
      el.append(name, control);
      grid.appendChild(el);
      return el;
    };

    const candidates = instanceSourceCandidates(controls.app.document).filter(({ layer }) => (
      Generators.has(layer.generator?.id)
      && Generators.get(layer.generator.id).capabilities?.geometryKind === 'surface'
    ));
    const sourceSelect = document.createElement('select');
    sourceSelect.className = 'artboard-input instance-source-select';
    for (const { layer: candidate } of candidates) {
      const option = document.createElement('option');
      option.value = candidate.id;
      option.textContent = candidate.name;
      sourceSelect.appendChild(option);
    }
    if (source?.id) sourceSelect.value = source.id;
    sourceSelect.disabled = Boolean(layer.locked) || !candidates.length;
    sourceSelect.addEventListener('change', () => {
      controls.app.setInstanceSource(controls.app.document.activeLayer, sourceSelect.value);
    });
    row('Source', sourceSelect);

    const selectSource = document.createElement('button');
    selectSource.type = 'button';
    selectSource.className = 'lab-button instance-select-source';
    selectSource.textContent = 'SELECT SOURCE LAYER';
    selectSource.disabled = !source;
    selectSource.addEventListener('click', () => {
      const index = controls.app.document.layers.findIndex((entry) => entry.id === source?.id);
      if (index >= 0) controls.app.setActiveLayer(index);
    });
    grid.appendChild(selectSource);

    if (generator && Generators.has(generator.id)) {
      const definition = Generators.get(generator.id);
      const params = document.createElement('div');
      params.className = 'instance-source-params';
      for (const [key, schema] of Object.entries(definition.params)) {
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

export function buildGeneratorSection(controls) {
    if (controls.app.activeLayerIsInstance()) return;
    const gui = controls.makeGui(controls.section('Generator', { id: 'generator', mode: 'form' }));
    const options = {};
    for (const def of Generators.list()) options[def.name] = def.id;
    const proxy = { id: controls.app.document.generator.id };
    const control = gui.add(proxy, 'id', options)
      .name('Mathematical Model')
      .onChange((id) => controls.app.setGenerator(id));
    if (controls.app.activeLayerLocked) control.disable();
}

export function buildParamsSection(controls) {
    if (controls.app.activeLayerIsInstance()) return;
    const body = controls.section('Parameters', { id: 'parameters', mode: 'form' });
    const gen = Generators.get(controls.app.document.generator.id);
    const stage = controls.app.document.generator;
    const plain = Object.entries(gen.params).filter(([, schema]) =>
      [TYPE.NUMBER, TYPE.BOOLEAN, TYPE.SELECT].includes(schema.type));
    if (!plain.length) return;
    const numericSchema = Object.fromEntries(
      Object.entries(gen.params).filter(([, schema]) => schema.type === TYPE.NUMBER),
    );

    const essential = [];
    const advanced = [];
    for (const entry of plain) {
      if (isAdvancedParam(entry[1])) advanced.push(entry);
      else essential.push(entry);
    }

    if (essential.length) {
      const essentialGui = controls.makeGui(body);
      bindStageParams(essentialGui, Object.fromEntries(essential), stage, () => controls.app.rebuild(), { disabled: controls.app.activeLayerLocked });
    }

    if (advanced.length) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'advanced-toggle';
      const wrap = document.createElement('div');
      wrap.className = 'advanced-params';
      const advancedGui = controls.makeGui(wrap);
      bindStageParams(advancedGui, Object.fromEntries(advanced), stage, () => controls.app.rebuild(), { disabled: controls.app.activeLayerLocked });
      body.append(toggle, wrap);
      controls.advancedToggle = toggle;

      const apply = (open, persist = true) => {
        wrap.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = `${open ? '▾' : '▸'} Advanced parameters (${advanced.length})`;
        if (persist) {
          controls.uiState.advancedParams = open;
          controls.saveUiState();
        }
      };
      toggle.addEventListener('click', () => {
        apply(wrap.hidden);
      });
      // When every control is advanced, open the group so the panel is
      // not an empty section with a single toggle. Do not persist controls
      // automatic default into other generators.
      apply(essential.length === 0 ? true : Boolean(controls.uiState.advancedParams), essential.length !== 0);
    }

    const modsGui = controls.makeGui(body);
    bindStageMods(modsGui, numericSchema, stage, () => controls.app.rebuild(), { disabled: controls.app.activeLayerLocked });
}

export function buildEquationsSection(controls) {
    if (controls.app.activeLayerIsInstance()) return;
    const gen = Generators.get(controls.app.document.generator.id);
    const exprEntries = Object.entries(gen.params).filter(([, s]) =>
      [TYPE.EXPRESSION, TYPE.SOURCE].includes(s.type));
    if (!exprEntries.length) return;

    const body = controls.section('Equations', { id: 'equations', mode: 'form' });
    const stage = controls.app.document.generator;
    for (const [key, s] of exprEntries) {
      const field = new ExpressionField({
        label: s.label ?? key,
        multiline: s.type === TYPE.SOURCE,
        doc: s.doc ?? '',
        get: () => stage.params[key],
        set: (v) => {
          stage.params[key] = v;
          controls.app.rebuild();
        },
      });
      body.appendChild(field.el);
      if (controls.app.activeLayerLocked) field.setDisabled(true);
      controls.expressionFields.set(key, field);
    }
}

export function buildHarmonicsSection(controls) {
    if (controls.app.activeLayerIsInstance()) return;
    const gen = Generators.get(controls.app.document.generator.id);
    const hasHarmonics = Object.keys(gen.params).some((k) => k === 'harmonicsX' || k === 'harmonicsY');
    if (!hasHarmonics) return;
    const body = controls.section('Harmonics', { id: 'harmonics', mode: 'form' });
    controls.harmonicsEditor = new HarmonicsEditor({
      getRows: (axis) => controls.app.document.generator.params[axis] ?? [],
      onChange: (axis, rows) => {
        controls.app.document.generator.params[axis] = rows;
        controls.app.rebuild();
      },
    });
    body.appendChild(controls.harmonicsEditor.el);
    if (controls.app.activeLayerLocked) controls.harmonicsEditor.setDisabled(true);
}

export function buildOperatorsSection(controls) {
    const body = controls.section('Operators', { id: 'operators', mode: 'form' });
    controls.operatorStack = new OperatorStack(controls.app);
    body.appendChild(controls.operatorStack.el);
}


function layerButton(label, title, onClick, disabled = false) {
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

function isAdvancedParam(schema) {
  return schema?.advanced === true;
}

function formatInstanceParam(value) {
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (value && typeof value === 'object' && typeof value.expr === 'string') return `ƒ ${value.expr}`;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return Number.isFinite(value) ? String(Number(value.toFixed(4))) : '—';
  if (typeof value === 'string') return value.length > 32 ? `${value.slice(0, 31)}…` : value;
  return String(value);
}
