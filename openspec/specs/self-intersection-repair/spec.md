# self-intersection-repair Specification

## Purpose
Resolve self-intersecting closed meshes through explicit local splitting or
deterministic signed-distance remeshing, without silently exporting invalid
geometry.
## Requirements
### Requirement: Explicit strategy

Self-intersection repair SHALL be opt-in and strategy-driven.

#### Scenario: Default

- **WHEN** repair does not request self-intersection resolution
- **THEN** the 5E behavior is preserved
- **AND** self-intersections remain validation errors

#### Scenario: Remesh

- **WHEN** strategy is remesh
- **THEN** a deterministic signed-distance remesh is produced
- **AND** the resolution and triangle count are reported

#### Scenario: Auto

- **WHEN** strategy is auto and pairs exist
- **THEN** remesh is selected
- **AND** the actual strategy is reported

### Requirement: Remesh repair

Remesh SHALL produce a deterministic watertight approximation.

#### Scenario: Iso-surface

- **WHEN** a resolution is selected
- **THEN** the signed distance field is sampled deterministically
- **AND** the iso-surface is welded, oriented and validated

#### Scenario: Approximation

- **WHEN** remesh completes
- **THEN** resolution, triangle count and volume delta are reported
- **AND** the result validates

#### Scenario: Resolution budget

- **WHEN** the expected triangle count exceeds the budget
- **THEN** the operation fails with `complexity`
- **AND** no partial mesh is returned

### Requirement: Validation and reporting

Every repaired result SHALL pass the standard mesh gate.

#### Scenario: Valid result

- **WHEN** self-intersections are resolved
- **THEN** the result is closed, manifold, oriented, self-intersection-free and
  has positive volume
- **AND** the strategy and changes are reported

#### Scenario: Failed result

- **WHEN** intersections remain or the result is invalid
- **THEN** fabrication export is rejected
- **AND** the remaining count and validation errors are shown

### Requirement: Fabrication isolation

Self-intersection repair SHALL be derived only.

#### Scenario: Render geometry

- **WHEN** repair runs
- **THEN** render meshes, layers and SurfaceMapping are unchanged
- **AND** only the fabrication source is replaced

#### Scenario: Determinism

- **WHEN** the same mesh, strategy and budgets are used
- **THEN** geometry and STL bytes are identical

### Requirement: Feature-preserving self-intersection remesh

Self-intersection remesh SHALL use feature-aware projection.

#### Scenario: Remesh

- **WHEN** self-intersections are resolved by remesh
- **THEN** generated vertices are projected to the source surface
- **AND** features are snapped where detected

