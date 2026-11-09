# quad-svg-export Specification

## Purpose
Reconstruct the existing Quad layout in SVG and plotter export without changing
the canvas renderer.
## Requirements
### Requirement: Quad export layout

Quad export SHALL contain the four canvas panels.

#### Scenario: Panels

- **WHEN** the document layout is Quad
- **THEN** export contains 3D, XY, XZ and YZ panels
- **AND** each panel has a stable `data-panel` identity

#### Scenario: Scene

- **WHEN** panels are emitted
- **THEN** each uses the same document geometry
- **AND** each uses its own projection

### Requirement: Units and order

Quad export SHALL preserve physical units and panel order.

#### Scenario: Plotter

- **WHEN** the Quad is exported to plotter SVG
- **THEN** panels appear in 3D, XY, XZ, YZ order
- **AND** page units remain physical when configured

#### Scenario: Single view

- **WHEN** the layout is Single
- **THEN** the existing export path is unchanged

