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

### Requirement: Boolean recipe controls

Fabricate SHALL expose explicit boolean operations over selected validated
bodies.

#### Scenario: Controls

- **WHEN** the user selects a multi-body scope
- **THEN** the panel offers None, Union, Difference and Intersection
- **AND** None remains the default

#### Scenario: Operand count

- **WHEN** fewer than two valid bodies are selected
- **THEN** Difference and Intersection are disabled with a reason

#### Scenario: Result

- **WHEN** a boolean succeeds
- **THEN** the panel reports the operation, operand count and result counts
- **AND** the result is treated as one derived body

#### Scenario: Empty or failed result

- **WHEN** the boolean is empty or fails
- **THEN** export remains disabled
- **AND** the reason states empty, invalid result or complexity

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

### Requirement: Format selector

Fabricate SHALL offer STL and 3MF export formats.

#### Scenario: Default

- **WHEN** the user opens Fabricate
- **THEN** STL remains the default format

#### Scenario: 3MF

- **WHEN** the user selects 3MF and exports
- **THEN** the download uses the `.3mf` extension
- **AND** the report shows object and triangle counts

#### Scenario: Shared source

- **WHEN** the format changes
- **THEN** the selected bodies, repair, CSG and units settings are unchanged

### Requirement: Topology repair controls

Fabricate SHALL expose topology repair under Repair.

#### Scenario: Controls

- **WHEN** Repair is enabled
- **THEN** the panel offers non-manifold strategies and non-orientable handling
- **AND** no topology repair runs by default

#### Scenario: Report

- **WHEN** topology repair runs
- **THEN** the panel reports split edges, duplicated vertices, cuts, removals
  and remaining errors

#### Scenario: Failure

- **WHEN** topology remains invalid or a closed non-orientable surface is
  requested
- **THEN** export remains disabled
- **AND** the reason identifies the unsupported topology

### Requirement: Self-intersection repair controls

Fabricate SHALL expose self-intersection repair under Repair.

#### Scenario: Controls

- **WHEN** Repair is enabled
- **THEN** the panel offers Off, Split, Remesh and Auto
- **AND** Off remains the default

#### Scenario: Report

- **WHEN** the step runs
- **THEN** the panel reports strategy, remaining pairs, fallbacks, resolution and
  volume/triangle deltas

#### Scenario: Failure

- **WHEN** repair cannot resolve the mesh
- **THEN** export remains disabled
- **AND** the reason identifies remaining self-intersections or complexity

### Requirement: CSG strategy controls

Fabricate SHALL expose the robust CSG strategy.

#### Scenario: Controls

- **WHEN** a boolean recipe is selected
- **THEN** Auto, BSP and Remesh are available
- **AND** Auto remains the default

#### Scenario: Report

- **WHEN** a boolean runs
- **THEN** the panel reports actual strategy, fallback, epsilon, splits, timing
  and volume delta

#### Scenario: Failure

- **WHEN** all strategies fail
- **THEN** export remains disabled
- **AND** the reason identifies topology, complexity or remesh failure

### Requirement: Manifold controls

Fabricate SHALL expose the Manifold strategy and readiness.

#### Scenario: Strategy

- **WHEN** a boolean recipe is selected
- **THEN** Auto, Manifold, BSP and Remesh are available
- **AND** Auto remains the default

#### Scenario: Readiness

- **WHEN** Manifold is still loading
- **THEN** the UI can show readiness
- **AND** explicit Manifold reports `not-ready`

#### Scenario: Report

- **WHEN** Manifold runs
- **THEN** the Boolean result row reports `manifold` and any fallback

