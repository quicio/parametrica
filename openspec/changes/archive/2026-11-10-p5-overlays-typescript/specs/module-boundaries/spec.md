## ADDED Requirements

### Requirement: Typed p5 overlays

The p5 frame-context overlay helpers SHALL be strict TypeScript.

#### Scenario: Quad and coordinates

- **WHEN** quad panels, coordinate grids, ticks or cursor readouts draw
- **THEN** panels, descriptors, transforms, units and contexts are typed
- **AND** layout, clipping and tick output are unchanged

#### Scenario: Underlay and diagnostics

- **WHEN** the image underlay, seam overlay or surface inspection overlay draws
- **THEN** image, seam edges, inspection shapes and contexts are typed
- **AND** drawing order and output are unchanged

#### Scenario: Reference and guides

- **WHEN** spatial reference axes/ground or artboard guides draw
- **THEN** transforms, runs and clip rectangles are typed
- **AND** output is unchanged

### Requirement: p5 overlay compatibility

The old `render/p5/overlays.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** `P5Adapter` or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
