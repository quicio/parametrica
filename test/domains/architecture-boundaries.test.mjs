/**
 * architecture-boundaries.test.mjs — executable Phase A import rules.
 *
 * These checks are intentionally textual: they fail before a bundler or a
 * dependency graph tool is involved, and they document the first boundaries
 * that ADR-0004 makes non-negotiable.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { UI_SURFACE } from '../../src/composition/createUiPort.js';
import { FABRICATION_PORT } from '../../src/composition/createFabricationPort.js';
import { NOTEBOOK_PORT } from '../../src/composition/createNotebookPort.js';
import { LAB_PORT } from '../../src/composition/createLabPort.js';
import { PRESET_PORT } from '../../src/composition/createPresetPort.js';
import { FORM_PORT } from '../../src/composition/createFormPort.js';
import { LOOK_PORT } from '../../src/composition/createLookPort.js';
import { KEEP_PORT } from '../../src/composition/createKeepPort.js';
import { INGEST_PORT } from '../../src/composition/createIngestPort.js';
import { ADVISOR_PORT } from '../../src/composition/createAdvisorPort.js';
import { START_WITH_PORT } from '../../src/composition/createStartWithPort.js';
import { RENDER_PORT } from '../../src/composition/createRenderPort.js';
import { join, relative } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;

function read(path) {
  return readFileSync(new URL(path, `file://${root}`), 'utf8');
}

function importsOf(source) {
  const out = [];
  const re = /(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+[\s\S]*?\s+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(re)) out.push(match[1]);
  return out;
}

function filesUnder(path) {
  const absolute = join(root, path);
  const out = [];
  for (const name of readdirSync(absolute)) {
    const child = join(absolute, name);
    if (statSync(child).isDirectory()) out.push(...filesUnder(relative(root, child)));
    else if (name.endsWith('.js') || name.endsWith('.ts')) out.push(relative(root, child));
  }
  return out;
}

export async function run(assert) {
  const forbiddenDomain = ['render', 'viz', 'ui', 'application', 'workers', 'export', 'geometry'];
  for (const file of filesUnder('src/domain')) {
    const source = read(file);
    for (const spec of importsOf(source)) {
      const forbidden = forbiddenDomain.find((layer) => spec.includes(`/${layer}/`));
      assert(!forbidden, `${file} does not import ${forbidden ?? 'outer layer'}`);
    }
  }

  const documentImports = importsOf(read('src/core/document.ts'));
  for (const spec of documentImports) {
    assert(!spec.includes('/render/'), 'core/document does not import render');
    assert(!spec.includes('/viz/'), 'core/document does not import viz');
    assert(!spec.includes('/geometry/'), 'core/document does not import geometry');
  }

  for (const file of ['src/generators/helpers.ts', 'src/generators/surfaceLattice.ts']) {
    const source = read(file);
    assert(!importsOf(source).some((spec) => spec.includes('/render/')), `${file} does not import render`);
    assert(importsOf(source).some((spec) => spec.includes('/view/camera')), `${file} imports pure view camera`);
  }

  const appImports = importsOf(read('src/application/App.ts'));
  for (const spec of [
    '../render/p5/P5Adapter.js',
    '../ui/Controls.js',
    '../ui/StartWithOverlay.js',
    '../ui/dialogs.js',
    '../ui/ParametricOverlay.js',
    '../ui/UVDomainInset.js',
    '../ui/SurfaceInspector.js',
    '../ui/SeamLegend.js',
    '../export/Exporter.js',
    '../presets/PresetManager.js',
    '../presets/preview.js',
    '../lab/notebook.js',
    '../lab/notebookRepository.js',
    '../lab/workspace.js',
    '../core/session.js',
    '../core/persistence.js',
    '../mutation/MutationEngine.js',
  ]) {
    assert(!appImports.includes(spec), `application/App does not import ${spec}`);
  }
  assert(read('src/composition/createApp.ts').includes('new P5Adapter'), 'composition creates the technical renderer');
  assert(read('src/composition/createApp.ts').includes('new Controls'), 'composition creates the controls');
  assert(read('src/composition/createApp.ts').includes('new Exporter'), 'composition creates the exporter');
  assert(read('src/main.ts').includes("from './composition/createApp.ts'"), 'main boots through the composition root');

  const exporterSource = read('src/export/Exporter.ts');
  assert(!exporterSource.includes('this.app'), 'Exporter never reaches into the App instance');
  assert(!importsOf(exporterSource).some((spec) => spec.includes('application/App')), 'Exporter does not import App');
  assert(exporterSource.includes('this.port'), 'Exporter uses the injected export port');
  assert(read('src/composition/createApp.ts').includes('createExportPort'), 'composition creates the export port');

  const uiSurface = new Set(UI_SURFACE);
  const controlsSource = read('src/ui/Controls.js');
  for (const match of controlsSource.matchAll(/this\.app\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
    assert(uiSurface.has(match[1]), `control port exposes app.${match[1]}`);
  }
  assert(read('src/composition/createApp.ts').includes('createUiPort'), 'composition passes the control port to Controls');

  const fabricationSource = read('src/ui/sections/fabricateSections.js');
  assert(!fabricationSource.includes('controls.app.'), 'Fabricate panel uses the narrow fabrication port');
  for (const name of FABRICATION_PORT) {
    assert(fabricationSource.includes(`controls.fabrication.${name}`) || name === 'document' || name === 'exporter',
      `Fabricate port member ${name} is the documented surface`);
  }
  assert(read('src/composition/createApp.ts').includes('createFabricationPort'), 'composition passes the fabrication port');

  for (const file of ['src/ui/widgets/TimelinePanel.js', 'src/ui/widgets/AdvisorPanel.js', 'src/ui/SurfaceInspector.js', 'src/ui/sections/lookSections.js']) {
    const source = read(file);
    assert(!source.includes('this.app.renderer'), `${file} uses the render port`);
    assert(!source.includes('controls.app.renderer'), `${file} does not use controls.app.renderer`);
  }
  for (const name of RENDER_PORT) {
    assert(read('src/composition/createRenderPort.ts').includes(name), `render port documents ${name}`);
  }

  const notebookPanel = read('src/ui/widgets/NotebookPanel.ts');
  for (const match of notebookPanel.matchAll(/\bapp\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
    assert(NOTEBOOK_PORT.includes(match[1]), `notebook port exposes app.${match[1]}`);
  }
  assert(read('src/composition/createApp.ts').includes('createNotebookPort'), 'composition passes the notebook port');
  assert(read('src/composition/createApp.ts').includes('createRenderPort'), 'composition passes the render port');
  assert(!notebookPanel.includes('controls.app.'), 'Notebook panel uses the notebook port');

  const presetPanel = read('src/ui/widgets/PresetPanel.ts');
  for (const match of presetPanel.matchAll(/\bapp\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
    assert(PRESET_PORT.includes(match[1]), `preset port exposes app.${match[1]}`);
  }
  assert(read('src/composition/createApp.ts').includes('createPresetPort'), 'composition passes the preset port');
  assert(read('src/ui/sections/keepSections.js').includes('new PresetPanel(controls.presetPort'), 'preset panel uses the preset port');

  for (const file of ['src/ui/widgets/LabPanel.ts', 'src/ui/widgets/ExplorePanel.ts', 'src/ui/widgets/EvolutionPanel.ts']) {
    for (const match of read(file).matchAll(/\bapp\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
      assert(LAB_PORT.includes(match[1]), `lab port exposes app.${match[1]} for ${file}`);
    }
  }
  assert(read('src/composition/createApp.ts').includes('createLabPort'), 'composition passes the lab port');
  assert(read('src/ui/sections/keepSections.js').includes('new LabPanel(controls.labPort'), 'analysis uses the lab port');
  assert(read('src/ui/sections/keepSections.js').includes('new ExplorePanel(controls.labPort'), 'explore uses the lab port');
  assert(read('src/ui/sections/keepSections.js').includes('new EvolutionPanel(controls.labPort'), 'evolution uses the lab port');

  const assertAppPort = (file, port, label) => {
    for (const match of read(file).matchAll(/\bapp\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
      assert(port.includes(match[1]), `${label} exposes app.${match[1]}`);
    }
  };
  const assertControlsPort = (file, portName, port, label) => {
    const re = new RegExp(`controls\\.${portName}\\.([a-zA-Z_][a-zA-Z0-9_]*)`, 'g');
    for (const match of read(file).matchAll(re)) {
      assert(port.includes(match[1]), `${label} exposes ${portName}.${match[1]}`);
    }
  };
  assertAppPort('src/ui/widgets/OperatorStack.ts', FORM_PORT, 'form port');
  assertControlsPort('src/ui/sections/formSections.ts', 'formPort', FORM_PORT, 'form sections');
  assertControlsPort('src/ui/sections/lookSections.ts', 'lookPort', LOOK_PORT, 'look sections');
  assertControlsPort('src/ui/sections/keepSections.js', 'keepPort', KEEP_PORT, 'keep sections');
  assertControlsPort('src/ui/sections/keepSections.js', 'lookPort', LOOK_PORT, 'look-blocks in keep sections');
  assertAppPort('src/ui/widgets/TimelinePanel.ts', KEEP_PORT, 'keep/timeline port');
  assertAppPort('src/ui/widgets/ImagePanel.ts', INGEST_PORT, 'ingest port');
  assertAppPort('src/ui/widgets/AdvisorPanel.ts', ADVISOR_PORT, 'advisor port');
  assertAppPort('src/ui/StartWithOverlay.ts', START_WITH_PORT, 'start-with port');
  for (const name of ['createFormPort', 'createLookPort', 'createKeepPort', 'createIngestPort', 'createAdvisorPort', 'createStartWithPort']) {
    assert(read('src/composition/createApp.ts').includes(name), `composition passes ${name}`);
  }
  assert(!read('src/ui/sections/keepSections.js').includes('controls.app.'), 'keep sections use narrow ports');

  assert(read('src/core/units.js').includes('../domain/units.ts'), 'core/units keeps a domain re-export');
  assert(read('src/render/passStyle.js').includes('../domain/passStyle.ts'), 'render/passStyle keeps a domain re-export');
  assert(read('src/viz/overlays.ts').includes('../domain/overlays.ts'), 'viz/overlays keeps a domain re-export');
  assert(read('src/geometry/manufacturingProfile.js').includes('../domain/manufacturingProfile.ts'), 'geometry/manufacturingProfile keeps a domain re-export');
  assert(read('src/geometry/repair.ts').includes('../domain/fabrication.ts'), 'geometry/repair imports domain cap strategies');
}
