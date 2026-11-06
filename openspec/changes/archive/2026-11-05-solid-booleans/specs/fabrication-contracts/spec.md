## ADDED Requirements

### Requirement: Boolean-derived fabrication source

Fabrication SHALL apply explicit boolean recipes only to validated bodies and
shall validate the result again.

#### Scenario: Valid recipe

- **WHEN** a union, difference or intersection recipe succeeds
- **THEN** the result is validated before becoming exportable
- **AND** the report identifies the operation and operand count

#### Scenario: Invalid operand

- **WHEN** a selected body fails per-body validation
- **THEN** it is excluded from the boolean recipe
- **AND** the remaining valid bodies may still be combined
- **AND** if fewer than two valid bodies remain, the recipe is not run

#### Scenario: Failed result

- **WHEN** the boolean result fails validation or hits a complexity limit
- **THEN** STL export is rejected
- **AND** no bytes are written
- **AND** the reason identifies the boolean failure

#### Scenario: No silent fallback

- **WHEN** an explicit boolean recipe is selected
- **THEN** the exporter does not fall back to overlapping-shell multi-body
  output after a boolean failure
