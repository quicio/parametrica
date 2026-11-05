## Purpose

Provide deterministic union, difference and intersection over validated closed
Mesh/Solid operands, with explicit empty results and bounded complexity.

## ADDED Requirements

### Requirement: Boolean operations

The geometry layer SHALL provide union, difference and intersection for
validated closed solids.

#### Scenario: Union

- **WHEN** two validated solids are unioned
- **THEN** the result contains the outer boundary of both
- **AND** interior faces are removed
- **AND** the result is a validated closed mesh

#### Scenario: Difference

- **WHEN** solid A is subtracted from solid B
- **THEN** the result is B outside A
- **AND** operand order is deterministic and documented

#### Scenario: Intersection

- **WHEN** two validated solids are intersected
- **THEN** the result is their common volume
- **AND** the result is a validated closed mesh

#### Scenario: Unknown operation

- **WHEN** the operation is not union, difference or intersection
- **THEN** the call fails with an `invalid-operation` error
- **AND** no geometry is returned

### Requirement: Operand eligibility

Boolean operands SHALL be validated closed solids.

#### Scenario: Valid operands

- **WHEN** every operand is closed, manifold, consistently oriented, free of
  self-intersections and has finite positive volume
- **THEN** the operation may proceed

#### Scenario: Invalid operand

- **WHEN** an operand is open, non-manifold, inconsistently oriented,
  self-intersecting, degenerate or non-finite
- **THEN** the operation fails with a structured error
- **AND** no partial geometry is returned

#### Scenario: Surface input

- **WHEN** an operand is a Surface
- **THEN** it is rejected
- **AND** the caller must tessellate and prepare it first

### Requirement: Coplanar and touching faces

The engine SHALL handle coplanar and exactly touching faces deterministically.

#### Scenario: Shared face

- **WHEN** two cubes share a face and are unioned
- **THEN** the shared internal face is removed
- **AND** the result is one closed shell

#### Scenario: Face touching intersection

- **WHEN** two solids only touch at a face and are intersected
- **THEN** the result is empty
- **AND** no zero-volume mesh is returned

#### Scenario: Near-coplanar tolerance

- **WHEN** faces are within the configured tolerance of each other
- **THEN** they are classified consistently
- **AND** the same inputs always produce the same result

### Requirement: Empty results

Empty boolean results SHALL be explicit successes.

#### Scenario: Self subtraction

- **WHEN** a solid is subtracted from itself
- **THEN** the result is `empty: true`
- **AND** `geometry` is null

#### Scenario: Disjoint intersection

- **WHEN** two disjoint solids are intersected
- **THEN** the result is `empty: true`
- **AND** no degenerate mesh is returned

#### Scenario: Fabrication

- **WHEN** a boolean recipe produces an empty result
- **THEN** Fabricate disables export
- **AND** the reason states that the boolean result is empty

### Requirement: Result validation

Every non-empty boolean result SHALL pass the existing mesh validation gate.

#### Scenario: Valid result

- **WHEN** the boolean result is closed, manifold, oriented, free of
  self-intersections and has positive volume
- **THEN** it is returned with its validation record

#### Scenario: Invalid result

- **WHEN** the result fails topology, orientation, self-intersection or volume
  validation
- **THEN** the operation fails
- **AND** no partial mesh is returned

### Requirement: Determinism

Boolean results SHALL be deterministic.

#### Scenario: Repeat

- **WHEN** the same operands and tolerance are processed twice
- **THEN** the geometry and STL bytes are identical
- **AND** face order does not depend on hash iteration

### Requirement: Complexity limits

The engine SHALL bound time and memory on pathological inputs.

#### Scenario: Input limit

- **WHEN** an operand exceeds the configured input triangle limit
- **THEN** the call fails with a `complexity` error

#### Scenario: Split limit

- **WHEN** BSP depth or intermediate polygon count exceeds its limit
- **THEN** the call fails with a `complexity` error
- **AND** no partial result is returned

### Requirement: Units and tolerance

Booleans SHALL operate in world units with an explicit tolerance.

#### Scenario: Tolerance

- **WHEN** a tolerance is supplied
- **THEN** it is used for plane classification and result welding
- **AND** it is recorded in the result stats

#### Scenario: No implicit conversion

- **WHEN** physical units are present
- **THEN** the boolean uses world coordinates
- **AND** millimetre conversion happens only at export
