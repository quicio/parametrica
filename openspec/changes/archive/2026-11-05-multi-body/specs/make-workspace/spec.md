## ADDED Requirements

### Requirement: Body scope controls

Fabricate SHALL expose the export scope and body count.

#### Scenario: Scope control

- **WHEN** the user opens Fabricate
- **THEN** the panel offers Single, Active layer and Composition scope
- **AND** Single remains the default

#### Scenario: Multi-body source

- **WHEN** several valid bodies are selected
- **THEN** the panel shows the body count and merged counts
- **AND** it states that shells are separate, not unioned

## MODIFIED Requirements

### Requirement: Health readout

The mode SHALL show validation health, geometry counts, body count, volume and
physical bounds.

#### Scenario: Valid source

- **WHEN** the source validates
- **THEN** the mode shows triangle/vertex counts, body count, volume and
  physical bbox
- **AND** self-intersection status and other validation warnings are visible

### Requirement: No CAD

The mode SHALL NOT provide direct geometry editing, boolean operations or
implicit repair.

#### Scenario: Unsupported action

- **WHEN** the user needs direct vertex editing or booleans
- **THEN** the mode reports that these are not available
- **AND** does not silently modify the source

#### Scenario: Explicit preparation

- **WHEN** the user enables weld or cap
- **THEN** only the derived fabrication copy is prepared
- **AND** the render/document geometry remains unchanged

#### Scenario: Explicit multi-body

- **WHEN** the user selects a multi-body scope
- **THEN** only validated closed shells are merged
- **AND** overlapping shells are rejected rather than unioned
