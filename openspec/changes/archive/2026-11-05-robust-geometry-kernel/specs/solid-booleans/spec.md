## ADDED Requirements

### Requirement: Kernel tolerance available to CSG

CSG SHALL be able to consume the shared adaptive tolerance.

#### Scenario: Tolerance selection

- **WHEN** CSG uses automatic tolerance
- **THEN** it can derive epsilon from the kernel
- **AND** records the actual value

#### Scenario: No behavior change

- **WHEN** the kernel is not used by a CSG path
- **THEN** the existing 5D/6D behavior is unchanged
