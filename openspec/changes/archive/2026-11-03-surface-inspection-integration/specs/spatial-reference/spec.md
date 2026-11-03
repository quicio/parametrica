## ADDED Requirements

### Requirement: World-space reference extent

The reference extent SHALL be derived from world bounds.

#### Scenario: Perspective

- **WHEN** a perspective scene contains ordinary surface geometry
- **THEN** the reference axes/ground use a world-scale extent
- **AND** projected artboard units are not treated as world units

#### Scenario: Deep shape

- **WHEN** one world axis is much deeper than the horizontal span
- **THEN** the extent is capped by the horizontal world span
- **AND** the axes remain visible

#### Scenario: Vertical shape

- **WHEN** horizontal world span is zero
- **THEN** the reference still receives a visible extent

### Requirement: Reference frame independence

Reference extent changes SHALL NOT alter geometry, frame or bbox.

#### Scenario: Toggle

- **WHEN** the reference is enabled or disabled
- **THEN** the artwork frame and bbox remain unchanged
