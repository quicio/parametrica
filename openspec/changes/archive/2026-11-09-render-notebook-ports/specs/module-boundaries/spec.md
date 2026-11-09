## ADDED Requirements

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
