## ADDED Requirements

### Requirement: Typed inspection overlay

Inspection overlay derivation SHALL be strict TypeScript.

#### Scenario: Inspect

- **WHEN** an inspected point, triangle or cell is overlaid
- **THEN** layers, mappings, transforms and artboard points are typed
- **AND** overlay geometry is unchanged

### Requirement: Typed seam overlay

Seam/domain overlay derivation SHALL be strict TypeScript.

#### Scenario: Seams

- **WHEN** domain seams and borders are overlaid
- **THEN** UV edges, classifications, statuses and counts are typed
- **AND** overlay edges are unchanged

### Requirement: Overlay compatibility

The old `interaction/inspectionOverlay.js` and `seamOverlay.js` paths SHALL
keep resolving.

#### Scenario: Import

- **WHEN** render overlays import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
