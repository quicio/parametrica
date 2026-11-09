## ADDED Requirements

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
