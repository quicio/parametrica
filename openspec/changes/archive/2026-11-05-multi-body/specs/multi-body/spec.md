## Purpose

Export several validated closed shells as one multi-body STL without implying a
boolean union or hiding invalid geometry.

## ADDED Requirements

### Requirement: Explicit body scope

Fabricate SHALL default to one body and allow explicit multi-body scopes.

#### Scenario: Default

- **WHEN** scope is `single`
- **THEN** only the first valid closed body from the active layer is exported
- **AND** existing behavior is unchanged

#### Scenario: Active layer

- **WHEN** scope is `active-layer`
- **THEN** every valid closed body in the active layer is selected

#### Scenario: Composition

- **WHEN** scope is `composition`
- **THEN** valid closed bodies from visible layers are selected
- **AND** hidden layers contribute no bodies

### Requirement: Independent body validation

Every selected body SHALL pass fabrication validation before merging.

#### Scenario: Invalid body

- **WHEN** one selected body is open, non-manifold, self-intersecting or has
  invalid volume
- **THEN** it is not included in the multi-body set
- **AND** the remaining valid bodies may still export

#### Scenario: No valid bodies

- **WHEN** no selected body validates
- **THEN** export remains disabled
- **AND** validation reasons are shown

### Requirement: Merged validation

The merged multi-body mesh SHALL pass the same validation gate as a single
body.

#### Scenario: Disjoint shells

- **WHEN** selected bodies do not overlap
- **THEN** the merged mesh is closed, manifold, oriented and free of
  self-intersections
- **AND** it is exportable

#### Scenario: Overlapping shells

- **WHEN** selected bodies overlap
- **THEN** the merged mesh reports self-intersections
- **AND** export is rejected
- **AND** no automatic union is attempted

### Requirement: Multi-body report

The fabrication report SHALL expose scope, body count and merged health.

#### Scenario: Report

- **WHEN** multi-body export is selected
- **THEN** the report states the scope, number of bodies and merged counts
- **AND** it identifies the source as multi-body rather than a union
