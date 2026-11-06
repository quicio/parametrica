# csg-robustness Specification

## Purpose
Make CSG usable on highly non-convex overlapping solids through explicit
strategies, adaptive tolerance, repair integration and bounded fallbacks.
## Requirements
### Requirement: CSG strategies

Boolean operations SHALL support explicit robustness strategies.

#### Scenario: BSP

- **WHEN** strategy is bsp
- **THEN** the existing BSP engine is used
- **AND** cube/sphere behavior is preserved

#### Scenario: Remesh

- **WHEN** strategy is remesh
- **THEN** a deterministic signed-distance iso-surface is produced
- **AND** resolution and volume delta are reported

#### Scenario: Auto

- **WHEN** strategy is auto
- **THEN** bsp is attempted first
- **AND** remesh is used when bsp fails or exceeds its budget
- **AND** the actual strategy and fallback are reported

### Requirement: Adaptive tolerance

CSG SHALL use a scale-aware tolerance.

#### Scenario: Auto tolerance

- **WHEN** tolerance is auto
- **THEN** epsilon is derived from mesh scale and coordinate magnitude
- **AND** the actual epsilon is recorded

#### Scenario: Explicit tolerance

- **WHEN** a numeric tolerance is supplied
- **THEN** it is used consistently for classification, welding and repair
- **AND** invalid or non-finite values are rejected

### Requirement: Robustness

CSG SHALL produce valid results for the defined non-convex test matrix.

#### Scenario: Overlapping tori

- **WHEN** two overlapping full-resolution tori are unioned, subtracted or
  intersected
- **THEN** the result is closed, manifold, oriented, self-intersection-free and
  positive volume
- **AND** the remesh fallback is reported when BSP cannot produce a valid result

#### Scenario: Fallback

- **WHEN** the primary strategy exceeds budgets or produces invalid topology
- **THEN** auto may fall back to another strategy
- **AND** the fallback is reported
- **AND** the final result is validated

#### Scenario: Failure

- **WHEN** all selected strategies fail
- **THEN** a structured failure is returned
- **AND** no partial geometry is returned

### Requirement: Performance and budgets

CSG SHALL remain bounded.

#### Scenario: Input budget

- **WHEN** operands exceed the triangle budget
- **THEN** the operation fails with `complexity`

#### Scenario: Time/space budget

- **WHEN** splitting, BSP depth or remesh resolution exceeds its budget
- **THEN** the operation fails or falls back
- **AND** the report identifies the budget

### Requirement: Validation and reporting

Every CSG result SHALL pass the standard gate.

#### Scenario: Valid result

- **WHEN** a strategy produces geometry
- **THEN** mesh validation, including self-intersections, passes
- **AND** strategy, epsilon, splits, fallback, timing and volume delta are
  reported

#### Scenario: Determinism

- **WHEN** the same operands, strategy and tolerance are used twice
- **THEN** geometry and STL bytes are identical

### Requirement: Fabrication integration

Robust CSG SHALL remain an explicit fabrication recipe.

#### Scenario: Strategy selector

- **WHEN** a boolean recipe is selected
- **THEN** Auto/BSP/Surface/Remesh are available
- **AND** Auto remains the default

#### Scenario: No silent fallback

- **WHEN** a strategy fails without a successful fallback
- **THEN** export remains disabled
- **AND** the reason identifies the failure

### Requirement: Feature-preserving CSG fallback

CSG remesh fallback SHALL use feature-aware projection.

#### Scenario: Fallback

- **WHEN** BSP fails and remesh is used
- **THEN** projection is enabled by default
- **AND** projection/feature stats are reported

### Requirement: Manifold CSG strategy

Robust CSG SHALL offer a Manifold strategy.

#### Scenario: Overlapping tori

- **WHEN** full-resolution tori are unioned, subtracted or intersected with
  Manifold
- **THEN** the result is valid and watertight
- **AND** no remesh approximation is used

#### Scenario: Regression

- **WHEN** Manifold is unavailable
- **THEN** BSP/remesh behavior remains unchanged

