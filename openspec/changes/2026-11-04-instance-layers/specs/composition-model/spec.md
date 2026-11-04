## ADDED Requirements

### Requirement: Layer kinds

The composition model SHALL support generator and instance layers without a
document version bump.

#### Scenario: Backward compatibility

- **WHEN** a v3 document without layer kinds is loaded
- **THEN** every layer is treated as a generator layer
- **AND** its generator, params, operators, style and seed are preserved

#### Scenario: Instance persistence

- **WHEN** an instance layer is serialized
- **THEN** its type and source layer id round-trip
- **AND** derived meshes or mappings are not serialized

### Requirement: Layer limits

The composition SHALL enforce the MVP limits.

#### Scenario: Layer cap

- **WHEN** a document would exceed 32 layers
- **THEN** creation is rejected
- **AND** the existing document remains valid

#### Scenario: Instance cap

- **WHEN** a document would exceed 24 instance layers
- **THEN** creation is rejected with an instance-specific message
