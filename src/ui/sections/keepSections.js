/**
 * keepSections.js — inspector section builders.
 *
 * Each export receives the Controls coordinator and only talks to shared
 * helpers, registries and App APIs. Sections never import each other.
 */

import { createDefaultFillGradient, FILL_GRADIENT_COLORS } from '../../core/fillGradient.js';
import { RenderPasses } from '../../core/registry.js';
import { normalizeModes, toggleMode } from '../widgets/modeToggles.js';
import { applyHardBounds } from '../params/ParamRegistry.js';
import { PASS_APPEARANCE, passSupports } from '../../render/passStyle.js';
import { OVERLAYS } from '../../domain/overlays.js';
import { ImagePanel } from '../widgets/ImagePanel.js';
import { TimelinePanel } from '../widgets/TimelinePanel.js';
import { LabPanel } from '../widgets/LabPanel.js';
import { NotebookPanel } from '../widgets/NotebookPanel.js';
import { AdvisorPanel } from '../widgets/AdvisorPanel.js';
import { ExplorePanel } from '../widgets/ExplorePanel.js';
import { EvolutionPanel } from '../widgets/EvolutionPanel.js';
import { PresetPanel } from '../widgets/PresetPanel.js';
export function buildStyleSection(controls) {
    const body = controls.section('Style', { id: 'style', mode: 'look' });
    const view = controls.app.document.view;
    const st = view.style;
    const layer = controls.app.activeLayer;
    const locked = Boolean(controls.app.activeLayerLocked);
    const layerName = layer?.name ?? 'current layer';
    body.appendChild(controls.panelHint(`Active layer · ${layerName}`));
    const lockable = (control) => {
      if (locked) control.disabled = true;
      return control;
    };
    const grid = document.createElement('div');
    grid.className = 'artboard-grid';

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
    const number = (value, min, max, step, apply) => {
      const input = document.createElement('input');
      input.className = 'artboard-input';
      input.type = 'number';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      input.addEventListener('change', () => {
        const n = Math.min(max, Math.max(min, Number(input.value) || min));
        input.value = String(n);
        apply(n);
        rebuild();
      });
      return input;
    };
    const color = (value, apply) => {
      const input = document.createElement('input');
      input.className = 'artboard-color';
      input.type = 'color';
      input.value = value;
      input.addEventListener('input', () => { apply(input.value); rebuild(); });
      return input;
    };
    const select = (options, value, apply) => {
      const input = document.createElement('select');
      input.className = 'artboard-input';
      for (const option of options) {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        input.appendChild(opt);
      }
      input.value = value;
      input.addEventListener('change', () => { apply(input.value); rebuild(); });
      return input;
    };
    const rebuild = () => {
      view.strokeWeight = st.stroke.width;
      controls.app.rebuild();
    };

    row('Stroke', lockable(color(st.stroke.color, (v) => { st.stroke.color = v; })));
    const strokeWidth = lockable(number(st.stroke.width, 0.1, 40, 0.1, (v) => { st.stroke.width = v; }));
    row('Stroke width', strokeWidth);
    const strokeOpacity = document.createElement('input');
    strokeOpacity.className = 'artboard-range';
    strokeOpacity.type = 'range';
    strokeOpacity.min = '0';
    strokeOpacity.max = '1';
    strokeOpacity.step = '0.01';
    strokeOpacity.value = String(st.stroke.opacity);
    if (locked) strokeOpacity.disabled = true;
    strokeOpacity.addEventListener('input', () => { st.stroke.opacity = Number(strokeOpacity.value); rebuild(); });
    row('Stroke opacity', strokeOpacity);
    row('Cap', lockable(select(
      [{ value: 'round', label: 'Round' }, { value: 'butt', label: 'Butt' }, { value: 'square', label: 'Square' }],
      st.stroke.cap, (v) => { st.stroke.cap = v; },
    )));
    row('Join', lockable(select(
      [{ value: 'round', label: 'Round' }, { value: 'miter', label: 'Miter' }, { value: 'bevel', label: 'Bevel' }],
      st.stroke.join, (v) => { st.stroke.join = v; },
    )));

    const fillToggle = document.createElement('input');
    fillToggle.className = 'artboard-check';
    fillToggle.type = 'checkbox';
    fillToggle.checked = Boolean(st.fill.enabled);
    fillToggle.disabled = locked;
    fillToggle.addEventListener('change', () => {
      st.fill.enabled = fillToggle.checked;
      syncGradientRows();
      rebuild();
    });
    row('Fill', fillToggle);

    const gradient = st.fill.gradient ?? (st.fill.gradient = createDefaultFillGradient());
    const fillType = select(
      [
        { value: 'solid', label: 'Solid' },
        { value: 'linear', label: 'Linear' },
        { value: 'radial', label: 'Radial' },
      ],
      gradient.enabled ? gradient.type : 'solid',
      (value) => {
        if (value === 'solid') {
          gradient.enabled = false;
        } else {
          gradient.enabled = true;
          gradient.type = value;
          st.fill.enabled = true;
          fillToggle.checked = true;
        }
        syncGradientRows();
      },
    );
    row('Fill type', lockable(fillType));

    const fillColorRow = row('Fill color', lockable(color(st.fill.color, (v) => { st.fill.color = v; })));
    const fillOpacity = document.createElement('input');
    fillOpacity.className = 'artboard-range';
    fillOpacity.type = 'range';
    fillOpacity.min = '0';
    fillOpacity.max = '1';
    fillOpacity.step = '0.01';
    fillOpacity.value = String(st.fill.opacity);
    if (locked) fillOpacity.disabled = true;
    fillOpacity.addEventListener('input', () => { st.fill.opacity = Number(fillOpacity.value); rebuild(); });
    const fillOpacityRow = row('Fill opacity', fillOpacity);

    const angleRow = row('Gradient angle', lockable(number(gradient.angle, 0, 360, 1, (v) => {
      gradient.angle = v;
    })));
    const centerXRow = row('Center X', lockable(number(gradient.centerX, 0, 1, 0.01, (v) => {
      gradient.centerX = v;
    })));
    const centerYRow = row('Center Y', lockable(number(gradient.centerY, 0, 1, 0.01, (v) => {
      gradient.centerY = v;
    })));
    const radiusRow = row('Radius', lockable(number(gradient.radius, 0.05, 3, 0.05, (v) => {
      gradient.radius = v;
    })));

    const stopList = document.createElement('div');
    stopList.className = 'ramp-stops fill-gradient-stops';
    const addStop = document.createElement('button');
    addStop.className = 'lab-button ramp-add fill-gradient-add';
    addStop.textContent = '+ Color';
    addStop.disabled = locked;
    addStop.addEventListener('click', () => {
      if (gradient.colors.length >= FILL_GRADIENT_COLORS) return;
      gradient.colors.push(gradient.colors[gradient.colors.length - 1] ?? '#ffffff');
      gradient.enabled = true;
      renderStops();
      rebuild();
    });
    const stopBox = document.createElement('div');
    stopBox.className = 'fill-gradient-stops-box';
    stopBox.append(stopList, addStop);
    const colorsRow = row('Gradient colors', stopBox);

    const renderStops = () => {
      stopList.replaceChildren();
      gradient.colors.forEach((stopColor, index) => {
        const item = document.createElement('span');
        item.className = 'ramp-stop';
        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'ramp-color fill-gradient-color';
        input.value = stopColor;
        input.disabled = locked;
        input.setAttribute('aria-label', `Fill gradient color ${index + 1}`);
        input.addEventListener('input', () => {
          gradient.colors[index] = input.value;
          rebuild();
        });
        item.appendChild(input);
        if (gradient.colors.length > 2 && !locked) {
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'ramp-remove';
          remove.textContent = '×';
          remove.title = 'Remove gradient color';
          remove.addEventListener('click', () => {
            gradient.colors.splice(index, 1);
            renderStops();
            rebuild();
          });
          item.appendChild(remove);
        }
        stopList.appendChild(item);
      });
      addStop.disabled = locked || gradient.colors.length >= FILL_GRADIENT_COLORS;
    };

    function syncGradientRows() {
      const showGradient = Boolean(st.fill.enabled && gradient.enabled);
      const radial = gradient.type === 'radial';
      angleRow.hidden = !showGradient || radial;
      centerXRow.hidden = !showGradient || !radial;
      centerYRow.hidden = !showGradient || !radial;
      radiusRow.hidden = !showGradient || !radial;
      colorsRow.hidden = !showGradient;
      fillColorRow.hidden = showGradient;
      fillOpacityRow.hidden = false;
      fillType.value = gradient.enabled ? gradient.type : 'solid';
    }

    renderStops();
    syncGradientRows();

    row('Blend', lockable(select(
      [{ value: 'normal', label: 'Normal' }, { value: 'multiply', label: 'Multiply' }, { value: 'screen', label: 'Screen' }, { value: 'difference', label: 'Difference' }],
      st.blend, (v) => { st.blend = v; },
    )));

    const paletteSelect = document.createElement('select');
    paletteSelect.className = 'artboard-input';
    paletteSelect.disabled = locked;
    paletteSelect.title = 'Palette applies the canvas background and active-layer stroke/fill.';
    const paletteName = document.createElement('input');
    paletteName.className = 'artboard-input palette-name';
    paletteName.type = 'text';
    paletteName.maxLength = 40;
    paletteName.placeholder = 'Palette name';
    paletteName.disabled = locked;
    const paletteSave = document.createElement('button');
    paletteSave.className = 'lab-button palette-save';
    paletteSave.textContent = 'Save';
    paletteSave.disabled = locked;
    const paletteDelete = document.createElement('button');
    paletteDelete.className = 'lab-button palette-delete';
    paletteDelete.textContent = 'Delete';
    paletteDelete.disabled = true;
    const paletteActions = document.createElement('div');
    paletteActions.className = 'palette-actions';
    paletteActions.append(paletteName, paletteSave, paletteDelete);
    const paletteWrap = document.createElement('span');
    paletteWrap.className = 'artboard-palette';
    paletteWrap.append(paletteSelect, paletteActions);

    const renderPaletteOptions = (selectedId = paletteSelect.value) => {
      paletteSelect.replaceChildren();
      for (const palette of controls.paletteStore.entries()) {
        const opt = document.createElement('option');
        opt.value = palette.id;
        opt.textContent = palette.builtIn ? palette.name : `${palette.name} · custom`;
        paletteSelect.appendChild(opt);
      }
      if (selectedId && controls.paletteStore.get(selectedId)) paletteSelect.value = selectedId;
      paletteDelete.disabled = locked || !controls.paletteStore.isCustom(paletteSelect.value);
    };
    paletteSelect.addEventListener('change', () => {
      const palette = controls.paletteStore.get(paletteSelect.value);
      if (!palette) return;
      controls.app.document.view.artboard.background = palette.background;
      st.stroke.color = palette.stroke;
      st.fill.color = palette.fill;
      paletteDelete.disabled = locked || !controls.paletteStore.isCustom(palette.id);
      rebuild();
    });
    paletteSave.addEventListener('click', () => {
      try {
        const saved = controls.paletteStore.save(paletteName.value, {
          background: controls.app.document.view.artboard.background,
          stroke: st.stroke.color,
          fill: st.fill.color,
        });
        paletteName.value = '';
        renderPaletteOptions(saved.id);
        controls.app.notify?.(`Palette “${saved.name}” saved`);
      } catch (error) {
        controls.app.notify?.(`Palette save failed: ${error.message}`, 'error');
      }
    });
    paletteDelete.addEventListener('click', () => {
      if (!controls.paletteStore.isCustom(paletteSelect.value)) return;
      const palette = controls.paletteStore.get(paletteSelect.value);
      controls.paletteStore.delete(paletteSelect.value);
      renderPaletteOptions(controls.paletteStore.entries()[0]?.id);
      controls.app.notify?.(`Palette “${palette?.name ?? 'custom'}” deleted`);
    });
    renderPaletteOptions();
    row('Palette', paletteWrap);

    if (layer) {
      const override = document.createElement('select');
      override.className = 'artboard-input layer-mode-override';
      for (const option of [
        { value: 'global', label: 'Global' },
        { value: 'custom', label: 'Custom' },
      ]) {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        override.appendChild(opt);
      }
      override.value = Array.isArray(layer.modes) && layer.modes.length ? 'custom' : 'global';
      override.disabled = locked;

      const modeList = document.createElement('div');
      modeList.className = 'layer-mode-list';
      const modeWrap = document.createElement('div');
      modeWrap.className = 'layer-mode-wrap';
      modeWrap.append(override, modeList);

      const renderModes = () => {
        modeList.replaceChildren();
        modeList.hidden = !Array.isArray(layer.modes);
        if (modeList.hidden) return;
        for (const def of RenderPasses.list()) {
          if (def.internal) continue;
          const rowEl = document.createElement('label');
          rowEl.className = 'mode-toggle layer-mode-toggle';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = layer.modes.includes(def.id);
          input.disabled = locked;
          input.addEventListener('change', () => {
            layer.modes = toggleMode(layer.modes, def.id, input.checked, RenderPasses.ids());
            controls.app.rebuild();
          });
          const text = document.createElement('span');
          text.textContent = def.name;
          rowEl.append(input, text);
          modeList.appendChild(rowEl);
        }
      };

      override.addEventListener('change', () => {
        if (override.value === 'global') {
          layer.modes = null;
        } else {
          layer.modes = [...view.modes];
        }
        renderModes();
        controls.app.rebuild();
      });

      row('Render passes', modeWrap);
      renderModes();

      const colorMetric = select(
        [
          { value: 'global', label: 'Global' },
          { value: 'auto', label: 'Auto' },
          { value: 'height', label: 'Height' },
          { value: 'radius', label: 'Radius' },
          { value: 'curvature', label: 'Curvature' },
          { value: 'arc', label: 'Arc length' },
        ],
        layer.colorMetric ?? 'global',
        (value) => {
          layer.colorMetric = value === 'global' ? null : value;
        },
      );
      colorMetric.disabled = locked;
      row('Color metric', colorMetric);
    }

    if (locked) {
      grid.appendChild(controls.panelHint('Layer content is locked. Unlock the layer to edit style.'));
    }
    body.appendChild(grid);
}

export function buildRenderSection(controls) {
    const body = controls.section('Render', { id: 'render', mode: 'look' });
    const view = controls.app.document.view;
    body.appendChild(controls.panelHint(
      'Global render passes · checkbox enables a pass · opacity only adjusts its strength.',
    ));
    const order = RenderPasses.ids();
    view.modes = normalizeModes(view.modes, order);
    const passApplies = new Map(RenderPasses.list().filter((def) => !def.internal).map((def) => [def.id, controls.renderPassApplies(def)]));
    const modeInputs = [];
    const groups = new Map();
    for (const def of RenderPasses.list()) {
      if (def.internal) continue;
      const group = def.group ?? 'diagnostic';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(def);
    }
    const groupOrder = ['base', 'surface', 'color', 'diagnostic'];
    const ordered = [
      ...groupOrder.filter((group) => groups.has(group)).map((group) => [group, groups.get(group)]),
      ...[...groups.entries()].filter(([group]) => !groupOrder.includes(group)),
    ];
    const groupLabels = {
      base: 'Base',
      surface: 'Surfaces',
      color: 'Color',
      diagnostic: 'Diagnostics',
    };
    for (const [group, defs] of ordered) {
      const groupEl = document.createElement('div');
      groupEl.className = 'render-group';
      const heading = document.createElement('div');
      heading.className = 'render-group-h';
      heading.textContent = groupLabels[group] ?? group;
      const modesBody = document.createElement('div');
      modesBody.className = 'mode-toggles render-mode-toggles';
      for (const def of defs) {
        const applies = passApplies.get(def.id) !== false;
        const checked = view.modes.includes(def.id);
        const reason = applies ? '' : controls.renderPassReason(def);
        const row = document.createElement('div');
        row.className = 'mode-toggle render-mode-row';
        row.dataset.pass = def.id;
        row.classList.toggle('inapplicable', !applies);
        row.classList.toggle('off', !checked);
        row.title = applies ? (def.description ?? def.name) : reason;
        if (def.description) row.setAttribute('aria-description', def.description);
        if (!applies) row.setAttribute('aria-disabled', 'true');

        const main = document.createElement('label');
        main.className = 'mode-toggle-main';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = checked;
        input.disabled = !applies;
        input.addEventListener('change', () => {
          const next = toggleMode(controls.app.document.view.modes, def.id, input.checked, order);
          controls.app.document.view.modes = next;
          for (const entry of modeInputs) {
            entry.input.checked = next.includes(entry.id);
            entry.syncState();
          }
          controls.app.rebuild();
        });
        const labels = document.createElement('span');
        labels.className = 'mode-toggle-labels';
        const name = document.createElement('span');
        name.className = 'mode-toggle-name';
        name.textContent = def.name;
        const reasonEl = document.createElement('span');
        reasonEl.className = 'mode-toggle-reason';
        reasonEl.textContent = reason;
        labels.append(name, reasonEl);
        main.append(input, labels);

        const mix = document.createElement('span');
        mix.className = 'mode-toggle-mix';
        const mixLabel = document.createElement('span');
        mixLabel.className = 'mode-toggle-mix-label';
        mixLabel.textContent = 'Opacity';
        const opacity = document.createElement('input');
        opacity.type = 'range';
        opacity.className = 'pass-opacity';
        opacity.min = '0';
        opacity.max = '1';
        opacity.step = '0.05';
        opacity.value = String(view.passOpacity?.[def.id] ?? 1);
        opacity.title = `${def.name} opacity`;
        const percent = document.createElement('span');
        percent.className = 'mode-toggle-mix-value';
        percent.textContent = `${Math.round((Number(opacity.value) || 0) * 100)}%`;
        opacity.addEventListener('click', (event) => event.stopPropagation());
        opacity.addEventListener('input', () => {
          view.passOpacity = {
            ...(view.passOpacity ?? {}),
            [def.id]: Number(opacity.value),
          };
          percent.textContent = `${Math.round(Number(opacity.value) * 100)}%`;
          controls.app.rebuild();
        });
        mix.append(mixLabel, opacity, percent);

        const badge = document.createElement('span');
        badge.className = 'mode-toggle-badge';
        badge.textContent = 'N/A';
        badge.hidden = applies;

        let appearance = null;
        let colorInput = null;
        let widthInput = null;
        if (PASS_APPEARANCE[def.id]) {
          appearance = document.createElement('div');
          appearance.className = 'mode-toggle-appearance';
          const baseStroke = view.style?.stroke ?? {};
          const override = view.passStyle?.[def.id] ?? {};
          if (passSupports(def.id, 'color')) {
            const label = document.createElement('span');
            label.className = 'mode-toggle-appearance-label';
            label.textContent = 'Color';
            colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.className = 'pass-color';
            colorInput.value = override.color ?? baseStroke.color ?? '#ffffff';
            colorInput.title = `${def.name} color`;
            colorInput.addEventListener('input', () => {
              view.passStyle = {
                ...(view.passStyle ?? {}),
                [def.id]: { ...(view.passStyle?.[def.id] ?? {}), color: colorInput.value },
              };
              controls.app.rebuild();
            });
            appearance.append(label, colorInput);
          }
          if (passSupports(def.id, 'width')) {
            const label = document.createElement('span');
            label.className = 'mode-toggle-appearance-label';
            label.textContent = 'Width';
            widthInput = document.createElement('input');
            widthInput.type = 'number';
            widthInput.className = 'pass-width';
            widthInput.min = '0.1';
            widthInput.max = '40';
            widthInput.step = '0.1';
            widthInput.value = String(override.width ?? baseStroke.width ?? 1);
            widthInput.title = `${def.name} stroke width`;
            widthInput.addEventListener('change', () => {
              const width = Number(widthInput.value);
              if (!Number.isFinite(width) || width <= 0) return;
              view.passStyle = {
                ...(view.passStyle ?? {}),
                [def.id]: { ...(view.passStyle?.[def.id] ?? {}), width: Math.max(0.1, Math.min(40, width)) },
              };
              controls.app.rebuild();
            });
            appearance.append(label, widthInput);
          }
          const resetStyle = document.createElement('button');
          resetStyle.type = 'button';
          resetStyle.className = 'pass-style-reset';
          resetStyle.textContent = 'RESET';
          resetStyle.title = `Reset ${def.name} appearance`;
          resetStyle.addEventListener('click', () => {
            const next = { ...(view.passStyle ?? {}) };
            delete next[def.id];
            view.passStyle = next;
            controls.app.rebuild();
            controls.refreshRenderModes();
          });
          appearance.appendChild(resetStyle);
        }

        row.append(main, mix, badge);
        if (appearance) row.appendChild(appearance);
        modesBody.appendChild(row);
        const entry = {
          id: def.id,
          input,
          row,
          def,
          opacity,
          percent,
          badge,
          reasonEl,
          colorInput,
          widthInput,
          appearance,
          syncState() {
            const enabled = applies && input.checked;
            opacity.disabled = !enabled;
            row.classList.toggle('off', !input.checked);
            row.classList.toggle('inapplicable', !applies);
            badge.hidden = applies;
            reasonEl.textContent = applies ? '' : reason;
            if (colorInput) colorInput.disabled = !enabled;
            if (widthInput) widthInput.disabled = !enabled;
          },
        };
        entry.syncState();
        modeInputs.push(entry);
      }
      groupEl.append(heading, modesBody);
      body.appendChild(groupEl);
    }
    controls.modeToggles = modeInputs;
    const metricGui = controls.makeGui(body);
    metricGui.add(view, 'colorMetric', {
      Auto: 'auto',
      Height: 'height',
      Radius: 'radius',
      Curvature: 'curvature',
      'Arc length': 'arc',
    }).name('Gradient metric').onChange(() => controls.app.rebuild());
    controls.buildRampEditor(body);
}

export function buildOverlaysSection(controls) {
    const body = controls.section('Overlays', { id: 'overlays', mode: 'look' });
    body.appendChild(controls.panelHint('Global diagnostics · drawn above the active passes.'));
    const gui = controls.makeGui(body);
    for (const o of OVERLAYS) {
      gui.add(controls.app.document.view.overlays, o.id)
        .name(o.name)
        .onChange(() => controls.app.rebuild());
    }
}

export function buildImageSection(controls) {
    const body = controls.section('Image', { id: 'image', mode: 'ingest' });
    controls.imagePanel = new ImagePanel(controls.app);
    body.appendChild(controls.imagePanel.el);
}

export function buildAnimationSection(controls) {
    const gui = controls.makeGui(controls.section('Animation', { id: 'animation', mode: 'perform' }));
    const a = controls.app.document.animation;
    gui.add(a, 'playing').name('Play').onChange(() => controls.app.rebuild());
    gui.add(a, 'speed', 0.05, 4, 0.05).name('Speed').onChange(() => {});
    const time = gui.add(a, 'time', 0, 12.5664, 0.01)
      .name('Time')
      .onChange((t) => controls.app.setTime(t))
      .listen();
    applyHardBounds(time, { snap: false, hardMin: 0, hardMax: 1000000 });
    controls.timeController = time;
    controls.timeBaseMax = 12.5664;
    controls.syncTimeRange(a.time);
    gui.add({ reset: () => controls.app.resetTime() }, 'reset').name('Reset Time');
}

export function buildTimelineSection(controls) {
    const body = controls.section('Timeline', { id: 'timeline', mode: 'perform' });
    controls.timelinePanel = new TimelinePanel(controls.app);
    body.appendChild(controls.timelinePanel.el);
}

export function buildMutationSection(controls) {
    if (controls.app.activeLayerIsInstance()) {
      const body = controls.section('Mutation', { id: 'mutation', mode: 'explore' });
      body.appendChild(controls.panelHint('Select a generator layer to use controls tool. Instance layers are read-only.'));
      return;
    }
    const gui = controls.makeGui(controls.section('Mutation', { id: 'mutation', mode: 'explore' }));
    const btn = gui.add({ mutate: () => controls.app.mutate() }, 'mutate').name('Mutate');
    btn.domElement.classList.add('gl-accent');
    gui.add({ undo: () => controls.app.undo() }, 'undo').name('Undo (⌘Z)');
    gui.add({ redo: () => controls.app.redo() }, 'redo').name('Redo (⇧⌘Z)');
    gui.add(controls.app.document, 'seed', 0, 999999, 1)
      .name('Seed')
      .onChange((v) => controls.app.setSeed(v))
      .listen();
    gui.add({ reroll: () => controls.app.rerollSeed() }, 'reroll').name('Reroll Seed');
}

export function buildAnalysisSection(controls) {
    const body = controls.section('Analysis', { id: 'analysis', mode: 'explore' });
    controls.labPanel = new LabPanel(controls.app);
    body.appendChild(controls.labPanel.el);
}

export function buildNotebookSection(controls) {
    const body = controls.section('Notebook', { id: 'notebook', mode: 'keep' });
    controls.notebookPanel = new NotebookPanel(controls.app);
    body.appendChild(controls.notebookPanel.el);
}

export function buildAdvisorSection(controls) {
    const body = controls.section('Advisor', { id: 'advisor', mode: 'explore' });
    if (controls.app.activeLayerIsInstance()) {
      body.appendChild(controls.panelHint('Select a generator layer to use the advisor.'));
      return;
    }
    controls.advisorPanel = new AdvisorPanel(controls.app);
    body.appendChild(controls.advisorPanel.el);
}

export function buildExploreSection(controls) {
    if (controls.app.activeLayerIsInstance()) {
      const body = controls.section('Explore', { id: 'explore', mode: 'explore' });
      body.appendChild(controls.panelHint('Select a generator layer to use controls tool. Instance layers are read-only.'));
      return;
    }
    const body = controls.section('Explore', { id: 'explore', mode: 'explore' });
    controls.explorePanel = new ExplorePanel(controls.app);
    body.appendChild(controls.explorePanel.el);
}

export function buildEvolutionSection(controls) {
    if (controls.app.activeLayerIsInstance()) {
      const body = controls.section('Evolution', { id: 'evolution', mode: 'explore' });
      body.appendChild(controls.panelHint('Select a generator layer to use controls tool. Instance layers are read-only.'));
      return;
    }
    const body = controls.section('Evolution', { id: 'evolution', mode: 'explore' });
    controls.evolutionPanel = new EvolutionPanel(controls.app);
    body.appendChild(controls.evolutionPanel.el);
}

export function buildPresetsSection(controls) {
    // Reuse the section on GUI-only rebuilds; otherwise every save would
    // append an empty "Presets" section.
    const body = controls.presetSectionBody ?? controls.section('Presets', { id: 'presets', mode: 'keep' });
    controls.presetSectionBody = body;
    controls.presetPanel?.destroy?.();
    body.replaceChildren();

    controls.presetPanel = new PresetPanel(controls.app, controls.presetFilter);
    body.append(controls.presetPanel.el);
    if (controls.sectionEls.get('presets')?.header.getAttribute('aria-expanded') === 'true') {
      requestAnimationFrame(() => controls.presetPanel?.resume?.());
    }

    const actions = document.createElement('div');
    actions.className = 'preset-actions-label';
    actions.textContent = 'Save current figure';
    body.append(actions);

    controls.presetsGui = controls.makeGui(body);

    const names = controls.app.presets.names();
    if (names.includes(controls.app.document.name)) {
      controls.presetState.selected = controls.app.document.name;
    } else if (!controls.presetState.selected && names.length) {
      controls.presetState.selected = names[0];
    }

    controls.presetsGui.add(controls.presetState, 'name').name('Name');
    controls.presetsGui.add({
      save: () => {
        try {
          const name = controls.app.presets.save(controls.presetState.name, controls.app.document);
          if (controls.app.presets.lastError) {
            controls.app.notify?.(
              `Preset saved in memory; storage failed: ${controls.app.presets.lastError}`,
              'error',
            );
          }
          controls.presetState.name = name;
          controls.presetState.selected = name;
          controls.rebuildPresetsSection();
          controls.sync();
        } catch (err) {
          controls.app.notify?.(`Preset save failed: ${err.message}`, 'error');
        }
      },
    }, 'save').name('Save Preset');
    controls.presetsGui.add({
      remove: () => {
        if (controls.app.presets.delete(controls.presetState.selected)) {
          if (controls.app.presets.lastError) {
            controls.app.notify?.(
              `Preset removed in memory; storage failed: ${controls.app.presets.lastError}`,
              'error',
            );
          }
          controls.presetState.selected = '';
          controls.rebuildPresetsSection();
          controls.presetPanel?.focusFilter?.();
        } else if (controls.app.presets.isBuiltIn(controls.presetState.selected)) {
          controls.app.notify?.('Built-in presets cannot be deleted', 'error');
        }
      },
    }, 'remove').name('Delete Preset');
    controls.presetsGui.add({ importJSON: () => controls.app.openImportDialog() }, 'importJSON').name('Import JSON…');
}

export function buildExportSection(controls) {
    const body = controls.section('2D Export', { id: 'export', mode: 'keep' });
    body.appendChild(controls.panelHint(
      'Vector, raster and document export. Manufacturing export lives in Make.',
    ));
    const gui = controls.makeGui(body);
    const ex = controls.app.exporter;
    gui.add({ svg: () => ex.exportSVG() }, 'svg').name('Export SVG');
    gui.add({ plotter: () => ex.exportPlotterSVG() }, 'plotter').name('Export Plotter SVG');
    gui.add({ png: () => ex.exportPNG() }, 'png').name('Export PNG');
    gui.add({ json: () => ex.exportJSON() }, 'json').name('Export JSON');
    gui.add({
      copy: async () => {
        const ok = await ex.copyJSON();
        if (!ok) controls.app.notify?.('Clipboard unavailable — use Export JSON', 'error');
        else controls.app.notify?.('Document copied to clipboard');
      },
    }, 'copy').name('Copy JSON');
}
