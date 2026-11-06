# fabrication-contracts Specification

## Purpose
Validate mesh and solid geometry before fabrication consumers may render or export it.
## Requirements
### Requirement: Mesh validation

The geometry layer SHALL validate mesh data before it can be rendered or
exported for fabrication.

#### Scenario: Invalid index

- **WHEN** a face references a vertex outside the vertex array
- **THEN** the mesh is rejected with a validation error

#### Scenario: Degenerate face

- **WHEN** a face has fewer than three distinct vertices
- **THEN** the mesh is rejected or the face is reported for repair
- **AND** it is not silently exported

### Requirement: Solid validation

A Solid SHALL only be considered closed after effective topological validation.
The `closed` flag SHALL NOT be accepted as sufficient evidence.

#### Scenario: Closed manifold mesh

- **WHEN** a mesh boundary is watertight, edge-consistent, consistently
  oriented and free of degenerate faces within tolerance
- **THEN** it can be promoted to a Solid
- **AND** the validation record reports the checks that passed

#### Scenario: Open mesh

- **WHEN** a mesh boundary has open edges
- **THEN** it remains a Mesh
- **AND** solid export is rejected
- **AND** the error identifies the open boundary

#### Scenario: Non-manifold or inconsistent mesh

- **WHEN** an edge is shared by an invalid number of faces or face winding is
  contradictory
- **THEN** solid promotion is rejected
- **AND** the validation record identifies the failing topology

#### Scenario: Degenerate faces

- **WHEN** a mesh contains zero-area or repeated-vertex faces
- **THEN** solid promotion is rejected or the faces are explicitly reported for
  repair
- **AND** a mesh is never silently promoted

#### Scenario: Self-intersections

- **WHEN** the validator supports self-intersection checks and intersections
  are found
- **THEN** the solid result is rejected or marked invalid
- **AND** the limitation is recorded when the validator cannot check it

#### Scenario: Volume consistency

- **WHEN** signed volume can be computed
- **THEN** the validation record includes volume and orientation consistency
- **AND** inconsistent or non-finite volume prevents solid promotion

#### Scenario: Closed flag is not validation

- **WHEN** a caller supplies `closed: true` without running the validator
- **THEN** the geometry remains a Mesh
- **AND** it cannot be exported as a Solid

### Requirement: Fabrication export adapters

STL and 3MF SHALL be implemented as geometry exporters, not renderers.

#### Scenario: STL contract

- **WHEN** STL export is added
- **THEN** it consumes world Mesh/Solid data
- **AND** it does not use p5, camera or document.view

#### Scenario: Units and tolerance

- **WHEN** a mesh or solid is exported
- **THEN** its metadata declares units and tolerance
- **AND** validation uses the same tolerance

### Requirement: Physical unit metadata

Fabrication validation and export SHALL use explicit physical unit metadata.

#### Scenario: Millimetres

- **WHEN** a mesh/solid is exported for fabrication in millimetres
- **THEN** its world scale is explicit
- **AND** validation tolerance has a documented unit
- **AND** no implicit unit conversion occurs

#### Scenario: Unitless

- **WHEN** physical units are absent
- **THEN** fabrication export cannot claim a physical size
- **AND** the result is rejected or clearly marked unitless

### Requirement: STL exporter gate

STL export SHALL be a geometry consumer with an explicit validation gate.

#### Scenario: Validation before output

- **WHEN** an STL exporter is invoked
- **THEN** fabrication validation runs first
- **AND** invalid geometry produces no partial file

#### Scenario: Unit declaration

- **WHEN** a file is produced
- **THEN** the surrounding export metadata declares the physical unit/scale
- **AND** STL itself is not misrepresented as carrying a unit field

### Requirement: Prepared fabrication source

Fabrication SHALL evaluate prepared geometry through the same validation gate
as authored geometry.

#### Scenario: Prepared body

- **WHEN** explicit preparation produces a mesh
- **THEN** it is validated before becoming exportable
- **AND** the report identifies that the source was prepared

#### Scenario: Failed preparation

- **WHEN** the prepared mesh is open, non-manifold, inconsistently oriented,
  degenerate or has invalid volume
- **THEN** STL export is rejected
- **AND** no partial file is written

#### Scenario: No silent repair

- **WHEN** preparation is disabled
- **THEN** the exporter never repairs or caps geometry
- **AND** the open-mesh rejection reason remains visible

### Requirement: Self-intersection diagnostics

Fabrication validation SHALL reject meshes with detected self-intersections.

#### Scenario: Checked mesh

- **WHEN** fabrication validation runs on a mesh
- **THEN** the validation record reports whether the self-intersection check ran
- **AND** the number of intersecting pairs found

#### Scenario: Intersecting mesh

- **WHEN** one or more self-intersecting pairs are found
- **THEN** STL export is rejected
- **AND** the error identifies the self-intersection
- **AND** no bytes are written

#### Scenario: No silent limitation

- **WHEN** the check runs successfully
- **THEN** the previous "not implemented" warning is not emitted

### Requirement: Explicit body scope

Fabrication SHALL export one body by default and several only when explicitly
requested.

#### Scenario: Default single body

- **WHEN** the user does not select a multi-body scope
- **THEN** Fabricate exports the first validated closed body from the active
  layer
- **AND** other visible instances are not included

#### Scenario: Multi-body scope

- **WHEN** the user selects active-layer or composition scope
- **THEN** only independently validated closed bodies are merged
- **AND** the merged mesh must pass topology and self-intersection validation

#### Scenario: Not a union

- **WHEN** bodies overlap
- **THEN** export is rejected instead of silently unioning them
- **AND** the UI does not claim a watertight single body

### Requirement: Boolean-derived fabrication source

Fabrication SHALL apply explicit boolean recipes only to validated bodies and
shall validate the result again.

#### Scenario: Valid recipe

- **WHEN** a union, difference or intersection recipe succeeds
- **THEN** the result is validated before becoming exportable
- **AND** the report identifies the operation and operand count

#### Scenario: Invalid operand

- **WHEN** a selected body fails per-body validation
- **THEN** it is excluded from the boolean recipe
- **AND** the remaining valid bodies may still be combined
- **AND** if fewer than two valid bodies remain, the recipe is not run

#### Scenario: Failed result

- **WHEN** the boolean result fails validation or hits a complexity limit
- **THEN** STL export is rejected
- **AND** no bytes are written
- **AND** the reason identifies the boolean failure

#### Scenario: No silent fallback

- **WHEN** an explicit boolean recipe is selected
- **THEN** the exporter does not fall back to overlapping-shell multi-body
  output after a boolean failure

### Requirement: Repaired fabrication source

Fabrication SHALL validate repaired geometry through the same gate as authored
geometry.

#### Scenario: Repaired body

- **WHEN** explicit repair produces a mesh
- **THEN** it is validated before becoming exportable
- **AND** the report identifies the repair actions

#### Scenario: Failed repair

- **WHEN** repair cannot produce a closed, manifold, oriented,
  self-intersection-free mesh with positive volume
- **THEN** STL export is rejected
- **AND** no partial file is written
- **AND** the reason identifies the remaining validation error

#### Scenario: No silent repair

- **WHEN** repair is disabled
- **THEN** the exporter never cleans, caps, welds or reorients geometry
- **AND** the validation failure remains visible

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

### Requirement: Topology-repaired source

Fabrication SHALL validate topology-repaired geometry before export.

#### Scenario: Repaired source

- **WHEN** topology repair produces a mesh
- **THEN** manifold, orientation, self-intersection and volume gates run again
- **AND** the report identifies topology actions

#### Scenario: Remaining topology errors

- **WHEN** non-manifold edges or non-orientable topology remain
- **THEN** STL export is rejected
- **AND** no partial file is written

### Requirement: Self-intersection-repaired source

Fabrication SHALL validate self-intersection-repaired geometry before export.

#### Scenario: Repaired source

- **WHEN** self-intersection repair produces a mesh
- **THEN** the self-intersection gate runs again
- **AND** the report identifies the repair strategy

#### Scenario: Remaining intersections

- **WHEN** intersections remain
- **THEN** STL export is rejected
- **AND** no partial file is written

### Requirement: Robust CSG source

Fabrication SHALL validate robust CSG results before export.

#### Scenario: Valid result

- **WHEN** a robust CSG strategy produces geometry
- **THEN** the standard fabrication gate runs again
- **AND** the report identifies strategy, fallback and volume delta

#### Scenario: Invalid or failed result

- **WHEN** the result fails validation or all strategies fail
- **THEN** STL/3MF export is rejected
- **AND** no partial file is written

### Requirement: Manifold-derived source

Fabrication SHALL validate Manifold-derived geometry before export.

#### Scenario: Valid result

- **WHEN** Manifold produces a body
- **THEN** the standard mesh/fabrication gate runs
- **AND** the report identifies the Manifold engine

#### Scenario: Invalid result

- **WHEN** Manifold output fails validation
- **THEN** STL/3MF export is rejected
- **AND** no partial file is written

### Requirement: SDF-repaired source

Fabrication SHALL validate SDF-repaired geometry before export.

#### Scenario: Valid result

- **WHEN** SDF repair produces a body
- **THEN** the standard gate runs
- **AND** the report identifies the SDF strategy

#### Scenario: Failed result

- **WHEN** SDF repair fails
- **THEN** STL/3MF export is rejected

### Requirement: Cached fabrication result

Export SHALL use a completed worker result when available.

#### Scenario: Cached result

- **WHEN** a heavy job has completed
- **THEN** STL/3MF export uses that report
- **AND** the geometry is not recomputed on the main thread

#### Scenario: Running job

- **WHEN** export is requested while a heavy job is running
- **THEN** export is rejected with a clear reason

