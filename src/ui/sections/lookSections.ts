/**
 * lookSections.js — inspector section builders.
 *
 * Each export receives the Controls coordinator and only talks to shared
 * helpers, registries and App APIs. Sections never import each other.
 */

import { LOOK_PRESETS } from '../../domain/lookPresets.ts';
import { supportsSpatial } from '../../core/capabilities.ts';
import { ARTBOARD_PRESETS } from '../../render/palettes.ts';

import type GUI from 'lil-gui';
import type { Controller } from 'lil-gui';

type Rec = Record<string, unknown>;

interface ArtboardLike { width: number; height: number; background: string; margin: number; [key: string]: unknown }
interface ReferenceLike { enabled?: boolean; ground?: boolean; [key: string]: unknown }
interface CoordinatesLike { enabled?: boolean; grid?: boolean; cursor?: boolean; step: number | null; unitDisplay: string; [key: string]: unknown }
interface UnitsLike {
  world: string;
  artboard: string;
  mmPerWorldUnit: number | null;
  mmPerArtboardUnit: number | null;
  [key: string]: unknown;
}
interface ViewLike {
  projection?: string;
  layout?: string;
  guides?: boolean;
  artboard: ArtboardLike;
  reference: ReferenceLike;
  coordinates: CoordinatesLike;
  units: UnitsLike;
  [key: string]: unknown;
}
interface LookPortLike {
  document: { view: ViewLike; [key: string]: unknown };
  evaluation?: { worldBBox?: Rec | null; bbox?: Rec | null } | null;
  lookStore: { findByName(name: string): unknown | null };
  dialogs: { confirm(options?: Rec): Promise<boolean | null> };
  applyLookPreset(id: string): boolean;
  saveUserLook(name: string): { ok: boolean; [key: string]: unknown };
  notify(message: string, kind?: string): void;
  rebuild(): void;
  resetCamera(): void;
  isParametricsVisible(): boolean;
  setParametricsVisible(visible: boolean): void;
  isUVDomainVisible(): boolean;
  setUVDomainVisible(visible: boolean): void;
  isSurfaceInspectorEnabled(): boolean;
  setSurfaceInspectorEnabled(enabled: boolean): void;
  isSeamsVisible(): boolean;
  setSeamsVisible(visible: boolean): void;
  [key: string]: unknown;
}
interface CoordinateReadout { [key: string]: unknown }
interface RenderPortLike {
  currentCoordinateReadout?: () => CoordinateReadout | null;
  setCoordinatePin?: (readout: CoordinateReadout) => boolean;
  clearCoordinatePin?: () => void;
}
interface LookControls {
  lookPort: LookPortLike;
  section: (title: string, options: { id: string; mode: string }) => HTMLElement;
  panelHint: (message: string) => HTMLElement;
  makeGui: (container: HTMLElement) => GUI;
  lookPresetButtons: Map<string, { button: HTMLButtonElement; preset: unknown }>;
  refreshLookPresets: () => void;
  refreshUserLooks: () => void;
  userLookName: HTMLInputElement | null;
  userLookList: HTMLDivElement | null;
  activeGeneratorDefinition: () => { capabilities?: { geometryKind?: string } } | null;
  activeLayerHasSurface: () => boolean;
  activeLayerIsSpatial: () => boolean;
  parametricsToggle: HTMLInputElement | null;
  uvDomainToggle: HTMLInputElement | null;
  surfaceInspectorToggle: HTMLInputElement | null;
  seamsToggle: HTMLInputElement | null;
  coordinatePinButton: HTMLButtonElement | null;
  coordinatePinRelease: HTMLButtonElement | null;
  coordinatePinStatus: HTMLSpanElement | null;
  refreshCoordinatePin: () => void;
  render?: RenderPortLike | null;
}

import {
  PHYSICAL_UNIT_SYSTEMS,
  artboardToMillimetres,
  bboxToMillimetres,
  formatPhysicalLength,
  millimetresPerUnit,
  validateUnits,
} from '../../domain/units.ts';
export function buildLooksSection(controls: LookControls): void {
    const body = controls.section('Looks', { id: 'looks', mode: 'look' });
    body.appendChild(controls.panelHint(
      'View recipes · passes, overlays, color metric and guides only. Geometry and style are untouched.',
    ));
    const grid = document.createElement('div');
    grid.className = 'look-preset-grid';
    controls.lookPresetButtons = new Map();
    for (const preset of LOOK_PRESETS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'look-preset';
      button.dataset.preset = preset.id;
      const name = document.createElement('span');
      name.className = 'look-preset-name';
      name.textContent = preset.name;
      const description = document.createElement('span');
      description.className = 'look-preset-desc';
      description.textContent = preset.description;
      button.append(name, description);
      button.addEventListener('click', () => {
        if (controls.lookPort.applyLookPreset(preset.id)) controls.refreshLookPresets();
      });
      grid.appendChild(button);
      controls.lookPresetButtons.set(preset.id, { button, preset });
    }
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'lab-button look-preset-reset';
    reset.textContent = 'RESET LOOK';
    reset.title = 'Apply the Line preset and clear diagnostic overlays';
    reset.addEventListener('click', () => {
      if (controls.lookPort.applyLookPreset('line')) controls.refreshLookPresets();
    });
    const userWrap = document.createElement('div');
    userWrap.className = 'user-looks';
    const userHead = document.createElement('div');
    userHead.className = 'lab-subhead';
    userHead.textContent = 'My Looks';
    const saveRow = document.createElement('div');
    saveRow.className = 'user-look-save-row';
    const nameInput = document.createElement('input');
    nameInput.className = 'artboard-input user-look-name';
    nameInput.placeholder = 'Look name';
    nameInput.maxLength = 60;
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'lab-button user-look-save';
    saveButton.textContent = 'SAVE';
    const save = async () => {
      const name = nameInput.value.trim();
      if (!name) {
        controls.lookPort.notify('Look name required', 'error');
        return;
      }
      const existing = controls.lookPort.lookStore.findByName(name);
      if (existing) {
        const ok = await controls.lookPort.dialogs.confirm({
          title: 'Overwrite look?',
          message: `A look named “${name}” already exists.`,
          confirmText: 'Overwrite',
          cancelText: 'Keep',
        });
        if (!ok) return;
      }
      const result = controls.lookPort.saveUserLook(name);
      if (result.ok) nameInput.value = '';
    };
    saveButton.addEventListener('click', () => { void save(); });
    nameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void save();
      }
    });
    saveRow.append(nameInput, saveButton);
    const userList = document.createElement('div');
    userList.className = 'user-look-list';
    userWrap.append(userHead, saveRow, userList);
    body.append(grid, reset, userWrap);
    controls.userLookName = nameInput;
    controls.userLookList = userList;
    controls.refreshLookPresets();
    controls.refreshUserLooks();
}

export function buildCameraSection(controls: LookControls): void {
    const body = controls.section('Camera', { id: 'camera', mode: 'look' });
    const view = controls.lookPort.document.view;
    const generator = controls.activeGeneratorDefinition();
    const canProject = Boolean(generator && supportsSpatial(generator));
    if (!canProject && view.projection !== '3d') view.projection = '3d';
    view.projection ??= '3d';
    view.layout ??= 'single';
    if (!canProject) view.layout = 'single';

    body.appendChild(controls.panelHint(
      canProject
        ? 'Global viewport · projection applies to all layers.'
        : 'Global viewport · orthographic views require a spatial active layer; projection applies globally.',
    ));

    const gui = controls.makeGui(body);
    const resetCamera = document.createElement('button');
    resetCamera.className = 'lab-button camera-reset';
    resetCamera.textContent = 'Reset camera';
    resetCamera.addEventListener('click', () => controls.lookPort.resetCamera());
    const syncReset = () => {
      const available = canProject && view.projection === '3d';
      resetCamera.disabled = !available;
      resetCamera.title = available
        ? 'Reset yaw, pitch and FOV to defaults'
        : 'Camera reset is available in the 3D camera view';
    };

    const projection = gui
      .add(view, 'projection', {
        '3D camera': '3d',
        'XY · Planta': 'xy',
        'XZ · Alzado': 'xz',
        'YZ · Perfil': 'yz',
      })
      .name('Projection')
      .onChange(() => {
        controls.lookPort.rebuild();
        syncReset();
      });
    projection.domElement.classList.add('view-projection-row');
    projection.$widget?.querySelector?.('select')?.classList.add('view-projection');
    if (!canProject) {
      projection.disable();
      projection.domElement.title = 'Orthographic views require a spatial active layer';
    }
    const layout = gui.add(view, 'layout', {
      Single: 'single',
      Quad: 'quad',
    }).name('Layout').onChange(() => controls.lookPort.rebuild());
    layout.domElement.title = 'Quad view arranges 3D + XY/XZ/YZ. SVG and plotter exports use the active projection.';
    if (!canProject) layout.disable();
    gui.add(view, 'guides').name('CAD Guides').onChange(() => controls.lookPort.rebuild());
    body.appendChild(resetCamera);
    syncReset();
}

export function buildCanvasSection(controls: LookControls): void {
    const body = controls.section('Canvas', { id: 'canvas', mode: 'look' });
    const view = controls.lookPort.document.view;
    const ab = view.artboard;
    const surfaceAvailable = controls.activeLayerHasSurface();
    body.appendChild(controls.panelHint('Global canvas · applied to the whole document.'));
    const grid = document.createElement('div');
    grid.className = 'artboard-grid';

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
    const number = (value: number, min: number, max: number, step: number, apply: (value: number) => void): HTMLInputElement => {
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
    const color = (value: string, apply: (value: string) => void): HTMLInputElement => {
      const input = document.createElement('input');
      input.className = 'artboard-color';
      input.type = 'color';
      input.value = value;
      input.addEventListener('input', () => { apply(input.value); rebuild(); });
      return input;
    };
    const rebuild = () => controls.lookPort.rebuild();

    const presetSelect = document.createElement('select');
    presetSelect.className = 'artboard-input';
    for (const preset of ARTBOARD_PRESETS) {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    }
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom';
    presetSelect.appendChild(customOption);
    const initialPreset = ARTBOARD_PRESETS.find((p) => p.width === ab.width && p.height === ab.height);
    presetSelect.value = initialPreset?.id ?? 'custom';
    presetSelect.addEventListener('change', () => {
      const preset = ARTBOARD_PRESETS.find((p) => p.id === presetSelect.value);
      if (!preset) return;
      ab.width = preset.width;
      ab.height = preset.height;
      sync();
      rebuild();
    });
    row('Preset', presetSelect);

    const widthInput = number(ab.width, 240, 4096, 1, (v) => { ab.width = v; presetSelect.value = 'custom'; });
    const heightInput = number(ab.height, 240, 4096, 1, (v) => { ab.height = v; presetSelect.value = 'custom'; });
    row('Width', widthInput);
    row('Height', heightInput);
    row('Background', color(ab.background, (v) => { ab.background = v; }));

    const margin = document.createElement('input');
    margin.className = 'artboard-range';
    margin.type = 'range';
    margin.min = '0';
    margin.max = '120';
    margin.step = '1';
    margin.value = String(ab.margin);
    const marginValue = document.createElement('span');
    marginValue.className = 'artboard-value';
    marginValue.textContent = `${ab.margin}px`;
    margin.addEventListener('input', () => {
      ab.margin = Number(margin.value);
      marginValue.textContent = `${ab.margin}px`;
      rebuild();
    });
    const marginWrap = document.createElement('span');
    marginWrap.className = 'artboard-range-wrap';
    marginWrap.append(margin, marginValue);
    row('Margin', marginWrap);

    controls.parametricsToggle = document.createElement('input');
    controls.parametricsToggle.className = 'artboard-check parametrics-toggle-checkbox';
    controls.parametricsToggle.type = 'checkbox';
    controls.parametricsToggle.checked = controls.lookPort.isParametricsVisible();
    controls.parametricsToggle.title = 'Show active-layer parametric properties at the canvas edge';
    controls.parametricsToggle.addEventListener('change', () => {
      controls.lookPort.setParametricsVisible(controls.parametricsToggle!.checked);
    });
    row('Parametrics', controls.parametricsToggle);

    controls.uvDomainToggle = document.createElement('input');
    controls.uvDomainToggle.className = 'artboard-check uv-domain-toggle-checkbox';
    controls.uvDomainToggle.type = 'checkbox';
    controls.uvDomainToggle.checked = controls.lookPort.isUVDomainVisible();
    controls.uvDomainToggle.title = 'Show the active surface UV domain inset. UI-only; never included in exports.';
    controls.uvDomainToggle.addEventListener('change', () => {
      controls.lookPort.setUVDomainVisible(controls.uvDomainToggle!.checked);
    });
    row('UV Domain', controls.uvDomainToggle);

    controls.surfaceInspectorToggle = document.createElement('input');
    controls.surfaceInspectorToggle.className = 'artboard-check surface-inspector-toggle-checkbox';
    controls.surfaceInspectorToggle.type = 'checkbox';
    controls.surfaceInspectorToggle.checked = controls.lookPort.isSurfaceInspectorEnabled();
    controls.surfaceInspectorToggle.title = 'Inspect the surface under the cursor in single Canvas.';
    controls.surfaceInspectorToggle.addEventListener('change', () => {
      controls.lookPort.setSurfaceInspectorEnabled(controls.surfaceInspectorToggle!.checked);
    });
    row('Inspect', controls.surfaceInspectorToggle);

    controls.seamsToggle = document.createElement('input');
    controls.seamsToggle.className = 'artboard-check seams-toggle-checkbox';
    controls.seamsToggle.type = 'checkbox';
    controls.seamsToggle.checked = controls.lookPort.isSeamsVisible();
    controls.seamsToggle.title = 'Show declared UV domain borders, seams and reverse/twist seams.';
    controls.seamsToggle.addEventListener('change', () => {
      controls.lookPort.setSeamsVisible(controls.seamsToggle!.checked);
    });
    row('Seams', controls.seamsToggle);

    if (!surfaceAvailable) {
      for (const control of [controls.uvDomainToggle!, controls.surfaceInspectorToggle!, controls.seamsToggle!]) {
        control.disabled = true;
        control.title = `${control.title} Requires surface or mesh geometry.`;
      }
    }

    const sync = () => {
      widthInput.value = String(ab.width);
      heightInput.value = String(ab.height);
      margin.value = String(ab.margin);
      marginValue.textContent = `${ab.margin}px`;
      const preset = ARTBOARD_PRESETS.find((p) => p.width === ab.width && p.height === ab.height);
      presetSelect.value = preset?.id ?? 'custom';
    };
    sync();
    body.appendChild(grid);
    if (!surfaceAvailable) {
      const note = controls.panelHint('UV Domain, Inspect and Seams require surface or mesh geometry.');
      note.classList.add('control-reason');
      body.appendChild(note);
    }
}

export function buildCoordinatesSection(controls: LookControls): void {
    const body = controls.section('Coordinates', { id: 'coordinates', mode: 'look' });
    const view = controls.lookPort.document.view;
    const reference = view.reference;
    const coordinates = view.coordinates;
    const spatialAvailable = controls.activeLayerIsSpatial();
    body.appendChild(controls.panelHint(
      'Global viewport · UI-only. Origin, axes, ticks and cursor readout never enter exports.',
    ));

    const grid = document.createElement('div');
    grid.className = 'artboard-grid coordinates-grid';
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
    const checkbox = (className: string, checked: boolean, title: string): HTMLInputElement => {
      const input = document.createElement('input');
      input.className = `artboard-check ${className}`;
      input.type = 'checkbox';
      input.checked = checked;
      input.title = title;
      return input;
    };
    const rebuild = () => controls.lookPort.rebuild();

    const referenceToggle = checkbox(
      'reference-toggle-checkbox',
      Boolean(reference.enabled),
      'Show world origin and XYZ axes. UI-only; never included in exports.',
    );
    const groundToggle = checkbox(
      'reference-ground-checkbox',
      Boolean(reference.ground),
      'Show a low-density ground plane at z = 0.',
    );
    groundToggle.disabled = !reference.enabled;
    referenceToggle.addEventListener('change', () => {
      reference.enabled = referenceToggle.checked;
      groundToggle.disabled = !reference.enabled;
      rebuild();
    });
    groundToggle.addEventListener('change', () => {
      reference.ground = groundToggle.checked;
      rebuild();
    });
    row('Reference', referenceToggle);
    row('Ground', groundToggle);

    const coordinatesToggle = checkbox(
      'coordinates-toggle-checkbox',
      Boolean(coordinates.enabled),
      'Show world-axis ticks and values in orthographic panels.',
    );
    const gridToggle = checkbox(
      'coordinates-grid-checkbox',
      Boolean(coordinates.grid),
      'Draw a light grid at coordinate ticks.',
    );
    gridToggle.disabled = !coordinates.enabled;
    coordinatesToggle.addEventListener('change', () => {
      coordinates.enabled = coordinatesToggle.checked;
      gridToggle.disabled = !coordinates.enabled;
      stepInput.disabled = !coordinates.enabled;
      rebuild();
    });
    gridToggle.addEventListener('change', () => {
      coordinates.grid = gridToggle.checked;
      rebuild();
    });
    row('Values', coordinatesToggle);
    row('Grid', gridToggle);

    const cursorToggle = checkbox(
      'coordinates-cursor-checkbox',
      Boolean(coordinates.cursor),
      'Show the two in-plane world coordinates under the cursor.',
    );
    cursorToggle.addEventListener('change', () => {
      coordinates.cursor = cursorToggle.checked;
      rebuild();
    });
    row('Cursor XYZ', cursorToggle);

    const stepInput = document.createElement('input');
    stepInput.className = 'artboard-input coordinates-step';
    stepInput.type = 'number';
    stepInput.min = '0.000001';
    stepInput.step = '0.1';
    stepInput.placeholder = 'auto';
    stepInput.value = coordinates.step === null ? '' : String(coordinates.step);
    stepInput.disabled = !coordinates.enabled;
    stepInput.title = 'World units between ticks. Empty means automatic 1/2/5 spacing.';
    stepInput.addEventListener('change', () => {
      const value = Number(stepInput.value);
      coordinates.step = Number.isFinite(value) && value > 0 ? value : null;
      if (!coordinates.step) stepInput.value = '';
      rebuild();
    });
    row('Tick step', stepInput);

    const unitsSelect = document.createElement('select');
    unitsSelect.className = 'artboard-input coordinates-units-select';
    for (const [value, label] of [
      ['auto', 'Auto · mm when scaled'],
      ['world', 'World units'],
      ['physical', 'Physical · mm'],
    ] as Array<[string, string]>) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      unitsSelect.appendChild(option);
    }
    unitsSelect.value = coordinates.unitDisplay;
    unitsSelect.addEventListener('change', () => {
      coordinates.unitDisplay = unitsSelect.value;
      rebuild();
    });
    row('Values in', unitsSelect);

    if (!spatialAvailable) {
      for (const control of [
        referenceToggle, groundToggle, coordinatesToggle, gridToggle,
        cursorToggle, stepInput, unitsSelect,
      ]) {
        control.disabled = true;
      }
      for (const control of [referenceToggle, coordinatesToggle, cursorToggle]) {
        control.title = `${control.title} Requires a spatial (3D) layer.`;
      }
      const note = controls.panelHint('Coordinates require a spatial layer with a world transform.');
      note.classList.add('control-reason');
      body.appendChild(note);
    }

    const pinRow = document.createElement('div');
    pinRow.className = 'coordinates-pin-row';
    const pinButton = document.createElement('button');
    pinButton.type = 'button';
    pinButton.className = 'lab-button coordinates-pin';
    pinButton.textContent = 'PIN';
    pinButton.title = 'Pin the last valid coordinate readout.';
    pinButton.disabled = !spatialAvailable;
    const releaseButton = document.createElement('button');
    releaseButton.type = 'button';
    releaseButton.className = 'lab-button coordinates-release';
    releaseButton.textContent = 'RELEASE';
    releaseButton.title = 'Clear the pinned coordinate.';
    releaseButton.disabled = true;
    const pinStatus = document.createElement('span');
    pinStatus.className = 'coordinates-pin-status';
    pinStatus.textContent = 'No pinned coordinate';
    pinRow.append(pinButton, releaseButton, pinStatus);

    pinButton.addEventListener('click', () => {
      const readout = controls.render?.currentCoordinateReadout?.() ?? null;
      if (!readout) {
        controls.lookPort.notify('Move over a surface to pin a coordinate', 'error');
        return;
      }
      if (!controls.render?.setCoordinatePin?.(readout)) {
        controls.lookPort.notify('Coordinate could not be pinned', 'error');
        return;
      }
      controls.lookPort.rebuild();
      controls.refreshCoordinatePin();
    });
    releaseButton.addEventListener('click', () => {
      controls.render?.clearCoordinatePin?.();
      controls.lookPort.rebuild();
      controls.refreshCoordinatePin();
    });

    controls.coordinatePinButton = pinButton;
    controls.coordinatePinRelease = releaseButton;
    controls.coordinatePinStatus = pinStatus;
    body.append(grid, pinRow);
    body.appendChild(controls.panelHint(
      'In 3D, a pin requires a surface hit. Empty space has no depth and never invents a Z value.',
    ));
    controls.refreshCoordinatePin();
}

export function buildUnitsSection(controls: LookControls): void {
    const body = controls.section('Scale', { id: 'units', mode: 'look' });
    const view = controls.lookPort.document.view;
    const units = view.units;
    body.appendChild(controls.panelHint(
      'Optional physical scale. Geometry is never rescaled; millimetres are applied only by export consumers.',
    ));

    const grid = document.createElement('div');
    grid.className = 'artboard-grid units-grid';

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

    const worldSize = document.createElement('div');
    worldSize.className = 'units-readout units-world-size';
    const pageSize = document.createElement('div');
    pageSize.className = 'units-readout units-page-size';
    const warning = document.createElement('div');
    warning.className = 'units-warning';

    const refresh = () => {
      const bbox = controls.lookPort.evaluation?.worldBBox ?? controls.lookPort.evaluation?.bbox ?? null;
      const physical = bboxToMillimetres(bbox, units);
      if (physical) {
        const dimensions = [
          formatPhysicalLength(physical.width),
          formatPhysicalLength(physical.height),
          physical.depth !== null ? formatPhysicalLength(physical.depth) : null,
        ].filter(Boolean);
        worldSize.textContent = `World bbox · ${dimensions.join(' × ')}`;
      } else {
        worldSize.textContent = 'World bbox · unitless';
      }

      const artboard = view.artboard;
      const pageWidth = artboardToMillimetres(artboard.width, units);
      const pageHeight = artboardToMillimetres(artboard.height, units);
      if (pageWidth !== null && pageHeight !== null) {
        pageSize.textContent = `Page · ${formatPhysicalLength(pageWidth)} × ${formatPhysicalLength(pageHeight)}`;
      } else {
        pageSize.textContent = `Page · unitless · ${artboard.width} × ${artboard.height}`;
      }

      const validation = validateUnits(units);
      warning.textContent = validation.ok
        ? `World scale ×${millimetresPerUnit(units, 'world') ?? '—'} · page scale ×${millimetresPerUnit(units, 'artboard') ?? '—'}`
        : validation.errors.join(' · ');
      warning.dataset.valid = validation.ok ? 'true' : 'false';
    };

    const select = (value: string, className: string, onChange: (value: string) => void): HTMLSelectElement => {
      const el = document.createElement('select');
      el.className = `artboard-input ${className}`;
      for (const system of PHYSICAL_UNIT_SYSTEMS) {
        const option = document.createElement('option');
        option.value = system;
        option.textContent = system === 'unitless' ? 'unitless' : system;
        el.appendChild(option);
      }
      el.value = value;
      el.addEventListener('change', () => {
        onChange(el.value);
        controls.lookPort.rebuild();
        refresh();
      });
      return el;
    };

    const factorInput = (value: number | null, className: string, disabled: boolean, onChange: (value: number | null) => void): HTMLInputElement => {
      const el = document.createElement('input');
      el.className = `artboard-input ${className}`;
      el.type = 'number';
      el.min = '0.000001';
      el.step = '0.01';
      el.placeholder = disabled ? '—' : 'mm per unit';
      el.disabled = disabled;
      el.value = value === null ? '' : String(value);
      el.addEventListener('change', () => {
        const number = Number(el.value);
        onChange(Number.isFinite(number) && number > 0 ? number : null);
        controls.lookPort.rebuild();
        refresh();
      });
      return el;
    };

    let worldFactor: HTMLInputElement | null = null;
    const worldSelect = select(units.world, 'units-world-select', (value) => {
      units.world = value;
      if (value === 'unitless') units.mmPerWorldUnit = null;
      if (worldFactor) {
        worldFactor.disabled = value === 'unitless';
        worldFactor.placeholder = value === 'unitless' ? '—' : 'mm per unit';
      }
    });
    row('World units', worldSelect);
    worldFactor = factorInput(
      units.mmPerWorldUnit,
      'units-world-factor',
      units.world === 'unitless',
      (value) => { units.mmPerWorldUnit = value; },
    );
    row('World mm/unit', worldFactor);

    let artboardFactor: HTMLInputElement | null = null;
    const artboardSelect = select(units.artboard, 'units-artboard-select', (value) => {
      units.artboard = value;
      if (value === 'unitless') units.mmPerArtboardUnit = null;
      if (artboardFactor) {
        artboardFactor.disabled = value === 'unitless';
        artboardFactor.placeholder = value === 'unitless' ? '—' : 'mm per unit';
      }
    });
    row('Page units', artboardSelect);
    artboardFactor = factorInput(
      units.mmPerArtboardUnit,
      'units-artboard-factor',
      units.artboard === 'unitless',
      (value) => { units.mmPerArtboardUnit = value; },
    );
    row('Page mm/unit', artboardFactor);

    grid.append(worldSize, pageSize, warning);
    refresh();
    body.appendChild(grid);
}
