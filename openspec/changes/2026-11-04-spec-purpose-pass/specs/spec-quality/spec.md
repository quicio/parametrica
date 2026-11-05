## Purpose

Keep the OpenSpec corpus useful after archiving.

## ADDED Requirements

### Requirement: Purpose completeness

Every archived spec SHALL have a non-placeholder Purpose.

#### Scenario: Archived spec

- **WHEN** a spec is archived
- **THEN** its Purpose describes the capability
- **AND** it does not contain `TBD - created by archiving`

### Requirement: Placeholder check

The quality gate SHALL reject new TBD purposes.

#### Scenario: New placeholder

- **WHEN** a spec contains the placeholder text
- **THEN** the check fails
- **AND** identifies the spec path
