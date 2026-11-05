## ADDED Requirements

### Requirement: Pass appearance controls

Render SHALL expose per-pass color and width.

#### Scenario: Supported pass

- **WHEN** a stroke-bearing pass is enabled
- **THEN** its color/width controls are available
- **AND** it can reset to inherit

#### Scenario: Unsupported pass

- **WHEN** a pass does not support color/width
- **THEN** the controls are disabled with a reason
- **AND** the pass remains usable
