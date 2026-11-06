## ADDED Requirements

### Requirement: Topology repair step

Advanced repair SHALL optionally run topology repair before orientation/caps.

#### Scenario: Order

- **WHEN** topology repair is enabled
- **THEN** non-manifold splitting and seam cutting run before orientation and
  caps
- **AND** the final result is validated

#### Scenario: Report

- **WHEN** topology repair changes the mesh
- **THEN** its actions are merged into the repair report
- **AND** failures remain structured
