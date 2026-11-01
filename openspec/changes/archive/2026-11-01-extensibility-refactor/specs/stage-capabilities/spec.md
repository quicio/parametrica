## ADDED Requirements

### Requirement: Declarative stage capabilities

Generator definitions SHALL declare their spatial and UI capabilities instead
of relying on generator id comparisons in core or shared UI code.

#### Scenario: Spatial generator

- **WHEN** a generator emits true 3D coordinates and depth metadata
- **THEN** it declares `capabilities.spatial = true`
- **AND** projection, camera and orthographic controls are enabled from that
  capability

#### Scenario: Planar generator

- **WHEN** a generator emits only 2D coordinates
- **THEN** orthographic projection controls are disabled with an explanation
- **AND** `view.projection` falls back to the camera view

#### Scenario: Sibling models

- **WHEN** both `helix` and `parametric-3d` declare `spatial: true`
- **THEN** they remain independent generators
- **AND** neither is treated as the parent or base model of the other

### Requirement: No generator-id special cases

Core, render and shared UI modules SHALL NOT branch on specific generator ids
such as `helix` or `parametric-3d`.

#### Scenario: New spatial generator

- **WHEN** a new generator declares `spatial: true`
- **THEN** projection and camera behavior work without editing `App`,
  `Controls`, `P5Renderer` or `Exporter`
