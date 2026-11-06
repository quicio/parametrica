## ADDED Requirements

### Requirement: Guided Fabricate presentation

Fabricate SHALL present a plan, grouped controls, quality presets, a suggestion
and a next action.

#### Scenario: Presentation

- **WHEN** the user opens Fabricate
- **THEN** the plan and groups are visible
- **AND** the next action reflects the current blocker or readiness

#### Scenario: Behavior parity

- **WHEN** the user changes any existing control
- **THEN** geometry, worker, validation and export behavior are unchanged
