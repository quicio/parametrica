# instance-layers Specification

## Purpose
Add layer-level instancing that reuses a generator layer's canonical Surface
while keeping per-instance transforms, identity, mapping and UI behavior.
## Requirements
### Requirement: Instance layers

A layer SHALL be either a generator layer or an instance layer.

#### Scenario: Persistent kind

- **WHEN** a document is saved and reloaded
- **THEN** generator and instance layer kinds are preserved
- **AND** documents without a kind are treated as generator layers

#### Scenario: Instance fields

- **WHEN** a layer is an instance
- **THEN** it stores `source.layerId`
- **AND** it has `generator: null` and `seed: null`
- **AND** it has its own operators, style, visibility and order

#### Scenario: Source change

- **WHEN** the user changes `source.layerId`
- **THEN** the instance is invalidated and re-evaluated
- **AND** its operators, style, visibility and order are preserved

### Requirement: Source validity

An instance SHALL reference exactly one generator layer.

#### Scenario: Generator source

- **WHEN** the source is a generator layer producing a Surface
- **THEN** the instance evaluates

#### Scenario: Invalid source

- **WHEN** the source is missing, a curve source, a Mesh-only source or another
  instance
- **THEN** the instance reports a keyed error
- **AND** no partial geometry is committed

#### Scenario: Cycles

- **WHEN** an instance would create a reference cycle or chain
- **THEN** evaluation rejects it
- **AND** the document remains valid without partial geometry

### Requirement: Canonical geometry

Instances SHALL transform canonical world Surface geometry before tessellation.

#### Scenario: World Surface

- **WHEN** an instance evaluates
- **THEN** it clones `evaluation.geometry`
- **AND** it applies instance operators before tessellation
- **AND** it never transforms `meshes` or `renderMeshes`

#### Scenario: Allowed operators

- **WHEN** an instance uses `translate`, `rotate` or `scale`
- **THEN** the operator applies
- **AND** when it uses `mirror`, repeat/array, deform, resample or boolean
- **THEN** evaluation reports a keyed error
- **AND** no partial geometry is committed

### Requirement: Instance identity

Instance IDs SHALL be deterministic and distinct from source IDs.

#### Scenario: Derived IDs

- **WHEN** an instance produces surfaces
- **THEN** each surface/mesh ID is derived from `layer.id` and its output index
- **AND** no source `surfaceId` or `meshId` is reused

#### Scenario: Stability

- **WHEN** the source and instance operators are unchanged
- **THEN** derived IDs are stable across reevaluations
- **AND** they may be reassigned when source output order/topology changes
- **AND** persistent IDs are limited to `layer.id` and `source.layerId`

### Requirement: Instance mapping

Instance mappings SHALL be regenerated from the cloned Surface.

#### Scenario: Mapping validity

- **WHEN** an instance tessellates
- **THEN** `mapping.surfaceId` and `mapping.meshId` are instance IDs
- **AND** domain, grid, cell and UV are derived from the cloned Surface
- **AND** no source mapping or UV correspondence is copied

#### Scenario: Stale mapping

- **WHEN** mapping IDs or face indices do not match the instance mesh
- **THEN** inspection reports missing/mismatch
- **AND** the stale mapping is not displayed as valid

### Requirement: Evaluation and visibility

Instances SHALL evaluate after their sources without duplicating generator
evaluation.

#### Scenario: Evaluation order

- **WHEN** layers contain sources and instances
- **THEN** needed sources evaluate first
- **AND** instances evaluate in original layer order

#### Scenario: Hidden source

- **WHEN** a source is hidden and a visible instance depends on it
- **THEN** the source is evaluated
- **AND** the source itself is not rendered
- **AND** when all dependent instances are hidden
- **THEN** the hidden source is not evaluated for render

#### Scenario: Cache invalidation

- **WHEN** a source or instance operator changes
- **THEN** the affected instances are invalidated
- **AND** unrelated instances are reused

### Requirement: Limits

The document SHALL enforce the MVP instance and layer limits.

#### Scenario: Instance limit

- **WHEN** the document already has 24 instance layers
- **THEN** creating another instance is rejected with a visible message
- **AND** the document remains valid

#### Scenario: Total layers

- **WHEN** the total layer count would exceed 32
- **THEN** creation is rejected with a visible message

### Requirement: UI

The UI SHALL expose minimal instance management without a new workspace.

#### Scenario: Create

- **WHEN** the user chooses Add Instance Layer
- **THEN** a source selector lists generator layers
- **AND** the created instance appears in Layers with its source

#### Scenario: Active instance

- **WHEN** an instance is active
- **THEN** generator/params/equations/harmonics are replaced by a read-only
  source summary
- **AND** only translate/rotate/scale appear in the operator stack
- **AND** style remains editable

#### Scenario: Disabled tools

- **WHEN** an instance is active
- **THEN** Mutation, Explore and Evolution are disabled with a reason

#### Scenario: Delete source

- **WHEN** a source has dependent instances
- **THEN** deletion is blocked
- **AND** the number of dependents is shown

### Requirement: Inspection and export compatibility

Instances SHALL use existing render, picking, inspection, export and unit paths.

#### Scenario: Picking

- **WHEN** an instance is picked
- **THEN** the result identifies the instance layer
- **AND** exposes the source layer
- **AND** mapping status remains truthful

#### Scenario: Exports

- **WHEN** SVG or PNG is exported
- **THEN** instance order, visibility and style are preserved
- **AND** units do not rescale geometry

### Requirement: Fabricate

Fabricate SHALL remain single-body.

#### Scenario: Active instance

- **WHEN** an instance is the active layer
- **THEN** Fabricate may export its first valid closed body
- **AND** it states that the composition is not exported as multi-body
- **AND** other visible instances do not disable export

