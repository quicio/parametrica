## ADDED Requirements

### Requirement: Self-intersection repair controls

Fabricate SHALL expose self-intersection repair under Repair.

#### Scenario: Controls

- **WHEN** Repair is enabled
- **THEN** the panel offers Off, Split, Remesh and Auto
- **AND** Off remains the default

#### Scenario: Report

- **WHEN** the step runs
- **THEN** the panel reports strategy, remaining pairs, fallbacks, resolution and
  volume/triangle deltas

#### Scenario: Failure

- **WHEN** repair cannot resolve the mesh
- **THEN** export remains disabled
- **AND** the reason identifies remaining self-intersections or complexity
