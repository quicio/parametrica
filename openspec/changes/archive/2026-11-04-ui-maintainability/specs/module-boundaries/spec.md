## ADDED Requirements

### Requirement: UI import boundaries

Inspector section modules SHALL depend on shared UI helpers, registries and App
APIs, not on each other.

#### Scenario: Section import

- **WHEN** one section module is loaded
- **THEN** it does not import another section implementation
- **AND** shared rules live in a common helper
