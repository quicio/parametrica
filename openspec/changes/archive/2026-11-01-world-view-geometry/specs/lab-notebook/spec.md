## MODIFIED Requirements

### Requirement: Checkpoint reproducibility

Restoring a checkpoint SHALL reproduce the same world geometry as the moment it
was created, given the same engine version and seed.

#### Scenario: Round-trip geometry

- **WHEN** a checkpoint is restored immediately after saving
- **THEN** its world geometry matches the saved intent
- **AND** camera orientation does not alter the checkpoint's world geometry

#### Scenario: Restore after reload

- **WHEN** the page reloads and the notebook is loaded from storage
- **THEN** restoring a checkpoint produces the same world document hash

## ADDED Requirements

### Requirement: World-space descriptors for spatial geometry

For spatial geometry, descriptor and comparison metrics SHALL be computed from
world geometry when the world descriptor lands.

#### Scenario: Camera-independent metrics

- **WHEN** a 3D creation is saved after rotating the camera
- **THEN** its world descriptor does not change because of camera rotation

#### Scenario: Compatibility period

- **WHEN** the legacy projected descriptor is still active
- **THEN** the notebook reports that camera changes do not change the saved
  document, but descriptor comparison remains screen-based until migration is
  complete
