## ADDED Requirements

### Requirement: User look library

Looks SHALL distinguish built-in and user-authored recipes.

#### Scenario: UI

- **WHEN** the Looks section is open
- **THEN** built-in presets appear in the preset grid
- **AND** user looks appear in a separate list with apply/delete actions

#### Scenario: Isolation

- **WHEN** a user look is applied
- **THEN** the active document geometry and history content are not replaced
