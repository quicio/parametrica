## ADDED Requirements

### Requirement: Self-intersection repair step

Advanced repair SHALL optionally resolve self-intersections.

#### Scenario: Order

- **WHEN** self-intersection repair is requested
- **THEN** it runs after cleanup/weld and before final orientation/cap
- **AND** the final result is validated

#### Scenario: Report

- **WHEN** the step runs
- **THEN** strategy, pairs, split faces, remesh fallback, resolution and
  volume/triangle deltas are reported
- **AND** failures are returned as structured errors
