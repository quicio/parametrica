## ADDED Requirements

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
