## Purpose

Integrate Manifold WASM as the primary robust CSG engine behind the existing
boolean contract.

## ADDED Requirements

### Requirement: Lazy initialization

Manifold SHALL be initialized asynchronously without blocking first paint.

#### Scenario: Ready

- **WHEN** initialization completes
- **THEN** manifold booleans are available synchronously

#### Scenario: Not ready

- **WHEN** an explicit manifold strategy runs before initialization
- **THEN** it returns `not-ready`
- **AND** auto can use a fallback strategy

### Requirement: Data conversion

Our Mesh/Solid data SHALL convert to Manifold Mesh and back.

#### Scenario: Input

- **WHEN** a validated closed Mesh/Solid is passed
- **THEN** positions and triangle indices are converted without mutation

#### Scenario: Output

- **WHEN** a Manifold result is returned
- **THEN** it is rebuilt as a canonical Mesh with finite vertices

### Requirement: Boolean operations

Manifold SHALL implement union, difference and intersection.

#### Scenario: Operations

- **WHEN** the operation is union, difference or intersection
- **THEN** the corresponding Manifold boolean is used
- **AND** multi-operand input is supported

#### Scenario: Empty

- **WHEN** the result has no triangles
- **THEN** it is returned as explicit empty

### Requirement: Validation

Manifold output SHALL pass the standard mesh gate.

#### Scenario: Valid result

- **WHEN** Manifold reports `NoError` and the converted mesh validates
- **THEN** it is returned as success

#### Scenario: Failure

- **WHEN** Manifold reports an error or the converted mesh is invalid
- **THEN** a structured failure is returned
- **AND** no partial geometry is returned

### Requirement: Strategy and fallback

Manifold SHALL be selectable and auto-preferred.

#### Scenario: Explicit

- **WHEN** strategy is manifold and initialized
- **THEN** Manifold is used

#### Scenario: Auto

- **WHEN** strategy is auto and Manifold is ready
- **THEN** Manifold is attempted first
- **AND** fallback is reported if it fails

#### Scenario: Fallback

- **WHEN** Manifold is unavailable or fails
- **THEN** BSP or remesh may run
- **AND** the fallback is recorded
