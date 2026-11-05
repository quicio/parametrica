## ADDED Requirements

### Requirement: Validation errors

Fabricate SHALL show validation errors alongside warnings.

#### Scenario: Invalid source

- **WHEN** the active layer has a mesh candidate that fails validation
- **THEN** the panel shows the validation errors
- **AND** export remains disabled

#### Scenario: Self-intersection

- **WHEN** validation detects self-intersections
- **THEN** the panel shows the intersecting-pair count
- **AND** the reason identifies self-intersection as the blocker
