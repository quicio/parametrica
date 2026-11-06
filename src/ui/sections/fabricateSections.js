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

    const plan = document.createElement('div');
    plan.className = 'fabricate-plan';
    const suggestion = document.createElement('div');
    suggestion.className = 'fabricate-suggestion';
    const nextAction = document.createElement('div');
    nextAction.className = 'fabricate-next-action';

    const rows = document.createElement('div');
    rows.className = 'fabricate-rows';

    const makeGroup = (title, className) => {
      const wrap = document.createElement('div');
      wrap.className = `fabricate-group ${className}`;
      const head = document.createElement('div');
      head.className = 'fabricate-group-title';
      head.textContent = title;
      const groupBody = document.createElement('div');
      groupBody.className = 'fabricate-group-body';
      wrap.append(head, groupBody);
      rows.appendChild(wrap);
      return groupBody;
    };
    const sourceGroup = makeGroup('Source', 'fabricate-group-source');
    const repairGroup = makeGroup('Repair', 'fabricate-group-repair');
    const combineGroup = makeGroup('Combine', 'fabricate-group-combine');
    const outputGroup = makeGroup('Output', 'fabricate-group-output');
    const checksGroup = makeGroup('Checks', 'fabricate-group-checks');

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
    outputGroup.appendChild(scaleRow);

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
    sourceGroup.appendChild(scopeRow);

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
    const csgSelect = document.createElement('select');
    csgSelect.className = 'artboard-input fabricate-csg-strategy';
    for (const [value, label] of [
      ['auto', 'Auto CSG'],
      ['manifold', 'Manifold CSG'],
      ['bsp', 'BSP CSG'],
      ['remesh', 'Remesh CSG'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      csgSelect.appendChild(option);
    }
    csgSelect.value = fabrication.csgStrategy ?? 'auto';
    csgSelect.title = 'Auto uses BSP for well-conditioned solids and remesh when BSP fails.';
    csgSelect.addEventListener('change', () => {
      fabrication.csgStrategy = csgSelect.value;
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    booleanRow.append(booleanLabel, booleanSelect, csgSelect);
    combineGroup.appendChild(booleanRow);

    const formatRow = document.createElement('div');
    formatRow.className = 'fabricate-row';
    const formatLabel = document.createElement('span');
    formatLabel.className = 'fabricate-label';
    formatLabel.textContent = 'Format';
    const formatSelect = document.createElement('select');
    formatSelect.className = 'artboard-input fabricate-format';
    for (const [value, label] of [['stl', 'STL'], ['3mf', '3MF']]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      formatSelect.appendChild(option);
    }
    formatSelect.value = fabrication.format ?? 'stl';
    formatSelect.title = 'STL writes one anonymous mesh; 3MF preserves one object per validated body.';
    formatSelect.addEventListener('change', () => {
      fabrication.format = formatSelect.value;
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    formatRow.append(formatLabel, formatSelect);
    outputGroup.appendChild(formatRow);
    const qualityRow = document.createElement('div');
    qualityRow.className = 'fabricate-row fabricate-quality-row';
    const qualityLabel = document.createElement('span');
    qualityLabel.className = 'fabricate-label';
    qualityLabel.textContent = 'Quality';
    const qualitySelect = document.createElement('select');
    qualitySelect.className = 'artboard-input fabricate-quality';
    for (const [value, label] of [
      ['custom', 'Custom'],
      ['draft', 'Draft · 32'],
      ['standard', 'Standard · 64'],
      ['high', 'High · 128'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      qualitySelect.appendChild(option);
    }
    qualitySelect.value = fabrication.quality ?? 'custom';
    qualitySelect.title = 'Draft/Standard/High set the repair resolution. Manual edits mark Custom.';
    qualitySelect.addEventListener('change', () => {
      fabrication.quality = qualitySelect.value;
      if (qualitySelect.value !== 'custom') {
        fabrication.remeshResolution = { draft: 32, standard: 64, high: 128 }[qualitySelect.value];
      }
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    qualityRow.append(qualityLabel, qualitySelect);
    repairGroup.appendChild(qualityRow);

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
    repairGroup.appendChild(prepRow);

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
    const topologySelect = document.createElement('select');
    topologySelect.className = 'artboard-input fabricate-topology';
    for (const [value, label] of [
      ['none', 'No topology'],
      ['split', 'Split topology'],
      ['remove', 'Remove topology'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      topologySelect.appendChild(option);
    }
    topologySelect.value = fabrication.topology ?? 'none';
    topologySelect.title = 'Split non-manifold edge fans into separate manifold edges.';
    const nonOrientableSelect = document.createElement('select');
    nonOrientableSelect.className = 'artboard-input fabricate-nonorientable';
    for (const [value, label] of [
      ['cut', 'Cut seams'],
      ['reject', 'Reject non-orientable'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      nonOrientableSelect.appendChild(option);
    }
    nonOrientableSelect.value = fabrication.nonOrientable ?? 'cut';
    nonOrientableSelect.title = 'How to handle non-orientable orientation conflicts.';
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
    topologySelect.addEventListener('change', () => {
      fabrication.topology = topologySelect.value;
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    nonOrientableSelect.addEventListener('change', () => {
      fabrication.nonOrientable = nonOrientableSelect.value;
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    const selfSelect = document.createElement('select');
    selfSelect.className = 'artboard-input fabricate-self-intersections';
    for (const [value, label] of [
      ['none', 'No self-intersection repair'],
      ['auto', 'Auto self-intersections'],
      ['sdf', 'Manifold SDF'],
      ['remesh', 'Fast remesh'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      selfSelect.appendChild(option);
    }
    selfSelect.value = fabrication.selfIntersections ?? 'none';
    selfSelect.title = 'Auto prefers Manifold SDF; Fast remesh is the approximate fallback.';
    const remeshInput = document.createElement('input');
    remeshInput.type = 'number';
    remeshInput.className = 'artboard-input fabricate-remesh-resolution';
    remeshInput.min = '16';
    remeshInput.max = '192';
    remeshInput.step = '16';
    remeshInput.value = String(fabrication.remeshResolution ?? 64);
    remeshInput.title = 'SDF grid / remesh resolution.';
    selfSelect.addEventListener('change', () => {
      fabrication.selfIntersections = selfSelect.value;
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    remeshInput.addEventListener('change', () => {
      const value = Number(remeshInput.value);
      if (!Number.isFinite(value)) return;
      fabrication.remeshResolution = Math.max(16, Math.min(192, Math.floor(value)));
      fabrication.quality = 'custom';
      remeshInput.value = String(fabrication.remeshResolution);
      controls.app.rebuild();
      controls.refreshFabricate();
    });
    repairWrap.append(repairToggle, strategySelect, topologySelect, nonOrientableSelect, selfSelect, remeshInput);
    repairRow.append(repairLabel, repairWrap);
    repairGroup.appendChild(repairRow);

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
      checksGroup.appendChild(row);
      return value;
    };
    const triangles = makeRow('Triangles', 'fabricate-triangles');
    const vertices = makeRow('Vertices', 'fabricate-vertices');
    const bodies = makeRow('Body count', 'fabricate-bodies');
    const boolean = makeRow('Boolean result', 'fabricate-boolean-status');
    const objects = makeRow('Objects', 'fabricate-objects');
    const volume = makeRow('Volume', 'fabricate-volume');
    const worldSize = makeRow('World bbox', 'fabricate-world-size');
    const physical = makeRow('Physical', 'fabricate-physical-size');
    const warnings = makeRow('Checks', 'fabricate-warnings');
    const preparation = makeRow('Preparation', 'fabricate-preparation');
    const repairStatus = makeRow('Repair report', 'fabricate-repair-status');

    const compositionNote = document.createElement('div');
    compositionNote.className = 'fabricate-composition-note';
    compositionNote.hidden = true;

    const progress = document.createElement('div');
    progress.className = 'fabricate-progress';
    progress.hidden = true;
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'lab-button fabricate-cancel';
    cancelButton.textContent = 'CANCEL';
    cancelButton.hidden = true;
    cancelButton.addEventListener('click', () => controls.cancelFabrication?.());

    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'lab-button fabricate-export';
    exportButton.textContent = 'EXPORT STL';
    exportButton.addEventListener('click', () => {
      if (fabrication.format === '3mf') controls.app.exporter.export3MF();
      else controls.app.exporter.exportSTL();
      controls.refreshFabricate();
    });

    panel.append(status, source, reason, plan, suggestion, nextAction, rows, prepHint, progress, compositionNote, cancelButton, exportButton);
    body.appendChild(panel);

    controls.fabricateEls = {
      panel, status, source, reason, plan, suggestion, nextAction,
      triangles, vertices, bodies, boolean, objects, volume,
      worldSize, physical, warnings, preparation, repairStatus, progress, cancelButton, exportButton,
      unitSelect, scaleInput, scopeSelect, booleanSelect, formatSelect, compositionNote,
      weld: weld.input, cap: cap.input, repair: repairInput, capStrategy: strategySelect,
      topology: topologySelect, nonOrientable: nonOrientableSelect,
      selfIntersections: selfSelect, remeshResolution: remeshInput,
      quality: qualitySelect,
      prepHint,
    };
    controls.refreshFabricate();
}
