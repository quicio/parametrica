# make-workspace Specification

## Purpose
Provide a narrow, read-only fabrication gate and STL export for validated
watertight geometry.
## Requirements
### Requirement: Fabricate mode

The inspector SHALL expose a read-only Fabricate mode.

#### Scenario: Entry

- **WHEN** the user selects Fabricate
- **THEN** only fabrication source, health, units and export controls are shown
- **AND** parameter/operator editors are not available

### Requirement: Source eligibility

Only a validated closed Mesh/Solid SHALL be exportable.

#### Scenario: Closed solid

- **WHEN** the active source is a validated solid
- **THEN** health and export controls are enabled

#### Scenario: Open surface

- **WHEN** the active source is an open surface/mesh
- **THEN** export is disabled
- **AND** the reason is shown

### Requirement: Health readout

The mode SHALL show validation health, geometry counts, body count, volume and
physical bounds.

#### Scenario: Valid source

- **WHEN** the source validates
- **THEN** the mode shows triangle/vertex counts, body count, volume and
  physical bbox
- **AND** self-intersection status and other validation warnings are visible

### Requirement: Units

Physical export SHALL require an explicit physical scale.

#### Scenario: Unitless

- **WHEN** the document is unitless
- **THEN** export remains disabled until a scale is configured

### Requirement: Export

The mode SHALL export binary STL only after validation.

#### Scenario: Export

- **WHEN** the user exports a valid source
- **THEN** the STL uses the physical scale
- **AND** the source geometry is not mutated

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

### Requirement: Validation errors

Fabricate SHALL show validation errors alongside warnings.

#### Scenario: Invalid source

- **WHEN** the active layer has a mesh candidate that fails validation
- **THEN** the panel shows the validation errors
- **AND** export remains disabled

#### Scenario: Self-intersection

- **WHEN** validation detects self-intersections
- **THEN** the panel shows the intersecting-pair count
- **AND** the reason identifies self-intersection as the blocker

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

