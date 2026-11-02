## REMOVED Requirements

### Requirement: Temporary Work group

## ADDED Requirements

### Requirement: Ingest and Perform ownership

Image SHALL live in Ingest. Animation and Timeline SHALL live in Perform.
Frame and GIF export SHALL remain with Timeline in Perform. KEEP SHALL remain
the workspace for final-artifact conservation and export.

#### Scenario: Image ownership

- **WHEN** the user opens Image
- **THEN** Ingest is the active mode
- **AND** Look is not required to reach Image

#### Scenario: Time ownership

- **WHEN** the user opens Animation or Timeline
- **THEN** Perform is the active mode
- **AND** the timeline frame/GIF export controls remain in Timeline

#### Scenario: Look is appearance-only

- **WHEN** Look is active
- **THEN** Image, Animation and Timeline are not visible
- **AND** the temporary Work group is absent

#### Scenario: Keep boundary

- **WHEN** the user opens Keep
- **THEN** Notebook, Presets and Export remain available
- **AND** temporal frame/GIF export is not duplicated there
