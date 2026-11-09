## ADDED Requirements

### Requirement: Architecture gate

The standard quality gate SHALL run dependency-cruiser with the project layer
rules.

#### Scenario: Standard gate

- **WHEN** `npm run check` runs
- **THEN** it runs `tsc --noEmit`
- **AND** it runs `depcruise` with the project configuration
- **AND** it fails on a new dependency violation

### Requirement: Empty baseline

The known-violations baseline SHALL start empty and SHALL NOT grow silently.

#### Scenario: New violation

- **WHEN** a module adds a forbidden import
- **THEN** `arch:check` fails
- **AND** adding it to the baseline requires an explicit reviewed change

### Requirement: Domain helper ownership

Pure render-mode helpers SHALL live in the domain layer.

#### Scenario: App imports

- **WHEN** the application normalizes render modes
- **THEN** it imports `domain/modeToggles.js`
- **AND** the UI path remains a compatibility re-export
