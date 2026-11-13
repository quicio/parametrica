## ADDED Requirements

### Requirement: Typed form sections

Layer, instance, generator, parameter, equation, harmonic and operator
sections SHALL be strict TypeScript.

#### Scenario: Build

- **WHEN** form sections are built for a layer
- **THEN** controls, ports, layers, stages and schemas are typed
- **AND** section markup and behavior are unchanged

### Requirement: Form section compatibility

The old `ui/sections/formSections.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls imports the old path
- **THEN** a compatibility re-export resolves
- **AND** form-port and maintainability checks read the typed module
