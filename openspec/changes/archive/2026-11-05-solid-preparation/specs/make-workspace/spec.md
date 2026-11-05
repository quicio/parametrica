## ADDED Requirements

### Requirement: Preparation controls

Fabricate SHALL expose explicit preparation controls for open meshes.

#### Scenario: Open source

- **WHEN** the active source is an open mesh
- **THEN** the panel offers weld and cap toggles
- **AND** it explains that preparation is derived for fabrication only

#### Scenario: Prepared source

- **WHEN** preparation is enabled and produces a valid body
- **THEN** the panel reports prepared triangle/vertex counts and changes
- **AND** export becomes available once units are valid

### Requirement: Preparation transparency

The panel SHALL distinguish source geometry from prepared geometry.

#### Scenario: Changes

- **WHEN** welding or capping changes the mesh
- **THEN** merged vertices, removed faces, capped loops and added triangles are
  visible
- **AND** preparation warnings are shown with other validation warnings

## MODIFIED Requirements

### Requirement: No CAD

The mode SHALL NOT provide direct geometry editing, boolean operations or
implicit repair.

#### Scenario: Unsupported action

- **WHEN** the user needs direct vertex editing, booleans or multi-body export
- **THEN** the mode reports that these are not available
- **AND** does not silently modify the source

#### Scenario: Explicit preparation

- **WHEN** the user enables weld or cap
- **THEN** only the derived fabrication copy is prepared
- **AND** the render/document geometry remains unchanged
