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
