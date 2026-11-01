## ADDED Requirements

### Requirement: Surface pipeline stage

The geometry pipeline SHALL accept Surface and Mesh geometry without changing
curve behavior.

#### Scenario: Surface generation

- **WHEN** the active generator emits Surface geometry
- **THEN** generation, validation and world analysis run before tessellation

#### Scenario: Tessellation

- **WHEN** a surface requires mesh rendering
- **THEN** tessellation runs in geometry
- **AND** projection runs after tessellation

#### Scenario: Existing curves

- **WHEN** a curve document is evaluated
- **THEN** its current pipeline and metrics are unchanged

### Requirement: Surface caches

Surface, mesh and projection caches SHALL be independent.

#### Scenario: Camera change

- **WHEN** only the camera changes
- **THEN** the Surface and Mesh are reused
- **AND** only projection/render results are recomputed

#### Scenario: Tessellation options

- **WHEN** smoothing or tessellation options change
- **THEN** the Surface is reused
- **AND** the Mesh and downstream caches are invalidated

#### Scenario: Resolution change

- **WHEN** `samplesU` or `samplesV` changes
- **THEN** the Surface cache is invalidated
- **AND** the Mesh is regenerated

### Requirement: Surface analysis

World analysis SHALL expose surface extent, closure and approximate area.

#### Scenario: Torus area

- **WHEN** a closed torus-like surface is analyzed
- **THEN** its bbox3 and area are finite
- **AND** camera changes do not alter them

#### Scenario: Open patch

- **WHEN** a surface is open in U or V
- **THEN** analysis records the closure flags
- **AND** area remains finite
