## ADDED Requirements

### Requirement: Instance inspection

Surface inspection SHALL distinguish an instance from its source.

#### Scenario: Pick result

- **WHEN** an instance surface is picked
- **THEN** the result reports the instance layer
- **AND** it reports the source layer when available
- **AND** mesh, surface and mapping identities remain instance-local

#### Scenario: Pinned result

- **WHEN** the source or an instance operator changes
- **THEN** a pinned result is revalidated
- **AND** stale IDs or mapping are not displayed as valid

#### Scenario: UV and seams

- **WHEN** UV Domain or seam overlays are shown for an instance
- **THEN** they use the instance mapping
- **AND** never the source mapping
