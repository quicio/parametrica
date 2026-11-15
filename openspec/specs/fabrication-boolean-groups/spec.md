# fabrication-boolean-groups Specification

## Purpose
Allow one preset to define independent boolean groups and export the results as
multiple bodies without a new CSG engine.
## Requirements
### Requirement: Grouped booleans

Fabricate SHALL run each boolean group independently.

#### Scenario: Difference groups

- **WHEN** a preset defines two difference groups
- **THEN** each group subtracts its own inner layers
- **AND** the results remain separate bodies

#### Scenario: Single-layer group

- **WHEN** a group contains one layer
- **THEN** that layer is exported as a body without a boolean

#### Scenario: Failure

- **WHEN** a group has no validated bodies or the boolean fails
- **THEN** the preset is not exportable
- **AND** the reason identifies the group

### Requirement: Multi-body output

Grouped results SHALL export as separate 3MF objects.

#### Scenario: 3MF

- **WHEN** a grouped preset with three results is exported
- **THEN** the package contains three objects
- **AND** the report says three bodies

### Requirement: Compatibility

Grouped presets SHALL NOT change the existing single-boolean path.

#### Scenario: Existing preset

- **WHEN** a preset has no groups
- **THEN** `scope` and `boolean` behave exactly as before

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

