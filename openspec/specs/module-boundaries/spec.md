# module-boundaries Specification

## Purpose
Split shared helpers by responsibility so registries, geometry and generators remain independently testable.
## Requirements
### Requirement: Responsibility-based helper modules

Shared generator helpers SHALL be split by responsibility.

#### Scenario: Period math

- **WHEN** a generator needs a closing period
- **THEN** it imports from `math/periods.js`
- **AND** does not load sampling, rendering or 3D camera code

#### Scenario: Parametric sampling

- **WHEN** a generator samples a parameter domain
- **THEN** it imports the sampling helper from `sampling/parametric.js`

#### Scenario: 3D camera

- **WHEN** a generator projects 3D points
- **THEN** it imports camera helpers from `render/camera3d.js`

### Requirement: Import direction

The dependency direction SHALL be documented and enforced.

#### Scenario: Core independence

- **WHEN** any runtime module under `src/core` is loaded in Node
- **THEN** it does not import UI widgets, DOM panels or lil-gui
- **AND** the composition root `App.js` is the only core file allowed to
  import UI modules

#### Scenario: UI may depend on core

- **WHEN** a UI widget needs registry or document helpers
- **THEN** it imports from core through public module exports

### Requirement: Import smoke test

The Node suite SHALL load registries and core modules without a DOM.

#### Scenario: Headless import

- **WHEN** the smoke test imports generators, operators and render passes
- **THEN** no module accesses `window`, `document` or `localStorage` at import
  time

### Requirement: UI import boundaries

Inspector section modules SHALL depend on shared UI helpers, registries and App
APIs, not on each other.

#### Scenario: Section import

- **WHEN** one section module is loaded
- **THEN** it does not import another section implementation
- **AND** shared rules live in a common helper

### Requirement: Domain isolation

The domain layer SHALL contain only inner policy and SHALL NOT import adapters,
UI, application or infrastructure modules.

#### Scenario: Domain import

- **WHEN** a module under `src/domain/` is loaded
- **THEN** it does not import `render`, `viz`, `ui`, `application`, `workers`,
  `export` or `geometry`
- **AND** it remains Node-testable without a DOM

### Requirement: Document isolation

Document validation SHALL depend on domain policy, not rendering or fabrication
infrastructure.

#### Scenario: Document imports

- **WHEN** `src/core/document.js` is inspected
- **THEN** it does not import `render/passStyle`, `viz/overlays`,
  `geometry/repair` or `geometry/manufacturingProfile`
- **AND** the same policy is available under `src/domain/`

### Requirement: Generator projection

Generators SHALL use pure view/camera math, not the render adapter.

#### Scenario: Camera import

- **WHEN** a generator needs camera projection
- **THEN** it imports `view/camera.js`
- **AND** it does not import `render/camera3d.js`

### Requirement: Compatibility re-exports

Existing import paths SHALL keep working during the migration.

#### Scenario: Old path

- **WHEN** code imports `core/units`, `viz/overlays`, `render/passStyle` or
  `geometry/manufacturingProfile`
- **THEN** the module still resolves
- **AND** it re-exports the domain implementation

### Requirement: Composition root ownership

The browser composition root SHALL be the only module that selects concrete
adapters and stores.

#### Scenario: Boot

- **WHEN** the browser app starts
- **THEN** `main.js` calls `composition/createApp.js`
- **AND** `createApp` constructs persistence, session, presets, notebook, UI,
  renderer and exporter implementations

#### Scenario: Application purity

- **WHEN** `application/App.js` is inspected
- **THEN** it does not import `P5Adapter`, `Controls`, `Exporter`, `StartWithOverlay`,
  dialogs, overlays, `PresetManager`, `Notebook`, `SessionStore` or
  `MutationEngine`
- **AND** it receives them as services or adapter factories

### Requirement: Behavior parity

Moving construction to the composition root SHALL NOT change public behavior.

#### Scenario: Existing flows

- **WHEN** the app restores a session, applies a preset, exports, switches to
  Product preview or opens Start With
- **THEN** the behavior is unchanged
- **AND** all Node and Playwright suites pass

### Requirement: Export adapter port

The exporter SHALL depend on an explicit export port, not on the App
composition object.

#### Scenario: Browser export

- **WHEN** SVG, PNG, GIF, STL, 3MF or JSON is exported
- **THEN** the exporter reads document, evaluation, renderer and fabrication
  state through the injected port
- **AND** composition supplies the port

#### Scenario: Tests

- **WHEN** a unit fixture provides the legacy plain context
- **THEN** the exporter normalizes it to the port shape
- **AND** output remains identical

### Requirement: UI controller port

The UI SHALL receive an explicit controller surface instead of the concrete App
object.

#### Scenario: Panel access

- **WHEN** a panel reads or writes `controls.app.<name>`
- **THEN** `<name>` is listed in `UI_SURFACE`
- **AND** unknown names throw

#### Scenario: Composition

- **WHEN** the browser app builds `Controls`
- **THEN** composition passes `createUiPort(app)`
- **AND** the App instance is not exposed directly

### Requirement: Transitional port honesty

The UI port SHALL be documented as a transitional contract.

#### Scenario: Future split

- **WHEN** the port is split into render, fabrication or notebook ports
- **THEN** `UI_SURFACE` shrinks rather than growing without review
- **AND** panel behavior remains unchanged

### Requirement: Fabrication UI port

The Fabricate panel SHALL consume a narrow fabrication port instead of the full
UI surface.

#### Scenario: Panel access

- **WHEN** the Fabricate section needs document, exporter, rebuild or Product
  preview
- **THEN** it reads `controls.fabrication`
- **AND** does not read `controls.app`

#### Scenario: Composition

- **WHEN** `createApp` builds `Controls`
- **THEN** it injects `createFabricationPort(app)`
- **AND** the port exposes only `document`, `exporter`, `rebuild`,
  `scheduleSessionSave`, `setProductPreviewEnabled` and `syncProductPreview`

### Requirement: Narrowing direction

Port splits SHALL reduce the UI surface, not duplicate it.

#### Scenario: Future ports

- **WHEN** Render, Notebook or Preset ports are split
- **THEN** `UI_SURFACE` shrinks or stops growing
- **AND** panels keep their current behavior

### Requirement: Render UI port

Renderer-dependent UI SHALL use a narrow render port.

#### Scenario: Frame and coordinate access

- **WHEN** Timeline, Advisor, Look coordinates or Surface Inspector need a
  renderer operation
- **THEN** they use `controls.render` or the injected `renderPort`
- **AND** do not read `app.renderer` directly

### Requirement: Notebook UI port

The Notebook panel SHALL use a narrow notebook port.

#### Scenario: Panel access

- **WHEN** NotebookPanel needs document, checkpoints, dialogs or workspace
- **THEN** every member comes from `NOTEBOOK_PORT`
- **AND** unrelated App members are unavailable

### Requirement: Port split direction

Splitting ports SHALL reduce the broad UI surface.

#### Scenario: Composition

- **WHEN** `createApp` builds `Controls`
- **THEN** it injects fabrication, render and notebook ports
- **AND** the remaining `UI_SURFACE` is smaller or unchanged

### Requirement: Preset UI port

The preset browser and save/delete controls SHALL use a narrow preset port.

#### Scenario: Preset access

- **WHEN** PresetPanel or the preset controls need document, presets, import or
  notification
- **THEN** every member is listed in `PRESET_PORT`
- **AND** unrelated App members are unavailable

### Requirement: Laboratory UI port

Analysis, Explore and Evolution panels SHALL use a narrow laboratory port.

#### Scenario: Lab access

- **WHEN** a laboratory panel needs document analysis, candidate adoption,
  notebook or checkpoint save
- **THEN** every member is listed in `LAB_PORT`
- **AND** the UI surface does not grow

### Requirement: Port coverage

Boundary checks SHALL scan the panel source for every `app.*` use.

#### Scenario: New dependency

- **WHEN** a preset or lab panel uses a new App member
- **THEN** the architecture test fails until the port is updated deliberately

### Requirement: Domain look and picking policy

Pure look presets, scene contracts and picking math SHALL live in domain.

#### Scenario: Application import

- **WHEN** the application applies a look, builds a render scene or picks a
  surface
- **THEN** it imports `domain/lookPresets.js`, `domain/scene.js` or
  `domain/interaction/`
- **AND** does not import `render/lookPresets`, `render/scene` or
  `interaction/ray|surfacePicker`

### Requirement: Panel-specific ports

UI panels SHALL receive narrow ports rather than the broad control surface.

#### Scenario: Form, Look, Keep, Ingest, Advisor and Start With

- **WHEN** a panel is constructed
- **THEN** it receives only its documented port
- **AND** unknown members are unavailable

### Requirement: Hardened dependency gate

The architecture gate SHALL forbid application → render/interaction and UI →
composition/App.

#### Scenario: Gate run

- **WHEN** `npm run arch:check` runs
- **THEN** application → render and application → interaction fail
- **AND** the known-violations baseline remains empty

### Requirement: Typed domain slice

Pure domain policy SHALL be strict TypeScript.

#### Scenario: Conversion

- **WHEN** `units`, `overlays`, `fabrication`, `scene`, `passStyle` or
  `modeToggles` is used
- **THEN** the implementation is a `.ts` module
- **AND** unknown input is narrowed at the boundary

#### Scenario: Compatibility

- **WHEN** existing code imports the old `.js` path
- **THEN** a compatibility re-export resolves
- **AND** runtime behavior is unchanged

### Requirement: Typed import strategy

TypeScript domain imports SHALL resolve under Vite, `tsx` and `tsc`.

#### Scenario: Gate

- **WHEN** `npm run check` runs
- **THEN** `tsc --noEmit` passes with `allowImportingTsExtensions`
- **AND** the production build resolves the same modules

### Requirement: Typed look and manufacturing policy

Look and manufacturing policy SHALL be strict TypeScript.

#### Scenario: Look

- **WHEN** a preset is resolved, matched or applied
- **THEN** the module is `domain/lookPresets.ts`
- **AND** view/user-look data is typed at the boundary

#### Scenario: Manufacturing

- **WHEN** a profile is sanitized or a report is built
- **THEN** the module is `domain/manufacturingProfile.ts`
- **AND** checks and report fields are typed

### Requirement: Compatibility during migration

Old JS paths SHALL remain re-exports while consumers migrate.

#### Scenario: Import

- **WHEN** code imports `render/lookPresets` or
  `geometry/manufacturingProfile`
- **THEN** the old path resolves
- **AND** the implementation is the typed domain module

### Requirement: Typed interaction domain

Ray and surface-picking math SHALL be strict TypeScript.

#### Scenario: Ray

- **WHEN** a cursor is converted to a world ray
- **THEN** vectors, transforms and bounds are typed
- **AND** invalid numeric input returns null

#### Scenario: Pick

- **WHEN** a surface is picked or a stored pick is validated
- **THEN** meshes, mappings, UVs and cells are validated before use
- **AND** the pick result is typed

### Requirement: Domain completion

The domain layer SHALL contain no JavaScript runtime modules.

#### Scenario: Boundary scan

- **WHEN** the domain is inspected
- **THEN** every runtime file is `.ts`
- **AND** old interaction paths remain compatibility re-exports

