## Purpose

Define even-odd filling and contour nesting for image-derived shapes so holes
render and export correctly.

## ADDED Requirements

### Requirement: Even-odd fill

Filled traced contours SHALL use even-odd fill semantics.

#### Scenario: Ring

- **WHEN** a ring is traced
- **THEN** the outer and inner contours form a filled ring with a hole
- **AND** the hole is transparent

#### Scenario: Nesting

- **WHEN** contours are nested
- **THEN** fill alternates by nesting depth
- **AND** layer identity is preserved

### Requirement: Export fidelity

SVG and raster export SHALL agree on the filled result.

#### Scenario: SVG

- **WHEN** a traced ring is exported as SVG
- **THEN** the filled group uses the even-odd rule
- **AND** the hole is not filled

#### Scenario: Raster

- **WHEN** the same document is exported as PNG
- **THEN** the hole matches the SVG result

### Requirement: Editability

Holes SHALL remain editable Fourier layers.

#### Scenario: Edit

- **WHEN** a hole layer is selected
- **THEN** its harmonics can be edited independently
