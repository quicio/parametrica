## ADDED Requirements

### Requirement: Boolean result contract

Boolean operations SHALL return an explicit success, empty or failure result.

#### Scenario: Success

- **WHEN** a boolean produces geometry
- **THEN** the result contains a Mesh with finite vertices and valid faces
- **AND** its metadata records the operation, operand count and tolerance

#### Scenario: Empty

- **WHEN** a boolean has no volume
- **THEN** the result is marked empty
- **AND** geometry is null
- **AND** this is not represented as an invalid mesh

#### Scenario: Failure

- **WHEN** a boolean cannot complete
- **THEN** the result contains a structured error code and message
- **AND** geometry is null
