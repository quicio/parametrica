## ADDED Requirements

### Requirement: Typed look sections

Preset, camera, canvas, coordinates and scale sections SHALL be strict
TypeScript.

#### Scenario: Build

- **WHEN** look sections are built
- **THEN** controls, ports, view, artboard, units and GUI are typed
- **AND** section markup and behavior are unchanged

### Requirement: Look section compatibility

The old `ui/sections/lookSections.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls imports the old path
- **THEN** a compatibility re-export resolves
- **AND** look-port checks read the typed module
