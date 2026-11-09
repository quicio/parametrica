/**
 * fabricateSections.js — inspector section builders.
 *
 * Each export receives the Controls coordinator and only talks to shared
 * helpers, registries and App APIs. Sections never import each other.
 */

import { PHYSICAL_UNIT_SYSTEMS } from '../../domain/units.ts';
import { manufacturingPreset, sanitizeManufacturingProfile } from '../../domain/manufacturingProfile.js';
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
    const finishGroup = makeGroup('Finish', 'fabricate-group-finish');
    const repairGroup = makeGroup('Repair', 'fabricate-group-repair');
    const combineGroup = makeGroup('Combine', 'fabricate-group-combine');
    const outputGroup = makeGroup('Output', 'fabricate-group-output');
    const checksGroup = makeGroup('Checks', 'fabricate-group-checks');
    const manufacturingGroup = makeGroup('Manufacturing', 'fabricate-group-manufacturing');

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
      const units = controls.fabrication.document.view.units;
      units.world = unitSelect.value;
      if (units.world === 'unitless') units.mmPerWorldUnit = null;
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    scaleInput.addEventListener('change', () => {
      const units = controls.fabrication.document.view.units;
      const factor = Number(scaleInput.value);
      units.mmPerWorldUnit = Number.isFinite(factor) && factor > 0 ? factor : null;
      units.world = units.mmPerWorldUnit === null
        ? 'unitless'
        : (units.world === 'unitless' ? 'mm' : units.world);
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    scaleWrap.append(unitSelect, scaleInput);
    scaleRow.append(scaleLabel, scaleWrap);
    outputGroup.appendChild(scaleRow);

    const fabrication = controls.fabrication.document.view.fabrication;
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

    const previewRow = document.createElement('div');
    previewRow.className = 'fabricate-row fabricate-preview-row';
    const previewLabel = document.createElement('span');
    previewLabel.className = 'fabricate-label';
    previewLabel.textContent = 'Body';
    const previewSelect = document.createElement('select');
    previewSelect.className = 'artboard-input fabricate-lattice-preview';
    for (const [value, label] of [['network', 'Network'], ['solid', 'Solid']]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      previewSelect.appendChild(option);
    }
    previewSelect.value = fabrication.latticePreview === 'network' ? 'network' : 'solid';
    previewSelect.title = 'Show the authored strut network or the prepared solid in the canvas.';
    previewSelect.addEventListener('change', () => {
      // Preview is display-only: changing it must not re-evaluate geometry or
      // reschedule the heavy fabrication worker.
      fabrication.latticePreview = previewSelect.value === 'network' ? 'network' : 'solid';
      controls.syncLatticePreview?.();
      controls.refreshFabricate();
    });
    previewRow.append(previewLabel, previewSelect);
    sourceGroup.appendChild(previewRow);

    const previewSettings = controls.fabrication.document.view.preview;
    const rendererRow = document.createElement('div');
    rendererRow.className = 'fabricate-row';
    const rendererLabel = document.createElement('span');
    rendererLabel.className = 'fabricate-label';
    rendererLabel.textContent = 'Renderer';
    const rendererSelect = document.createElement('select');
    rendererSelect.className = 'artboard-input fabricate-product-renderer';
    for (const [value, text] of [['p5', 'Technical'], ['webgl', 'Product']]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      rendererSelect.appendChild(option);
    }
    rendererSelect.value = previewSettings.backend === 'webgl' ? 'webgl' : 'p5';
    rendererSelect.title = 'Technical uses p5; Product uses the optional WebGL/PBR preview of the prepared body.';
    rendererSelect.addEventListener('change', () => {
      void controls.fabrication.setProductPreviewEnabled?.(rendererSelect.value === 'webgl');
      controls.refreshFabricate();
    });
    rendererRow.append(rendererLabel, rendererSelect);
    sourceGroup.appendChild(rendererRow);

    const materialRow = document.createElement('div');
    materialRow.className = 'fabricate-row';
    const materialLabel = document.createElement('span');
    materialLabel.className = 'fabricate-label';
    materialLabel.textContent = 'Material';
    const materialSelect = document.createElement('select');
    materialSelect.className = 'artboard-input fabricate-product-material';
    for (const [value, text] of [['clay', 'Clay'], ['ceramic', 'Ceramic'], ['matte', 'Matte']]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      materialSelect.appendChild(option);
    }
    materialSelect.value = previewSettings.material ?? 'ceramic';
    materialSelect.title = 'Presentation material. It does not affect geometry or export.';
    materialSelect.addEventListener('change', () => {
      controls.fabrication.document.view.preview.material = materialSelect.value;
      controls.fabrication.syncProductPreview?.();
      controls.fabrication.scheduleSessionSave?.();
      controls.refreshFabricate();
    });
    materialRow.append(materialLabel, materialSelect);
    sourceGroup.appendChild(materialRow);

    const previewQualityRow = document.createElement('div');
    previewQualityRow.className = 'fabricate-row';
    const previewQualityLabel = document.createElement('span');
    previewQualityLabel.className = 'fabricate-label';
    previewQualityLabel.textContent = 'Detail';
    const previewQualitySelect = document.createElement('select');
    previewQualitySelect.className = 'artboard-input fabricate-product-quality';
    for (const [value, text] of [['draft', 'Draft'], ['standard', 'Standard'], ['high', 'High']]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      previewQualitySelect.appendChild(option);
    }
    previewQualitySelect.value = previewSettings.quality ?? 'standard';
    previewQualitySelect.title = 'Shadow map, pixel ratio and preview cost. This is separate from geometric finish quality.';
    previewQualitySelect.addEventListener('change', () => {
      controls.fabrication.document.view.preview.quality = previewQualitySelect.value;
      controls.fabrication.syncProductPreview?.();
      controls.fabrication.scheduleSessionSave?.();
      controls.refreshFabricate();
    });
    previewQualityRow.append(previewQualityLabel, previewQualitySelect);
    sourceGroup.appendChild(previewQualityRow);

    const shadowRow = document.createElement('div');
    shadowRow.className = 'fabricate-row';
    const shadowLabel = document.createElement('span');
    shadowLabel.className = 'fabricate-label';
    shadowLabel.textContent = 'Shadows';
    const shadowInput = document.createElement('input');
    shadowInput.type = 'checkbox';
    shadowInput.className = 'artboard-check fabricate-product-shadow';
    shadowInput.checked = previewSettings.shadow !== false;
    shadowInput.title = 'Directional shadows and contact shadow in Product preview.';
    shadowInput.addEventListener('change', () => {
      controls.fabrication.document.view.preview.shadow = shadowInput.checked;
      controls.fabrication.document.view.preview.contactShadow = shadowInput.checked;
      controls.fabrication.syncProductPreview?.();
      controls.fabrication.scheduleSessionSave?.();
      controls.refreshFabricate();
    });
    shadowRow.append(shadowLabel, shadowInput);
    sourceGroup.appendChild(shadowRow);

    const lightingRow = document.createElement('div');
    lightingRow.className = 'fabricate-row';
    const lightingLabel = document.createElement('span');
    lightingLabel.className = 'fabricate-label';
    lightingLabel.textContent = 'Lighting';
    const lightingSelect = document.createElement('select');
    lightingSelect.className = 'artboard-input fabricate-product-lighting';
    for (const [value, text] of [['studio', 'Studio'], ['soft', 'Soft'], ['directional', 'Directional']]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      lightingSelect.appendChild(option);
    }
    lightingSelect.value = previewSettings.lighting ?? 'studio';
    lightingSelect.title = 'Presentation light rig. It does not affect geometry or export.';
    lightingSelect.addEventListener('change', () => {
      controls.fabrication.document.view.preview.lighting = lightingSelect.value;
      controls.fabrication.syncProductPreview?.();
      controls.fabrication.scheduleSessionSave?.();
      controls.refreshFabricate();
    });
    lightingRow.append(lightingLabel, lightingSelect);
    sourceGroup.appendChild(lightingRow);

    const aoRow = document.createElement('div');
    aoRow.className = 'fabricate-row';
    const aoLabel = document.createElement('span');
    aoLabel.className = 'fabricate-label';
    aoLabel.textContent = 'AO';
    const aoInput = document.createElement('input');
    aoInput.type = 'checkbox';
    aoInput.className = 'artboard-check fabricate-product-ao';
    aoInput.checked = previewSettings.ao === true;
    aoInput.title = 'Screen-space ambient occlusion. Expensive on dense lattices.';
    aoInput.addEventListener('change', () => {
      controls.fabrication.document.view.preview.ao = aoInput.checked;
      controls.fabrication.syncProductPreview?.();
      controls.fabrication.scheduleSessionSave?.();
      controls.refreshFabricate();
    });
    aoRow.append(aoLabel, aoInput);
    sourceGroup.appendChild(aoRow);

    const resetRow = document.createElement('div');
    resetRow.className = 'fabricate-row';
    const resetLabel = document.createElement('span');
    resetLabel.className = 'fabricate-label';
    resetLabel.textContent = 'Preview';
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'lab-button fabricate-product-reset';
    resetButton.textContent = 'RESET';
    resetButton.title = 'Reset material, lighting, shadows, AO and preview detail.';
    resetButton.addEventListener('click', () => {
      Object.assign(controls.fabrication.document.view.preview, {
        backend: 'webgl',
        material: 'ceramic',
        quality: 'standard',
        exposure: 1,
        background: '#070809',
        shadow: true,
        contactShadow: true,
        ao: false,
        lighting: 'studio',
      });
      controls.fabrication.syncProductPreview?.();
      controls.fabrication.scheduleSessionSave?.();
      controls.refreshFabricate();
    });
    resetRow.append(resetLabel, resetButton);
    sourceGroup.appendChild(resetRow);

    const makeFinishSelect = (label, className, options, key, title) => {
      const row = document.createElement('div');
      row.className = 'fabricate-row';
      const name = document.createElement('span');
      name.className = 'fabricate-label';
      name.textContent = label;
      const select = document.createElement('select');
      select.className = `artboard-input ${className}`;
      for (const [value, text] of options) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
      }
      select.value = fabrication[key] ?? options[0][0];
      select.title = title;
      select.addEventListener('change', () => {
        fabrication[key] = select.value;
        controls.fabrication.rebuild();
        controls.refreshFabricate();
      });
      row.append(name, select);
      finishGroup.appendChild(row);
      return select;
    };
    const finishQualitySelect = makeFinishSelect('Finish', 'fabricate-finish-quality', [
      ['draft', 'Draft'],
      ['standard', 'Standard'],
      ['high', 'High · export'],
    ], 'finishQuality', 'Lattice finish profile; separate from repair resolution.');
    const curveStyleSelect = makeFinishSelect('Curves', 'fabricate-curve-style', [
      ['polyline', 'Polyline'],
      ['organic', 'Organic'],
    ], 'curveStyle', 'Organic resamples struts in surface coordinates.');
    const jointStyleSelect = makeFinishSelect('Joints', 'fabricate-joint-style', [
      ['technical', 'Technical'],
      ['rounded', 'Rounded'],
      ['blend', 'Blend (SDF)'],
      ['auto', 'Auto'],
    ], 'jointStyle', 'Budgeted local SDF blend; remaining nodes use rounded fallback.');
    const envelopeSelect = makeFinishSelect('Envelope', 'fabricate-envelope', [
      ['centerline', 'Centerline'],
      ['outer', 'Outer'],
    ], 'envelope', 'Outer offsets the centerline inward by half the strut diameter.');
    const radiusProfileSelect = makeFinishSelect('Radius', 'fabricate-radius-profile', [
      ['constant', 'Constant'],
      ['taper', 'Taper'],
    ], 'radiusProfile', 'Variable strut radius profile.');
    const taperRow = document.createElement('div');
    taperRow.className = 'fabricate-row';
    const taperLabel = document.createElement('span');
    taperLabel.className = 'fabricate-label';
    taperLabel.textContent = 'Taper end';
    const taperInput = document.createElement('input');
    taperInput.className = 'artboard-input fabricate-taper';
    taperInput.type = 'number';
    taperInput.min = '0.25';
    taperInput.max = '1';
    taperInput.step = '0.01';
    taperInput.value = String(fabrication.taper ?? 0.85);
    taperInput.title = 'Radius at the mouth relative to the base for taper profile.';
    taperInput.addEventListener('change', () => {
      const value = Number(taperInput.value);
      if (!Number.isFinite(value)) return;
      fabrication.taper = Math.max(0.25, Math.min(1, value));
      taperInput.value = String(fabrication.taper);
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    taperRow.append(taperLabel, taperInput);
    finishGroup.appendChild(taperRow);

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
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    scopeSelect.addEventListener('change', () => {
      fabrication.scope = scopeSelect.value;
      if (fabrication.scope === 'single') fabrication.boolean = 'none';
      booleanSelect.value = fabrication.boolean ?? 'none';
      controls.fabrication.rebuild();
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
      controls.fabrication.rebuild();
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
      controls.fabrication.rebuild();
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
      controls.fabrication.rebuild();
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
      controls.fabrication.rebuild();
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
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    strategySelect.addEventListener('change', () => {
      fabrication.capStrategy = strategySelect.value;
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    topologySelect.addEventListener('change', () => {
      fabrication.topology = topologySelect.value;
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    nonOrientableSelect.addEventListener('change', () => {
      fabrication.nonOrientable = nonOrientableSelect.value;
      controls.fabrication.rebuild();
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
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    remeshInput.addEventListener('change', () => {
      const value = Number(remeshInput.value);
      if (!Number.isFinite(value)) return;
      fabrication.remeshResolution = Math.max(16, Math.min(192, Math.floor(value)));
      fabrication.quality = 'custom';
      remeshInput.value = String(fabrication.remeshResolution);
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    repairWrap.append(repairToggle, strategySelect, topologySelect, nonOrientableSelect, selfSelect, remeshInput);
    repairRow.append(repairLabel, repairWrap);
    repairGroup.appendChild(repairRow);

    const makeRow = (label, className, group = checksGroup) => {
      const row = document.createElement('div');
      row.className = 'fabricate-row';
      const name = document.createElement('span');
      name.className = 'fabricate-label';
      name.textContent = label;
      const value = document.createElement('span');
      value.className = `fabricate-value ${className}`;
      value.textContent = '—';
      row.append(name, value);
      group.appendChild(row);
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
    const lattice = makeRow('Lattice', 'fabricate-lattice');
    const printability = makeRow('Printability', 'fabricate-printability');
    const printChecks = makeRow('Print checks', 'fabricate-print-checks');

    const manufacturingProfile = fabrication.manufacturing;
    const manufacturingRow = document.createElement('div');
    manufacturingRow.className = 'fabricate-row';
    const manufacturingLabel = document.createElement('span');
    manufacturingLabel.className = 'fabricate-label';
    manufacturingLabel.textContent = 'Profile';
    const manufacturingSelect = document.createElement('select');
    manufacturingSelect.className = 'artboard-input fabricate-manufacturing-process';
    for (const [value, text] of [['fdm', 'FDM 0.4'], ['resin', 'Resin'], ['custom', 'Custom']]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      manufacturingSelect.appendChild(option);
    }
    manufacturingSelect.value = manufacturingProfile.process ?? 'fdm';
    manufacturingSelect.title = 'Provisional process minima. They are not calibrated print guarantees.';
    manufacturingSelect.addEventListener('change', () => {
      fabrication.manufacturing = manufacturingPreset(manufacturingSelect.value);
      syncManufacturingInputs();
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    manufacturingRow.append(manufacturingLabel, manufacturingSelect);
    manufacturingGroup.appendChild(manufacturingRow);

    const gatingRow = document.createElement('div');
    gatingRow.className = 'fabricate-row';
    const gatingLabel = document.createElement('span');
    gatingLabel.className = 'fabricate-label';
    gatingLabel.textContent = 'Gate';
    const gatingSelect = document.createElement('select');
    gatingSelect.className = 'artboard-input fabricate-manufacturing-gating';
    for (const [value, text] of [['warn', 'Warn only'], ['block', 'Block failures']]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      gatingSelect.appendChild(option);
    }
    gatingSelect.value = manufacturingProfile.gating ?? 'warn';
    gatingSelect.title = 'Warnings do not block by default. Block mode stops failing manufacturing checks.';
    gatingSelect.addEventListener('change', () => {
      fabrication.manufacturing.gating = gatingSelect.value;
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    gatingRow.append(gatingLabel, gatingSelect);
    manufacturingGroup.appendChild(gatingRow);

    const numberRow = (label, key, min, max, step, className) => {
      const row = document.createElement('div');
      row.className = 'fabricate-row';
      const name = document.createElement('span');
      name.className = 'fabricate-label';
      name.textContent = label;
      const input = document.createElement('input');
      input.className = `artboard-input ${className}`;
      input.type = 'number';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(fabrication.manufacturing[key] ?? '');
      input.addEventListener('change', () => {
        fabrication.manufacturing = sanitizeManufacturingProfile({
          ...fabrication.manufacturing,
          [key]: Number(input.value),
        });
        input.value = String(fabrication.manufacturing[key] ?? '');
        controls.fabrication.rebuild();
        controls.refreshFabricate();
      });
      row.append(name, input);
      manufacturingGroup.appendChild(row);
      return input;
    };
    const minWallInput = numberRow('Min wall (mm)', 'minWall', 0.2, 20, 0.1, 'fabricate-manufacturing-wall');
    const minStrutInput = numberRow('Min strut (mm)', 'minStrut', 0.2, 20, 0.1, 'fabricate-manufacturing-strut');
    const minOpeningInput = numberRow('Min opening (mm)', 'minOpeningWidth', 0, 50, 0.5, 'fabricate-manufacturing-opening');
    const overhangInput = numberRow('Overhang (°)', 'overhangAngle', 0, 89, 1, 'fabricate-manufacturing-overhang');

    const slicerRow = document.createElement('div');
    slicerRow.className = 'fabricate-row';
    const slicerLabel = document.createElement('span');
    slicerLabel.className = 'fabricate-label';
    slicerLabel.textContent = 'Slicer';
    const slicerInput = document.createElement('input');
    slicerInput.className = 'artboard-input fabricate-manufacturing-slicer';
    slicerInput.type = 'text';
    slicerInput.placeholder = 'e.g. Orca 2.2';
    slicerInput.maxLength = 80;
    slicerInput.value = manufacturingProfile.verification?.slicer ?? '';
    slicerInput.addEventListener('change', () => {
      fabrication.manufacturing = sanitizeManufacturingProfile({
        ...fabrication.manufacturing,
        verification: {
          ...(fabrication.manufacturing.verification ?? {}),
          slicer: slicerInput.value,
        },
      });
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    slicerRow.append(slicerLabel, slicerInput);
    manufacturingGroup.appendChild(slicerRow);

    const verificationRow = document.createElement('div');
    verificationRow.className = 'fabricate-row';
    const verificationLabel = document.createElement('span');
    verificationLabel.className = 'fabricate-label';
    verificationLabel.textContent = 'Slicer result';
    const verificationSelect = document.createElement('select');
    verificationSelect.className = 'artboard-input fabricate-manufacturing-verification';
    for (const [value, text] of [
      ['unverified', 'Not verified'],
      ['pass', 'Pass'],
      ['fail', 'Fail'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      verificationSelect.appendChild(option);
    }
    verificationSelect.value = manufacturingProfile.verification?.result ?? 'unverified';
    verificationSelect.addEventListener('change', () => {
      fabrication.manufacturing = sanitizeManufacturingProfile({
        ...fabrication.manufacturing,
        verification: {
          ...(fabrication.manufacturing.verification ?? {}),
          result: verificationSelect.value,
        },
      });
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    verificationRow.append(verificationLabel, verificationSelect);
    manufacturingGroup.appendChild(verificationRow);

    const notesRow = document.createElement('div');
    notesRow.className = 'fabricate-row';
    const notesLabel = document.createElement('span');
    notesLabel.className = 'fabricate-label';
    notesLabel.textContent = 'Slicer notes';
    const notesInput = document.createElement('input');
    notesInput.className = 'artboard-input fabricate-manufacturing-notes';
    notesInput.type = 'text';
    notesInput.placeholder = 'Material / layer height / notes';
    notesInput.maxLength = 240;
    notesInput.value = manufacturingProfile.verification?.notes ?? '';
    notesInput.addEventListener('change', () => {
      fabrication.manufacturing = sanitizeManufacturingProfile({
        ...fabrication.manufacturing,
        verification: {
          ...(fabrication.manufacturing.verification ?? {}),
          notes: notesInput.value,
        },
      });
      controls.fabrication.rebuild();
      controls.refreshFabricate();
    });
    notesRow.append(notesLabel, notesInput);
    manufacturingGroup.appendChild(notesRow);

    const syncManufacturingInputs = () => {
      const profile = fabrication.manufacturing ?? manufacturingProfile;
      manufacturingSelect.value = profile.process ?? 'fdm';
      gatingSelect.value = profile.gating ?? 'warn';
      minWallInput.value = String(profile.minWall ?? '');
      minStrutInput.value = String(profile.minStrut ?? '');
      minOpeningInput.value = String(profile.minOpeningWidth ?? '');
      overhangInput.value = String(profile.overhangAngle ?? '');
      slicerInput.value = profile.verification?.slicer ?? '';
      verificationSelect.value = profile.verification?.result ?? 'unverified';
      notesInput.value = profile.verification?.notes ?? '';
    };
    syncManufacturingInputs();

    const manufacturingStatus = makeRow('Manufacturing', 'fabricate-manufacturing-status', manufacturingGroup);
    const manufacturingChecks = makeRow('Manufacturing checks', 'fabricate-manufacturing-checks', manufacturingGroup);

    const compositionNote = document.createElement('div');
    compositionNote.className = 'fabricate-composition-note';
    compositionNote.hidden = true;

    const progress = document.createElement('div');
    progress.className = 'fabricate-progress';
    progress.hidden = true;
    const progressLabel = document.createElement('div');
    progressLabel.className = 'fabricate-progress-label';
    progressLabel.textContent = 'Preparing solid…';
    const progressBar = document.createElement('div');
    progressBar.className = 'fabricate-progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'fabricate-progress-fill indeterminate';
    progressBar.appendChild(progressFill);
    progress.append(progressLabel, progressBar);
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'lab-button fabricate-cancel';
    cancelButton.textContent = 'CANCEL';
    cancelButton.hidden = true;
    cancelButton.addEventListener('click', () => controls.cancelFabrication?.());

    const productExportButton = document.createElement('button');
    productExportButton.type = 'button';
    productExportButton.className = 'lab-button fabricate-product-export';
    productExportButton.textContent = 'EXPORT PRODUCT PNG';
    productExportButton.hidden = true;
    productExportButton.addEventListener('click', () => {
      controls.fabrication.exporter.exportProductPreviewPNG?.();
      controls.refreshFabricate();
    });

    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'lab-button fabricate-export';
    exportButton.textContent = 'EXPORT STL';
    exportButton.addEventListener('click', () => {
      if (fabrication.format === '3mf') controls.fabrication.exporter.export3MF();
      else controls.fabrication.exporter.exportSTL();
      controls.refreshFabricate();
    });

    panel.append(status, source, reason, progress, cancelButton, exportButton, productExportButton, plan, suggestion, nextAction, rows, prepHint, compositionNote);
    body.appendChild(panel);

    controls.fabricateEls = {
      panel, status, source, reason, plan, suggestion, nextAction,
      triangles, vertices, bodies, boolean, objects, volume,
      worldSize, physical, warnings, preparation, repairStatus, lattice, printability, printChecks,
      manufacturing: manufacturingStatus, manufacturingChecks,
      manufacturingProcess: manufacturingSelect, manufacturingGating: gatingSelect,
      manufacturingWall: minWallInput, manufacturingStrut: minStrutInput,
      manufacturingOpening: minOpeningInput, manufacturingOverhang: overhangInput,
      manufacturingSlicer: slicerInput, manufacturingVerification: verificationSelect,
      manufacturingNotes: notesInput,
      progress, progressLabel, progressFill, cancelButton, productExportButton, exportButton,
      unitSelect, scaleInput, scopeSelect, booleanSelect, formatSelect, compositionNote,
      latticePreview: previewSelect,
      finishQuality: finishQualitySelect,
      productRenderer: rendererSelect,
      productMaterial: materialSelect,
      productQuality: previewQualitySelect,
      productShadow: shadowInput,
      productLighting: lightingSelect,
      productAo: aoInput,
      productReset: resetButton,
      curveStyle: curveStyleSelect,
      jointStyle: jointStyleSelect,
      envelope: envelopeSelect,
      radiusProfile: radiusProfileSelect,
      taper: taperInput,
      weld: weld.input, cap: cap.input, repair: repairInput, capStrategy: strategySelect,
      topology: topologySelect, nonOrientable: nonOrientableSelect,
      selfIntersections: selfSelect, remeshResolution: remeshInput,
      quality: qualitySelect,
      prepHint,
    };
    controls.refreshFabricate();
}
