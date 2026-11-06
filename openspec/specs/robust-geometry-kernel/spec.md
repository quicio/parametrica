# robust-geometry-kernel Specification

## Purpose
Provide dependency-free robust orientation, tolerance, snapping and
intersection primitives shared by geometry repair and CSG.
## Requirements
### Requirement: Exact orientation signs

The kernel SHALL return exact signs for 2D and 3D orientation of finite double
coordinates.

#### Scenario: Fast path

- **WHEN** the double determinant is safely away from zero
- **THEN** the fast double sign is returned

#### Scenario: Near cancellation

- **WHEN** the double determinant is within the error bound
- **THEN** an exact integer fallback recomputes the sign
- **AND** a mathematically zero determinant returns zero

#### Scenario: Non-finite input

- **WHEN** any coordinate is non-finite
- **THEN** the predicate reports an indeterminate/zero result
- **AND** no exception is thrown

### Requirement: Adaptive tolerance

The kernel SHALL derive tolerance from geometry scale.

#### Scenario: Scale

- **WHEN** a bbox or point set is supplied
- **THEN** epsilon is derived from diagonal and coordinate magnitude
- **AND** it is clamped to documented floors and ceilings
- **AND** the actual epsilon is returned

#### Scenario: Explicit override

- **WHEN** a caller supplies bounds
- **THEN** the supplied floor/ceiling/factor are respected

### Requirement: Snap rounding

The kernel SHALL provide deterministic snap rounding.

#### Scenario: Grid

- **WHEN** a value and positive grid are supplied
- **THEN** the nearest grid multiple is returned
- **AND** repeated calls are identical

#### Scenario: Invalid grid

- **WHEN** the grid is non-finite or non-positive
- **THEN** the original value is returned

### Requirement: 2D primitives

The kernel SHALL provide robust 2D segment and triangle tests.

#### Scenario: Segments

- **WHEN** two segments cross, touch or overlap collinearly
- **THEN** intersection is reported
- **WHEN** they are disjoint
- **THEN** no intersection is reported

#### Scenario: Point in triangle

- **WHEN** a point is inside or on the boundary of a triangle
- **THEN** containment is reported
- **WHEN** outside
- **THEN** it is not reported

### Requirement: Triangle intersection classifier

The kernel SHALL classify triangle-triangle intersections robustly.

#### Scenario: Disjoint

- **WHEN** no intersection exists
- **THEN** the result is null

#### Scenario: Segment

- **WHEN** two non-coplanar triangles intersect
- **THEN** a start/end segment is returned
- **AND** the classification uses exact plane signs

#### Scenario: Coplanar

- **WHEN** both triangles lie in the same plane and overlap
- **THEN** the result is marked coplanar
- **AND** polygon extraction is left to a later CSG layer

### Requirement: Determinism and isolation

The kernel SHALL be deterministic and side-effect free.

#### Scenario: Repeat

- **WHEN** the same inputs are evaluated twice
- **THEN** results are identical
- **AND** inputs are not mutated
- **AND** no DOM, renderer or document dependency is used

