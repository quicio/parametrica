## ADDED Requirements

### Requirement: Typed interaction domain

Ray and surface-picking math SHALL be strict TypeScript.

#### Scenario: Ray

- **WHEN** a cursor is converted to a world ray
- **THEN** vectors, transforms and bounds are typed
- **AND** invalid numeric input returns null

#### Scenario: Pick

- **WHEN** a surface is picked or a stored pick is validated
- **THEN** meshes, mappings, UVs and cells are validated before use
- **AND** the pick result is typed

### Requirement: Domain completion

The domain layer SHALL contain no JavaScript runtime modules.

#### Scenario: Boundary scan

- **WHEN** the domain is inspected
- **THEN** every runtime file is `.ts`
- **AND** old interaction paths remain compatibility re-exports
