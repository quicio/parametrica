## ADDED Requirements

### Requirement: Typed core support

The core schema, registry, layer graph, capabilities and fill-gradient helpers
SHALL be strict TypeScript.

#### Scenario: Schema

- **WHEN** defaults, values, params or harmonics are sanitized
- **THEN** schema entries, types and animatable values are typed
- **AND** clamping and fallbacks are unchanged

#### Scenario: Registry

- **WHEN** generators, operators or render passes register and resolve
- **THEN** stage definitions and registries are typed
- **AND** validation errors and frozen definitions are unchanged

#### Scenario: Layers

- **WHEN** layers, instance sources or dependent instances are inspected
- **THEN** sources, generators, indices and candidates are typed
- **AND** layer limit rules are unchanged

#### Scenario: Paint and capabilities

- **WHEN** capabilities or fill gradients are resolved
- **THEN** capability flags and gradient specs are typed
- **AND** defaults, bounds and stops are unchanged

### Requirement: Core support compatibility

The old core support `.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** engine, document, generators, passes, App, UI or tests import the old
  paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
