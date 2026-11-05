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
    const volume = makeRow('Volume', 'fabricate-volume');
    const worldSize = makeRow('World bbox', 'fabricate-world-size');
    const physical = makeRow('Physical', 'fabricate-physical-size');
    const warnings = makeRow('Checks', 'fabricate-warnings');

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

    panel.append(status, source, reason, rows, compositionNote, exportButton);
    body.appendChild(panel);

    controls.fabricateEls = {
      panel, status, source, reason, triangles, vertices, volume,
      worldSize, physical, warnings, exportButton, unitSelect, scaleInput, compositionNote,
    };
    controls.refreshFabricate();
}
