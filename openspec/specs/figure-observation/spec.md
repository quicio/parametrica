# figure-observation Specification

## Purpose
Provide one deterministic, versioned description of the current figure so
every observation, notebook and AI feature compares the same quantities and
explains changes without guessing.
## Requirements
### Requirement: Versioned figure descriptor

The system SHALL expose a `FigureDescriptor` version `1` with the fields and
definitions specified in `design.md` §D1. It SHALL be plain JSON with no
timestamps, images, DOM state or random values.

#### Scenario: Stable descriptor for the same document

- **WHEN** the same sanitised document, seed and time are evaluated twice
- **THEN** both descriptors are deeply equal
- **AND** both have `version === 1`

#### Scenario: Descriptor changes with a form change

- **WHEN** a numeric parameter that affects geometry changes by more than its
  step
- **THEN** at least one descriptor field changes

#### Scenario: Descriptor is independent of UI state

- **WHEN** the same document is evaluated with different panel scroll,
  selected tab or hover state
- **THEN** the descriptor is identical

### Requirement: Document hash

The descriptor SHALL include `documentHash`, computed as SHA-256 over the
canonical sanitised document JSON with stable key order.

#### Scenario: Hash ignores key insertion order

- **WHEN** two documents have the same semantic content but different object
  key insertion order
- **THEN** their `documentHash` values are equal

#### Scenario: Hash changes with any document change

- **WHEN** any parameter, operator, layer or seed changes
- **THEN** `documentHash` changes

### Requirement: Metric definitions

The descriptor SHALL compute `area`, `perimeter`, `compactness`, `centroid`,
`symmetry`, `curvature`, `inflections`, `selfIntersections`, `crossings`,
`fourier`, `complexity`, `coverage` and `topology` using the formulas in
`design.md` §D1.

#### Scenario: Symmetry of a regular polygon

- **WHEN** the descriptor is computed for a regular hexagon with 6-fold
  symmetry
- **THEN** `symmetry.folds` is 6
- **AND** `symmetry.score` is greater than 0.95

#### Scenario: Known circle metrics

- **WHEN** the descriptor is computed for a closed circle of radius `r`
- **THEN** `area ≈ πr²` within 1%
- **AND** `perimeter ≈ 2πr` within 1%
- **AND** `compactness ≈ 1` within 0.05

#### Scenario: Degenerate geometry

- **WHEN** a curve has zero perimeter
- **THEN** `compactness` is `0` and no metric is `NaN` or `Infinity`

### Requirement: Parameter sensitivity

The system SHALL compute a deterministic sensitivity report for selected
numeric parameters using the central perturbation defined in `design.md`
§D1. Impact values SHALL be sorted descending.

#### Scenario: Sensitivity is deterministic

- **WHEN** sensitivity is computed twice for the same document and parameters
- **THEN** the ordered impact list is identical

#### Scenario: Inert parameter does not distort the report

- **WHEN** a selected parameter has no effect on geometry over one perturbation
  step
- **THEN** its impact is `0` within tolerance and it appears last

### Requirement: Stable figure snapshots

The observer SHALL emit a `FigureSnapshot` only after a stable commit
(300 ms), an explicit analysis request, or a checkpoint creation. It SHALL not
emit one per animation frame by default.

#### Scenario: Slider drag coalesces

- **WHEN** the user drags a slider continuously for two seconds
- **THEN** at most one snapshot is emitted after the drag settles

#### Scenario: Animation does not spam snapshots

- **WHEN** animation is playing with the observer enabled
- **THEN** no snapshot is emitted per frame

#### Scenario: Snapshot is immutable

- **WHEN** the document changes after a snapshot was created
- **THEN** the snapshot's document and descriptor remain unchanged

### Requirement: Evolution diff

The system SHALL compute an evolution diff between two snapshots containing
parameter changes and descriptor changes with paths, previous values, next
values and deltas.

#### Scenario: Parameter and descriptor changes

- **WHEN** snapshot B differs from A by `operators[0].params.count: 6 → 12`
- **THEN** the diff contains that path with `from: 6`, `to: 12`
- **AND** it contains descriptor deltas when the metrics changed

#### Scenario: No-op comparison

- **WHEN** two snapshots have the same `documentHash`
- **THEN** the diff has no changes
