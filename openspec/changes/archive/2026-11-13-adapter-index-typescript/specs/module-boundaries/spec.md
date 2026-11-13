## ADDED Requirements

### Requirement: Typed worker entry

The fabrication worker entry SHALL be strict TypeScript.

#### Scenario: Run

- **WHEN** a heavy fabrication job is posted to the worker
- **THEN** messages, inputs, progress and errors are typed
- **AND** job execution and messages are unchanged

### Requirement: Typed adapter indexes

Generator/render-pass indexes and render aliases SHALL be strict TypeScript.

#### Scenario: Import

- **WHEN** the app imports the adapter indexes
- **THEN** registration order and alias exports are unchanged

### Requirement: Adapter compatibility

The old worker/index/alias paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules or worker URLs use the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
