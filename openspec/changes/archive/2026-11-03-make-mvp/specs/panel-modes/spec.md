## ADDED Requirements

### Requirement: Fabricate mode

The workspace modes SHALL include Fabricate when MAKE MVP ships.

#### Scenario: Mode selection

- **WHEN** the user selects Fabricate
- **THEN** the Fabricate panel is visible
- **AND** form/look/explore/perform/ingest/keep sections are hidden

#### Scenario: Persistence

- **WHEN** Fabricate was active and the app reloads
- **THEN** Fabricate is restored if it remains valid

#### Scenario: Legacy state

- **WHEN** saved state contains the previous six modes
- **THEN** it remains valid
- **AND** no migration is required
