## ADDED Requirements

### Requirement: Typed Controls coordinator

The Controls coordinator SHALL be strict TypeScript.

#### Scenario: Coordinate

- **WHEN** modes, sections, fabrication, presets or render passes are used
- **THEN** ports, fields, DOM state and reports are typed
- **AND** panel behavior and layout are unchanged

### Requirement: Controls compatibility

The old `ui/Controls.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** composition creates the panel or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** maintainability and port checks read the typed module
