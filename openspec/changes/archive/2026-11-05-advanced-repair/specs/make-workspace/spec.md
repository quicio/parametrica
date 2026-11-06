## ADDED Requirements

### Requirement: Repair controls

Fabricate SHALL expose explicit repair and cap strategy controls.

#### Scenario: Repair toggle

- **WHEN** the user opens Fabricate
- **THEN** Repair is off by default
- **AND** enabling it prepares the derived source with orientation, cleanup and
  caps

#### Scenario: Cap strategy

- **WHEN** repair is enabled
- **THEN** the panel offers Auto, Fan and Planar cap strategies
- **AND** Auto is the default

#### Scenario: Repair report

- **WHEN** repair runs
- **THEN** the panel reports flipped faces/shells, removed faces, welded
  vertices, caps, fallbacks and skipped loops

#### Scenario: Failed repair

- **WHEN** repair cannot produce a valid body
- **THEN** export remains disabled
- **AND** the remaining validation errors are shown

## MODIFIED Requirements

### Requirement: No CAD

The mode SHALL NOT provide direct geometry editing, implicit repair or boolean
operations outside explicit recipes.

#### Scenario: Unsupported action

- **WHEN** the user needs direct vertex editing or self-intersection repair
- **THEN** the mode reports that these are not available
- **AND** does not silently modify the source

#### Scenario: Explicit preparation

- **WHEN** the user enables weld or cap
- **THEN** only the derived fabrication copy is prepared
- **AND** the render/document geometry remains unchanged

#### Scenario: Explicit multi-body

- **WHEN** the user selects a multi-body scope without a boolean recipe
- **THEN** only validated closed shells are merged
- **AND** overlapping shells are rejected rather than unioned

#### Scenario: Explicit boolean

- **WHEN** the user selects union, difference or intersection
- **THEN** only validated closed bodies are combined
- **AND** the result is validated before export
- **AND** the render/document geometry remains unchanged

#### Scenario: Explicit repair

- **WHEN** the user enables Repair
- **THEN** only the derived fabrication copy is cleaned, capped and reoriented
- **AND** the repair actions are reported
- **AND** the render/document geometry remains unchanged
