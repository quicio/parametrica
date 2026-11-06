## ADDED Requirements

### Requirement: Manifold-guaranteed output

Validation SHALL record Manifold's guarantee explicitly.

#### Scenario: Trusted mesh

- **WHEN** a mesh is tagged `manifoldGuaranteed`
- **THEN** the local self-intersection check is recorded as not checked
- **AND** other mesh checks still run
