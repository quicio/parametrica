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

