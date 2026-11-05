# surface-rendering Specification

## Purpose
Render projected Surface and Mesh triangles through RenderScene while documenting painter-order limitations.
## Requirements
### Requirement: RenderScene triangle items

RenderScene SHALL support projected triangle/mesh items alongside polylines.

#### Scenario: Mesh item

- **WHEN** a mesh is projected
- **THEN** the scene contains one `triangles` item with projected vertices and
  faces
- **AND** the item retains its source world identity in metadata

#### Scenario: Mixed scene

- **WHEN** a layer contains curves and surfaces
- **THEN** both polyline and triangle items can coexist in the same scene
- **AND** existing stroke passes still draw the curves

### Requirement: Surface render passes

The p5 backend SHALL render surface wireframe and filled modes.

#### Scenario: Wireframe

- **WHEN** `surface-wireframe` is active
- **THEN** projected mesh edges are drawn
- **AND** hidden-edge removal is not required

#### Scenario: Fill

- **WHEN** `surface-fill` is active
- **THEN** triangles are painted in approximate depth order
- **AND** the limitation of painter ordering is documented

#### Scenario: Orthographic fill

- **WHEN** the view is `xy`, `xz` or `yz`
- **THEN** fill uses projected world axes
- **AND** no camera depth fade is applied

### Requirement: No renderer mathematics

Render passes SHALL NOT evaluate surface equations, tessellate or compute
normals.

#### Scenario: Pass input

- **WHEN** a surface pass draws
- **THEN** it receives already-projected triangle items
- **AND** it does not read the document or generator params
