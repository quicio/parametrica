## Purpose

Make a one-dimensional family visible and adoptable: choose an axis, constrain
what may change, generate a strip of candidate forms and keep one.

## ADDED Requirements

### Requirement: Axis selection

The Explore section SHALL list every numeric parameter of the current
document and SHALL default to the first non-technical form parameter.

#### Scenario: Form axis default

- **WHEN** the Lissajous generator is active
- **THEN** the default axis is `generator.params.a`

#### Scenario: Technical fallback

- **WHEN** every numeric parameter is technical
- **THEN** the first numeric parameter is still selectable

### Requirement: Parameter scope

The Explore section SHALL expose per-parameter selection, Solo and Lock.

#### Scenario: Solo

- **WHEN** the user activates `S` on `generator.params.a`
- **THEN** only `a` is selected
- **AND** every other numeric parameter is locked

#### Scenario: Lock

- **WHEN** the user activates `L` on `generator.params.b`
- **THEN** `b` is removed from the selection
- **AND** randomisation leaves `b` unchanged

#### Scenario: Locked selection is impossible

- **WHEN** a locked parameter is selected
- **THEN** the selection rejects it

### Requirement: 1D variation strip

Generate strip SHALL create a deterministic sequence of candidates over the
schema range and display them as thumbnails with values.

#### Scenario: Endpoint coverage

- **WHEN** the user generates 12 steps on `a` (range `0.25..16`)
- **THEN** the first thumbnail uses `0.25`
- **AND** the last thumbnail uses `16`

#### Scenario: Only the axis changes

- **WHEN** a strip is generated on one axis
- **THEN** every candidate keeps all other parameters equal to the base

#### Scenario: Thumbnail family

- **WHEN** candidates are valid
- **THEN** each candidate has a preview image and a numeric label

### Requirement: Seeded randomisation

Randomize selected SHALL produce six candidates using the selected refs,
intensity control and a deterministic seed that advances per request.

#### Scenario: Locked parameter remains unchanged

- **WHEN** `b` is locked and randomize is used on `a`
- **THEN** all candidates keep `b` unchanged

#### Scenario: Deterministic seed

- **WHEN** the same session, selection, intensity and seed are used
- **THEN** the candidate documents are identical

#### Scenario: No selection

- **WHEN** no parameter is selected
- **THEN** randomize reports an error and generates nothing

### Requirement: Candidate adoption

Clicking a candidate SHALL adopt it through the normal history path, leaving
the current document unchanged until the click.

#### Scenario: Preview does not mutate

- **WHEN** candidates are generated
- **THEN** `app.document` is unchanged

#### Scenario: Adopt is undoable

- **WHEN** the user clicks a candidate and presses Undo
- **THEN** the pre-adoption document is restored

### Requirement: Invalid candidate handling

Candidates with evaluation errors or no curves SHALL be skipped.

#### Scenario: Broken candidate

- **WHEN** one candidate fails to evaluate
- **THEN** it is absent from the strip
- **AND** the remaining candidates are still shown
