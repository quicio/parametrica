## MODIFIED Requirements

### Requirement: Network/Solid preview

Fabricate SHALL offer a persisted authored/solid preview choice.

#### Scenario: Default

- **WHEN** a lattice report becomes ready in Fabricate
- **THEN** the canvas shows the prepared solid
- **AND** the Preview select reads `Solid`

#### Scenario: Network

- **WHEN** the user selects Network on a strut lattice
- **THEN** the canvas draws the authored strut centerlines
- **AND** no prepared mesh is injected

#### Scenario: Authored cutouts

- **WHEN** the user selects Authored on a perforated shell
- **THEN** the canvas draws the authored shell
- **AND** no prepared mesh is injected

#### Scenario: Solid

- **WHEN** the user selects Solid
- **THEN** the active layer renders the prepared mesh
- **AND** other layers do not paint over it
- **AND** the render uses the lattice preview pass
