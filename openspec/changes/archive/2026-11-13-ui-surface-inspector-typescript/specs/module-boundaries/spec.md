## ADDED Requirements

### Requirement: Typed surface inspector

The surface inspector SHALL be strict TypeScript.

#### Scenario: Inspect

- **WHEN** a surface is hovered, pinned or invalidated
- **THEN** pick results, ports, pins and rows are typed
- **AND** readout and behavior are unchanged

### Requirement: Surface inspector compatibility

The old `ui/SurfaceInspector.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the canvas imports the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
