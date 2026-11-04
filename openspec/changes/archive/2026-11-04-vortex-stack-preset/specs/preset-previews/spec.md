## ADDED Requirements

### Requirement: Composition previews

Built-in composition previews SHALL evaluate instance layers through the normal
document pipeline.

#### Scenario: Vortex Stack preview

- **WHEN** the browser requests a Vortex Stack preview
- **THEN** the preview contains the five instance curves
- **AND** the hidden source is evaluated as their dependency
- **AND** no special composition renderer is used

### Requirement: Stable preview hashing

Preview hashing SHALL normalize layer ids and instance source references.

#### Scenario: Repeated factory

- **WHEN** a built-in composition factory is called more than once
- **THEN** the normalized preview hash is identical
- **AND** layer ids and `source.layerId` differences do not invalidate the cache

#### Scenario: Cache version

- **WHEN** the preview hash normalization changes
- **THEN** `PREVIEW_VERSION` is bumped
- **AND** older cached previews are treated as stale
