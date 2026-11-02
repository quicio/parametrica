# parametric-surface-generator Specification

## Purpose
TBD - created by archiving change 2026-11-01-parametric-surfaces. Update Purpose after archive.
## Requirements
### Requirement: Parametric surface generator

The system SHALL provide a `parametric-surface` generator that evaluates
`x(u,v)`, `y(u,v)` and `z(u,v)` in world coordinates.

#### Scenario: Default surface

- **WHEN** the user selects Parametric Surface
- **THEN** a closed torus-like surface is generated
- **AND** the generator emits `Surface` geometry
- **AND** it does not read camera or render state

#### Scenario: Open patch

- **WHEN** `closedU` and `closedV` are false
- **THEN** the grid contains no duplicated seam rows or columns
- **AND** the generated mesh is open

#### Scenario: Resolution

- **WHEN** `samplesU` or `samplesV` changes
- **THEN** the grid row/column counts follow the documented seam convention
- **AND** the tessellated triangle count changes deterministically

#### Scenario: Expression error

- **WHEN** one surface expression is invalid
- **THEN** the generator reports a keyed expression error
- **AND** no partial Surface is emitted

### Requirement: Surface domains

The generator SHALL evaluate U and V over their declared ranges.

#### Scenario: Custom domain

- **WHEN** `u0/u1` or `v0/v1` are changed
- **THEN** the first and last sampled parameters reflect those bounds
- **AND** the surface domain metadata stores the same ranges

### Requirement: Surface capability

The generator SHALL declare `geometryKind: 'surface'` and `spatial: true`.

#### Scenario: Projection availability

- **WHEN** the surface generator is active
- **THEN** camera and orthographic projections are enabled
- **AND** the generator remains sibling to curve3d generators

### Requirement: Surface seam modes

The generator SHALL expose independent seam modes for closed U and V axes.

#### Scenario: Normal seam

- **WHEN** a closed axis uses the `normal` seam mode
- **THEN** its first and last sampled coordinates are identified index-to-index
- **AND** the existing closed-surface behaviour is unchanged

#### Scenario: Reversed seam

- **WHEN** a closed axis uses the `reverse` seam mode
- **THEN** the seam is identified with the opposite coordinate mirrored
- **AND** the Surface metadata records the seam mode

#### Scenario: Open axis

- **WHEN** an axis is open
- **THEN** its seam mode is ignored
- **AND** validation reports a warning if `reverse` was requested

#### Scenario: Default documents

- **WHEN** an existing document does not contain seam modes
- **THEN** both seams resolve to `normal`
- **AND** no document migration is required

