## ADDED Requirements

### Requirement: Size-aware preview cache

Preview identity SHALL include the requested preview size and profile.

#### Scenario: Different sizes

- **WHEN** the same document is previewed at 96 px and 224 px
- **THEN** the two cached images do not collide
- **AND** each size is served from its own cache entry

#### Scenario: Repeated request

- **WHEN** the same document and size are requested again
- **THEN** the cached image is reused
