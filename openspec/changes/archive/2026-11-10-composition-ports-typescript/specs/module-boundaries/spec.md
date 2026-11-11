## ADDED Requirements

### Requirement: Typed composition ports

The composition ports SHALL be strict TypeScript.

#### Scenario: Port creation

- **WHEN** a UI/application port is created from App
- **THEN** its allow-list, getters and bound methods are typed
- **AND** runtime allow-list enforcement is unchanged

#### Scenario: UI proxy

- **WHEN** the UI port is read, set or checked
- **THEN** the proxy handlers are typed
- **AND** unknown properties still throw

### Requirement: Composition port compatibility

The old `composition/create*Port.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** createApp, UI or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
