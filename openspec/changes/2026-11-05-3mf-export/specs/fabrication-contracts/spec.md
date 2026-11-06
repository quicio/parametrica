## ADDED Requirements

### Requirement: 3MF body grouping

3MF export SHALL preserve independent body identity.

#### Scenario: Object per body

- **WHEN** multiple bodies are exported
- **THEN** one 3MF object is written per body
- **AND** they are not merged into a single anonymous mesh

#### Scenario: No material promise

- **WHEN** the first 3MF slice is used
- **THEN** no materials, colors or textures are written
- **AND** the limitation is documented
