## ADDED Requirements

### Requirement: Ordered CSG recipe

Fabricate SHALL evaluate an ordered boolean recipe.

#### Scenario: Two steps

- **WHEN** a document defines `union [A, B]` then `difference [C]`
- **THEN** the report exposes two ordered steps
- **AND** the result is `(A ∪ B) − C` as one body

#### Scenario: Intermediate validation

- **WHEN** a step fails or produces an open result
- **THEN** export is blocked
- **AND** the reason names the step

#### Scenario: Layer reuse

- **WHEN** a layer appears in more than one step
- **THEN** the recipe is rejected
- **AND** the reason identifies the reuse

#### Scenario: Sanitization

- **WHEN** a recipe contains an unknown operation or an empty layer list
- **THEN** that step is dropped
- **AND** valid steps keep their order

#### Scenario: Determinism

- **WHEN** the same recipe and document are evaluated twice
- **THEN** the triangle count and volume are identical

#### Scenario: Compatibility

- **WHEN** a document has no recipe
- **THEN** groups and the global boolean behave exactly as before

### Requirement: Recipe output

A recipe SHALL export one derived body.

#### Scenario: Report

- **WHEN** a recipe succeeds
- **THEN** `bodies` is one
- **AND** the boolean metadata names the recipe and its steps
- **AND** the body is exportable in the selected format
