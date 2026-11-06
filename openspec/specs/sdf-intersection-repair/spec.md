# sdf-intersection-repair Specification

## Purpose
Resolve self-intersecting closed meshes with a winding-sign signed-distance
field and Manifold.levelSet, with remesh as fallback.
## Requirements
### Requirement: Winding SDF

The repair SHALL build a signed-distance function from the source mesh.

#### Scenario: Inside/outside

- **WHEN** a point is inside the source solid
- **THEN** the SDF returns a positive distance
- **WHEN** outside
- **THEN** it returns a negative distance

#### Scenario: Overlapping shells

- **WHEN** the source contains overlapping closed shells
- **THEN** the sign uses winding, not parity
- **AND** the overlap remains inside

#### Scenario: Closest distance

- **WHEN** a point is evaluated
- **THEN** the magnitude is the distance to the closest triangle

### Requirement: Manifold level set

Repair SHALL use Manifold.levelSet to reconstruct the surface.

#### Scenario: Reconstruction

- **WHEN** an SDF and bounds are supplied
- **THEN** Manifold.levelSet produces a manifold iso-surface
- **AND** resolution controls the edge length

#### Scenario: Slivers

- **WHEN** the raw level set contains near-degenerate slivers
- **THEN** Manifold.simplify runs before conversion
- **AND** the result is validated

### Requirement: Strategy

Repair SHALL expose SDF and remesh strategies.

#### Scenario: SDF

- **WHEN** strategy is sdf and Manifold is ready
- **THEN** SDF repair runs
- **AND** its edge length and strategy are reported

#### Scenario: Auto

- **WHEN** strategy is auto and Manifold is ready
- **THEN** SDF is preferred
- **AND** remesh is used if SDF fails

#### Scenario: Not ready

- **WHEN** explicit SDF runs before Manifold initialization
- **THEN** it returns `not-ready`

### Requirement: Validation and trust

SDF output SHALL be validated and explicitly tagged.

#### Scenario: Manifold guarantee

- **WHEN** output comes from Manifold
- **THEN** it is tagged `manifoldGuaranteed`
- **AND** the local self-intersection detector records `checked:false`
- **AND** closed, manifold, orientation, degenerate and volume checks still run

#### Scenario: Failure

- **WHEN** the output fails any hard gate
- **THEN** a structured failure is returned
- **AND** export remains disabled

