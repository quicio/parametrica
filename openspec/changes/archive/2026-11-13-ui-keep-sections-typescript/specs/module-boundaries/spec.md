## ADDED Requirements

### Requirement: Typed keep sections

Style, render, overlay, animation, timeline, mutation, analysis, notebook,
advisor, explore, evolution, preset and export sections SHALL be strict
TypeScript.

#### Scenario: Build

- **WHEN** keep sections are built
- **THEN** controls, ports, view/style, pass entries and panels are typed
- **AND** section markup and behavior are unchanged

### Requirement: Keep section compatibility

The old `ui/sections/keepSections.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** Controls imports the old path
- **THEN** a compatibility re-export resolves
- **AND** keep/look port and maintainability checks read the typed module
