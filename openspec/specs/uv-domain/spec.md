# uv-domain Specification

## Purpose
Expose the parameter domain of the active parametric surface as a compact,
read-only inset without changing geometry, framing or exports.
## Requirements
### Requirement: Real domain data

The inset SHALL use the evaluated Surface `domain.u/v` and grid metadata.

#### Scenario: Non-normalized domain

- **WHEN** U or V spans values outside `[0,1]`
- **THEN** the inset shows the real endpoints and bounds

#### Scenario: Reversed domain

- **WHEN** a parameter end is lower than its start
- **THEN** the inset preserves the real direction and min/max values

#### Scenario: Missing domain

- **WHEN** a Surface has no valid U/V range
- **THEN** no inset is shown

### Requirement: Domain visualization

The inset SHALL show U and V axes, bounds, a low-density grid and sample counts.

#### Scenario: Bounds

- **WHEN** a valid Surface is active
- **THEN** U min/max and V min/max are visible
- **AND** the chart uses a 4×4 low-density grid

### Requirement: Topology cues

The inset SHALL represent closure and seam metadata explicitly.

#### Scenario: Closed axis

- **WHEN** `closedU` or `closedV` is true
- **THEN** the corresponding edges are marked as seams

#### Scenario: Reverse seam

- **WHEN** a closed axis uses a reverse seam
- **THEN** the footer identifies it

### Requirement: Active surface only

The inset SHALL only appear for a valid active visible Surface.

#### Scenario: Planar layer

- **WHEN** the active layer has no Surface
- **THEN** the inset is hidden

#### Scenario: Hidden layer

- **WHEN** the active layer is hidden
- **THEN** the inset is hidden

### Requirement: UI-only activation

Visibility SHALL be explicitly toggleable from Canvas and persisted locally.

#### Scenario: Toggle

- **WHEN** the user enables UV Domain
- **THEN** the inset appears for a valid surface
- **AND** disabling it hides the inset

### Requirement: Isolation

The inset SHALL NOT alter geometry, ViewTransform, frame, bbox, Spatial
Reference or exports.

#### Scenario: Frame

- **WHEN** the inset is toggled
- **THEN** frame and bbox are unchanged

#### Scenario: Export

- **WHEN** SVG or plotter output is generated
- **THEN** it contains no UV Domain markup

### Requirement: Out of scope

UV ↔ XYZ interaction, UV export, physical units, snapping and CAD SHALL remain
out of this change.

#### Scenario: No interaction

- **WHEN** the inset is visible
- **THEN** it does not select or map points on the surface

