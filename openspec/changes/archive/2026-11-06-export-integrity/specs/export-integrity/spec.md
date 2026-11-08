## Purpose

Define trustworthy export and trust-flag contracts for fabrication: 3MF emits
only complete triangles, and Manifold trust never survives a post-process that
changes the mesh.

## ADDED Requirements

### Requirement: Triangle-only 3MF

3MF export SHALL emit only complete triangles.

#### Scenario: Triangular face

- **WHEN** a validated mesh face has three vertices
- **THEN** it is emitted as one triangle

#### Scenario: Polygonal face

- **WHEN** a validated mesh face has more than three vertices
- **THEN** it is triangulated deterministically
- **AND** the original winding is preserved
- **AND** the emitted triangle count includes every resulting triangle

#### Scenario: Unsupported face

- **WHEN** a face cannot be triangulated as a planar simple polygon
- **THEN** the export is rejected with a structured error
- **AND** no partial 3MF is written

#### Scenario: Determinism

- **WHEN** the same bodies and scale are exported twice
- **THEN** the package bytes are identical

### Requirement: Trust-flag lifecycle

`manifoldGuaranteed` SHALL describe only the mesh it was created for.

#### Scenario: Manifold output

- **WHEN** Manifold produces a mesh without further modification
- **THEN** the mesh may carry `manifoldGuaranteed: true`

#### Scenario: Post-process

- **WHEN** a repair, cap, weld, simplification or orientation pass changes the
  mesh
- **THEN** `manifoldGuaranteed` is cleared
- **AND** validation runs its normal self-intersection checks

#### Scenario: No upgrade

- **WHEN** a non-Manifold process produces a result
- **THEN** it does not set `manifoldGuaranteed`
- **AND** the report states whether the guarantee survived

### Requirement: Export evidence

The export result SHALL distinguish emitted geometry from source faces.

#### Scenario: Count

- **WHEN** a 3MF is produced
- **THEN** the reported triangle count equals the emitted triangles
- **AND** the source mesh is not mutated

#### Scenario: Failure

- **WHEN** triangulation or validation fails
- **THEN** the error identifies the body and the failing face or check
- **AND** no package is returned
