## ADDED Requirements

### Requirement: Typed fabricate section

The Fabricate section SHALL be strict TypeScript.

#### Scenario: Fabricate

- **WHEN** scope, preparation, repair, output, preview or manufacturing controls
  are edited
- **THEN** controls, ports, settings and profiles are typed
- **AND** fabrication gating and controls are unchanged

### Requirement: Fabricate section compatibility

The old `ui/sections/fabricateSections.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls imports the old path
- **THEN** a compatibility re-export resolves
- **AND** fabrication-port checks read the typed module
