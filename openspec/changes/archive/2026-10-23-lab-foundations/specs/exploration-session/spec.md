## Purpose

Turn parameter tweaking into intentional exploration: select a small set of
axes, lock everything else, generate candidate forms and adopt one without
destroying the current document.

## ADDED Requirements

### Requirement: Parameter references

An exploration session SHALL identify parameters with
`ParameterRef = { stage: 'generator' | 'operator', index?: integer, key }`.
All candidates SHALL be complete sanitised documents.

#### Scenario: Generator parameter reference

- **WHEN** the selected axis is `superformula.n1`
- **THEN** the reference is `{ stage: 'generator', key: 'n1' }`

#### Scenario: Operator parameter reference

- **WHEN** the selected axis is the second operator's `count`
- **THEN** the reference is `{ stage: 'operator', index: 1, key: 'count' }`

### Requirement: Solo and lock semantics

The session SHALL support `Solo(p)` and `Lock(p)`. Solo means only selected
parameters may change; Lock means the parameter may not change. A parameter
cannot be both soloed and locked.

#### Scenario: Solo isolates one axis

- **WHEN** Solo(`n1`) is active and a randomisation runs
- **THEN** only `n1` differs between the base document and every candidate

#### Scenario: Lock protects a parameter

- **WHEN** `ringScale` is locked and a randomisation runs
- **THEN** `ringScale` is identical in every candidate

#### Scenario: Conflicting selection

- **WHEN** a parameter is both soloed and locked
- **THEN** the session rejects the configuration with a visible error

### Requirement: 1D sweep

A 1D sweep with `N` steps over schema range `[min,max]` SHALL produce `N`
candidates at
`min + i·(max-min)/(N-1)` for `i = 0..N-1`.

#### Scenario: Endpoint coverage

- **WHEN** a sweep has `N = 12`
- **THEN** candidate 0 uses `min`
- **AND** candidate 11 uses `max`

#### Scenario: Deterministic candidates

- **WHEN** the same sweep is generated twice
- **THEN** the candidate documents are identical

### Requirement: 2D grid

A 2D grid with `N×M` steps SHALL produce `N·M` candidates using the same
sampling rule on both axes. Candidate order SHALL be row-major with axis X
fastest.

#### Scenario: Grid dimensions

- **WHEN** the grid is `6×4`
- **THEN** exactly 24 candidates are produced
- **AND** the first candidate uses both minima
- **AND** the last candidate uses both maxima

### Requirement: Directed randomisation

Randomisation SHALL be scoped to the selected parameters and their schema
ranges. It SHALL accept an intensity in `(0,1]` and use the document seed for
determinism.

#### Scenario: Scoped randomisation

- **WHEN** randomisation runs with only `n1` selected and intensity `0.2`
- **THEN** every candidate keeps all other parameters unchanged
- **AND** `n1` lies within `[min,max]`

#### Scenario: Seeded reproducibility

- **WHEN** the same randomisation configuration and seed run twice
- **THEN** the candidate list is identical

### Requirement: Morph A→B

Morphing SHALL interpolate numeric parameters at `t = i/(steps-1)` for
`i = 0..steps-1`, producing `steps` documents. It SHALL only run when the two
documents share generator id, operator ids/order and expression structure.

#### Scenario: Endpoints

- **WHEN** morphing A→B in 10 steps
- **THEN** step 0 equals A's parameters
- **AND** step 9 equals B's parameters

#### Scenario: Incompatible documents

- **WHEN** A and B have different generators or operator order
- **THEN** the session refuses the morph and reports the reason
- **AND** the UI may offer an image crossfade instead

### Requirement: Candidate adoption is explicit

Candidates SHALL never mutate the current document automatically. Adopting a
candidate SHALL go through the normal document history so it can be undone.

#### Scenario: Preview leaves document untouched

- **WHEN** the user hovers or previews a candidate
- **THEN** `app.document` is unchanged

#### Scenario: Adopt is undoable

- **WHEN** the user adopts a candidate and presses Undo
- **THEN** the previous document is restored

### Requirement: Candidate budgets

A sweep or grid SHALL cap the number of candidates and use reduced sample
counts for thumbnails. The full-resolution document is evaluated only for
the adopted candidate.

#### Scenario: Grid budget

- **WHEN** a grid would exceed the configured candidate limit
- **THEN** generation is rejected or the grid is reduced with a visible notice
- **AND** no unbounded evaluation is attempted
