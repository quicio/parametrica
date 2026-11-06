/**
 * fabricateSections.js — inspector section builders.
 *
 * Each export receives the Controls coordinator and only talks to shared
 * helpers, registries and App APIs. Sections never import each other.
 */

import { PHYSICAL_UNIT_SYSTEMS } from '../../core/units.js';
export function buildFabricateSection(controls) {
    const body = controls.section('Fabricate', { id: 'fabricate', mode: 'fabricate' });
    body.appendChild(controls.panelHint(
      'Read-only fabrication gate. Parametrica never repairs, caps or edits geometry in controls mode.',
    ));

    const panel = document.createElement('div');
    panel.className = 'fabricate-panel';

    const status = document.createElement('div');
    status.className = 'fabricate-status';
    status.setAttribute('role', 'status');
    const source = document.createElement('div');
    source.className = 'fabricate-source';
    const reason = document.createElement('div');
    reason.className = 'fabricate-reason';

    const rows = document.createElement('div');
    rows.className = 'fabricate-rows';

    const scaleRow = document.createElement('div');
    scaleRow.className = 'fabricate-row';
    const scaleLabel = document.createElement('span');
    scaleLabel.className = 'fabricate-label';
    scaleLabel.textContent = 'World scale';
    const scaleWrap = document.createElement('span');
    scaleWrap.className = 'fabricate-scale-controls';
    const unitSelect = document.createElement('select');
    unitSelect.className = 'artboard-input fabricate-world-units';
    for (const system of PHYSICAL_UNIT_SYSTEMS) {
      const option = document.createElement('option');
      option.value = system;
      option.textContent = system === 'unitless' ? 'unitless' : system;
      unitSelect.appendChild(option);
    }
    const scaleInput = document.createElement('input');
    scaleInput.className = 'artboard-input fabricate-world-scale';
    scaleInput.type = 'number';
    scaleInput.min = '0.000001';
    scaleInput.step = '0.01';
    scaleInput.placeholder = 'mm per world unit';
    unitSelect.addEventListener('change', () => {
      const units = controls.app.document.view.units;
      units.world = unitSelect.value;
      if (units.world === 'unitless') units.mmPerWorldUnit = null;
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    scaleInput.addEventListener('change', () => {
      const units = controls.app.document.view.units;
      const factor = Number(scaleInput.value);
      units.mmPerWorldUnit = Number.isFinite(factor) && factor > 0 ? factor : null;
      units.world = units.mmPerWorldUnit === null
        ? 'unitless'
        : (units.world === 'unitless' ? 'mm' : units.world);
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    scaleWrap.append(unitSelect, scaleInput);
    scaleRow.append(scaleLabel, scaleWrap);
    rows.appendChild(scaleRow);

    const fabrication = controls.app.document.view.fabrication;
    const scopeRow = document.createElement('div');
    scopeRow.className = 'fabricate-row';
    const scopeLabel = document.createElement('span');
    scopeLabel.className = 'fabricate-label';
    scopeLabel.textContent = 'Bodies';
    const scopeSelect = document.createElement('select');
    scopeSelect.className = 'artboard-input fabricate-scope';
    for (const [value, label] of [
      ['single', 'Single body'],
      ['active-layer', 'Active layer'],
      ['composition', 'Composition'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      scopeSelect.appendChild(option);
    }
    scopeSelect.value = fabrication.scope ?? 'single';
    scopeSelect.title = 'Single exports the first valid body; multi-body scopes merge separate closed shells.';
    scopeRow.append(scopeLabel, scopeSelect);
    rows.appendChild(scopeRow);

    const booleanRow = document.createElement('div');
    booleanRow.className = 'fabricate-row';
    const booleanLabel = document.createElement('span');
    booleanLabel.className = 'fabricate-label';
    booleanLabel.textContent = 'Boolean';
    const booleanSelect = document.createElement('select');
    booleanSelect.className = 'artboard-input fabricate-boolean';
    for (const [value, label] of [
      ['none', 'None'],
      ['union', 'Union'],
      ['difference', 'Difference'],
      ['intersection', 'Intersection'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      booleanSelect.appendChild(option);
    }
    booleanSelect.value = fabrication.boolean ?? 'none';
    booleanSelect.title = 'Combine selected bodies; difference subtracts later bodies from the first.';
    booleanSelect.addEventListener('change', () => {
      fabrication.boolean = booleanSelect.value;
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    scopeSelect.addEventListener('change', () => {
      fabrication.scope = scopeSelect.value;
      if (fabrication.scope === 'single') fabrication.boolean = 'none';
      booleanSelect.value = fabrication.boolean ?? 'none';
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    booleanRow.append(booleanLabel, booleanSelect);
    rows.appendChild(booleanRow);
    const prepRow = document.createElement('div');
    prepRow.className = 'fabricate-row fabricate-prepare-row';
    const prepLabel = document.createElement('span');
    prepLabel.className = 'fabricate-label';
    prepLabel.textContent = 'Prepare';
    const prepWrap = document.createElement('span');
    prepWrap.className = 'fabricate-prep-controls';
    const makePrepToggle = (className, label, checked) => {
      const wrap = document.createElement('label');
      wrap.className = 'fabricate-prep-toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = `artboard-check ${className}`;
      input.checked = checked;
      const text = document.createElement('span');
      text.textContent = label;
      wrap.append(input, text);
      return { wrap, input };
    };
    const weld = makePrepToggle('fabricate-weld', 'Weld', Boolean(fabrication.weld));
    const cap = makePrepToggle('fabricate-cap', 'Cap', Boolean(fabrication.cap));
    const syncPreparation = () => {
      controls.app.rebuild();
      controls.refreshFabricate();
    };
    weld.input.addEventListener('change', () => {
      fabrication.weld = weld.input.checked;
      syncPreparation();
    });
    cap.input.addEventListener('change', () => {
      fabrication.cap = cap.input.checked;
      syncPreparation();
    });
    prepWrap.append(weld.wrap, cap.wrap);
    prepRow.append(prepLabel, prepWrap);
    rows.appendChild(prepRow);

    const prepHint = controls.panelHint(
      'Derived for fabrication only. Render geometry and SurfaceMapping are unchanged.',
    );
    prepHint.classList.add('fabricate-prep-hint');

    const repairRow = document.createElement('div');
    repairRow.className = 'fabricate-row fabricate-repair-row';
    const repairLabel = document.createElement('span');
    repairLabel.className = 'fabricate-label';
    repairLabel.textContent = 'Repair';
    const repairWrap = document.createElement('span');
    repairWrap.className = 'fabricate-repair-controls';
    const repairToggle = document.createElement('label');
    repairToggle.className = 'fabricate-prep-toggle';
    const repairInput = document.createElement('input');
    repairInput.type = 'checkbox';
    repairInput.className = 'artboard-check fabricate-repair';
    repairInput.checked = fabrication.repair === true;
    const repairText = document.createElement('span');
    repairText.textContent = 'Orient + clean';
    repairToggle.append(repairInput, repairText);
    const strategySelect = document.createElement('select');
    strategySelect.className = 'artboard-input fabricate-cap-strategy';
    for (const [value, label] of [
      ['auto', 'Auto caps'],
      ['fan', 'Fan caps'],
      ['planar', 'Planar caps'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      strategySelect.appendChild(option);
    }
    strategySelect.value = fabrication.capStrategy ?? 'auto';
    strategySelect.title = 'Cap strategy used when repair is enabled.';
    repairInput.addEventListener('change', () => {
      fabrication.repair = repairInput.checked;
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    strategySelect.addEventListener('change', () => {
      fabrication.capStrategy = strategySelect.value;
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    repairWrap.append(repairToggle, strategySelect);
    repairRow.append(repairLabel, repairWrap);
    rows.appendChild(repairRow);

    const makeRow = (label, className) => {
      const row = document.createElement('div');
      row.className = 'fabricate-row';
      const name = document.createElement('span');
      name.className = 'fabricate-label';
      name.textContent = label;
      const value = document.createElement('span');
      value.className = `fabricate-value ${className}`;
      value.textContent = '—';
      row.append(name, value);
      rows.appendChild(row);
      return value;
    };
    const triangles = makeRow('Triangles', 'fabricate-triangles');
    const vertices = makeRow('Vertices', 'fabricate-vertices');
    const bodies = makeRow('Body count', 'fabricate-bodies');
    const boolean = makeRow('Boolean result', 'fabricate-boolean-status');
    const volume = makeRow('Volume', 'fabricate-volume');
    const worldSize = makeRow('World bbox', 'fabricate-world-size');
    const physical = makeRow('Physical', 'fabricate-physical-size');
    const warnings = makeRow('Checks', 'fabricate-warnings');
    const preparation = makeRow('Preparation', 'fabricate-preparation');
    const repairStatus = makeRow('Repair report', 'fabricate-repair-status');

    const compositionNote = document.createElement('div');
    compositionNote.className = 'fabricate-composition-note';
    compositionNote.hidden = true;

    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'lab-button fabricate-export';
    exportButton.textContent = 'EXPORT STL';
    exportButton.addEventListener('click', () => {
      controls.app.exporter.exportSTL();
      controls.refreshFabricate();
    });

    panel.append(status, source, reason, rows, prepHint, compositionNote, exportButton);
    body.appendChild(panel);

    controls.fabricateEls = {
      panel, status, source, reason, triangles, vertices, bodies, boolean, volume,
      worldSize, physical, warnings, preparation, repairStatus, exportButton,
      unitSelect, scaleInput, scopeSelect, booleanSelect, compositionNote,
      weld: weld.input, cap: cap.input, repair: repairInput, capStrategy: strategySelect,
      prepHint,
    };
    controls.refreshFabricate();
}
