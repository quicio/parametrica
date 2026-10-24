## Purpose

Expose two-dimensional families and smooth parameter transitions without
losing the current document or inventing topology changes.

## ADDED Requirements

### Requirement: 2D grid generation

The system SHALL generate a row-major grid of `cols×rows` candidates over two
numeric axes.

#### Scenario: Grid order

- **WHEN** the grid is `6×4`
- **THEN** the first cell uses both minima
- **AND** the last cell uses both maxima
- **AND** X changes fastest

#### Scenario: Grid budget

- **WHEN** the requested grid exceeds the candidate cap
- **THEN** generation is rejected or reduced with a visible notice

### Requirement: Grid preview and adoption

Grid cells SHALL show a preview and clicking one SHALL adopt it through the
history path.

#### Scenario: Adopt a cell

- **WHEN** the user clicks a valid cell
- **THEN** the document updates and the previous document is undoable

#### Scenario: Invalid cell

- **WHEN** a cell fails to evaluate
- **THEN** it is empty and cannot be adopted

### Requirement: Same-structure morph

Morphing SHALL interpolate numeric parameters linearly between two
compatible documents.

#### Scenario: Endpoints

- **WHEN** morphing A→B in 10 steps
- **THEN** step 0 equals A and step 9 equals B

#### Scenario: Incompatible structure

- **WHEN** generator or operator order differs
- **THEN** the morph is refused with a reason

### Requirement: Morph preview

The UI SHALL show a frame strip and allow adopting a frame.

#### Scenario: Adopt a frame

- **WHEN** the user clicks a morph frame
- **THEN** that frame becomes the current document and is undoable

### Requirement: Bounded work

Grid and morph generation SHALL enforce candidate and evaluation budgets and
SHALL not block indefinitely.

#### Scenario: Large grid

- **WHEN** the requested grid is too large
- **THEN** the app reports the limit and generates at most the allowed cells
