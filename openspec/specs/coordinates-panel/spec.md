# coordinates-panel Specification

## Purpose
Make coordinate inspection useful in 3D and allow a stable pinned readout.
## Requirements
### Requirement: Pinned readout

Coordinates SHALL support pinning the last valid readout.

#### Scenario: Pin

- **WHEN** the user pins a valid readout
- **THEN** the values remain visible
- **AND** release clears the pin

#### Scenario: Invalidation

- **WHEN** the evaluation or projection changes
- **THEN** a pinned readout is revalidated
- **AND** stale values are not shown as current

### Requirement: 3D surface hit

3D mode SHALL show world XYZ only when a surface hit exists.

#### Scenario: Hit

- **WHEN** the pointer is over a surface in 3D
- **THEN** the readout shows world XYZ
- **AND** it may identify instance/source

#### Scenario: No hit

- **WHEN** the pointer is over empty 3D space
- **THEN** no coordinate is inferred

